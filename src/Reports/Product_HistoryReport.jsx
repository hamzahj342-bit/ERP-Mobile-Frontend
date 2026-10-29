import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';
import api from '../../api';
import Select from 'react-select';
import { FaArrowLeft, FaSearch, FaFileExcel, FaFilePdf, FaImage, FaHistory } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';
import html2canvas from 'html2canvas';
import '../Profitloss.css';
import { localToday, localFirstOfMonth } from '../utils/localDate';

const formatDeviceMeta = (row) => {
  if (!row) return '---';
  const parts = [];
  if (row.imei1) parts.push(`IMEI ${row.imei1}`);
  if (row.condition) parts.push(row.condition);
  if (row.color) parts.push(row.color);
  if (row.ram || row.rom) parts.push(`${row.ram || '?'}/${row.rom || '?'}`);
  return parts.length ? parts.join(' · ') : '---';
};

const Product_HistoryReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef();

  const today = localToday();
  const firstOfMonth = localFirstOfMonth();

  // Mobile shop: phones only (tab kept as RM for API compatibility)
  const activeTab = 'RM';
  const [txGroup, setTxGroup] = useState('ALL');
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemOptions, setItemOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);

  const fetchItems = async () => {
    try {
      const res = await api.get('/add-materials');
      const responseData = Array.isArray(res.data) ? res.data : res.data?.data || [];

      const uniqueItems = new Map();
      responseData.forEach((item) => {
        const key = item.rm_id;
        const label = item.name || item.rm_name || `Model ${key}`;
        if (key && !uniqueItems.has(key)) {
          uniqueItems.set(key, { value: key, label });
        }
      });
      setItemOptions(Array.from(uniqueItems.values()));
    } catch (err) {
      console.error('Model list fetch error:', err);
      setItemOptions([]);
    }
  };

  const fetchHistoryReport = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/history', {
        params: {
          fromDate,
          toDate,
          search: searchTerm || undefined,
          tab: activeTab,
          itemId: selectedItem?.value || undefined,
          txGroup,
        },
      });
      setReportData(response.data.data || []);
    } catch (err) {
      console.error('History Fetch Error:', err);
      toast.error('Unable to fetch phone history report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    fetchHistoryReport();
  }, [txGroup, fromDate, toDate, selectedItem]);

  const isSaleReturn = (type = '') => {
    const t = (type || '').toLowerCase();
    return t.includes('sale return') || t === 'salereturn';
  };

  const isSaleOnly = (type = '') => {
    const t = (type || '').toLowerCase();
    if (isSaleReturn(t)) return false;
    return t === 'sale';
  };

  const saleSign = (type) => (isSaleReturn(type) ? -1 : 1);

  const saleRows = reportData.filter(
    (r) => isSaleOnly(r.transaction_type) || isSaleReturn(r.transaction_type)
  );

  const netSaleQty = saleRows.reduce(
    (sum, r) => sum + saleSign(r.transaction_type) * Math.abs(Number(r.quantity || 0)),
    0
  );
  const netSaleRevenue = saleRows.reduce(
    (sum, r) => sum + saleSign(r.transaction_type) * Math.abs(Number(r.total_price || 0)),
    0
  );
  const totalSaleCost = saleRows.reduce(
    (sum, r) =>
      sum +
      saleSign(r.transaction_type) *
        Math.abs(Number(r.quantity || 0)) *
        Number(r.unit_cost || 0),
    0
  );
  const netProfit = netSaleRevenue - totalSaleCost;

  const totalQuantity = reportData.reduce((sum, row) => {
    const t = (row.transaction_type || '').toLowerCase();
    const qty = Math.abs(Number(row.quantity || 0));
    if (t.includes('return')) return sum - qty;
    if (t.includes('sale')) return sum + qty;
    if (t === 'purchase') return sum + qty;
    return sum;
  }, 0);

  const totalValue = reportData.reduce((sum, row) => {
    const t = (row.transaction_type || '').toLowerCase();
    const val = Math.abs(Number(row.total_price || 0));
    if (t.includes('return')) return sum - val;
    if (t.includes('sale') || t === 'purchase') return sum + val;
    return sum;
  }, 0);
  const uniqueModelsCount = new Set(reportData.map((row) => row.item_id)).size;

  const getReferenceLink = (row) => {
    const invoiceNo = row.reference_no;
    if (!invoiceNo) return null;
    return `/rm-invoice/${invoiceNo}`;
  };

  const formatRowDate = (d) => {
    if (!d) return '';
    const s = String(d);
    const m = s.match(/(\d{4}-\d{2}-\d{2})/);
    if (m) {
      const [y, mo, day] = m[1].split('-');
      return `${day}/${mo}/${y}`;
    }
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toLocaleDateString('en-GB');
  };

  const formatCurrency = (amount) => {
    const val = Number(amount || 0);
    if (val < 0) {
      return `-Rs. ${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `Rs. ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const exportToExcel = () => {
    if (!reportData.length) return toast.error('No data available to export!');

    const wb = XLSX.utils.book_new();
    const titleRow = ['Phone History & Profit Report'];
    const dateRow = [`Date Range: ${fromDate} to ${toDate}`];
    const emptyRow = [];
    // Per-phone qty is 1 — Total Value duplicates Unit Price
    const headers = [
      'Date',
      'Model',
      'Type',
      'Ref No.',
      'Party',
      'IMEI / Specs',
      'Qty',
      'Unit Price',
      'Unit Cost',
    ];

    const bodyRows = reportData.map((row) => [
      formatRowDate(row.transaction_date),
      row.item_name || '',
      row.transaction_type || '',
      row.reference_no || '',
      row.entity_name || '',
      formatDeviceMeta(row),
      Number(row.quantity || 0),
      Number(row.unit_price || 0),
      Number(row.unit_cost || 0),
    ]);

    const sheetData = [titleRow, dateRow, emptyRow, headers, ...bodyRows];

    if (txGroup === 'SALE' || txGroup === 'ALL') {
      sheetData.push(emptyRow);
      sheetData.push(['PROFITABILITY ANALYSIS SUMMARY']);
      sheetData.push(['NET PHONES SOLD (Sale - Return)', netSaleQty]);
      sheetData.push(['NET REVENUE (Sale - Return)', netSaleRevenue]);
      sheetData.push(['TOTAL COST OF GOODS SOLD', totalSaleCost]);
      sheetData.push([netProfit >= 0 ? 'NET PROFIT' : 'NET LOSS', netProfit]);
    }

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const borderStyle = {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } },
    };

    const headerRange = XLSX.utils.decode_range(ws['!ref']);
    for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 3, c: C });
      if (ws[cellAddress]) {
        ws[cellAddress].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
          fill: { fgColor: { rgb: '334155' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: borderStyle,
        };
      }
    }

    if (ws['A1']) {
      ws['A1'].s = { font: { bold: true, sz: 16, color: { rgb: '1E293B' } } };
    }

    ws['!cols'] = [
      { wch: 12 },
      { wch: 22 },
      { wch: 16 },
      { wch: 14 },
      { wch: 20 },
      { wch: 36 },
      { wch: 8 },
      { wch: 14 },
      { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Phone History');
    XLSX.writeFile(wb, `Phone_History_Report_${today}.xlsx`);
  };

  const exportToPDF = () => {
    if (!reportData.length) return toast.error('No data available to export!');
    const doc = new jsPDF('landscape');

    doc.setFontSize(16);
    doc.text('Phone History & Profit Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Date Range: ${fromDate} to ${toDate}`, 14, 22);

    const tableHeaders = [
      ['Date', 'Model', 'Type', 'Ref', 'Party', 'IMEI / Specs', 'Qty', 'Unit Price', 'Unit Cost'],
    ];
    const tableData = reportData.map((row) => [
      formatRowDate(row.transaction_date),
      row.item_name || '',
      row.transaction_type || '',
      row.reference_no || '',
      row.entity_name || '',
      formatDeviceMeta(row),
      Number(row.quantity || 0).toLocaleString(),
      `Rs. ${Number(row.unit_price || 0).toFixed(2)}`,
      `Rs. ${Number(row.unit_cost || 0).toFixed(2)}`,
    ]);

    autoTable(doc, {
      head: tableHeaders,
      body: tableData,
      startY: 28,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85] },
      styles: { fontSize: 7 },
    });

    doc.save(`Phone_History_Report_${today}.pdf`);
  };

  const exportToImage = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `Phone_History_Report_${today}.png`;
      link.click();
    } catch (err) {
      console.error('PNG Export Error:', err);
      toast.error('Failed to generate PNG image.');
    }
  };

  const selectStyles = {
    control: (p) => ({
      ...p,
      minHeight: '32px',
      height: '32px',
      borderRadius: '6px',
      borderColor: '#e2e8f0',
      boxShadow: 'none',
      fontSize: '12px',
    }),
    valueContainer: (p) => ({ ...p, padding: '0 8px', height: '30px' }),
    indicatorsContainer: (p) => ({ ...p, height: '30px' }),
    input: (p) => ({ ...p, margin: 0, padding: 0 }),
    singleValue: (p) => ({ ...p, fontSize: '12px', color: '#334155' }),
    placeholder: (p) => ({ ...p, fontSize: '12px', color: '#94a3b8' }),
    menu: (p) => ({ ...p, zIndex: 9999, fontSize: '12px' }),
    option: (p) => ({ ...p, fontSize: '12px', padding: '6px 10px' }),
  };

  return (
    <>
      <NavigationBar />
      <div className="report-page-wrapper">
        <div className="report-card">
          <div className="report-header">
            <div className="report-header-top">
              <div className="report-header-left">
                <button type="button" className="back-btn erp-back-btn" onClick={() => navigate('/reports')}>
                  <FaArrowLeft />
                </button>
                <div>
                  <h3 className="report-title">
                    <FaHistory className="report-title-icon" /> Phone History & Profit Report
                  </h3>
                  <p className="report-description">
                    Purchase / sale history per phone model with IMEI and unit cost (COGS) for profit.
                  </p>
                </div>
              </div>
              {reportData.length > 0 && (
                <div className="export-btn-group">
                  <button type="button" className="icon-button bg-pdf" onClick={exportToPDF} title="PDF">
                    <FaFilePdf />
                  </button>
                  <button type="button" className="icon-button bg-excel" onClick={exportToExcel} title="Excel">
                    <FaFileExcel />
                  </button>
                  <button type="button" className="icon-button bg-png" onClick={exportToImage} title="PNG">
                    <FaImage />
                  </button>
                </div>
              )}
            </div>

            <div className="filter-group">
              <input type="date" className="date-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <input type="date" className="date-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              <input
                type="text"
                className="date-input"
                placeholder="Search model, party, IMEI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="react-select-shell">
                <Select
                  options={itemOptions}
                  value={selectedItem}
                  onChange={setSelectedItem}
                  placeholder="All models..."
                  isClearable
                  isSearchable
                  styles={selectStyles}
                />
              </div>
              <button type="button" className="get-report-btn" onClick={fetchHistoryReport}>
                <FaSearch /> Search
              </button>
            </div>

            <div className="filter-group" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  background: '#f1f5f9',
                  padding: '4px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                }}
              >
                <button
                  type="button"
                  onClick={() => setTxGroup('ALL')}
                  style={{
                    padding: '6px 14px',
                    border: 'none',
                    borderRadius: '4px',
                    background: txGroup === 'ALL' ? '#334155' : 'transparent',
                    color: txGroup === 'ALL' ? '#fff' : '#475569',
                    fontWeight: '600',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  All Types
                </button>
                <button
                  type="button"
                  onClick={() => setTxGroup('PURCHASE')}
                  style={{
                    padding: '6px 14px',
                    border: 'none',
                    borderRadius: '4px',
                    background: txGroup === 'PURCHASE' ? '#0284c7' : 'transparent',
                    color: txGroup === 'PURCHASE' ? '#fff' : '#475569',
                    fontWeight: '600',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Purchase / Return
                </button>
                <button
                  type="button"
                  onClick={() => setTxGroup('SALE')}
                  style={{
                    padding: '6px 14px',
                    border: 'none',
                    borderRadius: '4px',
                    background: txGroup === 'SALE' ? '#16a34a' : 'transparent',
                    color: txGroup === 'SALE' ? '#fff' : '#475569',
                    fontWeight: '600',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Sale / Return
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>Loading phone history...</div>
          ) : reportData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              No phone transactions found for the selected filters.
            </div>
          ) : (
            <div ref={reportRef} className="pl-table-container">
              <div className="pl-header-section">
                <h3 className="pl-statement-title">PHONE HISTORY &amp; PROFIT REPORT</h3>
                <p className="pl-statement-subtitle">
                  Period: <strong>{fromDate}</strong> to <strong>{toDate}</strong>
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
                <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                  <strong>Models:</strong> <span className="pl-summary-value">{uniqueModelsCount}</span>
                </div>
                <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                  <strong>Total Qty:</strong> <span className="pl-summary-value">{totalQuantity.toLocaleString()}</span>
                </div>
                <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                  <strong>Total Value:</strong> <span className="pl-summary-value">{formatCurrency(totalValue)}</span>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="pl-table">
                  <thead>
                    <tr>
                      {[
                        'Date',
                        'Model',
                        'Type',
                        'Ref No.',
                        'Party',
                        'IMEI / Specs',
                        'Qty',
                        'Unit Price',
                        'Unit Cost',
                      ].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row, idx) => {
                      const refLink = getReferenceLink(row);
                      return (
                        <tr key={idx}>
                          <td>{formatRowDate(row.transaction_date)}</td>
                          <td className="font-bold">{row.item_name}</td>
                          <td>{row.transaction_type}</td>
                          <td>
                            {refLink ? (
                              <Link to={refLink} style={{ color: '#0284c7' }}>
                                {row.reference_no}
                              </Link>
                            ) : (
                              row.reference_no || 'N/A'
                            )}
                          </td>
                          <td>{row.entity_name}</td>
                          <td style={{ fontSize: '0.78rem', color: '#475569' }}>{formatDeviceMeta(row)}</td>
                          <td className="text-right font-bold">{Number(row.quantity || 0).toLocaleString()}</td>
                          <td className="text-right font-bold">{formatCurrency(row.unit_price)}</td>
                          <td className="text-right font-bold" style={{ color: '#0284c7' }}>
                            {formatCurrency(row.unit_cost)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {(txGroup === 'SALE' || txGroup === 'ALL') && (
                <div
                  style={{
                    borderTop: '2px solid #cbd5e1',
                    background: '#f8fafc',
                    padding: '15px',
                    borderRadius: '6px',
                    marginTop: '15px',
                  }}
                >
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1e293b', fontWeight: '700' }}>
                    PROFITABILITY ANALYSIS SUMMARY
                  </h4>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '12px',
                    }}
                  >
                    <div style={{ padding: '10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>
                        NET PHONES SOLD (Sale - Return)
                      </span>
                      <span style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>
                        {netSaleQty.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ padding: '10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>
                        NET REVENUE (Sale - Return)
                      </span>
                      <span style={{ fontSize: '16px', fontWeight: '700', color: '#0284c7' }}>
                        {formatCurrency(netSaleRevenue)}
                      </span>
                    </div>
                    <div style={{ padding: '10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>
                        TOTAL COST OF GOODS SOLD
                      </span>
                      <span style={{ fontSize: '16px', fontWeight: '700', color: '#dc2626' }}>
                        {formatCurrency(totalSaleCost)}
                      </span>
                    </div>
                    <div
                      style={{
                        padding: '10px',
                        background: netProfit >= 0 ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${netProfit >= 0 ? '#16a34a' : '#dc2626'}`,
                        borderRadius: '4px',
                      }}
                    >
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>
                        {netProfit >= 0 ? 'NET PROFIT / MARGIN' : 'NET LOSS / MARGIN'}
                      </span>
                      <span
                        style={{
                          fontSize: '18px',
                          fontWeight: '700',
                          color: netProfit >= 0 ? '#16a34a' : '#dc2626',
                        }}
                      >
                        {formatCurrency(netProfit)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Product_HistoryReport;
