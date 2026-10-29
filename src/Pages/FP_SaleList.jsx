import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaEye, FaPlus, FaFileInvoice, FaUserAlt, FaCalendarAlt, FaEdit, FaCheckCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../RMForm.css';
import Footer from '../Components/Footer';
import Pagination from '../Components/Pagination';
import api from '../../api';
import ApprovedInvoiceEditModal from '../Components/ApprovedInvoiceEditModal';
import InvoiceTypeModal from '../Components/InvoiceTypeModal';
import Swal from 'sweetalert2';

const FP_SaleList = () => {
  const [sales, setSales] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [approvedModalOpen, setApprovedModalOpen] = useState(false);
  const [approvedInvoiceId, setApprovedInvoiceId] = useState(null);

  const limit = 50;
  const navigate = useNavigate();

  // Fetch paginated sales list
  const fetchSales = async () => {
    setLoading(true);
    try {
      const res = await api.get("/fp-sale", {
        params: {
          type: "Sale",
          page: page,
          limit: limit
        }
      });

      const data = res.data;
      if (data && data.data) {
        setSales(data.data);
        setTotalPages(data.totalPages || 1);
      } else {
        setSales([]);
      }
    } catch (error) {
      console.error("Error fetching FG sales:", error);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [page]);

  // ---------------------------------------------------------
  // 1️⃣ Update Payment Status Handler: Calls route PATCH /fp-sale/:id/payment-status
  // ---------------------------------------------------------
  const handlePaymentStatusChange = async (masterId, currentStatus) => {
    const { value: newStatus } = await Swal.fire({
      title: 'Update Payment Status',
      input: 'select',
      inputOptions: {
        Unpaid: 'Unpaid',
        Partial: 'Partial',
        Paid: 'Paid'
      },
      inputValue: currentStatus || 'Unpaid',
      showCancelButton: true,
      confirmButtonText: 'Update Status',
      confirmButtonColor: '#2b6cb0',
      cancelButtonText: 'Cancel'
    });

    if (newStatus && newStatus !== currentStatus) {
      try {
        Swal.showLoading();
        const res = await api.patch(`/fp-sale/${masterId}/payment-status`, {
          payment_status: newStatus
        });

        if (res.status === 200 || res.status === 201) {
          Swal.fire({
            title: 'Updated!',
            text: `Payment status has been updated to "${newStatus}".`,
            icon: 'success',
            timer: 1800,
            showConfirmButton: false
          });
          fetchSales(); // Matrix Table Refresh
        }
      } catch (err) {
        console.error("Error updating payment status:", err);
        Swal.fire({
          title: 'Error!',
          text: err.response?.data?.message || 'Failed to update payment status.',
          icon: 'error',
          confirmButtonColor: '#2b6cb0'
        });
      }
    }
  };

  // ---------------------------------------------------------
  // 2️⃣ Approve Invoice Handler
  // ---------------------------------------------------------
  const handleApproveInvoice = async (masterId, invoiceNo) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to Approve Invoice No: ${invoiceNo}? This action will post entries to Stock & Accounts and cannot be reversed!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2b6cb0',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Approve it!',
      cancelButtonText: 'No, Cancel'
    });

    if (result.isConfirmed) {
      Swal.fire({
        title: 'Processing...',
        text: 'Posting ledger accounts and updating inventory stock.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      try {
        const res = await api.put(`/fp-sale/${masterId}/approve`);
        if (res.status === 200 || res.status === 201) {
          Swal.fire({
            title: 'Approved!',
            text: `Invoice ${invoiceNo} has been successfully approved and posted.`,
            icon: 'success',
            confirmButtonColor: '#2b6cb0'
          });
          fetchSales();
        }
      } catch (err) {
        console.error("Error approving invoice:", err);
        Swal.fire({
          title: 'Error!',
          text: err.response?.data?.message || 'Something went wrong while approving the invoice.',
          icon: 'error',
          confirmButtonColor: '#2b6cb0'
        });
      }
    }
  };

  // ---------------------------------------------------------
  // 3️⃣ Edit Invoice Handler
  // ---------------------------------------------------------
  const handleEditInvoice = async (masterId) => {
    const result = await Swal.fire({
      title: 'Edit Draft?',
      text: 'Do you want to modify this invoice draft?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2b6cb0',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Yes, Edit',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      navigate(`/fp-sale-form?editId=${masterId}`);
    }
  };

  const handleViewDetails = (invoiceNo) => {
    navigate(`/fp-invoice-detail/${invoiceNo}`);
  };

  // Helper for Payment Status Badging Styles
  const getPaymentStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'status-approved'; // Green styling
      case 'partial':
        return 'status-partial';  // Orange / Yellow styling
      case 'unpaid':
      default:
        return 'status-draft';    // Red / Neutral styling
    }
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
              <h2 className="erp-page-title">Finished Goods Sales List</h2>
            </div>
            <button className="add-sale-btn erp-btn-primary" type="button" onClick={() => setIsInvoiceModalOpen(true)}>
              <FaPlus /> ADD NEW FG SALE
            </button>
          </div>

          <div className="erp-table-scroll">
            {loading ? (
              <div className="loading-state">Loading sales data...</div>
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
                    <th>PAYMENT STATUS</th>
                    <th><FaUserAlt /> CREATED BY</th>
                    <th style={{ textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>

                <tbody>
                  {sales.length > 0 ? (
                    sales.map((sale) => {
                      const currentPaymentStatus = sale.payment_status || "Unpaid";

                      return (
                        <tr key={sale.id}>
                          <td data-label="ID" className="id-cell" style={{ color: '#94a3b8' }}>#{sale.id}</td>
                          <td data-label="INVOICE NO" className="invoice-cell" style={{ fontWeight: '700' }}>{sale.invoice_no}</td>
                          <td data-label="CREATED AT">{sale.createdat ? new Date(sale.createdat).toLocaleDateString() : "-"}</td>
                          <td data-label="DATE">{sale.date ? new Date(sale.date).toLocaleDateString() : "-"}</td>
                          <td data-label="CUSTOMER"><span className="supplier-tag">{sale.customer?.name || sale.entity_name || "N/A"}</span></td>
                          <td data-label="GRAND TOTAL" className="total-cell" style={{ fontWeight: '700', color: '#2b6cb0' }}>
                            {parseFloat(sale.grand_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          
                          {/* 💳 Payment Status Badge (Clickable for Status Updates) */}
                          <td data-label="PAYMENT STATUS">
                            <span 
                              className={`status-badge ${getPaymentStatusBadgeClass(currentPaymentStatus)}`}
                              onClick={() => handlePaymentStatusChange(sale.id, currentPaymentStatus)}
                              style={{ cursor: 'pointer' }}
                              title="Click to update payment status"
                            >
                              {currentPaymentStatus}
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
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="9" className="no-data" style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
                        No Finished Goods Sales transactions found.
                      </td>
                    </tr>
                  )}
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
            navigate(`/fp-sale-form?invoiceType=${type}`);
          }}
          title="FG Sale Invoice Type"
        />

        <ApprovedInvoiceEditModal
          open={approvedModalOpen}
          onClose={() => {
            setApprovedModalOpen(false);
            setApprovedInvoiceId(null);
          }}
          invoiceId={approvedInvoiceId}
          invoiceCategory="fp"
          onSaved={fetchSales}
        />
      </div>

      <Footer />
    </>
  );
};

export default FP_SaleList;