import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaEye, FaPlus, FaFileInvoice, FaUserAlt, FaCalendarAlt, FaEdit, FaCheckCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../RMForm.css';
import Footer from '../Components/Footer';
import Pagination from '../Components/Pagination'; 
import api from "../../api"; 
import InvoiceTypeModal from '../Components/InvoiceTypeModal';
import ApprovedInvoiceEditModal from '../Components/ApprovedInvoiceEditModal';
import Swal from 'sweetalert2'; // Confirmation alerts engine

const FP_SaleReturnList = () => {
  const [sales, setSales] = useState([]); 
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [approvedModalOpen, setApprovedModalOpen] = useState(false);
  const [approvedInvoiceId, setApprovedInvoiceId] = useState(null);

  const limit = 50;
  const navigate = useNavigate();

  // Fetch paginated data - Strictly using your exact API structure
  const fetchSaleReturns = async () => {
    setLoading(true);
    try {
      const res = await api.get("/fp-sale", {
        params: {
          type: "SaleReturn", // Exact structural filter match
          page: page,
          limit: limit
        }
      });
      
      const data = res.data;
      
      if (data && Array.isArray(data.data)) {
        setSales(data.data);
        setTotalPages(data.totalPages || 1);
      } 
      else if (data && Array.isArray(data.rows)) {
        setSales(data.rows);
        setTotalPages(Math.ceil((data.count || 1) / limit));
      }
      else {
        setSales([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Error fetching FG sales returns:", error);
      setSales([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaleReturns();
  }, [page]); 
  
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString();
  };

  // ---------------------------------------------------------
  // 1️⃣ Approve Handler: Using route pattern "/fp-sale/:id/approve"
  // ---------------------------------------------------------
  const handleApproveInvoice = async (masterId, invoiceNo) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to Approve Sale Return No: ${invoiceNo}? This action updates inventory back to stock and posts accounts entries!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2b6cb0',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Approve Return!',
      cancelButtonText: 'No, Cancel'
    });

    if (result.isConfirmed) {
      Swal.fire({
        title: 'Processing Return...',
        text: 'Reverting ledger matrices and calculating batches restock.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      try {
        // Target Dynamic Endpoint: /fp-sale/:id/approve
        const res = await api.put(`/fp-sale/${masterId}/approve`);
        
        if (res.status === 200 || res.status === 201) {
          Swal.fire({
            title: 'Return Approved!',
            text: `Invoice Return ${invoiceNo} has been successfully approved.`,
            icon: 'success',
            confirmButtonColor: '#2b6cb0'
          });
          fetchSaleReturns(); // Reload UI grid state
        }
      } catch (err) {
        console.error("Error approving return invoice:", err);
        Swal.fire({
          title: 'Error!',
          text: err.response?.data?.message || 'Something went wrong while approving the sale return.',
          icon: 'error',
          confirmButtonColor: '#2b6cb0'
        });
      }
    }
  };

  // ---------------------------------------------------------
  // 2️⃣ Edit Handler: Redirects to target form view via query param
  // ---------------------------------------------------------
  const handleEditInvoice = async (masterId) => {
    const result = await Swal.fire({
      title: 'Edit Draft Return?',
      text: 'Do you want to modify this sale return draft entry?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2b6cb0',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Yes, Edit',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      navigate(`/fp-salereturn-form?editId=${masterId}`);
    }
  };

  const handleViewDetails = (invoiceNo) => {
    navigate(`/fp-invoice-detail/${invoiceNo}`); 
  };

  return (
    <>
      <NavigationBar />
      <div className="erp-entity-page rm-page">
        <div className="erp-page-card card">
          <div className="erp-page-header card-header header-flex">
            <div className="erp-page-header-left">
              <button className="back-btn erp-back-btn" type="button" onClick={() => navigate('/fp-transactions')}>
                <FaArrowLeft />
              </button>
              <h2 className="erp-page-title">Finished Goods Sale Returns List</h2>
            </div>
            <button className="add-sale-btn erp-btn-primary" type="button" onClick={() => setIsInvoiceModalOpen(true)}>
              <FaPlus /> ADD NEW FG RETURN
            </button>
          </div>
          
          <div className="erp-table-scroll">
            {loading ? (
              <div className="loading-state">Loading Finished Goods Sale Returns...</div>
            ) : sales.length === 0 ? (
              <div className="no-data" style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
                No Finished Goods Sale Returns transactions found.
              </div>
            ) : (
              <table className="product-table entity-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th><FaFileInvoice /> INVOICE NO</th>
                    <th>CREATED AT</th>
                    <th><FaCalendarAlt /> DATE</th>
                    <th>CUSTOMER</th>
                    <th>GRAND TOTAL</th>
                    <th>INVOICE STATUS</th>
                    <th><FaUserAlt /> CREATED BY</th>
                    <th style={{ textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id}>
                      <td data-label="ID" className="id-cell" style={{ color: '#94a3b8' }}>#{sale.id}</td> 
                      <td data-label="INVOICE NO" className="invoice-cell" style={{ fontWeight: '700' }}>{sale.invoice_no}</td>
                      <td data-label="CREATED AT">{formatDate(sale.createdat)}</td> 
                      <td data-label="DATE">{formatDate(sale.date)}</td>
                      <td data-label="CUSTOMER"><span className="supplier-tag">{sale.customer?.name || sale.entity_name || "N/A"}</span></td>
                      <td data-label="GRAND TOTAL" className="total-cell" style={{ fontWeight: '700', color: '#2b6cb0' }}>
                        {parseFloat(sale.grand_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td data-label="INVOICE STATUS">
                        {/* Status Badge Mapping */}
                        <span className={`status-badge ${
  sale.status === 'Approved' 
    ? 'status-approved' 
    : (sale.status === 'Draft' || !sale.status) 
      ? 'status-draft' // Red color wali class yahan lagegi
      : 'status-draft'
}`}>
  {sale.status === 'Draft' || !sale.status ? 'Unapproved' : sale.status}
</span>
                      </td>
                      <td data-label="CREATED BY"><span className="user-tag">{sale.createdby || "—"}</span></td>
                      <td data-label="ACTION" className="erp-actions-cell">
                        <div className="erp-actions-group">
                          
                          <button 
                            type="button"
                            onClick={() => handleViewDetails(sale.invoice_no)} 
                            className="primary-btn"
                          >
                            <FaEye /> VIEW
                          </button>

                          {/* 🛑 CONDITIONAL RENDERING STATE SYSTEM */}
                          {sale.status === 'Approved' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setApprovedInvoiceId(sale.id);
                                  setApprovedModalOpen(true);
                                }}
                                className="edit-btn-action"
                              >
                                <FaEdit /> EDIT
                              </button>
                              <span className="approved-text-btn">
                                <FaCheckCircle /> APPROVED
                              </span>
                            </>
                          ) : (
                            <>
                              <button 
                                type="button"
                                onClick={() => handleEditInvoice(sale.id)} 
                                className="edit-btn-action"
                              >
                                <FaEdit /> EDIT
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleApproveInvoice(sale.id, sale.invoice_no)} 
                                className="approve-btn-action"
                              >
                                <FaCheckCircle /> APPROVE
                              </button>
                            </>
                          )}

                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
            
          <div className="erp-pagination-wrap">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(newPage) => setPage(newPage)}
            />
          </div>
        </div>

        <InvoiceTypeModal
          open={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          onSelect={(type) => {
            setIsInvoiceModalOpen(false);
            navigate(`/fp-salereturn-form?invoiceType=${type}`);
          }}
          title="FG Sale Return Invoice Type"
        />

        <ApprovedInvoiceEditModal
          open={approvedModalOpen}
          onClose={() => {
            setApprovedModalOpen(false);
            setApprovedInvoiceId(null);
          }}
          invoiceId={approvedInvoiceId}
          invoiceCategory="fp"
          onSaved={fetchSaleReturns}
        />
      </div>
      <Footer />
    </>
  );
};

export default FP_SaleReturnList;