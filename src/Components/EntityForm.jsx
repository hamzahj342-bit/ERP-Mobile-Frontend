import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from 'react-icons/fa';
import "../EntityForm.css";
import { toast } from "react-toastify";

const EntityForm = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    contact: "",
    type: "customer", // default
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:5000/api/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success("Entity added successfully!");
        setFormData({ name: "", address: "", contact: "", type: "customer" });
      } else {
        toast.error("Error adding entity.");
      }
    } catch (err) {
      console.error("Submit Error:", err);
      toast.error("Server error occurred.");
    }
  };

  return (
    <div className="page-container">
      <button className="back-btn" onClick={() => navigate("/dashboard")}>
        <FaArrowLeft/>
        Back to Dashboard
      </button>

      <div className="entity-card">
        <h2>Add Supplier / Customer</h2>
        <form className="form" onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            required
          />

          <input
            type="text"
            name="address"
            placeholder="Address"
            value={formData.address}
            onChange={handleChange}
            required
          />

          <input
            type="text"
            name="contact"
            placeholder="Contact (Optional)"
            value={formData.phone}
            onChange={handleChange}
          />

          <select name="type" value={formData.type} onChange={handleChange} required>
            <option value="customer">Customer</option>
            <option value="supplier">Supplier</option>
          </select>

          <button type="submit" className="primary-btn">Add Entry</button>
        </form>
      </div>
    </div>
  );
};

export default EntityForm;
