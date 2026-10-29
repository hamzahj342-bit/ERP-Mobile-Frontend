import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaEdit, FaUserShield } from "react-icons/fa";
import NavigationBar from "../../Components/NavigationBar";
import Footer from "../../Components/Footer";
import { toast } from "react-toastify";
import api from "../../../api";
import { hasPermission } from "../../permissions";

const getCurrentUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user?.id ?? null;
  } catch {
    return null;
  }
};

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const canCreateUsers = hasPermission("users.manage");
  const currentUserId = getCurrentUserId();

  const canEditUser = (u) => {
    // Super Admin can edit anyone (including self). Full Access cannot edit self.
    if (canCreateUsers) return true;
    return String(u.id) !== String(currentUserId);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/users");
      let list = res.data || [];
      // Full Access: hide Super Admin users (API also filters; this is UI safety)
      if (!canCreateUsers) {
        list = list.filter((u) => (u.role?.name || "").toLowerCase() !== "super admin");
      }
      setUsers(list);
    } catch (err) {
      console.error("Error fetching users:", err);
      toast.error(err.response?.data?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="page-wrapper" style={{ marginTop: '30px'}}>
      <NavigationBar />
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "30px 0 25px 0" }}>
          <button className="back-btn" onClick={() => navigate("/dashboard")}>
            <FaArrowLeft />
          </button>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="primary-btn" style={{ backgroundColor: "#64748b", display: "flex", alignItems: "center", gap: 8 }} onClick={() => navigate("/roles")}>
              <FaUserShield /> Manage Roles
            </button>
            {canCreateUsers && (
              <button className="primary-btn" style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={() => navigate("/user-management/new")}>
                <FaPlus /> Add User
              </button>
            )}
          </div>
        </div>

        <div className="category-card" style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <h2 style={{ margin: "0 0 20px 0", fontSize: "1.4rem", color: "#1e293b", display: "flex", alignItems: "center", gap: 10 }}>
            <FaUserShield style={{ color: "#3b82f6" }} /> Users
          </h2>

          {loading ? (
            <div style={{ textAlign: "center", padding: 40 }}>Loading...</div>
          ) : (
            <div className="prod-table-container" style={{ overflowX: "auto" }}>
              <table className="entity-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th style={{ textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, index) => (
                    <tr key={u.id}>
                      <td>{index + 1}</td>
                      <td style={{ fontWeight: 500 }}>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.role?.name || <span style={{ color: "#94a3b8" }}>No role</span>}</td>
                      <td>
                        <span style={{ textTransform: "capitalize", color: u.status === "approved" ? "#16a34a" : "#d97706" }}>
                          {u.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
                          {canEditUser(u) ? (
                            <button className="edit-btn-action" onClick={() => navigate(`/user-management/${u.id}`)} title="Edit">
                              <FaEdit />
                            </button>
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "#94a3b8" }} title="You cannot edit your own account">
                              —
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan="6" style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>No users found.</td></tr>
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

export default UserList;
