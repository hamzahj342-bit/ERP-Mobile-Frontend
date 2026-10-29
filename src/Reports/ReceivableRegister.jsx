import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import Select from 'react-select';
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';
import api from '../../api';
import { FaArrowLeft, FaFileExcel, FaFilePdf, FaImage, FaSync, FaSearch, FaMoneyCheckAlt } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';
import html2canvas from 'html2canvas';
import '../Profitloss.css';
import { localToday, localFirstOfMonth } from '../utils/localDate';

const ReceivableRegister = () => {
  const navigate = useNavigate();
  const reportRef = useRef();

  const today = localToday();
  const firstOfMonth = localFirstOfMonth();

  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);
  
  // React-Select Customer Option
  const [selectedCustomerOption, setSelectedCustomerOption] = useState({ value: 'ALL', label: 'All Customers' });
  const [customerOptions, setCustomerOptions] = useState([{ value: 'ALL', label: 'All Customers' }]);
  
  const [itemTypeFilter, setItemTypeFilter] = useState('ALL'); // ALL, FP, RM
  const [taxTypeFilter, setTaxTypeFilter] = useState('ALL');
  const [agingBucketFilter, setAgingBucketFilter] = useState('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const [registerData, setRegisterData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch Customers from `/entities/customer` for React-Select Dropdown
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await api.get('/entities/customer');
        const rawList = Array.isArray(res.data) 
          ? res.data 
          : (res.data?.customers || res.data?.data || []);

        const uniqueCustomers = new Map();
        rawList.forEach(c => {
          const id = c.id || c.customer_id || c._id;
          const name = c.name || c.customer_name || c.company_name || 'Unknown Customer';
          if (id && !uniqueCustomers.has(id)) {
            uniqueCustomers.set(id, { value: id, label: name });
          }
        });

        setCustomerOptions([
          { value: 'ALL', label: 'All Customers' },
          ...Array.from(uniqueCustomers.values())
        ]);
      } catch (err) {
        console.error('Failed to fetch customers list:', err);
        toast.error('Could not load customers list.');
      }
    };
    fetchCustomers();
  }, []);

  // Fetch Customer Receivables Report Data
  const fetchReceivablesReport = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/receivable-register', {
        params: { 
          fromDate, 
          toDate, 
          customer_id: selectedCustomerOption?.value || 'ALL',
          item_type: itemTypeFilter,
          tax_type: taxTypeFilter 
        }
      });
      const data = response.data?.register || response.data?.data || response.data || [];
      setRegisterData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Customer Receivables Fetch Error:', err);
      toast.error('Failed to load Receivables Report data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceivablesReport();
  }, [fromDate, toDate, selectedCustomerOption, itemTypeFilter, taxTypeFilter]);

  // Client-Side Search & Filter
  const filteredRegister = registerData.filter(row => {
    if (agingBucketFilter !== 'ALL' && row.aging_bucket !== agingBucketFilter) return false;
    if (paymentStatusFilter !== 'ALL' && row.payment_status !== paymentStatusFilter) return false;

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();

    const docNo = String(row.doc_no || '').toLowerCase();
    const invNo = String(row.invoice_no || '').toLowerCase();
    const custName = String(row.customer_name || '').toLowerCase();
    const status = String(row.payment_status || '').toLowerCase();

    return docNo.includes(term) || invNo.includes(term) || custName.includes(term) || status.includes(term);
  });

  // Calculate Financial Totals
  const totals = filteredRegister.reduce((acc, row) => {
    acc.taxable += Number(row.taxable_amount || 0);
    acc.tax += Number(row.tax_amount || 0);
    acc.freight += Number(row.freight_amount || 0);
    acc.net += Number(row.net_amount || 0);
    acc.paid += Number(row.paid_amount || 0);
    acc.balance += Number(row.balance_amount || 0);
    if (Number(row.aging_days || 0) > 60 && row.payment_status !== 'Paid') acc.overdueCount += 1;
    return acc;
  }, { taxable: 0, tax: 0, freight: 0, net: 0, paid: 0, balance: 0, overdueCount: 0 });

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    if (num < 0) {
      return `-Rs. ${Math.abs(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `Rs. ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getAgingBadge = (bucket, days) => {
    if (bucket === 'Paid') return { bg: '#dcfce7', text: '#15803d', label: 'Paid' };
    const d = Number(days || 0);
    if (d > 90) return { bg: '#fef2f2', text: '#dc2626', label: '90+ Days' };
    if (d > 60) return { bg: '#fff7ed', text: '#c2410c', label: '61-90 Days' };
    if (d > 30) return { bg: '#fefce8', text: '#a16207', label: '31-60 Days' };
    return { bg: '#f0fdf4', text: '#15803d', label: '0-30 Days' };
  };

  const getPaymentStatusBadge = (status) => {
    switch (status) {
      case 'Paid': return { bg: '#dcfce7', text: '#16a34a' };
      case 'Partial': return { bg: '#fefce8', text: '#ca8a04' };
      default: return { bg: '#fef2f2', text: '#dc2626' };
    }
  };

  const selectStyles = {
    control: (p) => ({ ...p, minHeight: "32px", height: "32px", borderRadius: "6px", borderColor: "#e2e8f0", boxShadow: "none", fontSize: "12px" }),
    valueContainer: (p) => ({ ...p, padding: "0 8px", height: "30px" }),
    indicatorsContainer: (p) => ({ ...p, height: "30px" }),
    input: (p) => ({ ...p, margin: 0, padding: 0 }),
    singleValue: (p) => ({ ...p, fontSize: "12px", color: "#334155" }),
    placeholder: (p) => ({ ...p, fontSize: "12px", color: "#94a3b8" }),
    menu: (p) => ({ ...p, zIndex: 9999, fontSize: "12px" }),
    option: (p) => ({ ...p, fontSize: "12px", padding: "6px 10px" })
  };

  // Exports
  const exportToExcel = () => {
    if (!filteredRegister.length) return toast.error('No data available to export!');
    const wb = XLSX.utils.book_new();
    const titleRow = ['CUSTOMER RECEIVABLES REPORT'];
    const dateRow = [`Period: ${fromDate} to ${toDate} | Item Type: ${itemTypeFilter}`];
    const headers = ['Date', 'Doc No', 'Invoice No', 'Type', 'Customer Name', 'Tax Type', 'Taxable Amt', 'Tax Amt', 'Freight', 'Net Amount', 'Paid Amt', 'Balance Amt', 'Status', 'Aging (Days)', 'Bucket'];

    const bodyRows = filteredRegister.map(r => [
      r.date ? new Date(r.date).toISOString().split('T')[0] : '',
      r.doc_no || 'N/A',
      r.invoice_no || 'N/A',
      r.item_type || 'N/A',
      r.customer_name || 'N/A',
      r.is_taxable || 'N/A',
      Number(r.taxable_amount || 0),
      Number(r.tax_amount || 0),
      Number(r.freight_amount || 0),
      Number(r.net_amount || 0),
      Number(r.paid_amount || 0),
      Number(r.balance_amount || 0),
      r.payment_status || 'Unpaid',
      Number(r.aging_days || 0),
      r.aging_bucket || '0-30 Days'
    ]);

    const sheetData = [titleRow, dateRow, [], headers, ...bodyRows];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = Array(15).fill({ wch: 15 });
    XLSX.utils.book_append_sheet(wb, ws, 'Receivables');
    XLSX.writeFile(wb, `Receivables_Report_${today}.xlsx`);
  };

  const exportToPDF = () => {
    if (!filteredRegister.length) return toast.error('No data available to export!');
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text('Customer Receivables Report', 14, 15);
    doc.setFontSize(9);
    doc.text(`Period: ${fromDate} to ${toDate} | Type: ${itemTypeFilter}`, 14, 21);

    const headers = [['Date', 'Doc No', 'Invoice', 'Type', 'Customer Name', 'Net Amount', 'Paid', 'Balance', 'Status', 'Aging']];
    const body = filteredRegister.map(r => [
      r.date ? new Date(r.date).toISOString().split('T')[0] : '',
      r.doc_no || 'N/A',
      r.invoice_no || 'N/A',
      r.item_type || 'N/A',
      r.customer_name || 'N/A',
      `Rs. ${Number(r.net_amount || 0).toFixed(2)}`,
      `Rs. ${Number(r.paid_amount || 0).toFixed(2)}`,
      `Rs. ${Number(r.balance_amount || 0).toFixed(2)}`,
      r.payment_status || 'Unpaid',
      `${r.aging_days || 0} Days`
    ]);

    autoTable(doc, { head: headers, body: body, startY: 26, theme: 'grid', headStyles: { fillColor: [51, 65, 85] }, styles: { fontSize: 8 } });
    doc.save(`Receivables_Report_${today}.pdf`);
  };

  const exportToImage = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `Receivables_Report_${today}.png`;
      link.click();
    } catch (err) {
      console.error('PNG Export Error:', err);
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
                    <FaMoneyCheckAlt className="report-title-icon" /> Customer Receivables & Aging Report
                  </h3>
                  <p className="report-description">Track customer invoices, payments received, and aging analysis.</p>
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
              <div className="react-select-shell">
                <Select
                  options={customerOptions}
                  value={selectedCustomerOption}
                  onChange={(option) => setSelectedCustomerOption(option)}
                  placeholder="Search Customer..."
                  styles={selectStyles}
                  isSearchable
                />
              </div>
              <select className="date-input" value={itemTypeFilter} onChange={(e) => setItemTypeFilter(e.target.value)}>
                <option value="ALL">All Items</option>
                <option value="FP">Finished Goods</option>
                <option value="RM">Inventory</option>
              </select>
              <select className="date-input" value={taxTypeFilter} onChange={(e) => setTaxTypeFilter(e.target.value)}>
                <option value="ALL">All Tax Types</option>
                <option value="Taxable">Taxable</option>
                <option value="Non-Taxable">Non-Taxable</option>
              </select>
              <select className="date-input" value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)}>
                <option value="ALL">All Payments</option>
                <option value="Paid">Paid</option>
                <option value="Partial">Partial</option>
                <option value="Unpaid">Unpaid</option>
              </select>
              <select className="date-input" value={agingBucketFilter} onChange={(e) => setAgingBucketFilter(e.target.value)}>
                <option value="ALL">All Aging Buckets</option>
                <option value="Paid">Paid</option>
                <option value="0-30 Days">0-30 Days</option>
                <option value="31-60 Days">31-60 Days</option>
                <option value="61-90 Days">61-90 Days</option>
                <option value="90+ Days">90+ Days (Overdue)</option>
              </select>
              <input type="text" className="date-input" placeholder="Doc, Customer, Invoice..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <button type="button" className="get-report-btn" onClick={fetchReceivablesReport}>
                <FaSync /> Refresh
              </button>
            </div>
          </div>

          <div ref={reportRef} className="pl-table-container">
            <div className="pl-header-section">
              <h3 className="pl-statement-title">CUSTOMER RECEIVABLES & AGING REPORT</h3>
              <p className="pl-statement-subtitle">Period: <strong>{fromDate}</strong> to <strong>{toDate}</strong></p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '15px' }}>
              <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                <strong>Invoices:</strong> <span className="pl-summary-value">{filteredRegister.length}</span>
              </div>
              <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px' }}>
                <strong>Taxable:</strong> <span className="pl-summary-value">{formatCurrency(totals.taxable)}</span>
              </div>
              <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px', background: '#f0fdf4' }}>
                <strong style={{ color: '#16a34a' }}>Net Sales:</strong> <span className="pl-summary-value" style={{ color: '#16a34a' }}>{formatCurrency(totals.net)}</span>
              </div>
              <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px', background: '#f0fdf4' }}>
                <strong style={{ color: '#15803d' }}>Received:</strong> <span className="pl-summary-value" style={{ color: '#15803d' }}>{formatCurrency(totals.paid)}</span>
              </div>
              <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px', background: totals.balance > 0 ? '#fef2f2' : '#f8fafc' }}>
                <strong style={{ color: totals.balance > 0 ? '#dc2626' : '#16a34a' }}>Outstanding:</strong> <span className="pl-summary-value" style={{ color: totals.balance > 0 ? '#dc2626' : '#16a34a' }}>{formatCurrency(totals.balance)}</span>
              </div>
              <div className="pl-summary-bar" style={{ flex: 'unset', padding: '6px 12px', background: totals.overdueCount > 0 ? '#fef2f2' : '#f8fafc' }}>
                <strong style={{ color: totals.overdueCount > 0 ? '#dc2626' : '#475569' }}>Overdue (&gt;60d):</strong> <span className="pl-summary-value">{totals.overdueCount} Invoices</span>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                <FaSync className="spin" style={{ marginBottom: '8px', fontSize: '18px' }} />
                <div>Fetching Receivables Register...</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="pl-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Doc No.</th>
                      <th>Invoice No.</th>
                      <th className="text-center">Item Type</th>
                      <th>Customer Name</th>
                      <th className="text-center">Tax Type</th>
                      <th className="text-right">Net Amount</th>
                      <th className="text-right">Received</th>
                      <th className="text-right">Balance</th>
                      <th className="text-center">Status</th>
                      <th className="text-center">Aging</th>
                      <th className="text-center">Bucket</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegister.length === 0 ? (
                      <tr>
                        <td colSpan="13" className="text-center" style={{ padding: '20px', color: '#64748b' }}>
                          No receivable records found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredRegister.map((row, idx) => {
                        const badge = getAgingBadge(row.aging_bucket, row.aging_days);
                        const statusBadge = getPaymentStatusBadge(row.payment_status);

                        return (
                          <tr key={row.master_id || idx}>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              {row.date ? new Date(row.date).toISOString().split('T')[0] : 'N/A'}
                            </td>
                            <td className="font-bold" style={{ color: '#0284c7' }}>
                              {row.doc_no}
                            </td>
                            <td className="font-bold">
                              {row.invoice_no !== 'N/A' ? (
                                <Link 
                                  to={row.item_type === 'FP' ? `/sale-invoice/${encodeURIComponent(row.invoice_no)}` : `/rm-sale-invoice/${encodeURIComponent(row.invoice_no)}`} 
                                  style={{ color: '#0284c7', textDecoration: 'underline', fontWeight: '600' }}
                                >
                                  {row.invoice_no}
                                </Link>
                              ) : (
                                <span style={{ color: '#475569' }}>N/A</span>
                              )}
                            </td>
                            <td className="text-center">
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '700',
                                background: row.item_type === 'FP' ? '#e0e7ff' : '#fef3c7',
                                color: row.item_type === 'FP' ? '#3730a3' : '#92400e'
                              }}>
                                {row.item_type}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontWeight: '600', color: '#1e293b' }}>{row.customer_name || 'N/A'}</div>
                            </td>
                            <td className="text-center">
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '600',
                                background: row.is_taxable === 'Taxable' ? '#e0f2fe' : '#f1f5f9',
                                color: row.is_taxable === 'Taxable' ? '#0369a1' : '#64748b'
                              }}>
                                {row.is_taxable}
                              </span>
                            </td>
                            <td className="text-right font-bold" style={{ color: row.net_amount < 0 ? '#dc2626' : '#16a34a' }}>
                              {formatCurrency(row.net_amount)}
                            </td>
                            <td className="text-right font-bold" style={{ color: '#15803d' }}>
                              {formatCurrency(row.paid_amount)}
                            </td>
                            <td className="text-right font-bold" style={{ color: row.balance_amount > 0 ? '#dc2626' : '#64748b' }}>
                              {formatCurrency(row.balance_amount)}
                            </td>
                            <td className="text-center">
                              <span style={{
                                background: statusBadge.bg,
                                color: statusBadge.text,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '600'
                              }}>
                                {row.payment_status || 'Unpaid'}
                              </span>
                            </td>
                            <td className="text-center font-bold" style={{ color: '#475569' }}>
                              {row.aging_days ? `${row.aging_days} Days` : '0 Days'}
                            </td>
                            <td className="text-center">
                              <span style={{ 
                                background: badge.bg, 
                                color: badge.text, 
                                padding: '2px 8px', 
                                borderRadius: '12px', 
                                fontSize: '11px', 
                                fontWeight: '600',
                                display: 'inline-block'
                              }}>
                                {badge.label}
                              </span>
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
                RECEIVABLES SUMMARY
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div style={{ padding: '10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>TOTAL OUTPUT TAX</span>
                  <span style={{ fontSize: '15px', fontWeight: '700', color: '#d97706' }}>{formatCurrency(totals.tax)}</span>
                </div>
                <div style={{ padding: '10px', background: '#f0fdf4', border: '1px solid #16a34a', borderRadius: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>TOTAL NET SALES</span>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#16a34a' }}>{formatCurrency(totals.net)}</span>
                </div>
                <div style={{ padding: '10px', background: '#f0fdf4', border: '1px solid #15803d', borderRadius: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>TOTAL RECEIVED</span>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#15803d' }}>{formatCurrency(totals.paid)}</span>
                </div>
                <div style={{ padding: '10px', background: totals.balance > 0 ? '#fef2f2' : '#fff', border: `1px solid ${totals.balance > 0 ? '#dc2626' : '#cbd5e1'}`, borderRadius: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>OUTSTANDING RECEIVABLES</span>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: totals.balance > 0 ? '#dc2626' : '#16a34a' }}>{formatCurrency(totals.balance)}</span>
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

export default ReceivableRegister;