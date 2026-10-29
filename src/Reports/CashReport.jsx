import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import Select from 'react-select';
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';
import api from '../../api';
import { 
  FaArrowLeft, 
  FaFileExcel, 
  FaFilePdf, 
  FaImage, 
  FaSync, 
  FaWallet,
  FaListAlt,
  FaBookOpen
} from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';
import html2canvas from 'html2canvas';
import '../Profitloss.css';
import { localToday, localFirstOfMonth } from '../utils/localDate';

const CashReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef();

  const today = localToday();
  const firstOfMonth = localFirstOfMonth();

  // Active Tab State: Default changed to 'account' (Cash / Bank Account Summary)
  const [activeTab, setActiveTab] = useState('account');

  // Common Filters
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);

  // --- TAB 1: ALL VOUCHERS REGISTER STATES ---
  const [voucherType, setVoucherType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [registerData, setRegisterData] = useState([]);
  const [apiTotals, setApiTotals] = useState({
    count: 0,
    voucher_count: 0,
    total_amount: 0,
    payable_amount: 0,
    receivable_amount: 0,
    by_type: { JV: 0, CPV: 0, CRV: 0, BPV: 0, BRV: 0 },
  });

  // --- TAB 2: SPECIFIC CASH/BANK ACCOUNT SUMMARY STATES ---
  const [cashAccounts, setCashAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [summaryData, setSummaryData] = useState({
    opening_balance: 0,
    total_expense: 0,
    total_payable: 0,
    total_receivable: 0,
    closing_balance: 0,
  });
  const [loadingSummary, setLoadingSummary] = useState(false);

  // 1. Fetch All Vouchers Report (Tab 1)
  const fetchCashReport = async () => {
    if (!fromDate || !toDate) {
      toast.warning('Please select from and to dates.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.get('/reports/cash-report', {
        params: {
          fromDate,
          toDate,
          voucher_type: voucherType,
        },
      });
      setRegisterData(response.data?.register || []);
      setApiTotals(
        response.data?.totals || {
          count: 0,
          voucher_count: 0,
          total_amount: 0,
          payable_amount: 0,
          receivable_amount: 0,
          by_type: { JV: 0, CPV: 0, CRV: 0, BPV: 0, BRV: 0 },
        }
      );
    } catch (err) {
      console.error('Cash Report Fetch Error:', err);
      toast.error(err.response?.data?.message || 'Failed to load Cash Report.');
      setRegisterData([]);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Cash/Bank Dropdown List (Tab 2)
  const fetchCashAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const response = await api.get('/reports/cash-accounts');
      const accountsList = response.data?.accounts || response.data || [];

      if (Array.isArray(accountsList)) {
        const options = accountsList.map((acc) => ({
          value: acc.id,
          label: `${acc.account_name} (${acc.account_code || 'N/A'})`,
          ...acc,
        }));
        setCashAccounts(options);

        // Auto-select first cash/bank account if none is currently selected
        if (options.length > 0 && !selectedAccount) {
          setSelectedAccount(options[0]);
        }
      }
    } catch (err) {
      console.error('Fetch Accounts Error:', err);
      toast.error(err.response?.data?.message || 'Failed to load Cash/Bank accounts dropdown.');
    } finally {
      setLoadingAccounts(false);
    }
  };

  // 3. Fetch Account Summary (Tab 2: Opening -> 3 Columns -> Closing)
  const fetchAccountSummary = async () => {
    if (!selectedAccount) return;
    setLoadingSummary(true);
    try {
      const response = await api.get('/reports/daily-cash-summary', {
        params: {
          account_id: selectedAccount.value || selectedAccount.id,
          fromDate,
          toDate,
        },
      });

      if (response.data?.success || response.data?.summary) {
        const resSum = response.data.summary || response.data;
        setSummaryData({
          opening_balance: Number(resSum.opening_balance || 0),
          total_expense: Number(resSum.total_expense || 0),
          total_payable: Number(resSum.total_payable || 0),
          total_receivable: Number(resSum.total_receivable || 0),
          closing_balance: Number(resSum.closing_balance || 0),
        });
      } else {
        setSummaryData({
          opening_balance: 0,
          total_expense: 0,
          total_payable: 0,
          total_receivable: 0,
          closing_balance: 0,
        });
      }
    } catch (err) {
      console.error('Account Summary Fetch Error:', err);
      toast.error(err.response?.data?.message || 'Failed to fetch account summary.');
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'all') {
      fetchCashReport();
    } else {
      fetchCashAccounts();
    }
  }, [fromDate, toDate, voucherType, activeTab]);

  useEffect(() => {
    if (activeTab === 'account' && selectedAccount) {
      fetchAccountSummary();
    }
  }, [selectedAccount, fromDate, toDate, activeTab]);

  // Tab 1 Filtering & Totals Logic
  const filteredRegister = registerData.filter((row) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      (row.invoice_no && row.invoice_no.toLowerCase().includes(term)) ||
      (row.voucher_type && row.voucher_type.toLowerCase().includes(term)) ||
      (row.description && row.description.toLowerCase().includes(term)) ||
      (row.from_display && row.from_display.toLowerCase().includes(term)) ||
      (row.to_display && row.to_display.toLowerCase().includes(term))
    );
  });

  const rowTouchesPayable = (row) => {
    if (row.is_payable) return true;
    return /payable/i.test(`${row.from_display || ''} ${row.to_display || ''}`);
  };

  const rowTouchesReceivable = (row) => {
    if (row.is_receivable) return true;
    return /receivable/i.test(`${row.from_display || ''} ${row.to_display || ''}`);
  };

  const totals = filteredRegister.reduce(
    (acc, row) => {
      const amt = Number(row.amount || 0);
      acc.count += 1;
      acc.total_amount += amt;
      if (rowTouchesPayable(row)) acc.payable_amount += amt;
      if (rowTouchesReceivable(row)) acc.receivable_amount += amt;
      return acc;
    },
    { count: 0, total_amount: 0, payable_amount: 0, receivable_amount: 0 }
  );

  const formatCurrency = (amount) => {
    const val = Number(amount || 0);
    return `Rs. ${val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Export handlers
  const exportToExcel = () => {
    if (!filteredRegister.length && activeTab === 'all') {
      toast.warning('No data to export.');
      return;
    }
    const wb = XLSX.utils.book_new();
    const titleRow = ['CASH / VOUCHER REPORT'];
    const dateRow = [
      `Period: ${fromDate} to ${toDate} | Filter: ${voucherType} | Total: ${formatCurrency(totals.total_amount)}`,
    ];
    const header = ['Date', 'Voucher No', 'Type', 'Description', 'From (Account)', 'To (Account)', 'Amount'];
    const rows = filteredRegister.map((r) => [
      r.transaction_date || '',
      r.invoice_no || '',
      r.voucher_type || '',
      r.description || '',
      r.from_display || '',
      r.to_display || '',
      Number(r.amount || 0),
    ]);
    const ws = XLSX.utils.aoa_to_sheet([titleRow, dateRow, [], header, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Cash Report');
    XLSX.writeFile(wb, `Cash_Report_${fromDate}_to_${toDate}.xlsx`);
  };

  const exportToPDF = () => {
    if (!filteredRegister.length && activeTab === 'all') {
      toast.warning('No data to export.');
      return;
    }
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(14);
    doc.text('Cash / Voucher Report', 14, 14);
    doc.setFontSize(10);
    doc.text(`Period: ${fromDate} to ${toDate} | Filter: ${voucherType}`, 14, 20);
    autoTable(doc, {
      startY: 26,
      head: [['Date', 'Voucher No', 'Type', 'Description', 'From', 'To', 'Amount']],
      body: filteredRegister.map((r) => [
        r.transaction_date || '',
        r.invoice_no || '',
        r.voucher_type || '',
        (r.description || '').slice(0, 30),
        (r.from_display || '-').slice(0, 35),
        (r.to_display || '-').slice(0, 35),
        Number(r.amount || 0).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] },
    });
    doc.save(`Cash_Report_${fromDate}_to_${toDate}.pdf`);
  };

  const exportToImage = () => {
    const input = reportRef.current;
    if (!input) return;
    html2canvas(input, { scale: 2 }).then((canvas) => {
      const link = document.createElement('a');
      link.download = `Cash_Report_${fromDate}_to_${toDate}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  };

  const selectCustomStyles = {
    control: (provided) => ({
      ...provided,
      minHeight: '38px',
      borderRadius: '6px',
      borderColor: '#cbd5e1',
      fontSize: '13px',
      minWidth: '280px',
    }),
    menu: (provided) => ({
      ...provided,
      zIndex: 9999,
      fontSize: '13px',
    }),
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
                    <FaWallet className="report-title-icon" /> Cash / Voucher Report
                  </h3>
                  <p className="report-description">
                    All payment vouchers (JV, CPV, CRV, BPV, BRV) or specific Cash/Bank account totals.
                  </p>
                </div>
              </div>
              {activeTab === 'all' && filteredRegister.length > 0 && (
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

            {/* TAB BUTTONS TOGGLE */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('account')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'account' ? '#0f172a' : '#f1f5f9',
                  color: activeTab === 'account' ? '#ffffff' : '#475569',
                }}
              >
                <FaBookOpen /> Cash / Bank Account Summary
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'all' ? '#0f172a' : '#f1f5f9',
                  color: activeTab === 'all' ? '#ffffff' : '#475569',
                }}
              >
                <FaListAlt /> All Vouchers (Register)
              </button>
            </div>

            {/* FILTERS SECTION */}
            <div className="filter-group" style={{ marginTop: '15px' }}>
              <input
                type="date"
                className="date-input"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <input
                type="date"
                className="date-input"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />

              {/* TAB 2 SPECIFIC SEARCHABLE DROPDOWN */}
              {activeTab === 'account' && (
                <div style={{ flex: '1', minWidth: '280px' }}>
                  <Select
                    options={cashAccounts}
                    value={selectedAccount}
                    onChange={setSelectedAccount}
                    isLoading={loadingAccounts}
                    placeholder="Search Cash / Bank Account..."
                    isClearable
                    styles={selectCustomStyles}
                  />
                </div>
              )}

              {/* TAB 1 SPECIFIC FILTERS */}
              {activeTab === 'all' && (
                <>
                  <select
                    className="date-input"
                    value={voucherType}
                    onChange={(e) => setVoucherType(e.target.value)}
                  >
                    <option value="ALL">All Vouchers</option>
                    <option value="CASH">Cash (CPV + CRV)</option>
                    <option value="BANK">Bank (BPV + BRV)</option>
                    <option value="JV">Journal (JV)</option>
                    <option value="CPV">Cash Payment (CPV)</option>
                    <option value="CRV">Cash Receipt (CRV)</option>
                    <option value="BPV">Bank Payment (BPV)</option>
                    <option value="BRV">Bank Receipt (BRV)</option>
                  </select>
                  <input
                    type="text"
                    className="date-input"
                    placeholder="Search voucher"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </>
              )}

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
              <button 
                type="button" 
                className="get-report-btn" 
                onClick={activeTab === 'all' ? fetchCashReport : fetchAccountSummary}
              >
                <FaSync /> Refresh
              </button>
            </div>
          </div>

          <div ref={reportRef} className="pl-table-container">
            {/* VIEW 1: SINGLE CASH / BANK ACCOUNT SUMMARY (DEFAULT VIEW) */}
            {activeTab === 'account' && (
              <>
                <div className="pl-header-section">
                  <h3 className="pl-statement-title">
                    {selectedAccount ? selectedAccount.label : 'CASH / BANK ACCOUNT SUMMARY'}
                  </h3>
                  <p className="pl-statement-subtitle">
                    Period: <strong>{fromDate}</strong> to <strong>{toDate}</strong>
                  </p>
                </div>

                {!selectedAccount ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                    Please search and select a Cash or Bank account above to view summary.
                  </div>
                ) : loadingSummary ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>Loading Account Summary...</div>
                ) : (
                  <div style={{ overflowX: 'auto', marginTop: '15px' }}>
                    {/* OPENING BALANCE BAR */}
                    <div 
                      className="pl-summary-bar" 
                      style={{ 
                        marginBottom: '15px', 
                        padding: '10px 16px', 
                        fontSize: '14px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center' 
                      }}
                    >
                      <span><strong>Opening Balance:</strong></span>
                      <span className="pl-summary-value">{formatCurrency(summaryData.opening_balance)}</span>
                    </div>

                    {/* 3 COLUMNS TABLE */}
                    <table className="pl-table">
                      <thead>
                        <tr>
                          <th className="text-center" style={{ width: '33.33%' }}>
                            Total Expense
                          </th>
                          <th className="text-center" style={{ width: '33.33%' }}>
                            Total Payable
                          </th>
                          <th className="text-center" style={{ width: '33.33%' }}>
                            Total Receivable
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="text-center font-bold" style={{ padding: '16px' }}>
                            {formatCurrency(summaryData.total_expense)}
                          </td>
                          <td className="text-center font-bold" style={{ padding: '16px' }}>
                            {formatCurrency(summaryData.total_payable)}
                          </td>
                          <td className="text-center font-bold" style={{ padding: '16px' }}>
                            {formatCurrency(summaryData.total_receivable)}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* CLOSING BALANCE BAR */}
                    <div 
                      className="pl-summary-bar" 
                      style={{ 
                        marginTop: '15px', 
                        padding: '10px 16px', 
                        fontSize: '14px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center' 
                      }}
                    >
                      <span><strong>Closing Balance:</strong></span>
                      <span className="pl-summary-value">{formatCurrency(summaryData.closing_balance)}</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* VIEW 2: ALL VOUCHERS REGISTER */}
            {activeTab === 'all' && (
              <>
                <div className="pl-header-section">
                  <h3 className="pl-statement-title">CASH / VOUCHER REPORT</h3>
                  <p className="pl-statement-subtitle">
                    Period: <strong>{fromDate}</strong> to <strong>{toDate}</strong>
                  </p>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '15px' }}>
                  <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                    <strong>Entries:</strong>{' '}
                    <span className="pl-summary-value">{totals.count}</span>
                  </div>
                  <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                    <strong>Vouchers:</strong>{' '}
                    <span className="pl-summary-value">{apiTotals.voucher_count || 0}</span>
                  </div>
                  <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                    <strong>Total Amount:</strong>{' '}
                    <span className="pl-summary-value">{formatCurrency(totals.total_amount)}</span>
                  </div>
                  <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                    <strong>Payable:</strong>{' '}
                    <span className="pl-summary-value">{formatCurrency(totals.payable_amount)}</span>
                  </div>
                  <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                    <strong>Receivable:</strong>{' '}
                    <span className="pl-summary-value">{formatCurrency(totals.receivable_amount)}</span>
                  </div>
                </div>

                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>Loading Cash Report...</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="pl-table">
                      <thead>
                        <tr>
                          {['Date', 'Voucher No.', 'Type', 'Description', 'From', 'To', 'Amount'].map((h) => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRegister.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="text-center" style={{ padding: '20px', color: '#64748b' }}>
                              No vouchers found for this period.
                            </td>
                          </tr>
                        ) : (
                          filteredRegister.map((row) => (
                            <tr key={`${row.invoice_no}-${row.entry_id}`}>
                              <td>{row.transaction_date || ''}</td>
                              <td className="font-bold">
                                <Link
                                  to={`/payment-transaction/${row.invoice_no}`}
                                  style={{ color: '#0284c7' }}
                                >
                                  {row.invoice_no}
                                </Link>
                              </td>
                              <td>
                                <span
                                  style={{
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    backgroundColor: '#f1f5f9',
                                    color: '#0f172a',
                                  }}
                                >
                                  {row.voucher_type}
                                </span>
                              </td>
                              <td style={{ maxWidth: 240, whiteSpace: 'normal' }}>
                                {row.description || '-'}
                              </td>
                              <td style={{ maxWidth: 220, whiteSpace: 'normal' }}>
                                {row.from_display || '-'}
                              </td>
                              <td style={{ maxWidth: 220, whiteSpace: 'normal' }}>
                                {row.to_display || '-'}
                              </td>
                              <td className="text-right font-bold">{formatCurrency(row.amount)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
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

export default CashReport;