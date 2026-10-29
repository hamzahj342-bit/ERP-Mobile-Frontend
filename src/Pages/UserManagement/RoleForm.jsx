import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import NavigationBar from "../../Components/NavigationBar";
import Footer from "../../Components/Footer";
import { toast } from "react-toastify";
import api from "../../../api";
import { getAssignablePermissionGroups, ADMIN_PERMISSION_KEYS, hasPermission } from "../../permissions";

const RoleForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const canGrantAdmin = hasPermission("users.manage");

  const [name, setName] = useState("");
  const [isSystem, setIsSystem] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [saving, setSaving] = useState(false);

  // Full Access: hide Administration; Super Admin: full catalog
  const visibleGroups = useMemo(() => getAssignablePermissionGroups(), [canGrantAdmin]);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await api.get(`/roles/${id}`);
        setName(res.data.name || "");
        setIsSystem(Boolean(res.data.is_system));
        // Keep admin keys in the set (so they are preserved on save) even if hidden in UI
        setSelected(new Set(res.data.permissions || []));
      } catch (err) {
        console.error("Error loading role:", err);
        toast.error(err.response?.data?.message || "Failed to load role.");
        navigate("/roles");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const toggleKey = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleGroup = (groupKeys, allSelected) => {
    setSelected((prev) => {
      const next = new Set(prev);
      groupKeys.forEach((k) => (allSelected ? next.delete(k) : next.add(k)));
      return next;
    });
  };

  const groupState = useMemo(() => {
    return visibleGroups.map((g) => {
      const keys = g.permissions.map((p) => p.key);
      const allSelected = keys.every((k) => selected.has(k));
      const someSelected = keys.some((k) => selected.has(k));
      return { group: g.group, keys, allSelected, someSelected };
    });
  }, [selected, visibleGroups]);

  // Count only keys visible in the form (admin keys may still be in selected for preserve)
  const totalSelected = [...selected].filter((k) =>
    canGrantAdmin ? true : !ADMIN_PERMISSION_KEYS.includes(k)
  ).length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Role name is required.");
      return;
    }
    setSaving(true);
    try {
      // Backend strips / preserves Administration keys for Full Access callers.
      const payload = { name: name.trim(), permissions: [...selected] };
      if (isEdit) {
        await api.put(`/roles/${id}`, payload);
        toast.success("Role updated successfully!");
      } else {
        await api.post("/roles", payload);
        toast.success("Role created successfully!");
      }
      navigate("/roles");
    } catch (err) {
      console.error("Save role error:", err);
      toast.error(err.response?.data?.message || "Failed to save role.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <NavigationBar />
      <div className="page-container" style={{ maxWidth: 760, margin: "0 auto", padding: "0 16px" }}>
        <button className="back-btn" style={{ marginTop: '50px' }} onClick={() => navigate("/roles")}>
          <FaArrowLeft />
        </button>

        <div className="entity-card" style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", marginTop: 16 }}>
          <h2 style={{ marginTop: 0 }}>{isEdit ? "Edit Role" : "Create Role"}</h2>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ fontSize: "0.85rem", color: "#64748b" }}>Role Name</label>
              <input
                type="text"
                placeholder="e.g. Store Manager"
                value={name}
                onChange={(e) => setName(e.target.value)}
                readOnly={isSystem}
                required
                style={isSystem ? { background: "#f1f5f9" } : {}}
              />
              {isSystem && (
                <small style={{ color: "#94a3b8" }}>System role name is fixed; you can still change its permissions.</small>
              )}
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1e293b" }}>Permissions</label>
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>{totalSelected} selected</span>
              </div>

              {visibleGroups.map((g, gi) => {
                const gs = groupState[gi];
                return (
                  <div key={g.group} style={{ border: "1px solid #e2e8f0", borderRadius: 10, marginBottom: 12, overflow: "hidden" }}>
                    <div style={{ background: "#f8fafc", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <strong style={{ color: "#334155", fontSize: "0.9rem" }}>{g.group}</strong>
                      <label style={{ fontSize: "0.8rem", color: "#3b82f6", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                          type="checkbox"
                          checked={gs.allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = gs.someSelected && !gs.allSelected;
                          }}
                          onChange={() => toggleGroup(gs.keys, gs.allSelected)}
                        />
                        Select all
                      </label>
                    </div>
                    <div style={{ padding: "12px 14px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                      {g.permissions.map((p) => (
                        <label key={p.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.88rem", color: "#475569", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={selected.has(p.key)}
                            onChange={() => toggleKey(p.key)}
                          />
                          {p.label}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? "Saving..." : "Save Role"}
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default RoleForm;
