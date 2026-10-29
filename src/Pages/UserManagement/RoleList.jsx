import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaEdit, FaTrashAlt, FaUserShield, FaLock } from "react-icons/fa";
import NavigationBar from "../../Components/NavigationBar";
import Footer from "../../Components/Footer";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import api from "../../../api";
import { hasPermission } from "../../permissions";

const isSuperAdminRole = (role) => {
  const name = (role?.name || "").toLowerCase();
  if (name === "super admin") return true;
  return Array.isArray(role?.permissions) && role.permissions.includes("users.manage");
};

const isFullAccessRole = (role) => (role?.name || "").toLowerCase() === "full access";

const RoleList = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isSuperAdminUser = hasPermission("users.manage");

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await api.get("/roles");
      let list = res.data || [];
      // Belt-and-suspenders: Full Access never sees Super Admin role row
      if (!isSuperAdminUser) {
        list = list.filter((r) => !isSuperAdminRole(r));
      }
      setRoles(list);
    } catch (err) {
      console.error("Error fetching roles:", err);
      toast.error(err.response?.data?.message || "Failed to load roles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Full Access users cannot edit the Full Access system role; Super Admin can.
  const canEditRole = (role) => {
    if (isSuperAdminUser) return true;
    if (isFullAccessRole(role)) return false;
    if (isSuperAdminRole(role)) return false;
    return true;
  };

  const handleDelete = (role) => {
    if (role.is_system) return;
    Swal.fire({
      title: "Delete role?",
      text: `This will remove the "${role.name}" role.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/roles/${role.id}`);
          fetchRoles();
          Swal.fire("Deleted!", "Role removed.", "success");
        } catch (err) {
          Swal.fire("Error!", err.response?.data?.message || "Could not delete role.", "error");
        }
      }
    });
  };

  return (
    <div className="page-wrapper " style={{ marginTop: '30px'}}>
      <NavigationBar />
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "30px 0 25px 0" }}>
          <button className="back-btn" onClick={() => navigate("/user-management")}>
            <FaArrowLeft />
          </button>
          <button className="primary-btn" style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={() => navigate("/roles/new")}>
            <FaPlus /> Add Role
          </button>
        </div>

        <div className="category-card" style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <h2 style={{ margin: "0 0 20px 0", fontSize: "1.4rem", color: "#1e293b", display: "flex", alignItems: "center", gap: 10 }}>
            <FaUserShield style={{ color: "#3b82f6" }} /> Roles
          </h2>

          {loading ? (
            <div style={{ textAlign: "center", padding: 40 }}>Loading...</div>
          ) : (
            <div className="prod-table-container" style={{ overflowX: "auto" }}>
              <table className="entity-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>#</th>
                    <th>Role Name</th>
                    <th style={{ textAlign: "center" }}>Permissions</th>
                    <th style={{ textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role, index) => {
                    const editable = canEditRole(role);
                    return (
                      <tr key={role.id}>
                        <td>{index + 1}</td>
                        <td style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                          {role.name}
                          {role.is_system && (
                            <span title="System role" style={{ color: "#94a3b8", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <FaLock size={11} /> system
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>{role.permissions?.length || 0}</td>
                        <td>
                          <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
                            <button
                              className="edit-btn-action"
                              onClick={() => editable && navigate(`/roles/${role.id}`)}
                              title={editable ? "Edit" : "You cannot edit this role"}
                              disabled={!editable}
                              style={!editable ? { opacity: 0.4, cursor: "not-allowed" } : {}}
                            >
                              <FaEdit />
                            </button>
                            <button
                              className="delete-btn"
                              onClick={() => handleDelete(role)}
                              title={role.is_system ? "System roles cannot be deleted" : "Delete"}
                              disabled={role.is_system}
                              style={role.is_system ? { opacity: 0.4, cursor: "not-allowed" } : {}}
                            >
                              <FaTrashAlt />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {roles.length === 0 && (
                    <tr><td colSpan="4" style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>No roles found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default RoleList;
