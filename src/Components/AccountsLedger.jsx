import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import Select from "react-select";
import * as XLSX from "xlsx-js-style";
import { FaArrowLeft, FaFileExcel, FaFilePdf, FaImage, FaBook } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import NavigationBar from "./NavigationBar";
import Footer from "./Footer";
import api from "../../api";
import "../Profitloss.css"; 
import { localToday, localYearStart } from "../utils/localDate";

const AccountLedger = () => {
  const navigate = useNavigate();
  const { accountId } = useParams();
  const reportRef = useRef(null);
  const today = localToday();
  const currentYearStart = localYearStart();

  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(accountId || "");
  const [fromDate, setFromDate] = useState(currentYearStart);
  const [toDate, setToDate] = useState(today);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const accountOptions = accounts.map(acc => ({ value: acc.id, label: `${acc.account_name} (${acc.category_name})` }));

  // --- 1. Fetch Accounts ---
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await api.get("/accounts");
        setAccounts(res.data);
      } catch (err) {
        toast.error("Failed to load accounts");
      }
    };
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (accountId) {
      setSelectedAccount(accountId);
      fetchLedger(accountId, currentYearStart, today);
    }
  }, [accountId]);

  // --- 2. Fetch Ledger Report ---
  const fetchLedger = async (accountIdToUse = selectedAccount, fromDateValue = fromDate, toDateValue = toDate) => {
    if (!accountIdToUse || !fromDateValue || !toDateValue) {
      toast.error("Please select account and date range");
      return;
    }
    setLoading(true);
    try {
      const res = await api.get("/reports/ledger", {
        params: { accountId: accountIdToUse, fromDate: fromDateValue, toDate: toDateValue }
      });
      setReport(res.data);
      toast.success("Ledger loaded successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Error fetching ledger");
    } finally {
      setLoading(false);
    }
  };

  const calculateRunningBalance = (index, items, openingBalance, category) => {
    const naturalDebit = ['Assets', 'Expense'].includes(category);
    let balance = Number(openingBalance);
    for (let i = 0; i <= index; i++) {
      const debit = Number(items[i].debit) || 0;
      const credit = Number(items[i].credit) || 0;
      balance += naturalDebit ? (debit - credit) : (credit - debit);
    }
    return balance;
  };

  // --- 📗 PROFESSIONAL EXCEL EXPORT ---
  const exportToExcel = () => {
    if (!report) return;

    const headerStyle = {
      fill: { fgColor: { rgb: "2C3E50" } },
      font: { color: { rgb: "FFFFFF" }, bold: true },
      alignment: { horizontal: "center" }
    };

    const subHeaderStyle = {
      fill: { fgColor: { rgb: "F8F9FA" } },
      font: { bold: true },
      border: { bottom: { style: "thin" } }
    };

    const numStyle = { alignment: { horizontal: "right" }, numFmt: "#,##0.00" };

    const rows = [
      [{ v: `Account Ledger: ${report.accountName}`, s: { font: { bold: true, sz: 14 } } }, "", "", "", "", ""],
      [{ v: `Period: ${fromDate} to ${toDate}`, s: { font: { italic: true } } }, "", "", "", "", ""],
      [],
      [{ v: "Opening Balance", s: subHeaderStyle }, "", "", "", "", { v: Number(report.openingBalance), s: { ...numStyle, font: { bold: true } } }],
      [{ v: "DATE", s: headerStyle }, { v: "DESCRIPTION", s: headerStyle }, { v: "PARTY / ENTITY", s: headerStyle }, { v: "DEBIT", s: headerStyle }, { v: "CREDIT", s: headerStyle }, { v: "BALANCE", s: headerStyle }],
    ];

    report.ledger.forEach((t, index) => {
      const rb = calculateRunningBalance(index, report.ledger, report.openingBalance, report.categoryName);
      rows.push([
        { v: t.date.split('T')[0] },
        { v: t.description || t.narration },
        { v: t.entity_name || "-" },
        { v: Number(t.debit), s: numStyle },
        { v: Number(t.credit), s: numStyle },
        { v: Number(rb), s: { ...numStyle, font: { bold: true } } }
      ]);
    });

    rows.push(
      [],
      [{ v: "Closing Balance", s: { ...subHeaderStyle, fill: { fgColor: { rgb: "E8F5E9" } } } }, "", "", "", "", { v: Number(report.closingBalance), s: { ...numStyle, font: { bold: true }, fill: { fgColor: { rgb: "E8F5E9" } } } }]
    );

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 15 }, { wch: 36 }, { wch: 24 }, { wch: 15 }, { wch: 15 }, { wch: 18 }];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ledger");
    XLSX.writeFile(wb, `${report.accountName}_Ledger.xlsx`);
  };

  // --- 🖼️ PNG EXPORT ---
  const exportToPNG = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2 });
    const link = document.createElement('a');
    link.href = canvas.toDataURL("image/png");
    link.download = `${report.accountName}_Ledger.png`;
    link.click();
  };

  const exportToPDF = () => {
    if (!reportRef.current) return;
    html2canvas(reportRef.current, { scale: 3 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
      pdf.save(`${report.accountName}_Ledger.pdf`);
    });
  };

  const selectStyles = {
    control: (provided) => ({
      ...provided,
      minHeight: "32px",
      height: "32px",
      borderRadius: "6px",
      borderColor: "#e2e8f0",
      boxShadow: "none",
      fontSize: "12px"
    }),
    valueContainer: (provided) => ({
      ...provided,
      padding: "0 8px",
      height: "30px"
    }),
    indicatorsContainer: (provided) => ({
      ...provided,
      height: "30px"
    }),
    input: (provided) => ({
      ...provided,
      margin: 0,
      padding: 0
    }),
    singleValue: (provided) => ({
      ...provided,
      fontSize: "12px",
      color: "#334155"
    }),
    placeholder: (provided) => ({
      ...provided,
      fontSize: "12px",
      color: "#94a3b8"
    }),
    menu: (provided) => ({
      ...provided,
      zIndex: 9999,
      fontSize: "12px"
    }),
    option: (provided) => ({
      ...provided,
      fontSize: "12px",
      padding: "6px 10px"
    })
  };

  return (
    <>
      <NavigationBar />
      <div className="report-page-wrapper">
        <div className="report-card">
          <div className="report-header">
            <div className="report-header-top">
              <div className="report-header-left">
                <button type="button" className="back-btn erp-back-btn" onClick={() => navigate("/reports")}><FaArrowLeft /></button>
                <div>
                  <h3 className="report-title"><FaBook className="report-title-icon" /> Account Ledger Report</h3>
                  <p className="report-description">Review account activity, party references, and running balances in a compact ledger view.</p>
                </div>
              </div>
              {report && (
                <div className="export-btn-group">
                  <button type="button" className="icon-button bg-pdf" onClick={exportToPDF} title="PDF"><FaFilePdf /></button>
                  <button type="button" className="icon-button bg-excel" onClick={exportToExcel} title="Excel"><FaFileExcel /></button>
                  <button type="button" className="icon-button bg-png" onClick={exportToPNG} title="PNG"><FaImage /></button>
                </div>
              )}
            </div>
            <div className="filter-group">
              <div className="react-select-shell">
                <Select
                  classNamePrefix="react-select"
                  options={accountOptions}
                  value={accountOptions.find(opt => opt.value === selectedAccount) || null}
                  onChange={(option) => setSelectedAccount(option?.value || "")}
                  placeholder="Select Account"
                  isClearable
                  styles={selectStyles}
                />
              </div>
              <input type="date" className="date-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <input type="date" className="date-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              <button type="button" className="get-report-btn" onClick={() => fetchLedger(selectedAccount, fromDate, toDate)}>{loading ? "..." : "Get Report"}</button>
            </div>
          </div>

          {report && (
            <div ref={reportRef} className="pl-table-container">
              <div className="pl-header-section">
                <h3 className="pl-statement-title">{report.accountName}</h3>
                <p className="pl-statement-subtitle">{report.categoryName} Account</p>
              </div>

              <div className="pl-meta-row">
                <span><strong>Opening Balance:</strong> <span className="pl-value-strong">{Number(report.openingBalance).toLocaleString()}</span></span>
                <span><strong>Period:</strong> {fromDate} to {toDate}</span>
              </div>

              <table className="pl-table">
                <thead>
                  <tr>
                    <th className="text-center" style={{ minWidth: '110px' }}>Date</th>
                    <th style={{ minWidth: '200px' }}>Description</th>
                    <th style={{ minWidth: '140px' }}>Party / Entity</th>
                    <th className="text-right" style={{ minWidth: '100px' }}>Debit</th>
                    <th className="text-right" style={{ minWidth: '100px' }}>Credit</th>
                    <th className="text-right" style={{ minWidth: '110px' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {report.ledger.map((t, index) => {
                    const rb = calculateRunningBalance(index, report.ledger, report.openingBalance, report.categoryName);
                    return (
                      <tr key={index}>
                        <td className="text-center">{t.date.split('T')[0]}</td>
                        <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={t.description || t.narration}>{t.description || t.narration}</td>
                        <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }} title={t.entity_name || '-'}>{t.entity_name || '-'}</td>
                        <td className="text-right">{t.debit > 0 ? Number(t.debit).toLocaleString() : '-'}</td>
                        <td className="text-right">{t.credit > 0 ? Number(t.credit).toLocaleString() : '-'}</td>
                        <td className="text-right font-bold">{Number(rb).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="pl-summary-bar">
                <span><strong>Closing Balance: </strong> 
                  <span className="pl-summary-value">PKR {Number(report.closingBalance).toLocaleString()}</span>
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

export default AccountLedger;

