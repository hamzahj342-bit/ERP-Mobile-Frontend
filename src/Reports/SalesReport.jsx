import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';
import api from '../../api';
import { FaUserFriends, FaMobileAlt, FaFilter, FaFileInvoiceDollar, FaArrowLeft, FaFileExcel, FaFilePdf, FaImage } from 'react-icons/fa';
import '../Profitloss.css';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';
import html2canvas from 'html2canvas';
import { localToday, localFirstOfMonth } from '../utils/localDate';

const SalesReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef();
  const today = localToday();
  const firstDay = localFirstOfMonth();

  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(today);
  const [reportType, setReportType] = useState('customer');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [customerData, setCustomerData] = useState([]);
  const [phoneData, setPhoneData] = useState([]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/sales-report', {
        params: { fromDate, toDate, reportType },
      });

      if (reportType === 'customer') {
        setCustomerData(Array.isArray(response.data) ? response.data : []);
      } else {
        const phones =
          response.data?.phones ||
          response.data?.rawMaterials ||
          [];
        setPhoneData(Array.isArray(phones) ? phones : []);
      }
    } catch (err) {
      console.error('Error fetching report:', err);
      alert('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  const filterCustomer = customerData.filter((c) => {
    const customerName = c?.customerName || c?.name || '';
    return customerName.toLowerCase().includes((searchTerm || '').toLowerCase());
  });

  const filteredPhones = phoneData.filter((item) => {
    const itemName = item?.itemName || '';
    return itemName.toLowerCase().includes((searchTerm || '').toLowerCase());
  });

  const customerQtyTotal = filterCustomer.reduce((sum, row) => sum + Number(row.rmQty || 0), 0);
  const customerSaleTotal = filterCustomer.reduce(
    (sum, row) => sum + Number(row.rmAmount || row.netTotalAmount || row.total || 0),
    0
  );
  const phoneQtyTotal = filteredPhones.reduce((s, i) => s + Number(i.qty || 0), 0);
  const phoneSaleTotal = filteredPhones.reduce((s, i) => s + Number(i.total || 0), 0);

  const exportToExcel = () => {
    const headerStyle = {
      fill: { fgColor: { rgb: '2196F3' } },
      font: { color: { rgb: 'FFFFFF' }, bold: true, sz: 12 },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
      },
    };
    const cellStyle = {
      alignment: { horizontal: 'left' },
      border: { bottom: { style: 'thin', color: { rgb: 'EEEEEE' } } },
    };
    const amountStyle = {
      alignment: { horizontal: 'right' },
      numFmt: '#,##0.00',
      border: { bottom: { style: 'thin', color: { rgb: 'EEEEEE' } } },
    };

    const wb = XLSX.utils.book_new();
    let ws;

    if (reportType === 'customer') {
      const headers = [
        { v: 'CUSTOMER NAME', s: headerStyle },
        { v: 'PHONES SOLD', s: headerStyle },
        { v: 'PHONE SALES (RS)', s: headerStyle },
      ];
      const rows = filterCustomer.map((c) => [
        { v: c.customerName || c.name || 'Unknown', s: cellStyle },
        { v: Number(c.rmQty || 0), s: cellStyle },
        { v: Number(c.rmAmount || c.netTotalAmount || 0), s: amountStyle },
      ]);
      ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = [{ wch: 35 }, { wch: 14 }, { wch: 22 }];
    } else {
      const headers = [
        { v: 'MODEL NAME', s: headerStyle },
        { v: 'QTY', s: headerStyle },
        { v: 'SALES (RS)', s: headerStyle },
      ];
      const rows = filteredPhones.map((r) => [
        { v: r.itemName, s: cellStyle },
        { v: Number(r.qty || 0), s: cellStyle },
        { v: Number(r.total || 0), s: amountStyle },
      ]);
      ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = [{ wch: 35 }, { wch: 12 }, { wch: 20 }];
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');
    XLSX.writeFile(wb, `Phone_Sales_Report_${today}.xlsx`);
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const reportTitle =
        reportType === 'customer'
          ? 'Phone Sales Report - Customer Wise'
          : 'Phone Sales Report - Model Wise';

      doc.setFontSize(18);
      doc.setTextColor(40);
      doc.text(reportTitle, 14, 15);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Period: ${fromDate} to ${toDate}`, 14, 22);
      doc.text(`Generated on: ${today}`, 14, 27);

      if (reportType === 'customer') {
        const bodyData = filterCustomer.map((c) => [
          c.customerName || c.name || 'Unknown',
          Number(c.rmQty || 0).toLocaleString(),
          Number(c.rmAmount || c.netTotalAmount || 0).toLocaleString(),
        ]);
        bodyData.push([
          { content: 'GRAND TOTAL', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
          { content: customerQtyTotal.toLocaleString(), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
          { content: customerSaleTotal.toLocaleString(), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
        ]);

        autoTable(doc, {
          startY: 35,
          head: [['Customer Name', 'Phones Sold', 'Phone Sales (Rs)']],
          body: bodyData,
          headStyles: { fillColor: [33, 150, 243] },
          theme: 'grid',
        });
      } else {
        const body = filteredPhones.map((r) => [
          r.itemName,
          Number(r.qty || 0).toLocaleString(),
          Number(r.total || 0).toLocaleString(),
        ]);
        body.push([
          { content: 'TOTAL', styles: { fontStyle: 'bold', fillColor: [232, 245, 233] } },
          { content: phoneQtyTotal.toLocaleString(), styles: { fontStyle: 'bold', fillColor: [232, 245, 233] } },
          { content: phoneSaleTotal.toLocaleString(), styles: { fontStyle: 'bold', fillColor: [232, 245, 233] } },
        ]);

        autoTable(doc, {
          startY: 35,
          head: [['Model Name', 'Qty', 'Sales (Rs)']],
          body,
          headStyles: { fillColor: [67, 160, 71] },
          theme: 'grid',
        });
      }

      doc.save(`Phone_Sales_Report_${today}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
      alert('Failed to generate PDF. Check console logs.');
    }
  };

  const exportToPNG = async () => {
    if (reportRef.current) {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `Phone_Sales_Report_${today}.png`;
      link.click();
    }
  };

  const hasData =
    reportType === 'customer' ? filterCustomer.length > 0 : filteredPhones.length > 0;

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
                    <FaFileInvoiceDollar className="report-title-icon" /> Phone Sales Report
                  </h3>
                  <p className="report-description">
                    Customer-wise and model-wise phone sales (approved invoices, returns netted).
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
                  <button type="button" className="icon-button bg-png" onClick={exportToPNG} title="PNG">
                    <FaImage />
                  </button>
                </div>
              )}
            </div>

            <div className="filter-group">
              <input
                type="text"
                className="date-input"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ minWidth: '150px' }}
              />
              <input type="date" className="date-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <span>to</span>
              <input type="date" className="date-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              <button type="button" className="get-report-btn" onClick={fetchReport}>
                <FaFilter /> Filter
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #e2e8f0', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setReportType('customer')}
                style={{
                  padding: '8px 18px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  borderBottom: reportType === 'customer' ? '3px solid #334155' : 'none',
                  color: reportType === 'customer' ? '#334155' : '#94a3b8',
                  fontWeight: '600',
                  fontSize: '12px',
                }}
              >
                <FaUserFriends /> Customer Wise
              </button>
              <button
                type="button"
                onClick={() => setReportType('item')}
                style={{
                  padding: '8px 18px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  borderBottom: reportType === 'item' ? '3px solid #334155' : 'none',
                  color: reportType === 'item' ? '#334155' : '#94a3b8',
                  fontWeight: '600',
                  fontSize: '12px',
                }}
              >
                <FaMobileAlt /> Model Wise
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Loading phone sales...</div>
          ) : (
            <div ref={reportRef} className="pl-table-container">
              {reportType === 'customer' && (
                <>
                  <div className="pl-header-section">
                    <h3 className="pl-statement-title">Customer Wise Phone Sales</h3>
                    <p className="pl-statement-subtitle">
                      Approved phone sales &amp; returns | {fromDate} to {toDate}
                    </p>
                  </div>
                  <table className="pl-table">
                    <thead>
                      <tr>
                        <th>Customer Name</th>
                        <th className="text-right">Phones Sold</th>
                        <th className="text-right">Phone Sales (Rs)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filterCustomer.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="text-center" style={{ padding: '20px', color: '#64748b' }}>
                            No phone sales in this period.
                          </td>
                        </tr>
                      ) : (
                        filterCustomer.map((row, index) => (
                          <tr key={index}>
                            <td>{row.customerName || row.name || 'Unknown'}</td>
                            <td className="text-right">{Number(row.rmQty || 0).toLocaleString()}</td>
                            <td className="text-right font-bold">
                              {Number(row.rmAmount || row.netTotalAmount || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {filterCustomer.length > 0 && (
                      <tfoot>
                        <tr className="font-bold">
                          <td>Grand Total</td>
                          <td className="text-right">{customerQtyTotal.toLocaleString()}</td>
                          <td className="text-right">{customerSaleTotal.toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </>
              )}

              {reportType === 'item' && (
                <>
                  <div className="pl-header-section">
                    <h3 className="pl-statement-title">Model Wise Phone Sales</h3>
                    <p className="pl-statement-subtitle">
                      Sales by phone model | {fromDate} to {toDate}
                    </p>
                  </div>
                  <table className="pl-table">
                    <thead>
                      <tr>
                        <th>Model Name</th>
                        <th className="text-right">Qty</th>
                        <th className="text-right">Sales (Rs)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPhones.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="text-center" style={{ padding: '20px', color: '#64748b' }}>
                            No phone sales in this period.
                          </td>
                        </tr>
                      ) : (
                        filteredPhones.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.itemName}</td>
                            <td className="text-right">{Number(item.qty || 0).toLocaleString()}</td>
                            <td className="text-right font-bold">{Number(item.total || 0).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {filteredPhones.length > 0 && (
                      <tfoot>
                        <tr className="font-bold">
                          <td>Total</td>
                          <td className="text-right">{phoneQtyTotal.toLocaleString()}</td>
                          <td className="text-right">{phoneSaleTotal.toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default SalesReport;
