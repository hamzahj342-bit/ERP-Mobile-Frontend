import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaEye, FaPlus, FaFileInvoice, FaCalendarAlt, FaUserAlt, FaEdit, FaCheckCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../RMForm.css';
import Footer from '../Components/Footer';
import Pagination from '../Components/Pagination';
import api from "../../api"; 
import Swal from 'sweetalert2';

const RM_OpeningStockList = () => {
  const [openingEntries, setOpeningEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const navigate = useNavigate();

  // Fetch paginated configuration specifically for opening stock sequences
  const fetchOpeningEntries = async () => {
    try {
      const res = await api.get("/rm-transactions/opening-stock", {
        params: {
          type: "purchase", // Triggers inventory lookup mapping matching layout schema
          page: page,
          limit: 50,
          isOpeningStock: true // Optional flag if your API supports filtering startup entries specifically
        }
      });

      const data = res.data;
      console.log("RM Opening Stock API Response:", data);

      if (Array.isArray(data.data)) {
        // Safe fallbacks to display entries synced under startup ID 999999
        const targetedData = data.data.filter(p => parseInt(p.entityid) === 999999 || p.invoice_no?.startsWith('OPENING-'));
        setOpeningEntries(targetedData.length > 0 ? targetedData : data.data);
        setTotalPages(data.totalPages);
      } else {
        setOpeningEntries([]);
      }
    } catch (err) {
      console.error("Error fetching opening balances ledger entries:", err);
      setOpeningEntries([]);
    }
  };

  useEffect(() => {
    fetchOpeningEntries();
  }, [page]);

  // ---------------------------------------------------------
  // 1️⃣ Approve Handler with SweetAlert2
  // ---------------------------------------------------------
  const handleApproveInvoice = async (masterId, invoiceNo) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to Approve Opening Stock Invoice No: ${invoiceNo}? This will post opening balances to core accounts and lock inventory layers.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2b6cb0',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Post & Approve!',
      cancelButtonText: 'No, Cancel'
    });

    if (result.isConfirmed) {
      Swal.fire({
        title: 'Processing...',
        text: 'Injecting opening metrics to accounts ledger & stock batches.',
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
            text: `Opening Entry ${invoiceNo} posted successfully.`,
            icon: 'success',
            confirmButtonColor: '#2b6cb0'
          });
          fetchOpeningEntries();
        }
      } catch (err) {
        console.error("Error approving initialization entry:", err);
        Swal.fire({
          title: 'Error!',
          text: err.response?.data?.message || 'Failed to approve system initialization ledger rows.',
          icon: 'error',
          confirmButtonColor: '#2b6cb0'
        });
      }
    }
  };

  // ---------------------------------------------------------
  // 2️⃣ Edit Handler for Opening Stock Layout
  // ---------------------------------------------------------
  const handleEditInvoice = async (masterId) => {
    const result = await Swal.fire({
      title: 'Modify Configuration?',
      text: 'Do you want to modify this opening stock initialization layout draft?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2b6cb0',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Yes, Edit Configuration',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      // Routes safely to dedicated opening form controller setup
      navigate(`/rm-opening-stock-form?editId=${masterId}`);
    }
  };

  return (
    <>
      <NavigationBar />
      <div className="rm-page">
        <div className="top-nav-container" style={{marginTop: '30px'}}>
          <button className="back-btn" onClick={() => navigate('/rm-transactions')}>
            <FaArrowLeft />
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Opening Stock</h3>
            <button className="add-sale-btn" onClick={() => navigate('/rm-opening-stock-form')}>
              <FaPlus /> INITIALIZE OPENING STOCK
            </button>
          </div>

          <div className="table-container">
            <table className="product-table">
              <thead>
                <tr>
                  <th>SYSTEM ID</th>
                  <th><FaFileInvoice /> INVOICE RUNTIME NO</th>
                  <th>CREATED AT</th>
                  <th><FaCalendarAlt /> SETUP DATE</th>
                  <th><FaUserAlt /> OPERATOR</th>
                  <th>TARGET ACCOUNT SYSTEM</th>
                  <th>TOTAL SETUP VALUATION</th>
                  {/* <th>LEDGER STATUS</th> */}
                  <th style={{ textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {openingEntries.length > 0 ? (
                  openingEntries.map((p) => (
                    <tr key={p.master_id}>
                      <td style={{ color: '#94a3b8' }}>#{p.master_id}</td>
                      <td style={{ fontWeight: '700' }}>{p.invoice_no}</td>
                      <td>{p.createdat ? new Date(p.createdat).toLocaleDateString() : "-"}</td>
                      <td>{p.date ? new Date(p.date).toLocaleDateString() : "-"}</td>
                      <td><span className="user-tag">{p.createdby}</span></td>
                      <td><span className="supplier-tag" style={{ backgroundColor: '#edf2f7', color: '#4a5568' }}>System Startup Entity</span></td>
                      <td style={{ fontWeight: '700', color: '#2b6cb0' }}>
                        {parseFloat(p.grand_total).toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                      {/* <td>
                        <span className={`status-badge ${
                          p.status === 'Approved' 
                            ? 'status-approved' 
                            : 'status-draft'
                        }`}>
                          {p.status === 'Draft' || !p.status ? 'Unapproved' : p.status}
                        </span>
                      </td> */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                          <button onClick={() => navigate(`/rm-invoice/${p.invoice_no}`)} className="primary-btn">
                            <FaEye /> VIEW
                          </button>
                          </div>
                          </td>
                          

                          {/* {p.status === 'Approved' ? (
                            <span className="approved-text-btn">
                              <FaCheckCircle /> POSTED
                            </span>
                          ) : (
                            <>
                              <button onClick={() => handleEditInvoice(p.master_id)} className="edit-btn-action">
                                <FaEdit /> EDIT
                              </button>
                              <button onClick={() => handleApproveInvoice(p.master_id, p.invoice_no)} className="approve-btn-action">
                                <FaCheckCircle /> APPROVE
                              </button>
                            </>
                          )} */}
                        {/* </div>
                      </td> */}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>No Initialization Invoices Found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'center' }}>
            <Pagination page={page} totalPages={totalPages} onPageChange={(newPage) => setPage(newPage)} />
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default RM_OpeningStockList;