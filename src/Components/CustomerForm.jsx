// src/pages/CustomerForm.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from 'react-icons/fa';
import Select from 'react-select';
import "../EntityForm.css";
import { toast } from "react-toastify";
import NavigationBar from "./NavigationBar";
import Footer from "./Footer";
import api from "../../api";

const CustomerForm = () => {
  const navigate = useNavigate();

  const [entities, setEntities] = useState([]);
  const [isSupplierLinked, setIsSupplierLinked] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    contact: ""
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

  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const res = await api.get('/entities/transactions');
        setEntities(res.data || []);
      } catch (err) {
        console.error('Error fetching entities:', err);
      }
    };

    fetchEntities();
  }, []);

  const supplierOptions = entities
    .filter((entity) => entity?.type === 'supplier')
    .map((supplier) => ({ value: supplier.id, label: supplier.name }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user || !user.company_id) {
      toast.error("User session expired or Company not selected. Please login again.");
      return;
    }

    if (isSupplierLinked && !selectedSupplier) {
      toast.error("Please select an active supplier to link this customer.");
      return;
    }

    const payload = {
      ...formData,
      company_id: user.company_id,
      created_by: user ? user.id : null,
      type: "customer",
      is_supplier_linked: isSupplierLinked,
      entity_relation_id: isSupplierLinked ? selectedSupplier.value : null
    };

    try {
      const res = await api.post("/entities", payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      toast.success("Customer added successfully!");
      setFormData({ name: "", address: "", contact: "" });
      setIsSupplierLinked(false);
      setSelectedSupplier(null);
      navigate("/customers");
      
    } catch (err) {
      console.error("Submit Error:", err);
      const errorMsg = err.response?.data?.message || "Error adding customer.";
      toast.error(errorMsg);
    }
  };
  return (
    <>
    <NavigationBar />
    <div className="page-container">
      <button className="back-btn" type="button" onClick={() => navigate("/customers")}>
        <FaArrowLeft />
      </button>

      <div className="entity-card">
        <h2>Add Customer</h2>
        <form className="form erp-form" onSubmit={handleSubmit}>
          <div className="erp-form-grid">
            <div className="erp-form-field">
              <label htmlFor="customer-name">Full Name</label>
              <input
                id="customer-name"
                type="text"
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="erp-form-field">
              <label htmlFor="customer-address">Address</label>
              <input
                id="customer-address"
                type="text"
                name="address"
                placeholder="Address"
                value={formData.address}
                onChange={handleChange}
                required
              />
            </div>

            <div className="erp-form-field">
              <label htmlFor="customer-contact">Contact (Optional)</label>
              <input
                id="customer-contact"
                type="text"
                name="contact"
                placeholder="Contact (Optional)"
                value={formData.contact}
                onChange={handleChange}
              />
            </div>

            <div className="linkage-card erp-form-field--full">
              <label className="linkage-label">
                <input
                  type="checkbox"
                  checked={isSupplierLinked}
                  onChange={(e) => {
                    setIsSupplierLinked(e.target.checked);
                    if (!e.target.checked) setSelectedSupplier(null);
                  }}
                />
                <span>Is this customer also an active Supplier?</span>
              </label>

              {isSupplierLinked && (
                <Select
                  options={supplierOptions}
                  value={selectedSupplier}
                  onChange={setSelectedSupplier}
                  placeholder="Search & select Supplier..."
                  isClearable
                  isSearchable
                  className="linkage-select"
                />
              )}
            </div>
          </div>

          <div className="erp-form-actions">
            <button type="submit" className="save-btn">Save Customer</button>
          </div>
        </form>
      </div>
    </div>
    <Footer />
    </>
  );
};

export default CustomerForm;