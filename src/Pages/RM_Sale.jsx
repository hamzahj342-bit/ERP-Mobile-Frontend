import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaEye, FaPlus, FaFileInvoice, FaCalendarAlt, FaEdit, FaCheckCircle, FaMoneyBillWave } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../RMForm.css';
import Footer from '../Components/Footer';
import Pagination from '../Components/Pagination';
import api from "../../api"; 
import InvoiceTypeModal from '../Components/InvoiceTypeModal';
import ApprovedInvoiceEditModal from '../Components/ApprovedInvoiceEditModal';
import Swal from 'sweetalert2'; 
import { formatRmDetailsList } from '../utils/rmQtyDisplay';

const RM_Sale = ({ channel = null }) => {
  const [sales, setSales] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [approvedModalOpen, setApprovedModalOpen] = useState(false);
  const [approvedInvoiceId, setApprovedInvoiceId] = useState(null);

  const navigate = useNavigate();

  const channelLabel = channel === 'retail' ? 'Retail' : channel === 'wholesale' ? 'Wholesale' : channel === 'pos' ? 'POS' : null;
  const isPos = channel === 'pos';
  const formPath = isPos ? '/pos/sale' : channel ? `/${channel}/sale-form` : '/rm-sale-form';
  const backPath = channel ? '/dashboard' : '/rm-transactions';
  const pageTitle = channelLabel ? `${channelLabel} Sales` : 'Sales';

  // Fetch paginated data using api.js
  const fetchSales = async () => {
    try {
      const res = await api.get("/rm-transactions", {
        params: {
          type: "sale",
          page: page,
          limit: 50,
          ...(channel ? { channel } : {})
        }
      });

      const data = res.data;

      if (Array.isArray(data.data)) {
        setSales(data.data);
        setTotalPages(data.totalPages);
      } else {
        setSales([]);
      }
    } catch (err) {
      console.error("Error fetching sales:", err);
      setSales([]);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [page, channel]);

  // ---------------------------------------------------------
  // 💳 Payment Status Change Handler with SweetAlert2 Dropdown
  // ---------------------------------------------------------
  const handlePaymentStatusChange = async (masterId, currentStatus, invoiceNo) => {
    const { value: newStatus } = await Swal.fire({
      title: `Update Payment Status`,
      text: `Invoice No: ${invoiceNo}`,
      input: 'select',
      inputOptions: {
        'Unpaid': 'Unpaid',
        'Partial': 'Partial',
        'Paid': 'Paid'
      },
      inputValue: currentStatus,
      showCancelButton: true,
      confirmButtonText: 'Update Status',
      confirmButtonColor: '#2b6cb0',
      cancelButtonColor: '#64748b',
      inputValidator: (value) => {
        if (!value) {
          return 'You need to select a status!';
        }
      }
    });

    if (newStatus && newStatus !== currentStatus) {
      try {
        Swal.fire({
          title: 'Updating...',
          text: 'Updating payment status',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        // Backend API call to update payment status
        const res = await api.patch(`/rm-transactions/${masterId}/payment-status`, {
          payment_status: newStatus
        });

        if (res.status === 200 || res.status === 201) {
          Swal.fire({
            title: 'Updated!',
            text: `Payment status updated to ${newStatus}`,
            icon: 'success',
            timer: 1800,
            showConfirmButton: false
          });
          fetchSales(); // Refresh list to reflect updated badge
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
  // 1️⃣ Approve Handler
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
        const res = await api.put(`/rm-transactions/${masterId}/approve`);
        
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
  // 2️⃣ Edit Handler
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
      navigate(`${formPath}?editId=${masterId}`);
    }
  };

  return (
    <>
      <NavigationBar />
      <div className="erp-entity-page rm-page">
        <div className="erp-page-card card">
          <div className="erp-page-header card-header header-flex">
            <div className="erp-page-header-left">
              <button className="back-btn erp-back-btn" type="button" onClick={() => navigate(backPath)}>
                <FaArrowLeft />
              </button>
              <h2 className="erp-page-title">{pageTitle}</h2>
            </div>
            <button className="add-sale-btn erp-btn-primary" type="button" onClick={() => isPos ? navigate(formPath) : setIsInvoiceModalOpen(true)}>
              <FaPlus /> {isPos ? 'NEW POS SALE' : 'ADD NEW SALE'}
            </button>
          </div>

          <div className="erp-table-scroll">
            <table className="product-table entity-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th><FaFileInvoice /> INVOICE NO</th>
                  <th><FaCalendarAlt /> DATE</th>
                  <th>CUSTOMER</th>
                  <th>ITEM NAME</th>
                  <th>GRAND TOTAL</th>
                  <th>PAYMENT STATUS</th> {/* 👈 Payment Status Header */}
                  <th style={{ textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {sales.length > 0 ? (
                  sales.map((s) => {
                    // Payment Status Dynamic CSS Class Setup
                    const payStatus = s.payment_status || 'Unpaid';
                    const badgeClass = 
                      payStatus === 'Paid' ? 'status-paid' : 
                      payStatus === 'Partial' ? 'status-partial' : 'status-unpaid';

                    return (
                      <tr key={s.master_id}>
                        <td data-label="ID" style={{ color: '#94a3b8' }}>#{s.master_id}</td>
                        <td data-label="INVOICE NO" style={{ fontWeight: '700' }}>{s.invoice_no}</td>
                        <td data-label="DATE">{s.date ? new Date(s.date).toLocaleDateString() : "-"}</td>
                        <td data-label="CUSTOMER"><span className="supplier-tag">{s.entity_name}</span></td>
                        <td data-label="ITEM NAME"><span className="user-tag">{formatRmDetailsList(s.details)}</span></td>
                        <td data-label="GRAND TOTAL" style={{ fontWeight: '700', color: '#2b6cb0' }}>
                          {parseFloat(s.grand_total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>

                        {/* 👈 Dynamic Interactive Payment Status Button */}
                        <td data-label="PAYMENT STATUS">
                          <button
                            type="button"
                            onClick={() => handlePaymentStatusChange(s.master_id, payStatus, s.invoice_no)}
                            className={`payment-status-btn ${badgeClass}`}
                            title="Click to update payment status"
                          >
                            <FaMoneyBillWave /> {payStatus}
                          </button>
                        </td>

                        <td data-label="ACTION" className="erp-actions-cell">
                          <div className="erp-actions-group">
                            <button type="button" onClick={() => navigate(`/rm-invoice/${s.invoice_no}`)} className="primary-btn">
                              <FaEye /> VIEW
                            </button>

                            {isPos && (
                              <button type="button" onClick={() => navigate(`/pos/receipt/${s.invoice_no}`)} className="edit-btn-action" title="Print thermal receipt">
                                <FaFileInvoice /> RECEIPT
                              </button>
                            )}

                            {s.status === 'Approved' ? (
                              <>
                                {/* Post-approve edit disabled for mobile shop
                                <button
                                  type="button"
                                  onClick={() => {
                                    setApprovedInvoiceId(s.master_id);
                                    setApprovedModalOpen(true);
                                  }}
                                  className="edit-btn-action"
                                >
                                  <FaEdit /> EDIT
                                </button>
                                */}
                                <span className="approved-text-btn">
                                  <FaCheckCircle /> APPROVED
                                </span>
                              </>
                            ) : (
                              <>
                                <button type="button" onClick={() => handleEditInvoice(s.master_id)} className="edit-btn-action">
                                  <FaEdit /> EDIT
                                </button>
                                <button type="button" onClick={() => handleApproveInvoice(s.master_id, s.invoice_no)} className="approve-btn-action">
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
                    <td colSpan="10" style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>No Transactions Found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="erp-pagination-wrap">
            <Pagination page={page} totalPages={totalPages} onPageChange={(newPage) => setPage(newPage)} />
          </div>
        </div>
        
        <InvoiceTypeModal
          open={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          onSelect={(type) => {
            setIsInvoiceModalOpen(false);
            navigate(`${formPath}?invoiceType=${type}`);
          }}
          title={channelLabel ? `${channelLabel} Sale Invoice Type` : "Sale Invoice Type"}
        />

        {/* Post-approve edit modal disabled
        <ApprovedInvoiceEditModal
          open={approvedModalOpen}
          onClose={() => {
            setApprovedModalOpen(false);
            setApprovedInvoiceId(null);
          }}
          invoiceId={approvedInvoiceId}
          invoiceCategory="rm"
          onSaved={fetchSales}
        />
        */}
      </div>
      <Footer />
    </>
  );
};

export default RM_Sale;