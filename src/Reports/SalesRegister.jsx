import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';
import api from '../../api';
import { FaArrowLeft, FaFileExcel, FaFilePdf, FaImage, FaSync, FaCashRegister } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';
import html2canvas from 'html2canvas';
import '../Profitloss.css';
import { localToday, localFirstOfMonth } from '../utils/localDate';

const SalesRegister = () => {
  const navigate = useNavigate();
  const reportRef = useRef();

  const today = localToday();
  const firstOfMonth = localFirstOfMonth();

  // Active Tab: 'FP' (Finished Goods) | 'RM' (Raw Material)
  const [activeTab, setActiveTab] = useState('RM');
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);
  const [taxableType, setTaxableType] = useState('ALL'); // 'ALL' | 'TAXABLE' | 'NON_TAXABLE'
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [registerData, setRegisterData] = useState([]);

  // Fetch Sales Register Data from General Ledger Backend API
  const fetchSalesRegister = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/sales-register', {
        params: { 
          fromDate, 
          toDate, 
          taxable_type: taxableType
        }
      });

      const fullRegister = response.data?.register || [];
      
      // Filter dataset based on selected Tab
      const targetSaleType = activeTab === 'FP' ? 'Finished Goods' : 'Raw Material';
      const filteredList = fullRegister.filter(row => row.sale_type === targetSaleType);

      setRegisterData(filteredList);
    } catch (err) {
      console.error('Sales Register Fetch Error:', err);
      toast.error('Failed to load Sales Register data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesRegister();
  }, [fromDate, toDate, taxableType, activeTab]);

  // Client-side search filtering
  const filteredRegister = registerData.filter(row => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    
    return (
      (row.invoice_no && row.invoice_no.toLowerCase().includes(term)) ||
      (row.customer_name && row.customer_name.toLowerCase().includes(term)) ||
      (row.customer_id && String(row.customer_id).toLowerCase().includes(term)) ||
      (row.invoice_type && row.invoice_type.toLowerCase().includes(term))
    );
  });

  // Dynamic Totals based on search/filter results
  const totals = filteredRegister.reduce((acc, row) => {
    acc.total_revenue += Number(row.revenue || 0);
    acc.total_cogs += Number(row.cogs || 0);
    acc.net_profit += Number(row.net_profit || 0);
    return acc;
  }, { total_revenue: 0, total_cogs: 0, net_profit: 0 });

  // Dynamic Navigation Link
  const getInvoiceDetailLink = (row) => {
    if (!row.invoice_no) return null;
    if (activeTab === 'RM') return `/rm-invoice/${row.invoice_no}`;
    if (activeTab === 'FP') return `/fp-invoice-detail/${row.invoice_no}`;
    return null;
  };

  const formatCurrency = (amount) => {
    const val = Number(amount || 0);
    if (val < 0) {
      return `-Rs. ${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `Rs. ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Excel Export Logic
  const exportToExcel = () => {
    if (!filteredRegister.length) return toast.error('No data available to export!');

    const wb = XLSX.utils.book_new();
    const titleRow = [`${activeTab === 'RM' ? 'Inventory' : 'Finished Goods'} Sales Register Report (${taxableType})`];
    const dateRow = [`Period: ${fromDate} to ${toDate}`];
    const emptyRow = [];

    const headers = ['Date', 'Invoice No.', 'Customer Name', 'Taxable', 'Invoice Type', 'Revenue (GL)', 'COGS (GL)', 'Net Profit'];

    const bodyRows = filteredRegister.map((row) => [
      row.date ? new Date(row.date).toISOString().split('T')[0] : '',
      row.invoice_no || '',
      row.customer_name || 'N/A',
      row.is_taxable ? 'Taxable' : 'Non-Taxable',
      row.invoice_type || '',
      Number(row.revenue || 0),
      Number(row.cogs || 0),
      Number(row.net_profit || 0)
    ]);

    const summaryHeader = ['FINANCIAL REGISTER SUMMARY'];
    const revRow = ['TOTAL REVENUE', totals.total_revenue];
    const cogsRow = ['TOTAL COGS', totals.total_cogs];
    const profitRow = [totals.net_profit >= 0 ? 'NET PROFIT' : 'NET LOSS', totals.net_profit];

    const sheetData = [titleRow, dateRow, emptyRow, headers, ...bodyRows, emptyRow, summaryHeader, revRow, cogsRow, profitRow];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    ws['!cols'] = [
      { wch: 14 }, { wch: 18 }, { wch: 25 }, { wch: 14 },
      { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Sales Register');
    XLSX.writeFile(wb, `${activeTab}_Sales_Register_${today}.xlsx`);
  };

  // PDF Export Logic
  const exportToPDF = () => {
    if (!filteredRegister.length) return toast.error('No data available to export!');
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(16);
    doc.text(`${activeTab === 'RM' ? 'Inventory' : 'Finished Goods'} Sales Register (${taxableType})`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Period: ${fromDate} to ${toDate}`, 14, 22);

    const tableHeaders = [['Date', 'Invoice No.', 'Customer Name', 'Taxable', 'Invoice Type', 'Revenue', 'COGS', 'Net Profit']];
    const tableData = filteredRegister.map(row => [
      row.date ? new Date(row.date).toISOString().split('T')[0] : '',
      row.invoice_no || '',
      row.customer_name || 'N/A',
      row.is_taxable ? 'Yes' : 'No',
      row.invoice_type || '',
      `Rs. ${Number(row.revenue || 0).toFixed(2)}`,
      `Rs. ${Number(row.cogs || 0).toFixed(2)}`,
      `Rs. ${Number(row.net_profit || 0).toFixed(2)}`
    ]);

    autoTable(doc, {
      head: tableHeaders,
      body: tableData,
      startY: 28,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85] },
      styles: { fontSize: 8 }
    });

    doc.save(`${activeTab}_Sales_Register_${today}.pdf`);
  };

  // PNG Export
  const exportToImage = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `${activeTab}_Sales_Register_${today}.png`;
      link.click();
    } catch (err) {
      console.error('PNG Export Error:', err);
      toast.error('Failed to generate PNG image.');
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
                    <FaCashRegister className="report-title-icon" /> Sales Register
                  </h3>
                  <p className="report-description">View sales invoices, revenue, COGS, and profitability by product type.</p>
                </div>
              </div>
              {filteredRegister.length > 0 && (
                <div className="export-btn-group">
                  <button type="button" className="icon-button bg-pdf" onClick={exportToPDF} title="PDF"><FaFilePdf /></button>
                  <button type="button" className="icon-button bg-excel" onClick={exportToExcel} title="Excel"><FaFileExcel /></button>
                  <button type="button" className="icon-button bg-png" onClick={exportToImage} title="PNG"><FaImage /></button>
                </div>
              )}
            </div>

            <div className="filter-group">
              <input type="date" className="date-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <input type="date" className="date-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              <select className="date-input" value={taxableType} onChange={(e) => setTaxableType(e.target.value)}>
                <option value="ALL">All Invoices</option>
                <option value="NON_TAXABLE">Non-Taxable Only</option>
                <option value="TAXABLE">Taxable Only</option>
              </select>
              <input type="text" className="date-input" placeholder="Search Invoice/Customer..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <button type="button" className="get-report-btn" onClick={fetchSalesRegister}>
                <FaSync /> Refresh
              </button>
            </div>

            <div className="filter-group" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button type="button" onClick={() => setActiveTab('RM')} style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'RM' ? '3px solid #334155' : 'none', color: activeTab === 'RM' ? '#1e293b' : '#64748b', fontWeight: '600' }}>Inventory</button>
                <button type="button" onClick={() => setActiveTab('FP')} style={{ padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'FP' ? '3px solid #334155' : 'none', color: activeTab === 'FP' ? '#1e293b' : '#64748b', fontWeight: '600' }}>Finished Product</button>
              </div>
            </div>
          </div>

          <div ref={reportRef} className="pl-table-container">
            <div className="pl-header-section">
              <h3 className="pl-statement-title">SALES REGISTER ({activeTab === 'RM' ? 'INVENTORY' : 'FINISHED GOODS'})</h3>
              <p className="pl-statement-subtitle">Period: <strong>{fromDate}</strong> to <strong>{toDate}</strong></p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
              <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                <strong>Invoices:</strong> <span className="pl-summary-value">{filteredRegister.length}</span>
              </div>
              <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                <strong>Revenue:</strong> <span className="pl-summary-value">{formatCurrency(totals.total_revenue)}</span>
              </div>
              <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                <strong>COGS:</strong> <span className="pl-summary-value">{formatCurrency(totals.total_cogs)}</span>
              </div>
              <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px', background: totals.net_profit >= 0 ? '#f0fdf4' : '#fef2f2' }}>
                <strong style={{ color: totals.net_profit >= 0 ? '#16a34a' : '#dc2626' }}>
                  {totals.net_profit >= 0 ? 'Net Profit:' : 'Net Loss:'}
                </strong> <span className="pl-summary-value" style={{ color: totals.net_profit >= 0 ? '#16a34a' : '#dc2626' }}>{formatCurrency(totals.net_profit)}</span>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>Loading Sales Register...</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="pl-table">
                  <thead>
                    <tr>
                      {['Date', 'Invoice No.', 'Customer Name', 'Tax Status', 'Invoice Type', 'Revenue', 'COGS', 'Net Profit'].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegister.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center" style={{ padding: '20px', color: '#64748b' }}>
                          No matching sales register entries found.
                        </td>
                      </tr>
                    ) : (
                      filteredRegister.map((row, idx) => {
                        const link = getInvoiceDetailLink(row);
                        return (
                          <tr key={idx}>
                            <td>{row.date ? new Date(row.date).toISOString().split('T')[0] : ''}</td>
                            <td className="font-bold">
                              {link ? <Link to={link} style={{ color: '#0284c7' }}>{row.invoice_no}</Link> : row.invoice_no || 'N/A'}
                            </td>
                            <td>{row.customer_name || 'N/A'}</td>
                            <td>
                              <span style={{ 
                                padding: '2px 8px', 
                                borderRadius: '12px', 
                                fontSize: '11px', 
                                fontWeight: '600',
                                backgroundColor: row.is_taxable ? '#e0f2fe' : '#f1f5f9',
                                color: row.is_taxable ? '#0369a1' : '#475569'
                              }}>
                                {row.is_taxable ? 'Taxable' : 'Non-Taxable'}
                              </span>
                            </td>
                            <td>{row.invoice_type}</td>
                            <td className="text-right font-bold" style={{ color: row.revenue < 0 ? '#dc2626' : '#1e293b' }}>
                              {formatCurrency(row.revenue)}
                            </td>
                            <td className="text-right font-bold" style={{ color: '#0284c7' }}>
                              {formatCurrency(row.cogs)}
                            </td>
                            <td className="text-right font-bold" style={{ color: row.net_profit >= 0 ? '#16a34a' : '#dc2626' }}>
                              {formatCurrency(row.net_profit)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ borderTop: '2px solid #cbd5e1', paddingTop: '15px', background: '#f8fafc', padding: '15px', borderRadius: '6px', marginTop: '15px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1e293b', fontWeight: '700' }}>
                FINANCIAL REGISTER SUMMARY ({activeTab === 'RM' ? 'INVENTORY' : 'FINISHED GOODS'})
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div style={{ padding: '10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>TOTAL REVENUE</span>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#0284c7' }}>{formatCurrency(totals.total_revenue)}</span>
                </div>
                <div style={{ padding: '10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>TOTAL COGS</span>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#dc2626' }}>{formatCurrency(totals.total_cogs)}</span>
                </div>
                <div style={{ 
                  padding: '10px', 
                  background: totals.net_profit >= 0 ? '#f0fdf4' : '#fef2f2', 
                  border: `1px solid ${totals.net_profit >= 0 ? '#16a34a' : '#dc2626'}`, 
                  borderRadius: '4px' 
                }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>
                    {totals.net_profit >= 0 ? 'NET PROFIT' : 'NET LOSS'}
                  </span>
                  <span style={{ fontSize: '18px', fontWeight: '700', color: totals.net_profit >= 0 ? '#16a34a' : '#dc2626' }}>
                    {formatCurrency(totals.net_profit)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default SalesRegister;