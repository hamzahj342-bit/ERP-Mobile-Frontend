import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaEye, FaFileInvoice } from "react-icons/fa";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import "../CustomersAndSuppliers.css";
import api from "../../api"; 

const SupplierInvoices = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // 1. Initial State ko properly define kiya taake .length error na aaye
  const [data, setData] = useState({ 
    rmPurchases: [], 
    supplierName: "" 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/entities/${id}/supplierinvoices`);
        
        // 2. Response check: Agar backend se data na mile toh empty array set karein
        if (res.data) {
          setData({
            rmPurchases: res.data.rmPurchases || [],
            supplierName: res.data.rmPurchases[0]?.entity?.name || "Supplier"
          });
        }
      } catch (err) {
        console.error("Error fetching supplier invoices:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchInvoices();
  }, [id]);

  return (
    <>
      <NavigationBar />
      <div className="erp-entity-page table-container">
        <div className="erp-page-card table-wrapper">
          <div className="erp-page-header header-flex">
            <div className="erp-page-header-left">
              <button className="back-btn erp-back-btn" type="button" onClick={() => navigate('/suppliers')}>
                <FaArrowLeft />
              </button>
              <div>
                <h2 className="erp-page-title">Supplier Invoice History</h2>
                <p className="erp-page-subtitle">
                  Purchases from: <b>{data.supplierName}</b>
                </p>
              </div>
            </div>
            <FaFileInvoice className="erp-header-icon" size={24} />
          </div>

          {loading ? (
            <div className="erp-loader loader">Loading Invoices...</div>
          ) : (
            <div className="erp-table-scroll">
              <table className="entity-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Date</th>
                    <th>Grand Total</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.rmPurchases?.length > 0 ? (
                    data.rmPurchases.map((inv) => (
                      <tr key={inv.id}>
                        <td data-label="Invoice No" style={{ fontWeight: '600' }}>{inv.invoice_no}</td>
                        <td data-label="Date">{new Date(inv.createdat).toLocaleDateString('en-GB')}</td>
                        <td data-label="Grand Total" style={{ fontWeight: 'bold', color: '#2c3e50' }}>
                          Rs. {Number(inv.grand_total).toLocaleString()}
                        </td>
                        <td data-label="Actions" className="erp-actions-cell">
                          <button 
                            type="button"
                            className="edit-btn" 
                            onClick={() => navigate(`/rm-invoice/${inv.invoice_no}`)}
                          >
                            <FaEye /> View Detail
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="erp-empty-cell">
                        No invoices found for this supplier.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default SupplierInvoices;