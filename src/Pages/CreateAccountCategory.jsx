import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import "../EntityForm.css";
import "../save-btn.css";
import { toast } from "react-toastify";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import api from "../../api";

const CreateAccountCategory = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    category_name: "",
    category_code: "",
  });

  const fetchNextCategoryCode = async () => {
    try {
      const res = await api.get("/account-categories/next-code");
      setFormData((prev) => ({ ...prev, category_code: res.data.next_code }));
    } catch (err) {
      console.error("Error fetching next category code:", err);
    }
  };

  useEffect(() => {
    fetchNextCategoryCode();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const userId = localStorage.getItem("user_id");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.category_name) {
      toast.error("Please enter a category name!");
      return;
    }

    try {
      await api.post("/account-categories", {
        category_name: formData.category_name,
        category_code: formData.category_code,
        created_by: userId,
      });

      toast.success("Category created successfully!");
      setFormData({ category_name: "", category_code: "" });
      fetchNextCategoryCode();
      navigate("/account-categories");
    } catch (err) {
      console.error("Submit Error:", err);
      const errorMsg = err.response?.data?.message || "Error creating category.";
      toast.error(errorMsg);
    }
  };

  return (
    <>
      <NavigationBar />
      <div className="page-container">
        <button
          type="button"
          className="back-btn erp-back-btn"
          onClick={() => navigate("/account-categories")}
        >
          <FaArrowLeft />
        </button>

        <div className="entity-card">
          <h2>Create Account Category</h2>
          <form className="form erp-form" onSubmit={handleSubmit}>
            <div className="erp-form-grid">
              <div className="erp-form-field erp-form-field--full">
                <label htmlFor="category_name">Category Name</label>
                <input
                  id="category_name"
                  type="text"
                  name="category_name"
                  placeholder="Category Name"
                  value={formData.category_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="erp-form-field erp-form-field--full">
                <label htmlFor="category_code">Category Code</label>
                <input
                  id="category_code"
                  type="text"
                  name="category_code"
                  placeholder="Category Code"
                  value={formData.category_code}
                  readOnly
                />
              </div>
            </div>

            <div className="erp-form-actions">
              <button type="submit" className="save-btn">
                Save Category
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default CreateAccountCategory;
