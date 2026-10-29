import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaPlus } from "react-icons/fa";
import "../EntityForm.css";
import "../save-btn.css";
import { toast } from "react-toastify";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import api from "../../api";

const AccountForm = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    account_name: "",
    category_id: "",
    account_code: "",
    type: "General",
  });

  const [categories, setCategories] = useState([]);

  const fetchCategories = async () => {
    try {
      const res = await api.get("/account-categories");
      setCategories(res.data);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchNextCode = async (category_id) => {
    if (!category_id) return;
    try {
      const res = await api.get("/accounts/next-code", {
        params: { category_id },
      });
      setFormData((prev) => ({ ...prev, account_code: res.data.next_code }));
    } catch (err) {
      console.error("Error fetching next account code:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "category_id") {
      setFormData((prev) => ({ ...prev, category_id: value, account_code: "" }));
      fetchNextCode(value);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const userId = localStorage.getItem("user_id");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.account_name || !formData.category_id || !formData.type) {
      toast.error("Please fill all required fields!");
      return;
    }

    try {
      await api.post("/accounts", {
        account_name: formData.account_name,
        category_id: formData.category_id,
        type: formData.type,
        created_by: userId,
      });

      toast.success("Account created successfully!");
      setFormData({ account_name: "", category_id: "", account_code: "", type: "General" });
      navigate("/accounts");
    } catch (err) {
      console.error("Submit Error:", err);
      const errorMsg = err.response?.data?.message || "Error creating account.";
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
          onClick={() => navigate("/accounts")}
        >
          <FaArrowLeft />
        </button>

        <div className="entity-card">
          <h2>Create Account</h2>
          <form className="form erp-form" onSubmit={handleSubmit}>
            <div className="erp-form-grid">
              <div className="erp-form-field erp-form-field--full">
                <label htmlFor="account_name">Account Name</label>
                <input
                  id="account_name"
                  type="text"
                  name="account_name"
                  placeholder="Account Name"
                  value={formData.account_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="erp-form-field erp-form-field--full">
                <label htmlFor="category_id">Category</label>
                <div className="shop-row row">
                  <select
                    id="category_id"
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.category_name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="erp-inline-add-btn"
                    onClick={() => navigate("/create-category")}
                    title="Add Category"
                  >
                    <FaPlus />
                  </button>
                </div>
              </div>

              <div className="erp-form-field erp-form-field--full">
                <label htmlFor="type">Account Type</label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  required
                >
                  <option value="General">General</option>
                  <option value="General">Journal</option>
                  <option value="Payable">Payable</option>
                  <option value="Receivable">Receivable</option>
                  <option value="Bank">Bank</option>
                  <option value="Cash">Cash</option>
                  <option value="Expense">Expense</option>
                  <option value="Income">Income</option>
                </select>
              </div>

              <div className="erp-form-field erp-form-field--full">
                <label htmlFor="account_code">Account Code</label>
                <input
                  id="account_code"
                  type="text"
                  name="account_code"
                  placeholder="Account Code"
                  value={formData.account_code}
                  readOnly
                />
              </div>
            </div>

            <div className="erp-form-actions">
              <button type="submit" className="save-btn">
                Save Account
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default AccountForm;
