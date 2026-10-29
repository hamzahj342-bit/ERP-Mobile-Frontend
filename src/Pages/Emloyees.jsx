import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaEdit, FaTrash, FaSearch } from "react-icons/fa"; 
import Swal from 'sweetalert2';
import '../CustomersAndSuppliers.css';
import NavigationBar from '../Components/NavigationBar';
import Footer from "../Components/Footer";
import Pagination from "../Components/Pagination";
import api from "../../api"; 

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [onEdit, setOnEdit] = useState(null);
  const [formData, setFormData] = useState({ name: "", address: "", contact: "", salary: "" });
  const [searchTerm, setSearchTerm] = useState(""); 
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const navigate = useNavigate();

  // 1. Fetch Employees API (Pagination + Search + Type)
  const fetchEmployees = useCallback(async (page = 1, search = "") => {
    try {
      const res = await api.get(`/entities`, {
        params: {
          page: page,
          search: search,
          type: 'employee' // 👈 Strictly fetching employees
        }
      });
      
      if (res.data && res.data.entities) {
        setEmployees(res.data.entities);
        setTotalPages(res.data.totalPages || 1);
        setCurrentPage(res.data.currentPage || 1);
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  }, []);

  // 2. Debounce Effect for Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchEmployees(1, searchTerm); 
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, fetchEmployees]);

  // 3. Update Handler
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/entities/${onEdit.id}`, { 
        ...formData, 
        type: "employee" 
      });

      Swal.fire({
        icon: 'success',
        title: 'Updated!',
        text: `Employee ${formData.name} has been updated.`,
        showConfirmButton: false,
        timer: 1500
      });
      setOnEdit(null);
      fetchEmployees(currentPage, searchTerm);
    } catch (err) {
      Swal.fire('Error!', 'Failed to update employee.', 'error');
    }
  };

  // 4. Delete Handler
  const handleDelete = (id, name) => {
    Swal.fire({
        title: `Are you sure?`,
        text: `Do you want to delete employee: ${name}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await api.delete(`/entities/${id}`);
                Swal.fire('Deleted!', 'Employee has been deleted.', 'success');
                fetchEmployees(currentPage, searchTerm);
            } catch (err) {
                Swal.fire('Error!', 'Failed to delete employee.', 'error');
            }
        }
    });
  };

  const handleEditClick = (employee) => {
    setOnEdit(employee);
    setFormData({
      name: employee.name,
      address: employee.address,
      contact: employee.contact || "",
      salary: employee.salary || "",
    });
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePageChange = (pageNum) => {
    setCurrentPage(pageNum);
    fetchEmployees(pageNum, searchTerm);
    window.scrollTo(0, 0);
  };

  return (
    <>
      <NavigationBar />
      <div className="erp-entity-page table-container">
        <div className="erp-page-card table-wrapper">
          <div className="erp-page-header header-flex">
            <div className="erp-page-header-left">
              <button className="back-btn erp-back-btn" type="button" onClick={() => navigate('/dashboard')}>
                <FaArrowLeft />
              </button>
              <h2 className="erp-page-title">Employees List</h2>
            </div>
            <button className="add-cust-sup erp-btn-primary" type="button" onClick={() => navigate("/add-employees")}>
              <FaPlus /> Add Employee
            </button>
          </div>

          <div className="erp-search-bar search-container">
            <FaSearch className="erp-search-icon" />
            <input 
              type="text" 
              className="input erp-search-input" 
              placeholder="Search employee by name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {onEdit && (
            <div className="erp-modal-overlay modal-overlay">
              <div className="erp-modal-content modal-content">
                <h3>Edit Employee</h3>
                <form onSubmit={handleUpdate}>
                  <input className="input" name="name" value={formData.name} onChange={handleChange} placeholder="Name" required />
                  <input className="input" name="address" value={formData.address} onChange={handleChange} placeholder="Address" required />
                  <input className="input" name="contact" value={formData.contact} onChange={handleChange} placeholder="Contact" />
                  <input className="input" type="number" name="salary" value={formData.salary} onChange={handleChange} placeholder="Salary" />
                  
                  <div className="erp-modal-actions">
                    <button type="submit" className="add-cust-sup">Update</button>
                    <button type="button" className="delete-btn" onClick={() => setOnEdit(null)}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="erp-table-scroll">
          <table className="entity-table">
            <thead>
              <tr>
                <th>Id</th>
                <th>Name</th>
                <th>Address</th>
                <th>Contact</th>
                <th>Salary</th>
                <th style={{textAlign: 'right'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.length > 0 ? (
                employees.map((emp) => (
                  <tr key={emp.id}>
                    <td data-label="Id">{emp.id}</td>
                    <td data-label="Name" style={{fontWeight: '600'}}>{emp.name}</td>
                    <td data-label="Address">{emp.address}</td>
                    <td data-label="Contact">{emp.contact || "N/A"}</td>
                    <td data-label="Salary">{emp.salary ? `${emp.salary}` : "N/A"}</td>
                    <td data-label="Actions" className="erp-actions-cell">
                      <div className="erp-actions-group">
                        <button type="button" className="edit-btn-action" onClick={() => handleEditClick(emp)}><FaEdit /> Edit</button>
                        <button type="button" className="delete-btn" onClick={() => handleDelete(emp.id, emp.name)}><FaTrash /> Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="erp-empty-cell">No employees found.</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>

          {totalPages > 1 && (
            <div className="erp-pagination-wrap">
              <Pagination page={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Employees;