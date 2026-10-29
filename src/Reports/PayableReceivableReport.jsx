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
import { localToday } from '../utils/localDate';

const formatMoney = (n) =>
  `Rs. ${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const typeLabel = (t) => {
  const v = String(t || '').toLowerCase();
  if (v === 'customer') return 'Customer';
  if (v === 'supplier') return 'Supplier';
  if (v === 'employee') return 'Employee';
  return t || '-';
};

const PayableReceivableReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef();
  const today = localToday();

  const [asOf, setAsOf] = useState(today);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [receivables, setReceivables] = useState([]);
  const [payables, setPayables] = useState([]);

  const fetchReport = async () => {
    if (!asOf) {
      toast.warning('Please select an as-of date.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.get('/reports/payable-receivable', {
        params: { asOf },
      });
      setReceivables(response.data?.receivables || []);
      setPayables(response.data?.payables || []);
    } catch (err) {
      console.error('Payable / Receivable Report Error:', err);
      toast.error(err.response?.data?.message || 'Failed to load Payable & Receivable report.');
      setReceivables([]);
      setPayables([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [asOf]);

  const filterRows = (rows) => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase().trim();
    return rows.filter(
      (row) =>
        String(row.name || '').toLowerCase().includes(term) ||
        String(row.type || '').toLowerCase().includes(term)
    );
  };

  const filteredReceivables = useMemo(() => filterRows(receivables), [receivables, searchTerm]);
  const filteredPayables = useMemo(() => filterRows(payables), [payables, searchTerm]);

  const filteredTotals = useMemo(() => {
    const receivable_amount = filteredReceivables.reduce((s, r) => s + Number(r.balance || 0), 0);
    const payable_amount = filteredPayables.reduce((s, r) => s + Number(r.balance || 0), 0);
    return {
      receivable_count: filteredReceivables.length,
      payable_count: filteredPayables.length,
      receivable_amount,
      payable_amount,
      net_amount: receivable_amount - payable_amount,
    };
  }, [filteredReceivables, filteredPayables]);

  const openLedger = (row) => {
    if (!row?.id) {
      toast.error('Entity ID missing. Cannot open ledger.');
      return;
    }
    navigate(`/entity-ledger?entity_id=${row.id}&type=${row.type || ''}`);
  };

  const hasRows = filteredReceivables.length > 0 || filteredPayables.length > 0;

  const exportToExcel = () => {
    if (!hasRows) {
      toast.warning('No data to export.');
      return;
    }
    const wb = XLSX.utils.book_new();
    const titleRow = ['PAYABLE & RECEIVABLE STATEMENT'];
    const dateRow = [
      `As of: ${asOf} | Receivable: ${formatMoney(filteredTotals.receivable_amount)} | Payable: ${formatMoney(filteredTotals.payable_amount)} | Net: ${formatMoney(filteredTotals.net_amount)}`,
    ];
    const header = ['#', 'Name', 'Type', 'Balance'];
    const rows = [
      titleRow,
      dateRow,
      [],
      ['ACCOUNTS RECEIVABLE'],
      header,
      ...filteredReceivables.map((r, i) => [i + 1, r.name, typeLabel(r.type), Number(r.balance || 0)]),
      ['', 'Total Receivable', '', filteredTotals.receivable_amount],
      [],
      ['ACCOUNTS PAYABLE'],
      header,
      ...filteredPayables.map((r, i) => [i + 1, r.name, typeLabel(r.type), Number(r.balance || 0)]),
      ['', 'Total Payable', '', filteredTotals.payable_amount],
      [],
      ['', 'Net (Receivable − Payable)', '', filteredTotals.net_amount],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Payable Receivable');
    XLSX.writeFile(wb, `Payable_Receivable_${asOf}.xlsx`);
  };

  const exportToPDF = () => {
    if (!hasRows) {
      toast.warning('No data to export.');
      return;
    }
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFontSize(14);
    doc.text('Payable & Receivable Statement', 14, 14);
    doc.setFontSize(10);
    doc.text(
      `As of: ${asOf}  |  Receivable: ${formatMoney(filteredTotals.receivable_amount)}  |  Payable: ${formatMoney(filteredTotals.payable_amount)}`,
      14,
      20
    );

    autoTable(doc, {
      startY: 26,
      head: [['#', 'Name', 'Type', 'Receivable (Rs)']],
      body: [
        ...filteredReceivables.map((r, i) => [
          i + 1,
          r.name || '',
          typeLabel(r.type),
          Number(r.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }),
        ]),
        ['', 'Total Receivable', '', Number(filteredTotals.receivable_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })],
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] },
    });

    autoTable(doc, {
      startY: (doc.lastAutoTable?.finalY || 26) + 8,
      head: [['#', 'Name', 'Type', 'Payable (Rs)']],
      body: [
        ...filteredPayables.map((r, i) => [
          i + 1,
          r.name || '',
          typeLabel(r.type),
          Number(r.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }),
        ]),
        ['', 'Total Payable', '', Number(filteredTotals.payable_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })],
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] },
    });

    const y = (doc.lastAutoTable?.finalY || 40) + 10;
    doc.setFontSize(11);
    doc.text(`Net (Receivable − Payable): ${formatMoney(filteredTotals.net_amount)}`, 14, y);
    doc.save(`Payable_Receivable_${asOf}.pdf`);
  };

  const exportToImage = () => {
    const input = reportRef.current;
    if (!input) return;
    html2canvas(input, { scale: 2 }).then((canvas) => {
      const link = document.createElement('a');
      link.download = `Payable_Receivable_${asOf}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  };

  const renderPartyTable = (title, rows, amountColor) => (
    <table className="pl-table">
      <thead>
        <tr>
          <th colSpan="4">{title}</th>
        </tr>
        <tr>
          <th style={{ width: '50px' }}>#</th>
          <th>Name</th>
          <th style={{ width: '110px' }}>Type</th>
          <th className="text-right" style={{ width: '160px' }}>Balance (Rs)</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan="4" className="text-center" style={{ padding: '16px', color: '#64748b' }}>
              No outstanding balances.
            </td>
          </tr>
        ) : (
          rows.map((row, index) => (
            <tr
              key={`${title}-${row.id}`}
              onClick={() => openLedger(row)}
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8fafc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <td style={{ color: '#94a3b8' }}>{index + 1}</td>
              <td className="font-bold">{row.name}</td>
              <td>{typeLabel(row.type)}</td>
              <td className="text-right font-bold" style={{ color: amountColor }}>
                {formatMoney(row.balance)}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

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
                    <FaBalanceScale className="report-title-icon" /> Payable &amp; Receivable Report
                  </h3>
                  <p className="report-description">
                    Current outstanding balances as of the selected date. Click a name to open the ledger.
                  </p>
                </div>
              </div>
              {hasRows && (
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
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#475569' }}>
                As of
                <input
                  type="date"
                  className="date-input"
                  value={asOf}
                  onChange={(e) => setAsOf(e.target.value)}
                />
              </label>
              <input
                type="text"
                className="date-input"
                placeholder="Search name / type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button
                type="button"
                className="get-report-btn"
                onClick={() => setAsOf(localToday())}
                style={asOf === localToday() ? { backgroundColor: '#0f172a', color: '#fff' } : undefined}
              >
                Today
              </button>
              <button type="button" className="get-report-btn" onClick={fetchReport}>
                <FaSync /> Refresh
              </button>
            </div>
          </div>

          <div ref={reportRef} className="pl-table-container">
            <div className="pl-header-section">
              <h3 className="pl-statement-title">PAYABLE &amp; RECEIVABLE STATEMENT</h3>
              <p className="pl-statement-subtitle">
                As of: <strong>{asOf}</strong>
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '15px' }}>
              <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                <strong>Receivable:</strong>{' '}
                <span className="pl-summary-value" style={{ color: '#2e7d32' }}>
                  {formatMoney(filteredTotals.receivable_amount)}
                </span>
                <span style={{ marginLeft: 6, color: '#64748b', fontSize: 11 }}>
                  ({filteredTotals.receivable_count})
                </span>
              </div>
              <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                <strong>Payable:</strong>{' '}
                <span className="pl-summary-value" style={{ color: '#c62828' }}>
                  {formatMoney(filteredTotals.payable_amount)}
                </span>
                <span style={{ marginLeft: 6, color: '#64748b', fontSize: 11 }}>
                  ({filteredTotals.payable_count})
                </span>
              </div>
              <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                <strong>Net:</strong>{' '}
                <span className="pl-summary-value">{formatMoney(filteredTotals.net_amount)}</span>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>Loading outstanding balances...</div>
            ) : (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: 16,
                  }}
                >
                  <div>
                    {renderPartyTable('1. ACCOUNTS RECEIVABLE', filteredReceivables, '#2e7d32')}
                    {filteredReceivables.length > 0 && (
                      <div className="pl-summary-bar" style={{ marginTop: 8 }}>
                        <strong>Total Receivable:</strong>
                        <span className="pl-summary-value" style={{ color: '#2e7d32' }}>
                          {formatMoney(filteredTotals.receivable_amount)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    {renderPartyTable('2. ACCOUNTS PAYABLE', filteredPayables, '#c62828')}
                    {filteredPayables.length > 0 && (
                      <div className="pl-summary-bar" style={{ marginTop: 8 }}>
                        <strong>Total Payable:</strong>
                        <span className="pl-summary-value" style={{ color: '#c62828' }}>
                          {formatMoney(filteredTotals.payable_amount)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {!hasRows && (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No outstanding payable or receivable balances as of this date.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default PayableReceivableReport;
