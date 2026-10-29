import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';
import api from '../../api';
import { FaArrowLeft, FaFileExcel, FaFilePdf, FaImage, FaSync, FaBalanceScale } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';
import html2canvas from 'html2canvas';
import '../Profitloss.css';
import { localToday, localFirstOfMonth } from '../utils/localDate';

const formatQty = (n) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });

const formatQtyUom = (n, uom, empty = '---') => {
  if (n == null || Number(n) === 0) return empty;
  const u = uom ? ` ${uom}` : '';
  return `${formatQty(n)}${u}`;
};

const formatMoney = (n) =>
  `Rs. ${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatRange = (fromDate, toDate) => {
  const fmt = (d) => {
    if (!d) return '';
    const dt = new Date(`${d}T00:00:00`);
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  return `${fmt(fromDate)} to ${fmt(toDate)}`;
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

const InventoryAdjustmentReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef();

  const today = localToday();
  const firstOfMonth = localFirstOfMonth();

  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);
  const [itemType, setItemType] = useState('ALL');
  const [adjType, setAdjType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [register, setRegister] = useState([]);
  const [apiTotals, setApiTotals] = useState({
    count: 0,
    add_qty: 0,
    deduct_qty: 0,
    add_value: 0,
    deduct_value: 0,
    net_qty: 0,
    net_value: 0,
  });

  const fetchReport = async () => {
    if (!fromDate || !toDate) {
      toast.warning('Please select from and to dates.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.get('/reports/inventory-adjustment', {
        params: { fromDate, toDate, itemType, adjType },
      });
      setRegister(response.data?.register || []);
      setApiTotals(
        response.data?.totals || {
          count: 0,
          add_qty: 0,
          deduct_qty: 0,
          add_value: 0,
          deduct_value: 0,
          net_qty: 0,
          net_value: 0,
        }
      );
    } catch (err) {
      console.error('Inventory Adjustment Report Error:', err);
      toast.error(err.response?.data?.message || 'Failed to load Inventory Adjustment Report.');
      setRegister([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [fromDate, toDate, itemType, adjType]);

  const filteredRegister = useMemo(() => {
    if (!searchTerm.trim()) return register;
    const term = searchTerm.toLowerCase().trim();
    return register.filter(
      (row) =>
        String(row.item_name || '').toLowerCase().includes(term) ||
        String(row.reference_no || '').toLowerCase().includes(term) ||
        String(row.reason || '').toLowerCase().includes(term) ||
        String(row.adjusted_by || '').toLowerCase().includes(term) ||
        String(row.item_type || '').toLowerCase().includes(term)
    );
  }, [register, searchTerm]);

  const totals = useMemo(() => {
    const acc = filteredRegister.reduce(
      (sum, r) => {
        sum.count += 1;
        sum.add_qty += Number(r.in_qty || 0);
        sum.deduct_qty += Number(r.out_qty || 0);
        sum.add_value += r.adj_type === 'Add' ? Number(r.total_price || 0) : 0;
        sum.deduct_value += r.adj_type === 'Deduct' ? Number(r.total_price || 0) : 0;
        return sum;
      },
      { count: 0, add_qty: 0, deduct_qty: 0, add_value: 0, deduct_value: 0 }
    );
    acc.net_qty = acc.add_qty - acc.deduct_qty;
    acc.net_value = acc.add_value - acc.deduct_value;
    return acc;
  }, [filteredRegister]);

  const exportToExcel = () => {
    if (!filteredRegister.length) return toast.warning('No data to export.');
    const wb = XLSX.utils.book_new();
    const titleRow = ['INVENTORY ADJUSTMENT REPORT'];
    const dateRow = [`Period: ${formatRange(fromDate, toDate)} | Item: ${itemType} | Type: ${adjType}`];
    const header = [
      'DATE',
      'REF',
      'ITEM TYPE',
      'ITEM NAME',
      'TYPE',
      'SYSTEM QTY',
      'PHYSICAL QTY',
      'ADJ QTY',
      'UNIT PRICE',
      'TOTAL VAL',
      'REASON',
      'ADJUSTED BY',
    ];
    const body = filteredRegister.map((r) => [
      formatRowDate(r.transaction_date),
      r.reference_no || '',
      r.item_type || '',
      r.item_name || '',
      r.adj_type || '',
      Number(r.system_qty || 0),
      r.physical_qty == null ? '' : Number(r.physical_qty),
      Number(r.adjustment_qty || 0),
      Number(r.unit_price || 0),
      Number(r.total_price || 0),
      r.reason || '',
      r.adjusted_by || '',
    ]);
    body.push([
      '',
      '',
      '',
      'TOTAL',
      '',
      '',
      '',
      '',
      '',
      Number(totals.net_value),
      `Add ${formatMoney(totals.add_value)} | Deduct ${formatMoney(totals.deduct_value)}`,
      '',
    ]);
    const ws = XLSX.utils.aoa_to_sheet([titleRow, dateRow, [], header, ...body]);
    XLSX.utils.book_append_sheet(wb, ws, 'Adjustments');
    XLSX.writeFile(wb, `Inventory_Adjustment_${fromDate}_to_${toDate}.xlsx`);
  };

  const exportToPDF = () => {
    if (!filteredRegister.length) return toast.warning('No data to export.');
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(13);
    doc.text('INVENTORY ADJUSTMENT REPORT', 14, 14);
    doc.setFontSize(9);
    doc.text(`${formatRange(fromDate, toDate)}  |  ${itemType}  |  ${adjType}`, 14, 20);
    autoTable(doc, {
      startY: 25,
      head: [['DATE', 'REF', 'TYPE', 'ITEM', 'ADJ', 'QTY', 'UNIT PRICE', 'TOTAL VAL', 'REASON']],
      body: [
        ...filteredRegister.map((r) => [
          formatRowDate(r.transaction_date),
          r.reference_no || '',
          r.item_type_code || '',
          r.item_name || '',
          r.adj_type || '',
          formatQtyUom(r.adjustment_qty, r.uom_name),
          formatMoney(r.unit_price),
          formatMoney(r.total_price),
          (r.reason || '-').slice(0, 40),
        ]),
        [
          '',
          '',
          '',
          'NET TOTAL',
          '',
          '',
          '',
          formatMoney(totals.net_value),
          `Add ${formatMoney(totals.add_value)} / Deduct ${formatMoney(totals.deduct_value)}`,
        ],
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] },
    });
    doc.save(`Inventory_Adjustment_${fromDate}_to_${toDate}.pdf`);
  };

  const exportToImage = () => {
    const input = reportRef.current;
    if (!input) return;
    html2canvas(input, { scale: 2 }).then((canvas) => {
      const link = document.createElement('a');
      link.download = `Inventory_Adjustment_${fromDate}_to_${toDate}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  };

  return (
    <>
      <NavigationBar />
      <div className="report-page-wrapper">
        <div className="report-card">
          <div className="report-header">
            <div className="report-header-top">
              <div className="report-header-left">
                <button
                  type="button"
                  className="back-btn erp-back-btn"
                  onClick={() => navigate('/reports')}
                >
                  <FaArrowLeft />
                </button>
                <div>
                  <h3 className="report-title">
                    <FaBalanceScale className="report-title-icon" /> Inventory Adjustment Report
                  </h3>
                  <p className="report-description">
                    Add / Deduct stock adjustments for inventory products.
                  </p>
                </div>
              </div>
              {filteredRegister.length > 0 && (
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
              <select className="date-input" value={itemType} onChange={(e) => setItemType(e.target.value)}>
                <option value="ALL">All Items</option>
                <option value="RM">Inventory</option>
                <option value="FP">Finished Product</option>
              </select>
              <select className="date-input" value={adjType} onChange={(e) => setAdjType(e.target.value)}>
                <option value="ALL">All Types</option>
                <option value="Add">Add</option>
                <option value="Deduct">Deduct</option>
              </select>
              <input
                type="text"
                className="date-input"
                placeholder="Search item / reason / user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button
                type="button"
                className="get-report-btn"
                onClick={() => {
                  const day = localToday();
                  setFromDate(day);
                  setToDate(day);
                }}
                style={
                  fromDate === toDate && fromDate === localToday()
                    ? { backgroundColor: '#0f172a', color: '#fff' }
                    : undefined
                }
              >
                Daily
              </button>
              <button type="button" className="get-report-btn" onClick={fetchReport}>
                <FaSync /> Refresh
              </button>
            </div>
          </div>

          <div ref={reportRef} className="pl-table-container">
            <div className="pl-header-section">
              <h3 className="pl-statement-title">INVENTORY ADJUSTMENT REPORT</h3>
              <p className="pl-statement-subtitle">
                Period: <strong>{formatRange(fromDate, toDate)}</strong>
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '15px' }}>
              <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                <strong>Entries:</strong> <span className="pl-summary-value">{totals.count}</span>
              </div>
              <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                <strong>Add Qty:</strong> <span className="pl-summary-value">{formatQty(totals.add_qty)}</span>
              </div>
              <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                <strong>Deduct Qty:</strong> <span className="pl-summary-value">{formatQty(totals.deduct_qty)}</span>
              </div>
              <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                <strong>Add Value:</strong> <span className="pl-summary-value">{formatMoney(totals.add_value)}</span>
              </div>
              <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                <strong>Deduct Value:</strong> <span className="pl-summary-value">{formatMoney(totals.deduct_value)}</span>
              </div>
              <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                <strong>Net Value:</strong> <span className="pl-summary-value">{formatMoney(totals.net_value)}</span>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>Loading Inventory Adjustment Report...</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="pl-table stock-ledger-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Ref</th>
                      <th>Item Type</th>
                      <th>Item Name</th>
                      <th>Type</th>
                      <th className="text-right">System Qty</th>
                      <th className="text-right">Physical Qty</th>
                      <th className="text-right">Adj Qty</th>
                      <th className="text-right">Unit Price</th>
                      <th className="text-right">Total Val</th>
                      <th>Reason</th>
                      <th>Adjusted By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegister.length === 0 ? (
                      <tr>
                        <td colSpan="12" className="text-center" style={{ padding: '20px', color: '#64748b' }}>
                          {register.length === 0
                            ? 'No adjustments found for this period.'
                            : 'No rows match your search.'}
                        </td>
                      </tr>
                    ) : (
                      filteredRegister.map((row) => (
                        <tr key={row.id}>
                          <td>{formatRowDate(row.transaction_date)}</td>
                          <td className="font-bold">{row.reference_no}</td>
                          <td>{row.item_type}</td>
                          <td className="font-bold">{row.item_name}</td>
                          <td>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor: row.adj_type === 'Add' ? '#dcfce7' : '#fee2e2',
                                color: row.adj_type === 'Add' ? '#166534' : '#991b1b',
                              }}
                            >
                              {row.adj_type}
                            </span>
                          </td>
                          <td className="text-right">{formatQtyUom(row.system_qty, row.uom_name, formatQty(0))}</td>
                          <td className="text-right">
                            {row.physical_qty == null ? '---' : formatQtyUom(row.physical_qty, row.uom_name)}
                          </td>
                          <td className="text-right font-bold">{formatQtyUom(row.adjustment_qty, row.uom_name)}</td>
                          <td className="text-right">{formatMoney(row.unit_price)}</td>
                          <td className="text-right font-bold">{formatMoney(row.total_price)}</td>
                          <td style={{ maxWidth: 220, whiteSpace: 'normal' }}>{row.reason || '---'}</td>
                          <td>{row.adjusted_by || '---'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filteredRegister.length > 0 && (
                    <tfoot>
                      <tr className="amount-row">
                        <td colSpan="7" className="font-bold">
                          NET TOTAL
                        </td>
                        <td className="text-right font-bold">{formatQty(totals.net_qty)}</td>
                        <td />
                        <td className="text-right font-bold">{formatMoney(totals.net_value)}</td>
                        <td colSpan="2" />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default InventoryAdjustmentReport;
