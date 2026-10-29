import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import NavigationBar from "../../Components/NavigationBar";
import Footer from "../../Components/Footer";
import { toast } from "react-toastify";
import api from "../../../api";
import { hasPermission } from "../../permissions";

const UserForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const canCreateUsers = hasPermission("users.manage");

  const [roles, setRoles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role_id: "",
    status: "approved",
  });

  const loadData = async () => {
    try {
      // Create is Super Admin only
      if (!isEdit && !canCreateUsers) {
        toast.error("You are not allowed to create users.");
        navigate("/user-management");
        return;
      }

      const rolesRes = await api.get("/roles");
      let roleList = rolesRes.data || [];

      // Full Access cannot assign Super Admin–class roles
      if (!canCreateUsers) {
        roleList = roleList.filter(
          (r) => !(Array.isArray(r.permissions) && r.permissions.includes("users.manage"))
        );
      }
      setRoles(roleList);

      if (isEdit) {
        // Full Access cannot open self-edit form
        try {
          const me = JSON.parse(localStorage.getItem("user") || "{}");
          if (!canCreateUsers && String(me.id) === String(id)) {
            toast.error("You cannot edit your own account. Ask a Super Admin.");
            navigate("/user-management");
            return;
          }
        } catch { /* ignore */ }

        const usersRes = await api.get("/users");
        const user = usersRes.data.find((u) => String(u.id) === String(id));
        if (!user) {
          toast.error("User not found.");
          navigate("/user-management");
          return;
        }
        setForm({
          name: user.name || "",
          email: user.email || "",
          password: "",
          role_id: user.role_id || "",
          status: user.status || "approved",
        });
      }
    } catch (err) {
      console.error("Error loading user form:", err);
      toast.error(err.response?.data?.message || "Failed to load data.");
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error("Name and email are required.");
      return;
    }
    if (!isEdit && !form.password) {
      toast.error("Password is required for a new user.");
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/users/${id}`, {
          name: form.name,
          email: form.email,
          role_id: form.role_id || null,
          status: form.status,
        });
        if (form.password) {
          await api.put(`/users/${id}/password`, { password: form.password });
        }
        toast.success("User updated successfully!");
      } else {
        await api.post("/users", {
          name: form.name,
          email: form.email,
          password: form.password,
          role_id: form.role_id || null,
        });
        toast.success("User created successfully!");
      }
      navigate("/user-management");
    } catch (err) {
      console.error("Save user error:", err);
      toast.error(err.response?.data?.message || "Failed to save user.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <NavigationBar />
      <div className="page-wrapper" style={{ maxWidth: 560, margin: "0 auto", padding: "0 16px" }}>
        <button className="back-btn" style={{ marginTop: '50px' }} onClick={() => navigate("/user-management")}>
          <FaArrowLeft />
        </button>

        <div className="entity-card" style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", marginTop: 16 }}>
          <h2 style={{ marginTop: 0 }}>{isEdit ? "Edit User" : "Create User"}</h2>
          <form className="form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: "0.85rem", color: "#64748b" }}>Full Name</label>
              <input type="text" name="name" placeholder="Full Name" value={form.name} onChange={handleChange} required />
            </div>

            <div>
              <label style={{ fontSize: "0.85rem", color: "#64748b" }}>Email</label>
              <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} required />
            </div>

            <div>
              <label style={{ fontSize: "0.85rem", color: "#64748b" }}>
                {isEdit ? "New Password (leave blank to keep current)" : "Password"}
              </label>
              <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} autoComplete="new-password" />
            </div>

            <div>
              <label style={{ fontSize: "0.85rem", color: "#64748b" }}>Role</label>
              <select name="role_id" value={form.role_id} onChange={handleChange} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #cbd5e1" }}>
                <option value="">-- No role --</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            {isEdit && (
              <div>
                <label style={{ fontSize: "0.85rem", color: "#64748b" }}>Status</label>
                <select name="status" value={form.status} onChange={handleChange} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #cbd5e1" }}>
                  <option value="approved">Approved (active)</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            )}

            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default UserForm;
