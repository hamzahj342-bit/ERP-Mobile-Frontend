import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';
import api from '../../api';
import Select from 'react-select';
import { FaArrowLeft, FaFileExcel, FaFilePdf, FaImage, FaSync, FaWarehouse } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';
import html2canvas from 'html2canvas';
import '../Profitloss.css';
import { localToday, localFirstOfMonth } from '../utils/localDate';

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
  const s = d instanceof Date ? d.toISOString() : String(d);
  const m = s.match(/(\d{4}-\d{2}-\d{2})/);
  if (m) {
    const [y, mo, day] = m[1].split('-');
    return `${day}/${mo}/${y}`;
  }
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('en-GB');
};

const formatDeviceMeta = (row) => {
  if (!row || row.isOpening) return '---';
  const parts = [];
  if (row.imei1) parts.push(`IMEI ${row.imei1}`);
  if (row.condition) parts.push(row.condition);
  if (row.color) parts.push(row.color);
  if (row.ram || row.rom) parts.push(`${row.ram || '?'}/${row.rom || '?'}`);
  return parts.length ? parts.join(' · ') : '---';
};

const StockLedgerReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef();

  const today = localToday();
  const firstOfMonth = localFirstOfMonth();

  const [activeTab, setActiveTab] = useState('RM');
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemOptions, setItemOptions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState([]);
  const [register, setRegister] = useState([]);
  const [openings, setOpenings] = useState([]);
  const [itemMeta, setItemMeta] = useState(null);
  const [apiTotals, setApiTotals] = useState({
    count: 0,
    opening_qty: 0,
    opening_value: 0,
    in_qty: 0,
    out_qty: 0,
    closing_qty: 0,
    closing_avg: 0,
    closing_value: 0,
    total_value: 0,
  });

  const singleItem = Boolean(selectedItem?.value);

  const fetchItems = async (tab) => {
    try {
      const endpoint = tab === 'RM' ? '/add-materials' : '/product-batches';
      const params = tab === 'RM' ? {} : { type: 'summary' };
      const res = await api.get(endpoint, { params });
      const responseData = Array.isArray(res.data) ? res.data : res.data?.data || [];

      const uniqueItems = new Map();
      responseData.forEach((item) => {
        if (tab === 'RM') {
          const key = item.rm_id;
          const label = item.name || item.rm_name || `Material ${key}`;
          if (key && !uniqueItems.has(key)) uniqueItems.set(key, { value: key, label });
          return;
        }
        const productId = item.product_master_id || item.product?.id || item.id;
        const label = item.product?.name || item.name || item.product_name || `Product ${productId}`;
        if (productId && !uniqueItems.has(productId)) uniqueItems.set(productId, { value: productId, label });
      });
      setItemOptions(Array.from(uniqueItems.values()));
    } catch (err) {
      console.error('Item list fetch error:', err);
      setItemOptions([]);
    }
  };

  const fetchLedger = async () => {
    if (!fromDate || !toDate) {
      toast.warning('Please select from and to dates.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.get('/reports/stock-ledger', {
        params: {
          fromDate,
          toDate,
          tab: activeTab,
          itemId: selectedItem?.value || undefined,
        },
      });
      setSummary(response.data?.summary || []);
      setRegister(response.data?.register || []);
      setOpenings(response.data?.openings || []);
      setItemMeta(response.data?.item || null);
      setApiTotals(
        response.data?.totals || {
          count: 0,
          opening_qty: 0,
          opening_value: 0,
          in_qty: 0,
          out_qty: 0,
          closing_qty: 0,
          closing_avg: 0,
          closing_value: 0,
          total_value: 0,
        }
      );
    } catch (err) {
      console.error('Stock Ledger Fetch Error:', err);
      toast.error(err.response?.data?.message || 'Failed to load Stock Ledger.');
      setSummary([]);
      setRegister([]);
      setOpenings([]);
      setItemMeta(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems(activeTab);
    setSelectedItem(null);
    setSearchTerm('');
  }, [activeTab]);

  useEffect(() => {
    fetchLedger();
  }, [activeTab, fromDate, toDate, selectedItem]);

  const uom = itemMeta?.uom_name || openings[0]?.uom_name || register[0]?.uom_name || '';
  const itemName = itemMeta?.item_name || selectedItem?.label || '';

  const filteredSummary = useMemo(() => {
    if (!searchTerm.trim()) return summary;
    const term = searchTerm.toLowerCase().trim();
    return summary.filter((row) => String(row.item_name || '').toLowerCase().includes(term));
  }, [summary, searchTerm]);

  const filteredTotals = useMemo(
    () =>
      filteredSummary.reduce(
        (acc, r) => {
          acc.opening_qty += Number(r.opening_qty || 0);
          acc.in_qty += Number(r.in_qty || 0);
          acc.out_qty += Number(r.out_qty || 0);
          acc.closing_qty += Number(r.closing_qty || 0);
          acc.total_value += Number(r.value || 0);
          return acc;
        },
        { opening_qty: 0, in_qty: 0, out_qty: 0, closing_qty: 0, total_value: 0 }
      ),
    [filteredSummary]
  );

  const ledgerRows = useMemo(() => {
    if (!singleItem) return [];
    const openQty = Number(apiTotals.opening_qty || 0);
    const openVal = Number(apiTotals.opening_value || 0);
    const openAvg = openQty > 0 ? openVal / openQty : 0;

    return [
      {
        line_id: 'opening',
        isOpening: true,
        transaction_date: fromDate,
        transaction_type: 'Opening Balance',
        reference_no: '',
        entity_name: 'Opening Inventory',
        in_qty: 0,
        out_qty: 0,
        unit_price: openAvg,
        total_val: openVal,
        balance: openQty,
      },
      ...register.map((row) => ({
        ...row,
        isOpening: false,
        unit_price: Number(row.unit_price || 0),
        total_val: Number(row.total_val || 0),
        balance: Number(row.balance || 0),
      })),
    ];
  }, [singleItem, register, apiTotals.opening_qty, apiTotals.opening_value, fromDate]);

  const closingQty = Number(apiTotals.closing_qty || 0);
  // Trust backend closing_value (aligned to rm_stock). Do NOT rebuild from line
  // display prices — that leaves leftover Rs when qty is already 0.
  const closingVal =
    Math.abs(closingQty) < 1e-9 ? 0 : Number(apiTotals.closing_value || 0);
  const closingAvg = closingQty > 0 ? closingVal / closingQty : 0;

  // Period IN/OUT value from ledger lines (qty 1 → total_val ≈ unit_price)
  const periodInVal = useMemo(
    () =>
      register.reduce(
        (sum, r) =>
          sum + (Number(r.in_qty || 0) > 0 ? Number(r.total_val || r.unit_price || 0) : 0),
        0
      ),
    [register]
  );
  const periodOutVal = useMemo(
    () =>
      register.reduce(
        (sum, r) =>
          sum + (Number(r.out_qty || 0) > 0 ? Number(r.total_val || r.unit_price || 0) : 0),
        0
      ),
    [register]
  );

  const getReferenceLink = (row) => {
    const invoiceNo = row.reference_no;
    if (!invoiceNo || row.isOpening) return null;
    if (String(invoiceNo).startsWith('RECIPE-') || String(invoiceNo).startsWith('BATCH-') || String(invoiceNo).startsWith('ADJ-')) return null;
    if (activeTab === 'RM') return `/rm-invoice/${invoiceNo}`;
    return `/fp-invoice-detail/${invoiceNo}`;
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    if (!singleItem) {
      if (!filteredSummary.length) return toast.warning('No data to export.');
      const titleRow = ['CONSOLIDATED STOCK MOVEMENT SUMMARY'];
      const dateRow = [`Selected Category: ALL ITEMS / PRODUCTS | Date Range: ${formatRange(fromDate, toDate)}`];
      // Avg Price hidden — mobile shop uses per-IMEI cost
      const header = ['MODEL NAME', 'OPENING', 'TOTAL IN', 'TOTAL OUT', 'CLOSING QTY', 'TOTAL INVENTORY VAL'];
      const body = filteredSummary.map((r) => [
        r.item_name || '',
        Number(r.opening_qty || 0),
        Number(r.in_qty || 0),
        Number(r.out_qty || 0),
        Number(r.closing_qty || 0),
        Number(r.value || 0),
      ]);
      body.push([
        'GRAND TOTAL ALL ITEMS',
        Number(filteredTotals.opening_qty || 0),
        Number(filteredTotals.in_qty || 0),
        Number(filteredTotals.out_qty || 0),
        Number(filteredTotals.closing_qty || 0),
        Number(filteredTotals.total_value || 0),
      ]);
      const ws = XLSX.utils.aoa_to_sheet([titleRow, dateRow, [], header, ...body]);
      XLSX.utils.book_append_sheet(wb, ws, 'Stock Summary');
    } else {
      if (!ledgerRows.length) return toast.warning('No data to export.');
      const titleRow = ['ITEM STOCK LEDGER REPORT'];
      const dateRow = [`Product Name: ${itemName} | Date Range: ${formatRange(fromDate, toDate)}`];
      // Per-phone rows: Unit Price only (Total Val = price × 1, redundant)
      const header = ['DATE', 'TRANSACTION TYPE', 'REF / DOC#', 'PARTY', 'IMEI / SPECS', 'IN', 'OUT', 'UNIT PRICE', 'BALANCE'];
      const body = ledgerRows.map((r) => [
        formatRowDate(r.transaction_date),
        r.transaction_type || '',
        r.reference_no || '---',
        r.entity_name || '',
        formatDeviceMeta(r),
        Number(r.in_qty || 0),
        Number(r.out_qty || 0),
        r.isOpening ? '' : Number(r.unit_price || 0),
        Number(r.balance || 0),
      ]);
      body.push([
        formatRowDate(toDate),
        'CLOSING BALANCE',
        '---',
        `In ${Number(periodInVal).toLocaleString()} | Out ${Number(periodOutVal).toLocaleString()} | Remaining ${Number(closingVal).toLocaleString()}`,
        '',
        Number(apiTotals.in_qty || 0),
        Number(apiTotals.out_qty || 0),
        '',
        Number(closingQty),
      ]);
      const ws = XLSX.utils.aoa_to_sheet([titleRow, dateRow, [], header, ...body]);
      XLSX.utils.book_append_sheet(wb, ws, 'Item Ledger');
    }
    XLSX.writeFile(wb, `Stock_Ledger_${activeTab}_${fromDate}_to_${toDate}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    if (!singleItem) {
      if (!filteredSummary.length) return toast.warning('No data to export.');
      doc.setFontSize(13);
      doc.text('CONSOLIDATED STOCK MOVEMENT SUMMARY', 14, 14);
      doc.setFontSize(9);
      doc.text(`ALL ITEMS / PRODUCTS  |  ${formatRange(fromDate, toDate)}`, 14, 20);
      autoTable(doc, {
        startY: 25,
        head: [['MODEL NAME', 'OPENING', 'TOTAL IN', 'TOTAL OUT', 'CLOSING QTY', 'INVENTORY VAL']],
        body: [
          ...filteredSummary.map((r) => [
            r.item_name || '',
            formatQtyUom(r.opening_qty, r.uom_name, formatQty(0)),
            formatQtyUom(r.in_qty, r.uom_name, formatQty(0)),
            formatQtyUom(r.out_qty, r.uom_name, formatQty(0)),
            formatQtyUom(r.closing_qty, r.uom_name, formatQty(0)),
            formatMoney(r.value),
          ]),
          [
            'GRAND TOTAL ALL ITEMS',
            formatQty(filteredTotals.opening_qty),
            formatQty(filteredTotals.in_qty),
            formatQty(filteredTotals.out_qty),
            formatQty(filteredTotals.closing_qty),
            formatMoney(filteredTotals.total_value),
          ],
        ],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [15, 23, 42] },
      });
    } else {
      if (!ledgerRows.length) return toast.warning('No data to export.');
      doc.setFontSize(13);
      doc.text('ITEM STOCK LEDGER REPORT', 14, 14);
      doc.setFontSize(9);
      doc.text(`${itemName}  |  ${formatRange(fromDate, toDate)}`, 14, 20);
      autoTable(doc, {
        startY: 25,
        head: [['DATE', 'TYPE', 'REF', 'PARTY', 'IMEI / SPECS', 'IN', 'OUT', 'UNIT PRICE', 'BAL']],
        body: [
          ...ledgerRows.map((r) => [
            formatRowDate(r.transaction_date),
            r.transaction_type || '',
            r.reference_no || '---',
            r.entity_name || '---',
            formatDeviceMeta(r),
            r.in_qty ? formatQtyUom(r.in_qty, uom) : '---',
            r.out_qty ? formatQtyUom(r.out_qty, uom) : '---',
            r.isOpening ? '---' : formatMoney(r.unit_price),
            formatQtyUom(r.balance, uom, formatQty(0)),
          ]),
          [
            formatRowDate(toDate),
            'CLOSING BALANCE',
            '---',
            `In ${formatMoney(periodInVal)} | Out ${formatMoney(periodOutVal)} | Remaining ${formatMoney(closingVal)}`,
            '',
            formatQtyUom(apiTotals.in_qty, uom, formatQty(0)),
            formatQtyUom(apiTotals.out_qty, uom, formatQty(0)),
            '---',
            formatQtyUom(closingQty, uom, formatQty(0)),
          ],
        ],
        styles: { fontSize: 7 },
        headStyles: { fillColor: [15, 23, 42] },
      });
    }
    doc.save(`Stock_Ledger_${activeTab}_${fromDate}_to_${toDate}.pdf`);
  };

  const exportToImage = () => {
    const input = reportRef.current;
    if (!input) return;
    html2canvas(input, { scale: 2 }).then((canvas) => {
      const link = document.createElement('a');
      link.download = `Stock_Ledger_${activeTab}_${fromDate}_to_${toDate}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  };

  const hasData = singleItem ? ledgerRows.length > 0 : summary.length > 0;
  const metaStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px 28px',
    justifyContent: 'center',
    fontSize: '12px',
    color: '#334155',
    margin: '0 0 12px',
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
                    <FaWarehouse className="report-title-icon" /> Stock Ledger Report
                  </h3>
                  <p className="report-description">
                    Model-wise stock movement summary. Select a model for the full ledger (IMEI / unit price per phone).
                  </p>
                </div>
              </div>
              {hasData && (
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
              {!singleItem && (
                <input
                  type="text"
                  className="date-input"
                  placeholder="Search item name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              )}
              <button type="button" className="get-report-btn" onClick={fetchLedger}>
                <FaSync /> Refresh
              </button>
            </div>

            {/* Finished Product tab hidden — mobile shop uses Inventory / phones only
            <div className="filter-group" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button type="button" onClick={() => setActiveTab('RM')}>Inventory</button>
                <button type="button" onClick={() => setActiveTab('FP')}>Finished Product</button>
              </div>
            </div>
            */}
          </div>

          <div ref={reportRef} className="pl-table-container">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>Loading Stock Ledger...</div>
            ) : !singleItem ? (
              <>
                <div className="pl-header-section">
                  <h3 className="pl-statement-title">CONSOLIDATED STOCK MOVEMENT SUMMARY</h3>
                  <p className="pl-statement-subtitle" style={metaStyle}>
                    <span>
                      Selected Category: <strong>ALL MODELS</strong>
                    </span>
                    <span>
                      Date Range: <strong>{formatRange(fromDate, toDate)}</strong>
                    </span>
                  </p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="pl-table stock-ledger-table">
                    <thead>
                      <tr>
                        <th>Model Name</th>
                        <th className="text-right">Opening</th>
                        <th className="text-right">Total In</th>
                        <th className="text-right">Total Out</th>
                        <th className="text-right">Closing Qty</th>
                        {/* Avg Price hidden — per-IMEI cost on detail ledger */}
                        <th className="text-right">Total Inventory Val</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSummary.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center" style={{ padding: '20px', color: '#64748b' }}>
                            {summary.length === 0
                              ? 'No stock found for this period.'
                              : 'No items match your search.'}
                          </td>
                        </tr>
                      ) : (
                        filteredSummary.map((row) => (
                          <tr key={row.item_id}>
                            <td className="font-bold">{row.item_name}</td>
                            <td className="text-right">{formatQtyUom(row.opening_qty, row.uom_name, formatQty(0))}</td>
                            <td className="text-right">{formatQtyUom(row.in_qty, row.uom_name, formatQty(0))}</td>
                            <td className="text-right">{formatQtyUom(row.out_qty, row.uom_name, formatQty(0))}</td>
                            <td className="text-right font-bold">{formatQtyUom(row.closing_qty, row.uom_name, formatQty(0))}</td>
                            <td className="text-right font-bold">{formatMoney(row.value)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {filteredSummary.length > 0 && (
                      <tfoot>
                        <tr className="amount-row">
                          <td className="font-bold">GRAND TOTAL ALL ITEMS</td>
                          <td className="text-right font-bold">{formatQty(filteredTotals.opening_qty)}</td>
                          <td className="text-right font-bold">{formatQty(filteredTotals.in_qty)}</td>
                          <td className="text-right font-bold">{formatQty(filteredTotals.out_qty)}</td>
                          <td className="text-right font-bold">{formatQty(filteredTotals.closing_qty)}</td>
                          <td className="text-right font-bold">{formatMoney(filteredTotals.total_value)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </>
            ) : (
              <>
                <div className="pl-header-section">
                  <h3 className="pl-statement-title">ITEM STOCK LEDGER REPORT</h3>
                  <p className="pl-statement-subtitle" style={metaStyle}>
                    <span>
                      Model: <strong>{itemName}</strong>
                    </span>
                    <span>
                      Date Range: <strong>{formatRange(fromDate, toDate)}</strong>
                    </span>
                  </p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="pl-table stock-ledger-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Transaction Type</th>
                        <th>Ref / Doc#</th>
                        <th>Party</th>
                        <th>IMEI / Specs</th>
                        <th className="text-right">In</th>
                        <th className="text-right">Out</th>
                        <th className="text-right">Unit Price</th>
                        {/* Total Val hidden — each phone is qty 1, value = unit price */}
                        <th className="text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerRows.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="text-center" style={{ padding: '20px', color: '#64748b' }}>
                            No stock movements found for this period.
                          </td>
                        </tr>
                      ) : (
                        ledgerRows.map((row) => {
                          const refLink = getReferenceLink(row);
                          return (
                            <tr key={row.line_id} style={row.isOpening ? { background: '#f8fafc' } : undefined}>
                              <td>{formatRowDate(row.transaction_date)}</td>
                              <td className="font-bold">{row.transaction_type}</td>
                              <td>
                                {refLink ? (
                                  <Link to={refLink} style={{ color: '#0284c7' }}>
                                    {row.reference_no}
                                  </Link>
                                ) : (
                                  row.reference_no || '---'
                                )}
                              </td>
                              <td>{row.entity_name || '---'}</td>
                              <td style={{ fontSize: '0.78rem', color: '#475569' }}>{formatDeviceMeta(row)}</td>
                              <td className="text-right">{row.in_qty ? formatQtyUom(row.in_qty, uom) : '---'}</td>
                              <td className="text-right">{row.out_qty ? formatQtyUom(row.out_qty, uom) : '---'}</td>
                              <td className="text-right">
                                {row.isOpening ? '---' : formatMoney(row.unit_price)}
                              </td>
                              <td className="text-right font-bold">{formatQtyUom(row.balance, uom, formatQty(0))}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {ledgerRows.length > 0 && (
                      <tfoot>
                        <tr className="amount-row">
                          <td>{formatRowDate(toDate)}</td>
                          <td className="font-bold">CLOSING BALANCE</td>
                          <td>---</td>
                          <td colSpan={2} style={{ fontSize: '0.85rem' }}>
                            In: {formatMoney(periodInVal)}
                            {' · '}
                            Out: {formatMoney(periodOutVal)}
                            {' · '}
                            Remaining: {formatMoney(closingVal)}
                          </td>
                          <td className="text-right font-bold">{formatQtyUom(apiTotals.in_qty, uom, formatQty(0))}</td>
                          <td className="text-right font-bold">{formatQtyUom(apiTotals.out_qty, uom, formatQty(0))}</td>
                          <td className="text-right font-bold">---</td>
                          <td className="text-right font-bold">{formatQtyUom(closingQty, uom, formatQty(0))}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default StockLedgerReport;
