import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "../Invoice.css";
import api from "../../api";
import { FaFilePdf, FaImage } from "react-icons/fa";

const PaymentTransactionInvoice = () => {
  const { invoiceNo } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [rows, setRows] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem("user"));

  const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || "http://localhost:5000";

  const getLogoUrl = () => {
    if (!user?.profile_image) return null;
    if (user.profile_image.startsWith("http")) return user.profile_image;
    const cleanFileName = user.profile_image.replace("uploads\\", "").replace("uploads/", "");
    return `${IMAGE_BASE_URL}/uploads/${cleanFileName}`.replace(/\\/g, "/");
  };

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const [companyRes, invoiceRes] = await Promise.all([
          api.get("/companies"),
          api.get(`/payment-transactions/${invoiceNo}`),
        ]);

        setCompanies(companyRes.data || []);
        setInvoice(invoiceRes.data.invoice || invoiceRes.data);
        setRows(invoiceRes.data.rows || []);
      } catch (err) {
        console.error("Error fetching payment invoice:", err);
        setInvoice(null);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceNo]);

  const currentCompanyName = companies.find((c) => c.id === Number(user?.company_id))?.name || "CHEMICAL & DETERGENTS TRADER";

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleDownloadPDF = () => {
    const input = document.getElementById("payment-invoice-detail");
    if (!input) return;

    html2canvas(input, {
      useCORS: true,
      scale: 2,
      ignoreElements: (element) => element.classList.contains("no-print"),
    }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Payment-Invoice-${invoice?.invoice_no || invoiceNo}.pdf`);
    });
  };

  const handleDownloadImage = () => {
    const input = document.getElementById("payment-invoice-detail");
    if (!input) return;

    html2canvas(input, {
      useCORS: true,
      scale: 3,
      ignoreElements: (element) => element.classList.contains("no-print"),
    }).then((canvas) => {
      const link = document.createElement("a");
      link.download = `Payment-Invoice-${invoice?.invoice_no || invoiceNo}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    });
  };

  if (loading) return <p className="p-5 text-center">Loading payment invoice...</p>;
  if (!invoice && rows.length === 0) return <p className="p-5 text-center text-danger">Payment invoice not found.</p>;

  // ✅ FIX: Aggregate total debit and total credit sums across all transaction rows
  const totalDebit = rows.reduce((acc, row) => acc + (parseFloat(row.debit) || 0), 0);
  const totalCredit = rows.reduce((acc, row) => acc + (parseFloat(row.credit) || 0), 0);
  
  // Single side balanced total amount (Double Entry Ledger Rule: Sum(Debit) === Sum(Credit))
  const totalAmount = totalDebit > 0 ? totalDebit : totalCredit;

  const mainInvoiceNo = invoice?.invoice_no || invoiceNo;
  const transactionDate = invoice?.transaction_date || rows[0]?.transaction_date;
  const createdBy = invoice?.created_by || rows[0]?.created_by || "-";
  const description = invoice?.description || rows[0]?.description || "-";

  return (
    <div className="invoice-container">
      <div id="payment-invoice-detail" className="invoice-box shadow-lg">
        <header className="invoice-header">
          <div className="company-info">
            {user?.profile_image ? (
              <img
                className="invoice-logo"
                src={getLogoUrl()}
                alt="Logo"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="invoice-logo-fallback">NO LOGO</div>
            )}
            <div>
              <p className="title text">{currentCompanyName}</p>
              <h4 className="subtitle">Payment Transaction Voucher</h4>
            </div>
          </div>

          <div className="invoice-id">
            <p className="title">Voucher No.</p>
            <h1 className="id-number">#{mainInvoiceNo}</h1>
          </div>
        </header>

        <section className="voucher-summary payment-voucher-summary">
          <div className="voucher-card amount-card">
            <span>Total Payment Amount</span>
            <h2>Rs. {Number(totalAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
          </div>

          <div className="voucher-card">
            <span>Transaction Date</span>
            <p>{formatDate(transactionDate)}</p>
          </div>

          <div className="voucher-card">
            <span>Created By</span>
            <p>{createdBy}</p>
          </div>
        </section>

        <section className="payment-detail-box">
          <h5 className="section-title">Journal Entries Breakdown</h5>

          <div className="table-responsive">
            <table className="payment-table item-table">
              <thead>
                <tr>
                  <th className="product-col">Account & Party Name</th>
                  <th>Description</th>
                  <th className="text-right">Debit</th>
                  <th className="text-right">Credit</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const accName = row.account_name || row.account?.name || row.account_title || `Account ID: ${row.account_id}`;
                  const partyName = row.entity_name || row.entity?.name || null;

                  return (
                    <tr key={index}>
                      <td className="product-col">
                        <strong className="voucher-account-name">{accName}</strong>
                        {partyName && (
                          <span className="voucher-party-name">Party: {partyName}</span>
                        )}
                      </td>
                      <td>{row.description || description}</td>
                      <td className="text-right">
                        {Number(row.debit) > 0 ? `${Number(row.debit).toLocaleString()}` : "-"}
                      </td>
                      <td className="text-right">
                        {Number(row.credit) > 0 ? `${Number(row.credit).toLocaleString()}` : "-"}
                      </td>
                    </tr>
                  );
                })}
                <tr className="amount-row">
                  <td colSpan="2">Total Amount</td>
                  <td className="text-right">
                    Rs. {Number(totalDebit).toLocaleString()}
                  </td>
                  <td className="text-right">
                    Rs. {Number(totalCredit).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <footer className="invoice-footer">
          <div className="note-section">
            <p className="note">Thank you. This invoice represents the payment transaction entry.</p>
            <div className="action-buttons-group no-print">
              <button type="button" onClick={() => navigate(-1)} className="back-button">
                ← Back
              </button>
              <button type="button" onClick={handleDownloadImage} className="download-button bg-png" title="Download PNG">
                <FaImage />
              </button>
              <button type="button" onClick={handleDownloadPDF} className="download-button bg-pdf" title="Download PDF">
                <FaFilePdf />
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default PaymentTransactionInvoice;
