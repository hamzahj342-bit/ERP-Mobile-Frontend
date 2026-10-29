// src/pages/EmployeeForm.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from 'react-icons/fa';
import "../EntityForm.css";
import { toast } from "react-toastify";
import NavigationBar from "./NavigationBar";
import Footer from "./Footer";
import api from "../../api";

const EmployeesForm = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    contact: "",
    salary: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));

  const handleSubmit = async (e) => {
    e.preventDefault();

     if (!user || !user.company_id) {
          toast.error("User session expired or Company not selected. Please login again.");
          return;
        }

    const payload = {
      ...formData,
      company_id: user.company_id,
      created_by: user ? user.id : null,
      type: "employee"   // 👈 Employee type
    };

    try {
      const res = await api.post("/entities", payload, {
        headers: {
          Authorization: `Bearer ${token}`, // Token header mein bhej rahe hain
        }
      });

      toast.success("Employee added successfully!");
      navigate("/employees");
      setFormData({ name: "", address: "", contact: "", salary: "" });

    } catch (err) {
      console.error("Submit Error:", err);
      const errorMsg = err.response?.data?.message || "Error adding employee.";
      toast.error(errorMsg);
    }
  };

  return (
    <>
      <NavigationBar />
      <div className="page-container">

        <button
          className="back-btn"
          type="button"
          onClick={() => navigate("/employees")}
        >
          <FaArrowLeft />
        </button>

        <div className="entity-card">
          <h2>Add Employee</h2>

          <form className="form erp-form" onSubmit={handleSubmit}>
            <div className="erp-form-grid">
              <div className="erp-form-field">
                <label htmlFor="employee-name">Full Name</label>
                <input
                  id="employee-name"
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="erp-form-field">
                <label htmlFor="employee-address">Address</label>
                <input
                  id="employee-address"
                  type="text"
                  name="address"
                  placeholder="Address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="erp-form-field">
                <label htmlFor="employee-contact">Contact (Optional)</label>
                <input
                  id="employee-contact"
                  type="text"
                  name="contact"
                  placeholder="Contact (Optional)"
                  value={formData.contact}
                  onChange={handleChange}
                />
              </div>

              <div className="erp-form-field">
                <label htmlFor="employee-salary">Monthly Salary (Optional)</label>
                <input
                  id="employee-salary"
                  type="number"
                  name="salary"
                  placeholder="Monthly Salary (Optional)"
                  value={formData.salary}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="erp-form-actions">
              <button
                type="submit"
                className="save-btn"
              >
                Add Employee
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default EmployeesForm;
