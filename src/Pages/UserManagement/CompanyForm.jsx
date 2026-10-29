import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import NavigationBar from "../../Components/NavigationBar";
import Footer from "../../Components/Footer";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import api from "../../../api";

const CompanyForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [name, setName] = useState("");
  const [createRoleSuperAdmin, setCreateRoleSuperAdmin] = useState(true);
  const [createRoleFullAccess, setCreateRoleFullAccess] = useState(true);
  const [createUserSuperAdmin, setCreateUserSuperAdmin] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await api.get(`/companies/admin/${id}`);
        setName(res.data.name || "");
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load company.");
        navigate("/companies-admin");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Company name is required.");
      return;
    }

    if (!isEdit && createUserSuperAdmin && !createRoleSuperAdmin) {
      toast.error("Create User (Super Admin) requires Create Role: Super Admin.");
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/companies/${id}`, { name: name.trim() });
        toast.success("Company updated.");
        navigate("/companies-admin");
      } else {
        const res = await api.post("/companies", {
          name: name.trim(),
          create_role_super_admin: createRoleSuperAdmin,
          create_role_full_access: createRoleFullAccess,
          create_user_super_admin: createUserSuperAdmin,
        });

        const userInfo = res.data?.user_created;
        if (userInfo) {
          await Swal.fire({
            icon: "success",
            title: "Company created",
            html: `
              <p><b>${res.data.name}</b> (ID ${res.data.id}) created.</p>
              <p>Super Admin user:</p>
              <p>Username: <b>${userInfo.name}</b><br/>
              Email: <b>${userInfo.email}</b><br/>
              Password: <b>${userInfo.default_password}</b></p>
            `,
          });
        } else {
          toast.success(`Company "${res.data.name}" created.`);
        }
        navigate("/companies-admin");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save company.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <NavigationBar />
      <div className="page-container" style={{ maxWidth: 560, margin: "0 auto", padding: "0 16px" }}>
        <button className="back-btn" style={{ marginTop: 30 }} onClick={() => navigate("/companies-admin")}>
          <FaArrowLeft />
        </button>

        <div
          className="entity-card"
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 24,
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            marginTop: 16,
          }}
        >
          <h2 style={{ marginTop: 0 }}>{isEdit ? "Edit Company" : "Create Company"}</h2>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: "0.85rem", color: "#64748b" }}>Company Name</label>
              <input
                type="text"
                placeholder="e.g. Acme Trading"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {!isEdit && (
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14 }}>
                <strong style={{ display: "block", marginBottom: 10, color: "#334155" }}>
                  On create, also:
                </strong>
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={createRoleSuperAdmin}
                    onChange={(e) => setCreateRoleSuperAdmin(e.target.checked)}
                  />
                  Create Role: Super Admin
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={createRoleFullAccess}
                    onChange={(e) => setCreateRoleFullAccess(e.target.checked)}
                  />
                  Create Role: Full Access
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={createUserSuperAdmin}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setCreateUserSuperAdmin(on);
                      if (on) setCreateRoleSuperAdmin(true);
                    }}
                  />
                  Create User: Super Admin
                </label>
              </div>
            )}

            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Update Company" : "Create Company"}
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default CompanyForm;
