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

const RM_Purchase = ({ channel = null }) => {
  const [purchases, setPurchases] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [approvedModalOpen, setApprovedModalOpen] = useState(false);
  const [approvedInvoiceId, setApprovedInvoiceId] = useState(null);

  const navigate = useNavigate();

  const channelLabel = channel === 'retail' ? 'Retail' : channel === 'wholesale' ? 'Wholesale' : channel === 'pos' ? 'POS' : null;
  const formPath = channel ? `/${channel}/purchase-form` : '/rm-purchase-form';
  const backPath = channel ? '/dashboard' : '/rm-transactions';
  const pageTitle = channelLabel ? `${channelLabel} Purchases` : 'Purchase';

  // Fetch paginated data
  const fetchPurchases = async () => {
    try {
      const res = await api.get("/rm-transactions", {
        params: {
          type: "purchase",
          page: page,
          limit: 50,
          ...(channel ? { channel } : {})
        }
      });

      const data = res.data;
      if (Array.isArray(data.data)) {
        setPurchases(data.data);
        setTotalPages(data.totalPages);
      } else {
        setPurchases([]);
      }
    } catch (err) {
      console.error("Error fetching purchases:", err);
      setPurchases([]);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [page, channel]);

  // ---------------------------------------------------------
  // Payment Status Change Handler
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
      inputValue: currentStatus || 'Unpaid',
      showCancelButton: true,
      confirmButtonText: 'Update Status',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#2b6cb0',
      cancelButtonColor: '#94a3b8'
    });

    if (newStatus && newStatus !== currentStatus) {
      try {
        Swal.fire({
          title: 'Updating...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        // API Endpoint to update payment status
        const res = await api.patch(`/rm-transactions/${masterId}/payment-status`, {
          payment_status: newStatus
        });

        if (res.status === 200 || res.status === 201) {
          Swal.fire({
            title: 'Updated!',
            text: `Payment status changed to ${newStatus}`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
          });
          fetchPurchases(); // Table Refresh
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
  // Approve Handler
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
        didOpen: () => Swal.showLoading()
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
          fetchPurchases();
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
  // Edit Handler
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

  const renderItemNames = (details = []) => formatRmDetailsList(details);

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
            <button className="add-sale-btn erp-btn-primary" type="button" onClick={() => setIsInvoiceModalOpen(true)}>
              <FaPlus /> ADD NEW PURCHASE
            </button>
          </div>

          <div className="erp-table-scroll">
            <table className="product-table entity-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th><FaFileInvoice /> INVOICE NO</th>
                  <th><FaCalendarAlt /> DATE</th>
                  <th>ITEM NAME</th>
                  <th>SUPPLIER</th>
                  <th>GRAND TOTAL</th>
                  <th>PAYMENT STATUS</th> {/*  New Column Added */}
                  <th style={{ textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {purchases.length > 0 ? (
                  purchases.map((p) => {
                    const payStatus = p.payment_status || 'Unpaid';
                    const badgeClass = 
                      payStatus === 'Paid' ? 'status-paid' : 
                      payStatus === 'Partial' ? 'status-partial' : 'status-unpaid';

                    return (
                      <tr key={p.master_id}>
                        <td data-label="ID" style={{ color: '#94a3b8' }}>#{p.master_id}</td>
                        <td data-label="INVOICE NO" style={{ fontWeight: '700' }}>{p.invoice_no}</td>
                        <td data-label="DATE">{p.date ? new Date(p.date).toLocaleDateString() : "-"}</td>
                        <td data-label="ITEM NAME"><span className="user-tag">{renderItemNames(p.details)}</span></td>
                        <td data-label="SUPPLIER"><span className="supplier-tag">{p.entity_name}</span></td>
                        <td data-label="GRAND TOTAL" style={{ fontWeight: '700', color: '#2b6cb0' }}>
                          {parseFloat(p.grand_total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>

                        {/* 👈 Dynamic Payment Status Button */}
                        <td data-label="PAYMENT STATUS">
                          <button
                            type="button"
                            onClick={() => handlePaymentStatusChange(p.master_id, payStatus, p.invoice_no)}
                            className={`payment-status-btn ${badgeClass}`}
                            title="Click to change payment status"
                          >
                            <FaMoneyBillWave /> {payStatus}
                          </button>
                        </td>

                        <td data-label="ACTION" className="erp-actions-cell">
                          <div className="erp-actions-group">
                            <button type="button" onClick={() => navigate(`/rm-invoice/${p.invoice_no}`)} className="primary-btn">
                              <FaEye /> VIEW
                            </button>

                            {p.status === 'Approved' ? (
                              <>
                                {/* Post-approve edit disabled for mobile shop
                                <button
                                  type="button"
                                  onClick={() => {
                                    setApprovedInvoiceId(p.master_id);
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
                                <button type="button" onClick={() => handleEditInvoice(p.master_id)} className="edit-btn-action">
                                  <FaEdit /> EDIT
                                </button>
                                <button type="button" onClick={() => handleApproveInvoice(p.master_id, p.invoice_no)} className="approve-btn-action">
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
                    <td colSpan="8" style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
                      No Transactions Found
                    </td>
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
          title={channelLabel ? `${channelLabel} Purchase Invoice Type` : "Purchase Invoice Type"}
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
          onSaved={fetchPurchases}
        />
        */}
      </div>
      <Footer />
    </>
  );
};

export default RM_Purchase;