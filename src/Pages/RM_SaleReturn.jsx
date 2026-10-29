import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaPlus, FaEye, FaFileInvoice, FaUserAlt, FaCalendarAlt, FaEdit, FaCheckCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../RMForm.css';
import Footer from '../Components/Footer';
import Pagination from '../Components/Pagination';
import api from "../../api"; 
import InvoiceTypeModal from '../Components/InvoiceTypeModal';
import ApprovedInvoiceEditModal from '../Components/ApprovedInvoiceEditModal';
import Swal from 'sweetalert2';
import { formatRmDetailsList } from '../utils/rmQtyDisplay';

const RM_SaleReturn = ({ channel = null }) => {
  const [saleReturns, setSaleReturns] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [approvedModalOpen, setApprovedModalOpen] = useState(false);
  const [approvedInvoiceId, setApprovedInvoiceId] = useState(null);

  const navigate = useNavigate();

  const channelLabel = channel === 'retail' ? 'Retail' : channel === 'wholesale' ? 'Wholesale' : channel === 'pos' ? 'POS' : null;
  const formPath = channel ? `/${channel}/sale-return-form` : '/rm-sale-return-form';
  const backPath = channel ? '/dashboard' : '/rm-transactions';
  const pageTitle = channelLabel ? `${channelLabel} Sale Returns` : 'Sale Returns';

  const fetchSaleReturns = async () => {
    setLoading(true);
    try {
      const res = await api.get("/rm-transactions", {
        params: {
          type: "SaleReturn",
          page: page,
          limit: 50,
          ...(channel ? { channel } : {})
        }
      });

      const data = res.data;
      if (Array.isArray(data.data)) {
        setSaleReturns(data.data);
        setTotalPages(data.totalPages || 1);
      } else {
        setSaleReturns([]);
      }
    } catch (err) {
      console.error("Error fetching sale returns:", err);
      setSaleReturns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaleReturns();
  }, [page, channel]);

  // ---------------------------------------------------------
  // 1️⃣ Approve Handler (Same logic as Sale)
  // ---------------------------------------------------------
  const handleApproveInvoice = async (masterId, invoiceNo) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to Approve Sale Return: ${invoiceNo}? This will post entries to Stock & Accounts.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2b6cb0',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Approve it!'
    });

    if (result.isConfirmed) {
      Swal.fire({ title: 'Processing...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      try {
        await api.put(`/rm-transactions/${masterId}/approve`);
        Swal.fire('Approved!', 'Sale Return has been posted.', 'success');
        fetchSaleReturns();
      } catch (err) {
        Swal.fire('Error!', err.response?.data?.message || 'Failed to approve.', 'error');
      }
    }
  };

  // ---------------------------------------------------------
  // 2️⃣ Edit Handler (Same logic as Sale)
  // ---------------------------------------------------------
  const handleEditInvoice = async (masterId) => {
    const result = await Swal.fire({
      title: 'Edit Draft?',
      text: 'Do you want to modify this Sale Return draft?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2b6cb0',
      confirmButtonText: 'Yes, Edit'
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
            <button className="add-sale-btn erp-btn-primary" type="button" onClick={() => setIsInvoiceModalOpen(true)}>
              <FaPlus /> ADD NEW SALE RETURN
            </button>
          </div>

          <div className="erp-table-scroll">
            <table className="product-table entity-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th><FaFileInvoice /> INVOICE NO</th>
                  <th>CREATED AT</th>
                  <th><FaCalendarAlt /> DATE</th>
                  <th><FaUserAlt /> CREATED BY</th>
                  <th>CUSTOMER</th>
                  <th>ITEMS</th>
                  <th>GRAND TOTAL</th>
                  <th>INVOICE STATUS</th>
                  <th style={{ textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="10" style={{textAlign: 'center', padding: '20px'}}>Loading...</td></tr>
                ) : saleReturns.length > 0 ? (
                  saleReturns.map((s) => (
                    <tr key={s.master_id}>
                      <td data-label="ID" style={{ color: '#94a3b8' }}>#{s.master_id}</td>
                      <td data-label="INVOICE NO" style={{ fontWeight: '700' }}>{s.invoice_no}</td>
                      <td data-label="CREATED AT">{s.createdat ? new Date(s.createdat).toLocaleDateString() : "-"}</td>
                      <td data-label="DATE">{s.date ? new Date(s.date).toLocaleDateString() : "-"}</td>
                      <td data-label="CREATED BY"><span className="user-tag">{s.createdby}</span></td>
                      <td data-label="CUSTOMER"><span className="supplier-tag">{s.entity_name}</span></td>
                      <td data-label="ITEMS"><span className="user-tag" style={{ whiteSpace: 'normal', maxWidth: '280px', display: 'inline-block' }}>{formatRmDetailsList(s.details)}</span></td>
                      <td data-label="GRAND TOTAL" style={{ fontWeight: '700', color: '#2b6cb0' }}>
                        {parseFloat(s.grand_total).toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                      <td data-label="INVOICE STATUS">
 <span className={`status-badge ${
  s.status === 'Approved' 
    ? 'status-approved' 
    : (s.status === 'Draft' || !s.status) 
      ? 'status-draft' // Red color wali class yahan lagegi
      : 'status-draft'
}`}>
  {s.status === 'Draft' || !s.status ? 'Unapproved' : s.status}
</span>
                      </td>
                      <td data-label="ACTION" className="erp-actions-cell">
                        <div className="erp-actions-group">
                          <button type="button" onClick={() => navigate(`/rm-invoice/${s.invoice_no}`)} className="primary-btn">
                            <FaEye /> VIEW
                          </button>
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
                              <span className="approved-text-btn"><FaCheckCircle /> APPROVED</span>
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
                  ))
                ) : (
                  <tr><td colSpan="10" style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>No Transactions Found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="erp-pagination-wrap">
            <Pagination page={page} totalPages={totalPages} onPageChange={(newPage) => setPage(newPage)} />
          </div>
        </div>
      </div>

      <InvoiceTypeModal
        open={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        onSelect={(type) => {
          setIsInvoiceModalOpen(false);
          navigate(`${formPath}?invoiceType=${type}`);
        }}
        title={channelLabel ? `${channelLabel} Sale Return Invoice Type` : "Sale Return Invoice Type"}
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
        onSaved={fetchSaleReturns}
      />
      */}
      <Footer />
    </>
  );
};

export default RM_SaleReturn;