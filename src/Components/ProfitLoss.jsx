import React, { useState, useRef } from "react";
import { toast } from "react-toastify";
import * as XLSX from "xlsx-js-style";
import { FaArrowLeft, FaFileExcel, FaFilePdf, FaChartLine, FaImage } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useNavigate } from "react-router-dom";
import NavigationBar from "./NavigationBar";
import Footer from "./Footer";
import api from "../../api"; 
import "../Profitloss.css";

const ProfitLoss = () => {
  const navigate = useNavigate();
  const reportRef = useRef(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchProfitLoss = async () => {
    if (!fromDate || !toDate) {
      toast.error("Please select date range");
      return;
    }
    setLoading(true);
    setReport(null);
    try {
      const res = await api.get("/reports/profit-loss", {
        params: { fromDate, toDate }
      });
      setReport(res.data);
      toast.success("Profit & Loss loaded successfully");
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Server error";
      toast.error(`Failed: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const incomeItems = report?.details?.Income ? Object.values(report.details.Income) : [];
  const cogsItems = report?.details?.COGS ? Object.values(report.details.COGS) : [];
  const opexItems = report?.details?.OperatingExpense ? Object.values(report.details.OperatingExpense) : [];

  const totalRevenue = report?.totals?.totalIncome ?? 0;
  const totalCogs = report?.totals?.totalCogs ?? 0;
  const grossProfit = report?.totals?.grossProfit ?? 0;
  const totalOpex = report?.totals?.totalOpex ?? 0;
  const netProfit = report?.totals?.netProfit ?? 0;

  // Format numbers to professional standard (1,234.56 or (1,234.56))
  const formatCurrency = (amount, isNegativeDisplay = false) => {
    const val = Number(amount || 0);
    const formatted = Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (val < 0 || isNegativeDisplay) {
      return `(${formatted})`;
    }
    return formatted;
  };

  // ------------------------------
  // 📗 PROFESSIONAL EXCEL EXPORT
  // ------------------------------
  const exportToExcel = () => {
    if (!report) return;

    const companyHeaderStyle = {
      font: { name: "Arial", sz: 14, bold: true, color: { rgb: "1A202C" } },
      alignment: { horizontal: "center" }
    };

    const titleStyle = {
      font: { name: "Arial", sz: 12, bold: true, color: { rgb: "2D3748" } },
      alignment: { horizontal: "center" }
    };

    const subtitleStyle = {
      font: { name: "Arial", sz: 10, italic: true, color: { rgb: "718096" } },
      alignment: { horizontal: "center" }
    };

    const sectionStyle = {
      fill: { fgColor: { rgb: "EDF2F7" } },
      font: { bold: true, color: { rgb: "1A202C" }, sz: 11 },
      border: { bottom: { style: "thin", color: { rgb: "CBD5E0" } } }
    };

    const amountStyle = { alignment: { horizontal: "right" }, numFmt: "#,##0.00" };
    const subAccountStyle = { alignment: { horizontal: "left" }, font: { name: "Arial", sz: 10 } };

    const totalStyle = { 
      font: { bold: true, sz: 11 }, 
      fill: { fgColor: { rgb: "F7FAFC" } }, 
      border: { top: { style: "thin" }, bottom: { style: "thin" } } 
    };

    const grossProfitStyle = {
      font: { bold: true, color: { rgb: "047857" }, sz: 11 },
      fill: { fgColor: { rgb: "E6F4EA" } },
      border: { top: { style: "medium" }, bottom: { style: "medium" } }
    };

    // Conditional Styling for Excel Net Profit / Net Loss
    const isNetProfitPositive = netProfit >= 0;
    const netProfitStyle = {
      font: { bold: true, color: { rgb: isNetProfitPositive ? "047857" : "B91C1C" }, sz: 12 },
      fill: { fgColor: { rgb: isNetProfitPositive ? "E6F4EA" : "FEE2E2" } },
      border: { top: { style: "double" }, bottom: { style: "double" } }
    };

    const rows = [
      [{ v: "PROFIT & LOSS STATEMENT", s: companyHeaderStyle }, "", ""],
      [{ v: `Period: ${fromDate} to ${toDate}`, s: titleStyle }, "", ""],
      [{ v: `Generated on: ${new Date().toLocaleDateString()}`, s: subtitleStyle }, "", ""],
      [],
      [{ v: "ACCOUNT DESCRIPTION", s: sectionStyle }, "", { v: "AMOUNT", s: { ...sectionStyle, alignment: { horizontal: "right" } } }],
      
      // REVENUE
      [{ v: "REVENUE", s: sectionStyle }, "", ""],
    ];

    incomeItems.forEach(acc => {
      rows.push([{ v: `   ${acc.name}`, s: subAccountStyle }, "", { v: Number(acc.total), s: amountStyle }]);
    });
    rows.push([{ v: "TOTAL REVENUE", s: totalStyle }, "", { v: totalRevenue, s: { ...amountStyle, ...totalStyle } }]);
    
    // COGS
    rows.push([], [{ v: "COST OF GOODS SOLD (COGS)", s: sectionStyle }, "", ""]);
    cogsItems.forEach(acc => {
      rows.push([{ v: `   ${acc.name}`, s: subAccountStyle }, "", { v: -Number(acc.total), s: amountStyle }]);
    });
    rows.push([{ v: "TOTAL COST OF GOODS SOLD", s: totalStyle }, "", { v: -totalCogs, s: { ...amountStyle, ...totalStyle } }]);
    
    // GROSS PROFIT
    rows.push([], [{ v: "GROSS PROFIT", s: grossProfitStyle }, "", { v: grossProfit, s: { ...amountStyle, ...grossProfitStyle } }]);

    // OPERATING EXPENSES
    rows.push([], [{ v: "OPERATING EXPENSES", s: sectionStyle }, "", ""]);
    opexItems.forEach(acc => {
      rows.push([{ v: `   ${acc.name}`, s: subAccountStyle }, "", { v: -Number(acc.total), s: amountStyle }]);
    });
    rows.push([{ v: "TOTAL OPERATING EXPENSES", s: totalStyle }, "", { v: -totalOpex, s: { ...amountStyle, ...totalStyle } }]);

    // NET PROFIT / LOSS
    rows.push([], [{ v: isNetProfitPositive ? "NET PROFIT" : "NET LOSS", s: netProfitStyle }, "", { v: netProfit, s: { ...amountStyle, ...netProfitStyle } }]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 45 }, { wch: 5 }, { wch: 22 }];
    
    // Merge Header Rows
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Profit_Loss");
    XLSX.writeFile(wb, `Profit_Loss_Report_${fromDate}_to_${toDate}.xlsx`);
    toast.success("Professional Excel Downloaded");
  };

  // ------------------------------
  // 🖼️ PNG EXPORT
  // ------------------------------
  const exportToPNG = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: "#ffffff" });
    const link = document.createElement('a');
    link.href = canvas.toDataURL("image/png");
    link.download = `Profit_Loss_Report_${fromDate}_to_${toDate}.png`;
    link.click();
    toast.success("Image Downloaded");
  };

  // ------------------------------
  // 📄 PDF EXPORT
  // ------------------------------
  const exportToPDF = () => {
    if (!reportRef.current) return;
    html2canvas(reportRef.current, { scale: 2, backgroundColor: "#ffffff" }).then((canvas) => {
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "JPEG", 10, 10, pdfWidth - 20, pdfHeight - 10);
      pdf.save(`Profit_Loss_Report_${fromDate}_to_${toDate}.pdf`);
      toast.success("PDF Downloaded");
    });
  };

  const reportSubtitle = "Review revenue, cost of goods sold, operating expenses, and net result.";

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
                    <FaChartLine className="report-title-icon" /> Profit & Loss Statement
                  </h3>
                  <p className="report-description">{reportSubtitle}</p>
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
              <input type="date" className="date-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <input type="date" className="date-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              <button type="button" className="get-report-btn" onClick={fetchProfitLoss} disabled={loading}>
                {loading ? "Loading..." : "Get Report"}
              </button>
            </div>
          </div>

          {report && (
            <div ref={reportRef} className="pl-printable-container">
              <div className="pl-header-section">
                <h2 className="pl-statement-title">PROFIT & LOSS STATEMENT</h2>
                <p className="pl-statement-subtitle">
                  For the Period: <strong>{fromDate}</strong> to <strong>{toDate}</strong>
                </p>
                <p className="pl-statement-meta">
                  Generated on: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </div>

              <table className="pl-table">
                <thead>
                  <tr>
                    <th>Account Description</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="row-section-head">
                    <td colSpan="2">Revenue</td>
                  </tr>
                  {incomeItems.map(acc => (
                    <tr key={acc.id || acc.name}>
                      <td style={{ paddingLeft: '28px' }}>{acc.name}</td>
                      <td className="text-right">{formatCurrency(acc.total)}</td>
                    </tr>
                  ))}
                  <tr className="row-total-income">
                    <td>Total Revenue</td>
                    <td className="text-right">{formatCurrency(totalRevenue)}</td>
                  </tr>

                  <tr className="row-section-head">
                    <td colSpan="2">Cost Of Goods Sold (COGS)</td>
                  </tr>
                  {cogsItems.map(acc => (
                    <tr key={acc.id || acc.name}>
                      <td style={{ paddingLeft: '28px' }}>{acc.name}</td>
                      <td className="text-right">{formatCurrency(acc.total, true)}</td>
                    </tr>
                  ))}
                  <tr className="row-total-expense">
                    <td>Total Cost Of Goods Sold</td>
                    <td className="text-right">{formatCurrency(totalCogs, true)}</td>
                  </tr>

                  <tr className="row-gross-profit">
                    <td>Gross Profit</td>
                    <td className="text-right">{formatCurrency(grossProfit)}</td>
                  </tr>

                  <tr className="row-section-head">
                    <td colSpan="2">Operating Expenses</td>
                  </tr>
                  {opexItems.map(acc => (
                    <tr key={acc.id || acc.name}>
                      <td style={{ paddingLeft: '28px' }}>{acc.name}</td>
                      <td className="text-right">{formatCurrency(acc.total, true)}</td>
                    </tr>
                  ))}
                  <tr className="row-total-expense">
                    <td>Total Operating Expenses</td>
                    <td className="text-right">{formatCurrency(totalOpex, true)}</td>
                  </tr>

                  <tr 
                    className="row-net-profit" 
                    style={{ 
                      backgroundColor: netProfit >= 0 ? '#f0fdf4' : '#ffe8e8', 
                      borderTop: netProfit >= 0 ? '2px solid #a7f3d0' : '2px solid #fca5a5', 
                      borderBottom: netProfit >= 0 ? '2px solid #a7f3d0' : '2px solid #b91c1c' 
                    }}
                  >
                    <td>{netProfit >= 0 ? 'NET PROFIT' : 'NET LOSS'}</td>
                    <td className="text-right">{formatCurrency(netProfit)}</td>
                  </tr>
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

export default ProfitLoss;