// src/pages/ShopsForm.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import "../EntityForm.css";
import { toast } from "react-toastify";
import NavigationBar from "./NavigationBar";
import Footer from "./Footer";
import api from "../../api";

const ShopForm = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
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
      const payload = {
        ...formData,
        // 👇 backend handles created_by via token
      };

      // fetch (POST) ki jagah api.post
      const res = await api.post("/shops", payload);

      // Axios mein success response 2xx range mein hota hai
      toast.success("Shop added successfully!");
      setFormData({ name: "" });
      navigate("/shops");

    } catch (err) {
      console.error("Submit Error:", err);
      
      // Backend error message handle karein
      const errorMsg = err.response?.data?.message || "Error adding shop.";
      toast.error(errorMsg);
    }
  };
  return (
    <>
      <NavigationBar />
      <div className="page-container">
        <button
          className="back-btn"
          style={{ marginTop: "30px" }}
          onClick={() => navigate("/shops")}
        >
          <FaArrowLeft />
        </button>

        <div className="entity-card">
          <h2>Add Shop</h2>
          <form className="form" onSubmit={handleSubmit}>
            <input
              type="text"
              name="name"
              placeholder="Shop Name"
              value={formData.name}
              onChange={handleChange}
              required
            />

            <button type="submit" className="primary-btn">
              Add Shop
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ShopForm;
