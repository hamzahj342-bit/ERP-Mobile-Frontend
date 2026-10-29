import React, { useState, useEffect, useRef } from 'react';
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
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatRs = (n) => `Rs. ${formatMoney(n)}`;

const BalanceSheetReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef();
  const today = localToday();

  const [asOf, setAsOf] = useState(today);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    total_assets: 0,
    total_liabilities: 0,
    total_equity: 0,
    net_profit: 0,
    financing: 0,
    difference: 0,
    is_balanced: true,
  });
  const [assets, setAssets] = useState([]);
  const [liabilities, setLiabilities] = useState([]);
  const [equity, setEquity] = useState([]);

  const fetchReport = async () => {
    if (!asOf) {
      toast.warning('Please select an as-of date.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.get('/reports/balance-sheet', { params: { asOf } });
      if (response.data?.success === false) {
        toast.error(response.data.message || 'Failed to load Balance Sheet.');
        return;
      }
      setSummary(
        response.data?.summary || {
          total_assets: 0,
          total_liabilities: 0,
          total_equity: 0,
          net_profit: 0,
          financing: 0,
          difference: 0,
          is_balanced: true,
        }
      );
      setAssets(response.data?.data?.assets || []);
      setLiabilities(response.data?.data?.liabilities || []);
      setEquity(response.data?.data?.equity || []);
    } catch (err) {
      console.error('Balance Sheet Error:', err);
      toast.error(err.response?.data?.message || 'Failed to load Balance Sheet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [asOf]);

  const openAccount = (row) => {
    if (row?.derived_kind === 'retained_earnings' || row?.account_name === 'Accumulated Profit / (Loss)') {
      navigate('/profit-loss');
      return;
    }
    if (row?.account_id) navigate(`/ledger/${row.account_id}`);
  };

  const hasRows = assets.length > 0 || liabilities.length > 0 || equity.length > 0;

  const buildSectionRows = (rows) => {
    const out = [];
    let lastGroup = null;
    rows.forEach((row) => {
      if (row.group && row.group !== lastGroup) {
        out.push({ kind: 'group', label: row.group });
        lastGroup = row.group;
      }
      out.push({ kind: 'row', row });
    });
    return out;
  };

  const exportToExcel = () => {
    if (!hasRows) {
      toast.warning('No data to export.');
      return;
    }
    const wb = XLSX.utils.book_new();
    const lines = [
      ['BALANCE SHEET'],
      [`As of: ${asOf}`],
      [`Assets: ${formatRs(summary.total_assets)} | Liabilities: ${formatRs(summary.total_liabilities)} | Equity: ${formatRs(summary.total_equity)}`],
      [],
      ['Code', 'Account', 'Amount (Rs)'],
      ['1. ASSETS', '', ''],
      ...assets.map((r) => [r.account_code || '', r.account_name, Number(r.balance || 0)]),
      ['', 'Total Assets', Number(summary.total_assets)],
      [],
      ['2. LIABILITIES', '', ''],
      ...liabilities.map((r) => [r.account_code || '', r.account_name, Number(r.balance || 0)]),
      ['', 'Total Liabilities', Number(summary.total_liabilities)],
      [],
      ['3. EQUITY', '', ''],
      ...equity.map((r) => [r.account_code || '', r.account_name, Number(r.balance || 0)]),
      ['', 'Total Equity', Number(summary.total_equity)],
      [],
      ['', 'Liabilities + Equity', Number(summary.financing)],
      ['', 'Difference (Assets − L−E)', Number(summary.difference)],
    ];
    const ws = XLSX.utils.aoa_to_sheet(lines);
    XLSX.utils.book_append_sheet(wb, ws, 'Balance Sheet');
    XLSX.writeFile(wb, `Balance_Sheet_${asOf}.xlsx`);
  };

  const exportToPDF = () => {
    if (!hasRows) {
      toast.warning('No data to export.');
      return;
    }
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFontSize(14);
    doc.text('Balance Sheet', 14, 14);
    doc.setFontSize(10);
    doc.text(`As of: ${asOf}`, 14, 20);

    const body = [];
    const pushSection = (title, rows, totalLabel, totalVal) => {
      body.push([{ content: title, colSpan: 3, styles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' } }]);
      rows.forEach((r) => {
        body.push([
          r.account_code || '',
          r.account_name,
          { content: formatMoney(r.balance), styles: { halign: 'right' } },
        ]);
      });
      body.push([
        '',
        { content: totalLabel, styles: { fontStyle: 'bold', halign: 'right' } },
        { content: formatMoney(totalVal), styles: { fontStyle: 'bold', halign: 'right' } },
      ]);
    };

    pushSection('1. ASSETS', assets, 'Total Assets', summary.total_assets);
    pushSection('2. LIABILITIES', liabilities, 'Total Liabilities', summary.total_liabilities);
    pushSection('3. EQUITY', equity, 'Total Equity', summary.total_equity);
    body.push([
      '',
      { content: 'Liabilities + Equity', styles: { fontStyle: 'bold', halign: 'right' } },
      { content: formatMoney(summary.financing), styles: { fontStyle: 'bold', halign: 'right' } },
    ]);

    autoTable(doc, {
      startY: 26,
      head: [['Code', 'Account', 'Amount (Rs)']],
      body,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] },
    });
    doc.save(`Balance_Sheet_${asOf}.pdf`);
  };

  const exportToImage = () => {
    const input = reportRef.current;
    if (!input) return;
    html2canvas(input, { scale: 2 }).then((canvas) => {
      const link = document.createElement('a');
      link.download = `Balance_Sheet_${asOf}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  };

  const renderSection = (title, rows, totalLabel, totalVal, color) => {
    const items = buildSectionRows(rows);
    return (
      <>
        <tr className="row-section-head">
          <td colSpan="3">{title}</td>
        </tr>
        {items.length === 0 ? (
          <tr>
            <td colSpan="3" className="text-center" style={{ color: '#94a3b8' }}>
              No balances.
            </td>
          </tr>
        ) : (
          items.map((item, idx) =>
            item.kind === 'group' ? (
              <tr key={`${title}-g-${item.label}`} style={{ background: '#f8fafc' }}>
                <td colSpan="3" style={{ fontWeight: 600, color: '#475569', fontSize: 12 }}>
                  {item.label}
                </td>
              </tr>
            ) : (
              <tr
                key={`${title}-${item.row.account_id || item.row.account_name}-${idx}`}
                onClick={() => openAccount(item.row)}
                style={{ cursor: 'pointer' }}
              >
                <td style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{item.row.account_code || '—'}</td>
                <td>{item.row.account_name}</td>
                <td className="text-right" style={{ color }}>
                  {formatMoney(item.row.balance)}
                </td>
              </tr>
            )
          )
        )}
        <tr className="font-bold" style={{ background: '#f8fafc' }}>
          <td />
          <td className="text-right">{totalLabel}</td>
          <td className="text-right font-bold" style={{ color }}>
            {formatMoney(totalVal)}
          </td>
        </tr>
        <tr>
          <td colSpan="3" style={{ padding: 8 }} />
        </tr>
      </>
    );
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
                    <FaBalanceScale className="report-title-icon" /> Balance Sheet
                  </h3>
                  <p className="report-description">
                    Statement of financial position as of a date: Assets = Liabilities + Equity.
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

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Building balance sheet...</div>
          ) : (
            <div ref={reportRef} className="pl-table-container">
              <div className="pl-header-section">
                <h3 className="pl-statement-title">BALANCE SHEET</h3>
                <p className="pl-statement-subtitle">
                  As of: <strong>{asOf}</strong>
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 15 }}>
                <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                  <strong>Assets:</strong>{' '}
                  <span className="pl-summary-value" style={{ color: '#2e7d32' }}>
                    {formatRs(summary.total_assets)}
                  </span>
                </div>
                <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                  <strong>Liabilities:</strong>{' '}
                  <span className="pl-summary-value" style={{ color: '#c62828' }}>
                    {formatRs(summary.total_liabilities)}
                  </span>
                </div>
                <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                  <strong>Equity:</strong>{' '}
                  <span className="pl-summary-value">{formatRs(summary.total_equity)}</span>
                </div>
                <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                  <strong>{summary.is_balanced ? 'Balanced' : 'Difference'}:</strong>{' '}
                  <span
                    className="pl-summary-value"
                    style={{ color: summary.is_balanced ? '#2e7d32' : '#c62828' }}
                  >
                    {summary.is_balanced ? 'Yes' : formatRs(summary.difference)}
                  </span>
                </div>
              </div>

              <table className="pl-table">
                <thead>
                  <tr>
                    <th style={{ width: 140 }}>Account Code</th>
                    <th>Account Name</th>
                    <th className="text-right" style={{ width: 200 }}>
                      Amount (Rs)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {renderSection('1. ASSETS', assets, 'Total Assets', summary.total_assets, '#2e7d32')}
                  {renderSection(
                    '2. LIABILITIES',
                    liabilities,
                    'Total Liabilities',
                    summary.total_liabilities,
                    '#c62828'
                  )}
                  {renderSection('3. EQUITY', equity, 'Total Equity', summary.total_equity, '#0f172a')}
                  <tr className="amount-row">
                    <td />
                    <td className="font-bold text-right">Liabilities + Equity</td>
                    <td className="text-right font-bold">{formatMoney(summary.financing)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="pl-summary-bar">
                <strong>Assets = Liabilities + Equity</strong>
                <span className="pl-summary-value">
                  {formatRs(summary.total_assets)} = {formatRs(summary.financing)}
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

export default BalanceSheetReport;
