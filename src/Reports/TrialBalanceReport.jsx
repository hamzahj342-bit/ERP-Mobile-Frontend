import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; 
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';
import api from '../../api';
import { FaArrowLeft, FaFileExcel, FaFilePdf, FaImage, FaCalendarAlt, FaBookOpen, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import '../Profitloss.css';
import { toast } from 'react-toastify';

// Export Libraries
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';
import html2canvas from 'html2canvas';
import { localToday, localYearStart } from '../utils/localDate';

const TrialBalanceReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef();
  const today = localToday();
  const currentYearStart = localYearStart();

  // --- States ---
  const [fromDate, setFromDate] = useState(currentYearStart);
  const [toDate, setToDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({
    total_opening_debit: 0, total_opening_credit: 0,
    total_current_debit: 0, total_current_credit: 0,
    total_closing_debit: 0, total_closing_credit: 0,
    is_balanced: true
  });

  const fetchTrialBalance = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/trial-balance', {
        params: { from_date: fromDate, to_date: toDate }
      });
      if (response.data.success) {
        setRows(response.data.data || []);
        setTotals(response.data.totals);
      } else {
        toast.error(response.data.message || "Failed to fetch statements");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error connecting to server for summary grids.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrialBalance();
  }, [fromDate, toDate]);

  const renderAmount = (amount) => amount > 0 ? Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-';

  // --- 📊 EXCEL ADVANCED STYLING ENGINE ---
  const exportToExcel = () => {
    let wb = XLSX.utils.book_new();
    
    // Core Palettes & Styles Mapping
    const titleStyle = {
      font: { name: "Calibri", bold: true, sz: 16, color: { rgb: "1A202C" } },
      alignment: { horizontal: "left" }
    };
    
    const durationStyle = {
      font: { name: "Calibri", italic: true, sz: 11, color: { rgb: "718096" } },
      alignment: { horizontal: "left" }
    };

    const mainHeaderStyle = {
      fill: { fgColor: { rgb: "1A202C" } },
      font: { name: "Calibri", color: { rgb: "FFFFFF" }, bold: true, sz: 11 },
      alignment: { horizontal: "center", vertical: "center" },
      border: { top: { style: "thin", color: { rgb: "4A5568" } }, bottom: { style: "thin", color: { rgb: "4A5568" } } }
    };

    const subHeaderStyle = (bgColor, textColor) => ({
      fill: { fgColor: { rgb: bgColor } },
      font: { name: "Calibri", color: { rgb: textColor }, bold: true, sz: 10 },
      alignment: { horizontal: "center", vertical: "center" },
      border: { bottom: { style: "thin", color: { rgb: "CBD5E1" } }, right: { style: "thin", color: { rgb: "E2E8F0" } } }
    });

    const cellText = (isZebra) => ({
      fill: { fgColor: { rgb: isZebra ? "F8FAFC" : "FFFFFF" } },
      font: { name: "Calibri", sz: 10, color: { rgb: "334155" } },
      alignment: { horizontal: "left", vertical: "center" },
      border: { bottom: { style: "thin", color: { rgb: "F1F5F9" } } }
    });

    const cellAmount = (isZebra, colorHex, isBold = false) => ({
      fill: { fgColor: { rgb: isZebra ? "F8FAFC" : "FFFFFF" } },
      font: { name: "Calibri", sz: 10, color: { rgb: colorHex }, bold: isBold },
      alignment: { horizontal: "right", vertical: "center" },
      numFmt: "#,##0.00;(#,##0.00);\"-\"",
      border: { bottom: { style: "thin", color: { rgb: "F1F5F9" } } }
    });

    const totalLabelStyle = {
      fill: { fgColor: { rgb: "E2E8F0" } },
      font: { name: "Calibri", bold: true, sz: 11, color: { rgb: "1A202C" } },
      alignment: { horizontal: "right", vertical: "center" },
      border: { top: { style: "thin", color: { rgb: "1A202C" } }, bottom: { style: "double", color: { rgb: "1A202C" } } }
    };

    const totalAmountStyle = (colorHex) => ({
      fill: { fgColor: { rgb: "E2E8F0" } },
      font: { name: "Calibri", bold: true, sz: 11, color: { rgb: colorHex } },
      alignment: { horizontal: "right", vertical: "center" },
      numFmt: "#,##0.00;(#,##0.00);\"-\"",
      border: { top: { style: "thin", color: { rgb: "1A202C" } }, bottom: { style: "double", color: { rgb: "1A202C" } } }
    });

    // Building Rows Matrix Array
    let rowsData = [];
    
    // Row 1 & 2: Report Titles
    rowsData.push([{ v: "DETAILED TRIAL BALANCE MATRIX", s: titleStyle }]);
    rowsData.push([{ v: `Duration Timeline: ${fromDate} to ${toDate} | Generated on: ${today}`, s: durationStyle }]);
    rowsData.push([]); // Spacing

    // Row 4: Multi-tier Parent Headings
    rowsData.push([
      { v: "ACCOUNT DETAILS", s: mainHeaderStyle }, { v: "", s: mainHeaderStyle }, { v: "", s: mainHeaderStyle },
      { v: "OPENING BALANCE", s: mainHeaderStyle }, { v: "", s: mainHeaderStyle },
      { v: "TRANSACTIONS (PERIOD)", s: mainHeaderStyle }, { v: "", s: mainHeaderStyle },
      { v: "CLOSING BALANCE", s: mainHeaderStyle }, { v: "", s: mainHeaderStyle }
    ]);

    // Row 5: Column Definition Labels
    rowsData.push([
      { v: "A/C CODE", s: subHeaderStyle("4A5568", "FFFFFF") },
      { v: "ACCOUNT TITLE", s: subHeaderStyle("4A5568", "FFFFFF") },
      { v: "CLASSIFICATION", s: subHeaderStyle("4A5568", "FFFFFF") },
      { v: "DEBIT", s: subHeaderStyle("718096", "FFFFFF") },
      { v: "CREDIT", s: subHeaderStyle("718096", "FFFFFF") },
      { v: "DEBIT", s: subHeaderStyle("63B3ED", "1A202C") },
      { v: "CREDIT", s: subHeaderStyle("63B3ED", "1A202C") },
      { v: "DEBIT", s: subHeaderStyle("2D3748", "FFFFFF") },
      { v: "CREDIT", s: subHeaderStyle("2D3748", "FFFFFF") }
    ]);

    // Dynamic Account Rows Injection with Zebra Striping
    rows.forEach((r, idx) => {
      const isZebra = idx % 2 === 1;
      rowsData.push([
        { v: r.account_code, s: cellText(isZebra) },
        { v: r.account_name, s: cellText(isZebra) },
        { v: r.category_name, s: cellText(isZebra) },
        { v: r.opening_debit > 0 ? Number(r.opening_debit) : "", s: cellAmount(isZebra, "198754") },
        { v: r.opening_credit > 0 ? Number(r.opening_credit) : "", s: cellAmount(isZebra, "DC3545") },
        { v: r.current_debit > 0 ? Number(r.current_debit) : "", s: cellAmount(isZebra, "198754") },
        { v: r.current_credit > 0 ? Number(r.current_credit) : "", s: cellAmount(isZebra, "DC3545") },
        { v: r.closing_debit > 0 ? Number(r.closing_debit) : "", s: cellAmount(isZebra, "198754", true) },
        { v: r.closing_credit > 0 ? Number(r.closing_credit) : "", s: cellAmount(isZebra, "DC3545", true) }
      ]);
    });

    // Grand Accounting Summary Bottom Row
    rowsData.push([
      { v: "Grand Aggregates Summary:", s: totalLabelStyle },
      { v: "", s: totalLabelStyle },
      { v: "", s: totalLabelStyle },
      { v: Number(totals.total_opening_debit), s: totalAmountStyle("198754") },
      { v: Number(totals.total_opening_credit), s: totalAmountStyle("DC3545") },
      { v: Number(totals.total_current_debit), s: totalAmountStyle("198754") },
      { v: Number(totals.total_current_credit), s: totalAmountStyle("DC3545") },
      { v: Number(totals.total_closing_debit), s: totalAmountStyle("198754") },
      { v: Number(totals.total_closing_credit), s: totalAmountStyle("DC3545") }
    ]);

    let ws = XLSX.utils.aoa_to_sheet(rowsData);

    // Dynamic Merges Setup (Account Details merges, Opening, Tx, Closing top row block merges)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, // Title span
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }, // Subtitle span
      { s: { r: 3, c: 0 }, e: { r: 3, c: 2 } }, // Account Details Group Merge
      { s: { r: 3, c: 3 }, e: { r: 3, c: 4 } }, // Opening Group Merge
      { s: { r: 3, c: 5 }, e: { r: 3, c: 6 } }, // Transactions Group Merge
      { s: { r: 3, c: 7 }, e: { r: 3, c: 8 } }, // Closing Group Merge
      { s: { r: rows.length + 5, c: 0 }, e: { r: rows.length + 5, c: 2 } } // Bottom summary text merge
    ];

    // Perfect Layout Widths Optimization
    ws['!cols'] = [
      { wch: 14 }, { wch: 28 }, { wch: 18 },
      { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 16 }, { wch: 16 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Trial Balance Summary");
    XLSX.writeFile(wb, `Trial_Balance_${fromDate}_to_${toDate}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(14);
    doc.text("DETAILED TRIAL BALANCE STATEMENT", 14, 12);
    doc.setFontSize(10);
    doc.text(`Duration Frame: ${fromDate} to ${toDate}`, 14, 18);

    const pdfRows = rows.map(r => [
      r.account_code, r.account_name, r.category_name,
      renderAmount(r.opening_debit), renderAmount(r.opening_credit),
      renderAmount(r.current_debit), renderAmount(r.current_credit),
      renderAmount(r.closing_debit), renderAmount(r.closing_credit)
    ]);

    pdfRows.push([
      { content: 'Grand Accumulations Summary:', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240] } },
      { content: renderAmount(totals.total_opening_debit), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      { content: renderAmount(totals.total_opening_credit), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      { content: renderAmount(totals.total_current_debit), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      { content: renderAmount(totals.total_current_credit), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      { content: renderAmount(totals.total_closing_debit), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      { content: renderAmount(totals.total_closing_credit), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
    ]);

    autoTable(doc, {
      startY: 24,
      head: [
        [{ content: 'Account Details', colSpan: 3, styles: { halign: 'center' } }, { content: 'Opening Balance', colSpan: 2, styles: { halign: 'center' } }, { content: 'Transactions', colSpan: 2, styles: { halign: 'center' } }, { content: 'Closing Balance', colSpan: 2, styles: { halign: 'center' } }],
        ['Code', 'Account Title', 'Classification', 'Debit', 'Credit', 'Debit', 'Credit', 'Debit', 'Credit']
      ],
      body: pdfRows,
      theme: 'grid',
      headStyles: { fillColor: [52, 58, 64] }
    });
    doc.save(`Trial_Balance_Detailed_${fromDate}.pdf`);
  };

  const exportToPNG = async () => {
    if (reportRef.current) {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const link = document.createElement('a');
      link.href = canvas.toDataURL("image/png");
      link.download = `Trial_Balance_${fromDate}_to_${toDate}.png`;
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
                    <FaBookOpen className="report-title-icon" /> Detailed Trial Balance
                  </h3>
                  <p className="report-description">Opening, period transactions, and closing balances matrix.</p>
                </div>
              </div>
              {rows.length > 0 && (
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

            {rows.length > 0 && (
              <div className="pl-meta-row" style={{ marginTop: '8px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {totals.is_balanced ? <FaCheckCircle style={{ color: '#2e7d32' }} /> : <FaExclamationTriangle style={{ color: '#dc3545' }} />}
                  {totals.is_balanced ? 'Balanced' : 'Out of Balance'}
                </span>
                <span>Closing Dr: <strong style={{ color: '#2e7d32' }}>{renderAmount(totals.total_closing_debit)}</strong></span>
                <span>Closing Cr: <strong style={{ color: '#c62828' }}>{renderAmount(totals.total_closing_credit)}</strong></span>
              </div>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Syncing ledger matrix...</div>
          ) : (
            <div ref={reportRef} className="pl-table-container">
              <div className="pl-header-section">
                <h3 className="pl-statement-title">TRIAL BALANCE STATEMENT</h3>
                <p className="pl-statement-subtitle">For the Period: {fromDate} to {toDate}</p>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="pl-table" style={{ minWidth: '900px' }}>
                  <thead>
                    <tr>
                      <th rowSpan="2" style={{ width: '100px' }}>A/C Code</th>
                      <th rowSpan="2">Account Title</th>
                      <th rowSpan="2">Classification</th>
                      <th colSpan="2" className="text-center" style={{ backgroundColor: '#4a5568', color: '#fff' }}>Opening Balance</th>
                      <th colSpan="2" className="text-center" style={{ backgroundColor: '#2b6cb0', color: '#fff' }}>Transactions</th>
                      <th colSpan="2" className="text-center" style={{ backgroundColor: '#1a202c', color: '#e2e8f0' }}>Closing Balance</th>
                    </tr>
                    <tr>
                      <th className="text-right" style={{ width: '100px', backgroundColor: '#718096', color: '#fff' }}>Debit</th>
                      <th className="text-right" style={{ width: '100px', backgroundColor: '#718096', color: '#fff' }}>Credit</th>
                      <th className="text-right" style={{ width: '100px', backgroundColor: '#63b3ed', color: '#1a202c' }}>Debit</th>
                      <th className="text-right" style={{ width: '100px', backgroundColor: '#63b3ed', color: '#1a202c' }}>Credit</th>
                      <th className="text-right" style={{ width: '110px', backgroundColor: '#2d3748', color: '#fff' }}>Debit</th>
                      <th className="text-right" style={{ width: '110px', backgroundColor: '#2d3748', color: '#fff' }}>Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length > 0 ? rows.map((row, idx) => (
                      <tr key={`dt-row-${idx}`}>
                        <td style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '11px' }}>{row.account_code}</td>
                        <td>{row.account_name}</td>
                        <td style={{ color: '#94a3b8', fontSize: '11px' }}>{row.category_name}</td>
                        <td className="text-right" style={{ color: '#2e7d32' }}>{renderAmount(row.opening_debit)}</td>
                        <td className="text-right" style={{ color: '#c62828' }}>{renderAmount(row.opening_credit)}</td>
                        <td className="text-right" style={{ color: '#2e7d32' }}>{renderAmount(row.current_debit)}</td>
                        <td className="text-right" style={{ color: '#c62828' }}>{renderAmount(row.current_credit)}</td>
                        <td className="text-right font-bold" style={{ color: '#2e7d32', backgroundColor: '#f8fafc' }}>{renderAmount(row.closing_debit)}</td>
                        <td className="text-right font-bold" style={{ color: '#c62828', backgroundColor: '#f8fafc' }}>{renderAmount(row.closing_credit)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan="9" className="text-center" style={{ padding: '40px', color: '#94a3b8' }}>No records found.</td></tr>
                    )}
                    <tr className="font-bold" style={{ background: '#f1f5f9' }}>
                      <td colSpan="3" className="text-right">Grand Totals:</td>
                      <td className="text-right" style={{ color: '#2e7d32' }}>{renderAmount(totals.total_opening_debit)}</td>
                      <td className="text-right" style={{ color: '#c62828' }}>{renderAmount(totals.total_opening_credit)}</td>
                      <td className="text-right" style={{ color: '#2e7d32' }}>{renderAmount(totals.total_current_debit)}</td>
                      <td className="text-right" style={{ color: '#c62828' }}>{renderAmount(totals.total_current_credit)}</td>
                      <td className="text-right" style={{ color: '#2e7d32' }}>{renderAmount(totals.total_closing_debit)}</td>
                      <td className="text-right" style={{ color: '#c62828' }}>{renderAmount(totals.total_closing_credit)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="pl-summary-bar">
                <strong>{totals.is_balanced ? 'Balanced' : 'Out of Balance'}</strong>
                <span className="pl-summary-value">
                  Dr: {renderAmount(totals.total_closing_debit)} | Cr: {renderAmount(totals.total_closing_credit)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default TrialBalanceReport;