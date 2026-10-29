import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaEdit, FaTrashAlt, FaFolderOpen } from "react-icons/fa";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import api from "../../api"; 
import "../css/Accounts/CategoryList.css"; // CSS Link

const AccountCategoryList = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onUpdate, setOnUpdate] = useState(null);
  const [formData, setFormData] = useState({
    category_name: "",
    category_code: "",
  });

  const navigate = useNavigate();
  const userId = localStorage.getItem("user_id");

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get("/account-categories");
      setCategories(res.data);
    } catch (err) {
      console.error("Error fetching categories:", err);
      toast.error("Failed to load categories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleEdit = (cat) => {
    setOnUpdate(cat);
    setFormData({
      category_name: cat.category_name,
      category_code: cat.category_code,
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/account-categories/${onUpdate.id}`, {
        category_name: formData.category_name,
        updated_by: userId
      });
      toast.success("Category updated successfully!");
      setOnUpdate(null);
      fetchCategories();
    } catch (err) {
      toast.error("Failed to update category.");
    }
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This will remove the category from your chart of accounts!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/account-categories/${id}`);
          fetchCategories();
          Swal.fire("Deleted!", "Category removed.", "success");
        } catch (err) {
          Swal.fire("Error!", "Could not delete category.", "error");
        }
      }
    });
  };

  return (
    <div className="page-wrapper">
      <NavigationBar />

      <div className="acc-category-wrapper">
        <div className="acc-category-container">
          <div className="category-card erp-page-card">
            <div className="erp-page-header">
              <div className="erp-page-header-left">
                <button type="button" className="back-btn erp-back-btn" onClick={() => navigate("/accounts-setting")}>
                  <FaArrowLeft />
                </button>
                <h2 className="erp-page-title">
                  <FaFolderOpen style={{ color: '#475569' }} /> Account Categories
                </h2>
              </div>
              <button type="button" className="add-sale-btn" onClick={() => navigate("/create-category")}>
                <FaPlus /> Add Category
              </button>
            </div>

            {/* Edit Modal */}
            {onUpdate && (
              <div className="edit-modal-overlay">
                <div className="edit-modal-content">
                  <h3 style={{ marginTop: 0 }}>Edit Category</h3>
                  <form onSubmit={handleUpdate} className="modal-form">
                    <div>
                      <label style={{ fontSize: '0.85rem', color: '#64748b' }}>Category Name</label>
                      <input
                        className="input"
                        name="category_name"
                        value={formData.category_name}
                        onChange={handleChange}
                        placeholder="Enter Name"
                        required
                        autoFocus
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.85rem', color: '#64748b' }}>Category Code (Fixed)</label>
                      <input
                        className="input read-only-input"
                        name="category_code"
                        value={formData.category_code}
                        readOnly
                      />
                    </div>

                    <div className="action-btns-gap" style={{ marginTop: '10px' }}>
                      <button type="submit" className="primary-btn" style={{ flex: 1 }}>Update</button>
                      <button type="button" className="primary-btn" onClick={() => setOnUpdate(null)} style={{ flex: 1, backgroundColor: '#64748b' }}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Table */}
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px" }}><div className="loader"></div></div>
            ) : (
              <div className="erp-table-scroll prod-table-container">
                <table className="entity-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>#</th>
                      <th>Code</th>
                      <th>Category Name</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat, index) => (
                      <tr key={cat.id}>
                        <td data-label="#">{index + 1}</td>
                        <td data-label="Code" style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#0f172a' }}>{cat.category_code}</td>
                        <td data-label="Category Name" style={{ fontWeight: '500' }}>{cat.category_name}</td>
                        <td data-label="Actions">
                          <div className="action-btns-gap" style={{ justifyContent: 'center' }}>
                            <button className="edit-btn-action" onClick={() => handleEdit(cat)} title="Edit">
                              <FaEdit />
                            </button>
                            <button className="delete-btn" onClick={() => handleDelete(cat.id)} title="Delete">
                              <FaTrashAlt />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {categories.length === 0 && (
                      <tr><td colSpan="4" style={{ textAlign: "center", padding: '30px', color: '#94a3b8' }}>No categories found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AccountCategoryList;