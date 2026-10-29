import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaEdit, FaTrashAlt, FaBuilding } from "react-icons/fa";
import NavigationBar from "../../Components/NavigationBar";
import Footer from "../../Components/Footer";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import api from "../../../api";

const CompanyList = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await api.get("/companies/admin");
      setCompanies(res.data || []);
    } catch (err) {
      console.error("Error fetching companies:", err);
      toast.error(err.response?.data?.message || "Failed to load companies.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleDelete = (company) => {
    Swal.fire({
      title: "Delete company?",
      text: `"${company.name}" will be removed (only if it has no business data beyond roles/users).`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (!result.isConfirmed) return;
      try {
        await api.delete(`/companies/${company.id}`);
        fetchCompanies();
        Swal.fire("Deleted!", "Company removed.", "success");
      } catch (err) {
        const msg =
          err.response?.data?.message ||
          "Could not delete company.";
        const blocking = err.response?.data?.blocking;
        const detail =
          Array.isArray(blocking) && blocking.length
            ? `\n\nRelated data:\n${blocking.map((b) => `• ${b.table}: ${b.count}`).join("\n")}`
            : "";
        Swal.fire("Cannot delete", msg + detail, "error");
      }
    });
  };

  return (
    <div className="page-wrapper">
      <NavigationBar />
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "30px 0 25px 0" }}>
          <button className="back-btn" onClick={() => navigate("/dashboard")}>
            <FaArrowLeft />
          </button>
          <button
            className="primary-btn"
            style={{ display: "flex", alignItems: "center", gap: 8 }}
            onClick={() => navigate("/companies-admin/new")}
          >
            <FaPlus /> Add Company
          </button>
        </div>

        <div className="category-card" style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <h2 style={{ margin: "0 0 20px 0", fontSize: "1.4rem", color: "#1e293b", display: "flex", alignItems: "center", gap: 10 }}>
            <FaBuilding style={{ color: "#3b82f6" }} /> Companies
          </h2>

          {loading ? (
            <div style={{ textAlign: "center", padding: 40 }}>Loading...</div>
          ) : (
            <div className="prod-table-container" style={{ overflowX: "auto" }}>
              <table className="entity-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>ID</th>
                    <th>Company Name</th>
                    <th style={{ textAlign: "center" }}>Roles</th>
                    <th style={{ textAlign: "center" }}>Users</th>
                    <th style={{ textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr key={c.id}>
                      <td>{c.id}</td>
                      <td style={{ fontWeight: 500 }}>{c.name}</td>
                      <td style={{ textAlign: "center" }}>{c.role_count ?? 0}</td>
                      <td style={{ textAlign: "center" }}>{c.user_count ?? 0}</td>
                      <td>
                        <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
                          <button
                            className="edit-btn-action"
                            onClick={() => navigate(`/companies-admin/${c.id}`)}
                            title="Edit name"
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(c)}
                            title="Delete"
                          >
                            <FaTrashAlt />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {companies.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>
                        No companies found.
                      </td>
                    </tr>
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

export default CompanyList;
