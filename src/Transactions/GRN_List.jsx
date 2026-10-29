import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaEye, FaPlus, FaFileInvoice, FaCalendarAlt, FaEdit, FaTrash, FaTruck } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../RMForm.css';
import Footer from '../Components/Footer';
import Pagination from '../Components/Pagination';
import api from "../../api"; 
import Swal from 'sweetalert2';

const GRN_Listing = () => {
  const [documents, setDocuments] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();

  const fetchGRNs = async () => {
    try {
      const res = await api.get("/loader-documents", {
        params: { type: "GRN", page: page, limit: 50 }
      });
      if (Array.isArray(res.data?.data)) {
        setDocuments(res.data.data);
        setTotalPages(res.data.totalPages);
      } else {
        setDocuments([]);
      }
    } catch (err) {
      console.error("Error fetching GRN documents:", err);
      setDocuments([]);
    }
  };

  useEffect(() => {
    fetchGRNs();
  }, [page]);

  // Handle Delete Document
  const handleDelete = async (id, no) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete GRN No: ${no}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/loader-documents/${id}`);
        Swal.fire('Deleted!', 'Document has been deleted.', 'success');
        fetchGRNs();
      } catch (err) {
        Swal.fire('Error!', err.response?.data?.message || 'Something went wrong.', 'error');
      }
    }
  };

  return (
    <>
      <NavigationBar />
      <div className="erp-entity-page rm-page">
        <div className="erp-page-card card">
          <div className="erp-page-header card-header header-flex">
            <div className="erp-page-header-left">
              <button className="back-btn erp-back-btn" type="button" onClick={() => navigate(-1)}>
                <FaArrowLeft />
              </button>
              <h2 className="erp-page-title">Goods Received Note (GRN)</h2>
            </div>
            <button className="add-sale-btn erp-btn-primary" type="button" onClick={() => navigate('/grn-form')}>
              <FaPlus /> ADD NEW GRN
            </button>
          </div>

          <div className="erp-table-scroll">
            <table className="product-table entity-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th><FaFileInvoice /> GRN NO</th>
                  <th><FaCalendarAlt /> DATE</th>
                  <th>SUPPLIER / ENTITY</th>
                  <th><FaTruck /> DRIVER NAME</th>
                  <th style={{ textAlign: 'center' }}>PURCHASE</th>
                  <th style={{ textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {documents.length > 0 ? (
                  documents.map((d) => (
                    <tr key={d.id}>
                      <td data-label="ID" style={{ color: '#94a3b8' }}>#{d.id}</td>
                      <td data-label="GRN NO" style={{ fontWeight: '700' }}>{d.no}</td>
                      <td data-label="DATE">{d.date ? new Date(d.date).toLocaleDateString() : "-"}</td>
                      <td data-label="SUPPLIER / ENTITY"><span className="supplier-tag">{d.entity?.name}</span></td>
                      <td data-label="DRIVER NAME"><span className="user-tag">{d.driver?.driver_name}</span></td>
                      <td data-label="PURCHASE" style={{ textAlign: 'center' }}>
                        <span className={`status-badge ${d.is_posted ? 'status-approved' : 'status-draft'}`}>
                          {d.is_posted ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td data-label="ACTION" className="erp-actions-cell">
                        <div className="erp-actions-group">
                          
                          {/* 🔓 VIEW is always allowed */}
                          <button type="button" onClick={() => navigate(`/grn-view/${d.no}`)} className="primary-btn">
                            <FaEye /> VIEW
                          </button>

                          {/* 🛑 EDIT & DELETE are bound to is_posted */}
                          {!d.is_posted && (
                            <>
                              <button type="button" onClick={() => navigate(`/grn-form?editId=${d.id}`)} className="edit-btn-action">
                                <FaEdit /> EDIT
                              </button>
                              <button type="button" onClick={() => handleDelete(d.id, d.no)} className="approve-btn-action" style={{ backgroundColor: '#d33' }}>
                                <FaTrash /> DELETE
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>No GRN Documents Found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="erp-pagination-wrap">
            <Pagination page={page} totalPages={totalPages} onPageChange={(newPage) => setPage(newPage)} />
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default GRN_Listing;