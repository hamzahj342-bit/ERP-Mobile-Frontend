import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; 
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';
import api from '../../api';
import { FaArrowLeft, FaFileExcel, FaFilePdf, FaImage, FaCalendarAlt, FaUniversity, FaBalanceScale } from 'react-icons/fa';
import '../Profitloss.css';
import { toast } from 'react-toastify';

// Export Libraries
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';
import html2canvas from 'html2canvas';
import { localToday, localYearStart } from '../utils/localDate';

const CapitalReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef();
  const today = localToday();

  // --- 📊 State Definitions ---
  const currentYearStart = localYearStart();
  const [fromDate, setFromDate] = useState(currentYearStart);
  const [toDate, setToDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ total_assets: 0, total_liabilities: 0, net_capital: 0 });
  const [assets, setAssets] = useState([]);
  const [liabilities, setLiabilities] = useState([]);

  // --- 🌐 Fetch Data From Secured Route ---
  const fetchCapitalData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/capital', {
        params: { 
          from_date: fromDate, 
          to_date: toDate 
        }
      });
      
      if (response.data.success) {
        setSummary(response.data.summary);
        setAssets(response.data.data.assets || []);
        setLiabilities(response.data.data.liabilities || []);
      } else {
        toast.error(response.data.message || "Failed to process data");
      }
    } catch (err) {
      console.error("Error generating capital report:", err);
      toast.error(err.response?.data?.message || "Server error occurred while fetching balances");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCapitalData();
  }, [fromDate, toDate]);

  const handleAccountRowClick = (accountId) => {
    if (accountId) {
      navigate(`/ledger/${accountId}`);
    }
  };

  // --- 📊 EXPORT OPERATIONS ---

  const exportToExcel = () => {
    const headerStyle = {
      fill: { fgColor: { rgb: "2196F3" } },
      font: { color: { rgb: "FFFFFF" }, bold: true, sz: 12 },
      alignment: { horizontal: "center", vertical: "center" },
      border: { top: { style: "thin" }, bottom: { style: "thin" } }
    };

    const sectionStyle = {
      fill: { fgColor: { rgb: "E3F2FD" } },
      font: { color: { rgb: "0D47A1" }, bold: true, sz: 11 },
      alignment: { horizontal: "left" }
    };

    const cellStyle = { alignment: { horizontal: "left" }, border: { bottom: { style: "thin", color: { rgb: "EEEEEE" } } } };
    const amountStyle = { alignment: { horizontal: "right" }, numFmt: "#,##0.00", border: { bottom: { style: "thin", color: { rgb: "EEEEEE" } } } };
    const totalStyle = { font: { bold: true }, alignment: { horizontal: "right" }, numFmt: "#,##0.00", border: { top: { style: "thin" }, bottom: { style: "double" } } };

    let wb = XLSX.utils.book_new();
    
    const headers = [
      { v: "ACCOUNT CODE", s: headerStyle },
      { v: "ACCOUNT NAME", s: headerStyle },
      { v: "BALANCE (RS)", s: headerStyle }
    ];

    let rows = [];

    rows.push([{ v: "1. ASSETS", s: sectionStyle }, { v: "", s: sectionStyle }, { v: "", s: sectionStyle }]);
    assets.forEach(item => {
      rows.push([
        { v: item.account_code, s: cellStyle },
        { v: item.account_name, s: cellStyle },
        { v: Number(item.balance), s: amountStyle }
      ]);
    });
    rows.push([
      { v: "", s: cellStyle },
      { v: "Total Assets:", s: { font: { bold: true }, alignment: { horizontal: "right" } } },
      { v: Number(summary.total_assets), s: totalStyle }
    ]);

    rows.push([{ v: "" }, { v: "" }, { v: "" }]);

    rows.push([{ v: "2. LIABILITIES", s: sectionStyle }, { v: "", s: sectionStyle }, { v: "", s: sectionStyle }]);
    liabilities.forEach(item => {
      rows.push([
        { v: item.account_code, s: cellStyle },
        { v: item.account_name, s: cellStyle },
        { v: Number(item.balance), s: amountStyle }
      ]);
    });
    rows.push([
      { v: "", s: cellStyle },
      { v: "Total Liabilities:", s: { font: { bold: true }, alignment: { horizontal: "right" } } },
      { v: Number(summary.total_liabilities), s: totalStyle }
    ]);

    rows.push([{ v: "" }, { v: "" }, { v: "" }]);

    rows.push([
      { v: "NET OWNER EQUITY / CAPITAL (A - B):", s: { fill: { fgColor: { rgb: "0D47A1" } }, font: { color: { rgb: "FFFFFF" }, bold: true } } },
      { v: "", s: { fill: { fgColor: { rgb: "0D47A1" } } } },
      { v: Number(summary.net_capital), s: { fill: { fgColor: { rgb: "0D47A1" } }, font: { color: { rgb: "FFFFFF" }, bold: true }, alignment: { horizontal: "right" }, numFmt: "#,##0.00" } }
    ]);

    let ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [{ wch: 20 }, { wch: 45 }, { wch: 25 }];
    
    XLSX.utils.book_append_sheet(wb, ws, "Capital Statement");
    XLSX.writeFile(wb, `Capital_Report_${fromDate}_to_${toDate}.xlsx`);
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("CAPITAL & EQUITY REPORT", 14, 15);
      doc.setFontSize(10);
      doc.text(`Duration: ${fromDate} to ${toDate} | Generated on: ${today}`, 14, 22);

      let tableData = [];

      tableData.push([{ content: '1. ASSETS', colSpan: 3, styles: { fillColor: [227, 242, 253], textColor: [13, 71, 161], fontStyle: 'bold' } }]);
      assets.forEach(item => {
        tableData.push([item.account_code, item.account_name, { content: Number(item.balance).toLocaleString(undefined, { minimumFractionDigits: 2 }), styles: { halign: 'right' } }]);
      });
      tableData.push([
        '', 
        { content: 'Total Assets:', styles: { halign: 'right', fontStyle: 'bold' } }, 
        { content: Number(summary.total_assets).toLocaleString(undefined, { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' } }
      ]);

      tableData.push([{ content: '', colSpan: 3, styles: { cellPadding: 2 } }]);

      tableData.push([{ content: '2. LIABILITIES', colSpan: 3, styles: { fillColor: [255, 235, 235], textColor: [198, 40, 40], fontStyle: 'bold' } }]);
      liabilities.forEach(item => {
        tableData.push([item.account_code, item.account_name, { content: Number(item.balance).toLocaleString(undefined, { minimumFractionDigits: 2 }), styles: { halign: 'right' } }]);
      });
      tableData.push([
        '', 
        { content: 'Total Liabilities:', styles: { halign: 'right', fontStyle: 'bold' } }, 
        { content: Number(summary.total_liabilities).toLocaleString(undefined, { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' } }
      ]);

      tableData.push([{ content: '', colSpan: 3, styles: { cellPadding: 2 } }]);

      tableData.push([
        { content: 'NET CAPITAL (OWNER\'S EQUITY):', colSpan: 2, styles: { fillColor: [13, 71, 161], textColor: [255, 255, 255], fontStyle: 'bold' } },
        { content: Number(summary.net_capital).toLocaleString(undefined, { minimumFractionDigits: 2 }), styles: { fillColor: [13, 71, 161], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'right' } }
      ]);

      autoTable(doc, {
        startY: 30,
        head: [['Account Code', 'Account Name', 'Balance (Rs)']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [33, 150, 243] }
      });

      doc.save(`Capital_Report_${fromDate}_to_${toDate}.pdf`);
    } catch (error) {
      console.error(error);
      toast.error("PDF Export execution failed");
    }
  };

  const exportToPNG = async () => {
    if (reportRef.current) {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const link = document.createElement('a');
      link.href = canvas.toDataURL("image/png");
      link.download = `Capital_Statement_${fromDate}_to_${toDate}.png`;
      link.click();
    }
  };

  return (
    <>
      <NavigationBar />
      <div className="report-page-wrapper">
        <div className="report-card">
          <div className="report-header">
            <div className="report-header-top">
              <div className="report-header-left">
                <button type="button" className="back-btn erp-back-btn" onClick={() => navigate("/reports")}>
                  <FaArrowLeft />
                </button>
                <div>
                  <h3 className="report-title">
                    <FaBalanceScale className="report-title-icon" /> Net Capital Statement
                  </h3>
                  <p className="report-description">Assets, liabilities, and net owner equity overview.</p>
                </div>
              </div>
              {(assets.length > 0 || liabilities.length > 0) && (
                <div className="export-btn-group">
                  <button type="button" className="icon-button bg-pdf" onClick={exportToPDF} title="PDF"><FaFilePdf /></button>
                  <button type="button" className="icon-button bg-excel" onClick={exportToExcel} title="Excel"><FaFileExcel /></button>
                  <button type="button" className="icon-button bg-png" onClick={exportToPNG} title="PNG"><FaImage /></button>
                </div>
              )}
            </div>

            <div className="filter-group">
              <input type="date" className="date-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <input type="date" className="date-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Analyzing ledger balances...</div>
          ) : (
            <div ref={reportRef} className="pl-table-container">
              <div className="pl-header-section">
                <h3 className="pl-statement-title">CAPITAL & EQUITY STATEMENT</h3>
                <p className="pl-statement-subtitle">For the Period: {fromDate} to {toDate}</p>
              </div>

              <div className="pl-meta-row">
                <span>Assets: <strong style={{ color: '#2e7d32' }}>{Number(summary.total_assets).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
                <span>Liabilities: <strong style={{ color: '#c62828' }}>{Number(summary.total_liabilities).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
                <span>Net Capital: <strong>{Number(summary.net_capital).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
              </div>

              <table className="pl-table">
                <thead>
                  <tr>
                    <th style={{ width: '140px' }}>Account Code</th>
                    <th>Account Name</th>
                    <th className="text-right" style={{ width: '200px' }}>Balance (Rs)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="row-section-head">
                    <td colSpan="3"><FaUniversity /> 1. ASSETS</td>
                  </tr>
                  {assets.length > 0 ? assets.map((row, index) => (
                    <tr
                      key={`asset-${index}`}
                      onClick={() => handleAccountRowClick(row.account_id || row.id)}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && (row.account_id || row.id)) {
                          e.preventDefault();
                          handleAccountRowClick(row.account_id || row.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{row.account_code}</td>
                      <td>{row.account_name}</td>
                      <td className="text-right" style={{ color: '#2e7d32' }}>{Number(row.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="3" className="text-center" style={{ color: '#94a3b8' }}>No asset entries found.</td></tr>
                  )}
                  <tr className="font-bold" style={{ background: '#f8fafc' }}>
                    <td></td>
                    <td className="text-right">Total Assets (A):</td>
                    <td className="text-right font-bold" style={{ color: '#2e7d32' }}>{Number(summary.total_assets).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>

                  <tr><td colSpan="3" style={{ padding: '8px' }}></td></tr>

                  <tr className="row-section-head">
                    <td colSpan="3"><FaUniversity /> 2. LIABILITIES</td>
                  </tr>
                  {liabilities.length > 0 ? liabilities.map((row, index) => (
                    <tr
                      key={`liab-${index}`}
                      onClick={() => handleAccountRowClick(row.account_id || row.id)}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && (row.account_id || row.id)) {
                          e.preventDefault();
                          handleAccountRowClick(row.account_id || row.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{row.account_code}</td>
                      <td>{row.account_name}</td>
                      <td className="text-right" style={{ color: '#c62828' }}>{Number(row.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="3" className="text-center" style={{ color: '#94a3b8' }}>No liability entries found.</td></tr>
                  )}
                  <tr className="font-bold" style={{ background: '#f8fafc' }}>
                    <td></td>
                    <td className="text-right">Total Liabilities (B):</td>
                    <td className="text-right font-bold" style={{ color: '#c62828' }}>{Number(summary.total_liabilities).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>

              <div className="pl-summary-bar">
                <strong>Net Capital (Owner's Equity):</strong>
                <span className="pl-summary-value">{Number(summary.net_capital).toLocaleString(undefined, { minimumFractionDigits: 2 })} PKR</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default CapitalReport;