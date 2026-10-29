import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaEdit, FaTrash, FaSearch, FaFileInvoice } from "react-icons/fa"; 
import Swal from 'sweetalert2';
import '../CustomersAndSuppliers.css';
import NavigationBar from '../Components/NavigationBar';
import Footer from "../Components/Footer";
import Pagination from "../Components/Pagination";
import api from "../../api"; 

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [onEdit, setOnEdit] = useState(null);
  const [formData, setFormData] = useState({ name: "", address: "", contact: "" });
  const [searchTerm, setSearchTerm] = useState(""); 
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const navigate = useNavigate();

  // 1. Fetch Customers
  const fetchCustomers = useCallback(async (page = 1, search = "") => {
    try {
      const res = await api.get(`/entities`, {
        params: { page, search, type: 'customer' }
      });
      if (res.data && res.data.entities) {
        setCustomers(res.data.entities);
        setTotalPages(res.data.totalPages || 1);
        setCurrentPage(res.data.currentPage || 1);
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
    }
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCustomers(1, searchTerm); 
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, fetchCustomers]);

  // CRUD Logic (handleUpdate, handleDelete same rahega)
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/entities/${onEdit.id}`, { ...formData, type: "customer" });
      Swal.fire({ icon: 'success', title: 'Updated!', showConfirmButton: false, timer: 1500 });
      setOnEdit(null);
      fetchCustomers(currentPage, searchTerm);
    } catch (err) { Swal.fire('Error!', 'Update failed.', 'error'); }
  };

  const handleDelete = (id, name) => {
    Swal.fire({
        title: `Are you sure?`,
        text: `Delete customer: ${name}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await api.delete(`/entities/${id}`);
                Swal.fire('Deleted!', 'Customer deleted.', 'success');
                fetchCustomers(currentPage, searchTerm);
            } catch (err) { Swal.fire('Error!', 'Deletion failed.', 'error'); }
        }
    });
  };

  return (
    <>
      <NavigationBar />
      <div className="erp-entity-page table-container">
        <div className="erp-page-card table-wrapper">
          <div className="erp-page-header header-flex">
            <div className="erp-page-header-left">
              <button className="back-btn erp-back-btn" type="button" onClick={() => navigate('/dashboard')}><FaArrowLeft /></button>
              <h2 className="erp-page-title">Customers Management</h2>
            </div>
            <button className="add-cust-sup erp-btn-primary" type="button" onClick={() => navigate("/add-customers")}><FaPlus /> Add Customer</button>
          </div>

          <div className="erp-search-bar search-container">
            <FaSearch className="erp-search-icon" />
            <input
              type="text"
              className="input erp-search-input"
              placeholder="Search customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="erp-table-scroll">
          <table className="entity-table">
            <thead>
              <tr>
                <th>Id</th>
                <th>Customer Name</th>
                <th>Address</th>
                <th>Contact</th>
                <th style={{textAlign: 'right'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((cust) => (
                <tr key={cust.id}>
                  <td data-label="Id">{cust.id}</td>
                  <td data-label="Customer Name" style={{fontWeight: 'bold'}}>{cust.name}</td>
                  <td data-label="Address">{cust.address}</td>
                  <td data-label="Contact">{cust.contact || "N/A"}</td>
                  <td data-label="Actions" className="erp-actions-cell">
                    <div className="erp-actions-group">
                      <button
                        type="button"
                        className="primary-btn"
                        onClick={() => navigate(`/customer-invoices/${cust.id}`)}
                      >
                        <FaFileInvoice /> Invoices
                      </button>

                      <button type="button" className="edit-btn-action" onClick={() => {
                        setOnEdit(cust);
                        setFormData({ name: cust.name, address: cust.address, contact: cust.contact || "" });
                      }}>
                        <FaEdit /> Edit
                      </button>

                      <button type="button" className="delete-btn" onClick={() => handleDelete(cust.id, cust.name)}>
                        <FaTrash /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <div className="erp-pagination-wrap">
            <Pagination page={currentPage} totalPages={totalPages} onPageChange={(p) => fetchCustomers(p, searchTerm)} />
          </div>
        </div>
      </div>

      {onEdit && (
         <div className="erp-modal-overlay modal-overlay">
            <div className="erp-modal-content modal-content">
              <h3>Edit Customer</h3>
              <form onSubmit={handleUpdate}>
                <input className="input" type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Name" required />
                <input className="input" type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="Address" required />
                <input className="input" type="text" value={formData.contact} onChange={(e) => setFormData({...formData, contact: e.target.value})} placeholder="Contact" />
                <div className="erp-modal-actions">
                  <button type="submit" className="add-cust-sup">Update</button>
                  <button type="button" className="delete-btn" onClick={() => setOnEdit(null)}>Cancel</button>
                </div>
              </form>
            </div>
         </div>
      )}

      <Footer />
    </>
  );
};

export default Customers;