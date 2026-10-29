import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaEye, FaFileInvoiceDollar } from "react-icons/fa";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import "../CustomersAndSuppliers.css";
import api from "../../api";

const CustomerInvoices = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState({ fpSales: [], rmSales: [], customer: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLedger = async () => {
      try {
        const res = await api.get(`/entities/${id}/invoices`);
        setData(res.data);
      } catch (err) {
        console.error("Error fetching ledger:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLedger();
  }, [id]);

  if (loading) {
    return (
      <>
        <NavigationBar />
        <div className="erp-entity-page table-container">
          <div className="erp-loader loader">Loading Ledger...</div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <NavigationBar />
      <div className="erp-entity-page table-container">
        <div className="erp-page-card table-wrapper">
          <div className="erp-page-header header-flex">
            <div className="erp-page-header-left">
              <button className="back-btn erp-back-btn" type="button" onClick={() => navigate('/customers')}>
                <FaArrowLeft />
              </button>
              <div>
                <h2 className="erp-page-title">Customer Ledger</h2>
                <p className="erp-page-subtitle">History for: <b>{data.customer?.name || "Customer"}</b></p>
              </div>
            </div>
            <FaFileInvoiceDollar className="erp-header-icon" size={24} />
          </div>

          <div className="erp-section-block">
            <h3 className="erp-section-title">Finished Goods Invoices</h3>
            <div className="erp-table-scroll">
              <table className="entity-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th>Grand Total</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.fpSales.length > 0 ? data.fpSales.map(inv => (
                    <tr key={inv.id}>
                      <td data-label="Invoice #">{inv.invoice_no}</td>
                      <td data-label="Date">{new Date(inv.createdat).toLocaleDateString('en-GB')}</td>
                      <td data-label="Grand Total" style={{ fontWeight: 'bold' }}>Rs. {Number(inv.grand_total).toLocaleString()}</td>
                      <td data-label="Action" className="erp-actions-cell">
                        <button type="button" className="edit-btn" onClick={() => navigate(`/fp-invoice-detail/${inv.invoice_no}`)}>
                          <FaEye /> View Detail
                        </button>
                      </td>
                    </tr>
                  )) : <tr><td colSpan="4" className="erp-empty-cell">No FP Invoices found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="erp-section-block">
            <h3 className="erp-section-title erp-section-title--orange">Invoices</h3>
            <div className="erp-table-scroll">
              <table className="entity-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th>Grand Total</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rmSales.length > 0 ? data.rmSales.map(inv => (
                    <tr key={inv.id}>
                      <td data-label="Invoice #">{inv.invoice_no}</td>
                      <td data-label="Date">{new Date(inv.createdat).toLocaleDateString('en-GB')}</td>
                      <td data-label="Grand Total" style={{ fontWeight: 'bold' }}>Rs. {Number(inv.grand_total).toLocaleString()}</td>
                      <td data-label="Action" className="erp-actions-cell">
                        <button type="button" className="edit-btn"
                                onClick={() => navigate(`/rm-invoice/${inv.invoice_no}`)}>
                          <FaEye /> View Detail
                        </button>
                      </td>
                    </tr>
                  )) : <tr><td colSpan="4" className="erp-empty-cell">No invoices found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default CustomerInvoices;
