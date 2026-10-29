import React, { useState, useEffect } from "react";
import NavigationBar from "../Components/NavigationBar";
import { FaArrowLeft, FaEdit, FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "../RMForm.css";
import Footer from "../Components/Footer";
import Pagination from "../Components/Pagination"; 
import api from "../../api";

const GeneralVoucherList = () => {
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false); 
  const navigate = useNavigate();

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.get("/payment-transactions/list", {
        params: { 
          type: "JV", // Strictly target General/Journal Vouchers only
          page: page, 
          limit: 20   
        }
      });
      
      const { data, totalPages } = res.data;
      
      if (Array.isArray(data)) {
        setTransactions(data);
        setTotalPages(totalPages || 1);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      console.error("Error fetching general vouchers:", err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page]); 

  return (
    <>
      <NavigationBar />
      <div className="erp-entity-page rm-page">
        <div className="erp-page-card card">
          <div className="erp-page-header card-header header-flex">
            <div className="erp-page-header-left">
              <button className="back-btn erp-back-btn" type="button" onClick={() => navigate("/payment-transactions")}>
                <FaArrowLeft />
              </button>
              <h2 className="erp-page-title" style={{ color: '#0f172a' }}>Journal Vouchers (JV)</h2>
            </div>
            <div className="erp-header-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="add-sale-btn" onClick={() => navigate("/payments")}>
                <FaPlus /> NEW JOURNAL VOUCHER
              </button>
            </div>
          </div>

          <div className="erp-table-scroll">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '50px' }}>Loading Vouchers...</div>
            ) : (
              <table className="product-table entity-table">
                <thead>
                  <tr>
                    <th style={{ width: "80px" }}>ID</th> {/* 🌟 ID Column Wapas Add Kar Diya */}
                    <th>Voucher No</th>
                    <th>Transaction Date</th>
                    <th >Total Amount</th>
                    <th style={{ textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.invoice_no}>
                      <td style={{ color: "#6c757d", fontWeight: "500" }}>{tx.id}</td> {/* 🌟 Database key ID rendering */}
                      <td style={{ fontWeight: "600", color: "#495057" }}>{tx.invoice_no}</td>
                      <td>{tx.transaction_date || "-"}</td>
                      <td style={{ fontWeight: "600", color: "#0f172a" }}>
                        {parseFloat(tx.total_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: "center", flexDirection: "row", display: "flex", justifyContent: "center", gap: "8px" }}>
                        <button
                          className="edit-btn-action"
                          
                          onClick={async () => {
                            const result = await Swal.fire({
                              title: `Are you sure you want to edit Voucher ${tx.invoice_no}?`,
                              icon: "question",
                              showCancelButton: true,
                              confirmButtonText: "Yes, Confirm",
                              cancelButtonText: "Cancel"
                            });
                            if (result.isConfirmed) {
                              navigate(`/payments/${tx.id}`);
                            }
                          }}
                        >
                          <FaEdit />
                          Edit
                        </button>
                        <button
                          className="primary-btn"
                          style={{ width: "140px" }}
                          onClick={() => navigate(`/payment-transaction/${tx.invoice_no}`)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: '30px', color: "#6c757d" }}>
                        No general vouchers found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Controls */}
          {!loading && transactions.length > 0 && (
            <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'center' }}>
              <Pagination 
                page={page} 
                totalPages={totalPages} 
                onPageChange={(newPage) => setPage(newPage)} 
              />
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default GeneralVoucherList;