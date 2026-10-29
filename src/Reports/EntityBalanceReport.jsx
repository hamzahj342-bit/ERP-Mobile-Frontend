import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; 
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';
import api from '../../api';
import { FaUserFriends, FaArrowLeft, FaFileExcel, FaFilePdf, FaImage, FaSearch, FaUserTie, FaTruckLoading } from 'react-icons/fa';
import '../Profitloss.css';
import Pagination from '../Components/Pagination'; // Pagination component import kiya
import { toast } from 'react-toastify';

// Export Libraries
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';
import html2canvas from 'html2canvas';
import { localToday } from '../utils/localDate';

const EntityBalanceReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef();
  const today = localToday();

  const [reportType, setReportType] = useState('customer'); 
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(""); 
  const [data, setData] = useState([]);
  
  // Pagination States
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // --- 🔍 Native Debounce Logic ---
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Nayi search par page 1 par reset karein
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchBalances = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/entity-balance', {
        params: { 
          type: reportType,
          page: page,
          limit: 50,
          search: debouncedSearch
        }
      });
      
      // Backend response structure ke mutabiq data set karein
      setData(response.data.data || []);
      setTotalPages(response.data.totalPages || 1);
      setTotalItems(response.data.totalItems || 0);
    } catch (err) {
      console.error("Error fetching balances:", err);
      toast.error("Failed to fetch balance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [reportType, page, debouncedSearch]);

  // --- EXPORT FUNCTIONS ---

  const exportToExcel = () => {
    const headerStyle = {
      fill: { fgColor: { rgb: "2196F3" } },
      font: { color: { rgb: "FFFFFF" }, bold: true, sz: 12 },
      alignment: { horizontal: "center", vertical: "center" },
      border: { top: { style: "thin" }, bottom: { style: "thin" } }
    };

    const cellStyle = { alignment: { horizontal: "left" }, border: { bottom: { style: "thin", color: { rgb: "EEEEEE" } } } };
    const amountStyle = { alignment: { horizontal: "right" }, numFmt: "#,##0.00", border: { bottom: { style: "thin" } } };

    let wb = XLSX.utils.book_new();
    const headers = [
      { v: "SR #", s: headerStyle },
      { v: "NAME", s: headerStyle },
      { v: "CLOSING BALANCE (RS)", s: headerStyle }
    ];

    const rows = data.map((item, idx) => [
      { v: (page - 1) * 50 + (idx + 1), s: cellStyle },
      { v: item.name, s: cellStyle },
      { v: Number(item.balance), s: amountStyle }
    ]);

    let ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [{ wch: 10 }, { wch: 40 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws, "Balances");
    XLSX.writeFile(wb, `${reportType}_Balances_Page${page}.xlsx`);
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(`${reportType.toUpperCase()} BALANCE REPORT`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Page: ${page} | Generated on: ${today}`, 14, 22);

      const tableData = data.map((item, idx) => [
        (page - 1) * 50 + (idx + 1),
        item.name || 'N/A',
        { content: Number(item.balance || 0).toLocaleString(), styles: { halign: 'right' } }
      ]);

      autoTable(doc, {
        startY: 30,
        head: [['#', 'Entity Name', 'Balance (Rs)']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [33, 150, 243] }
      });

      doc.save(`${reportType}_Balance_Page${page}.pdf`);
    } catch (error) {
      toast.error("PDF Export failed");
    }
  };

  const exportToPNG = async () => {
    if (reportRef.current) {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const link = document.createElement('a');
      link.href = canvas.toDataURL("image/png");
      link.download = `${reportType}_Balances_Page${page}.png`;
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
                    <FaUserFriends className="report-title-icon" /> Financial Balances Summary
                  </h3>
                  <p className="report-description">Customer and supplier closing balance overview.</p>
                </div>
              </div>
              {data.length > 0 && (
                <div className="export-btn-group">
                  <button type="button" className="icon-button bg-pdf" onClick={exportToPDF} title="PDF"><FaFilePdf /></button>
                  <button type="button" className="icon-button bg-excel" onClick={exportToExcel} title="Excel"><FaFileExcel /></button>
                  <button type="button" className="icon-button bg-png" onClick={exportToPNG} title="PNG"><FaImage /></button>
                </div>
              )}
            </div>

            <div className="filter-group">
              <input type="text" className="date-input" placeholder="Search Name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ minWidth: '200px' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #e2e8f0', marginTop: '8px' }}>
              {['customer', 'supplier'].map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => { setReportType(type); setPage(1); }}
                  style={{
                    padding: '8px 18px', border: 'none', background: 'none', cursor: 'pointer',
                    borderBottom: reportType === type ? '3px solid #334155' : 'none',
                    color: reportType === type ? '#334155' : '#94a3b8',
                    fontWeight: '600', fontSize: '12px', textTransform: 'capitalize'
                  }}
                >
                  {type === 'customer' ? <FaUserFriends /> : <FaTruckLoading />} {type}s
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Loading Balances...</div>
          ) : (
            <div ref={reportRef} className="pl-table-container">
              <div className="pl-header-section">
                <h3 className="pl-statement-title" style={{ textTransform: 'capitalize' }}>{reportType} Wise Closing Balances</h3>
                <p className="pl-statement-subtitle">Showing {data.length} of {totalItems} records</p>
              </div>

              <table className="pl-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>#</th>
                    <th>Name</th>
                    <th className="text-right">Closing Balance (Rs)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length > 0 ? data.map((row, index) => (
                    <tr
                      key={index}
                      onClick={() => {
                        if (row.id) {
                          navigate(`/entity-ledger?entity_id=${row.id}&type=${reportType}`);
                        } else {
                          toast.error("Entity ID missing. Cannot open ledger.");
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ color: '#94a3b8' }}>{(page - 1) * 50 + (index + 1)}</td>
                      <td className="font-bold">{row.name}</td>
                      <td className="text-right font-bold" style={{ color: row.balance >= 0 ? '#2e7d32' : '#c62828' }}>
                        {Math.abs(row.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        <span style={{ fontSize: '10px', marginLeft: '4px' }}>{row.balance >= 0 ? '(Dr)' : '(Cr)'}</span>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="3" className="text-center" style={{ padding: '30px' }}>No records found.</td></tr>
                  )}
                </tbody>
              </table>

              <div style={{ marginTop: '20px' }}>
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={(newPage) => setPage(newPage)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default EntityBalanceReport;