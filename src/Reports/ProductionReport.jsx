import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';
import api from '../../api';
import { FaArrowLeft, FaSearch, FaFilter, FaFileExcel, FaFilePdf, FaImage } from 'react-icons/fa';
import { MdScience, MdPrecisionManufacturing } from 'react-icons/md';
import { toast } from 'react-toastify';
import '../Profitloss.css';

// Export Libraries
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from 'xlsx-js-style';
import html2canvas from 'html2canvas';
import { localToday, localFirstOfMonth } from '../utils/localDate';

const ProductionReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef(); // PNG capture ke liye reference
  const today = localToday();
  const firstDay = localFirstOfMonth();

  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(today);
  const [reportType, setReportType] = useState('summary'); 
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState([]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/production-report', {
        params: { fromDate, toDate, reportType }
      });
      setData(response.data);
    } catch (err) {
      console.error("Error fetching report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearchTerm('');
    fetchReport();
  }, [reportType]);

  const filteredData = data.filter(item => 
    (reportType === 'summary' ? item.productName : item.materialName)
    ?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- 📗 PRO EXCEL EXPORT ---
  const exportToExcel = () => {
    const headerStyle = {
      fill: { fgColor: { rgb: "4CAF50" } }, // Production Green Theme
      font: { color: { rgb: "FFFFFF" }, bold: true },
      alignment: { horizontal: "center" },
      border: { bottom: { style: "thin", color: { rgb: "000000" } } }
    };

    const cellStyle = { alignment: { horizontal: "left" } };
    const numStyle = { alignment: { horizontal: "right" } };

    const headers = [
      { v: reportType === 'summary' ? "PRODUCT NAME" : "MATERIAL NAME", s: headerStyle },
      { v: reportType === 'summary' ? "TOTAL BATCHES" : "QTY USED", s: headerStyle },
      { v: reportType === 'summary' ? "PRODUCED QTY" : "VALUE (RS)", s: headerStyle }
    ];

    const rows = filteredData.map(row => [
      { v: reportType === 'summary' ? row.productName : row.materialName, s: cellStyle },
      { v: reportType === 'summary' ? row.batchCount : Number(row.usedQty), s: cellStyle },
      { v: Number(reportType === 'summary' ? row.totalQty : row.totalCost), s: numStyle }
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 20 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Production Report");
    XLSX.writeFile(wb, `Production_${reportType}_${today}.xlsx`);
  };

  // --- 📕 PDF EXPORT ---
  const exportToPDF = () => {
  const loadingToast = toast.loading("Generating Production Report...");
  try {
    const doc = new jsPDF();
    doc.text(`Production Report: ${reportType.toUpperCase()}`, 14, 15);

    const body = filteredData.map(row => [
      reportType === 'summary' ? row.productName : row.materialName,
      reportType === 'summary' ? row.batchCount : Number(row.usedQty).toFixed(2),
      Number(reportType === 'summary' ? row.totalQty : row.totalCost).toLocaleString()
    ]);

    autoTable(doc, {
      startY: 25,
      head: reportType === 'summary' ? [['Product', 'Batches', 'Qty']] : [['Material', 'Used', 'Value']],
      body: body,
      headStyles: { fillColor: [76, 175, 80] }
    });

    doc.save(`Production_Report_${today}.pdf`);
    toast.success("Production PDF Downloaded!", { id: loadingToast });
  } catch (error) {
    toast.error("Production PDF Failed!", { id: loadingToast });
  }
};

  // --- 🖼️ PNG IMAGE EXPORT ---
  const exportToPNG = async () => {
    if (reportRef.current) {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const link = document.createElement('a');
      link.href = canvas.toDataURL("image/png");
      link.download = `Production_Analytics_${today}.png`;
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
                    <MdPrecisionManufacturing className="report-title-icon" /> Production Analytics
                  </h3>
                  <p className="report-description">View production summary and material consumption data.</p>
                </div>
              </div>
              {filteredData.length > 0 && (
                <div className="export-btn-group">
                  <button type="button" className="icon-button bg-pdf" onClick={exportToPDF} title="PDF"><FaFilePdf /></button>
                  <button type="button" className="icon-button bg-excel" onClick={exportToExcel} title="Excel"><FaFileExcel /></button>
                  <button type="button" className="icon-button bg-png" onClick={exportToPNG} title="PNG"><FaImage /></button>
                </div>
              )}
            </div>

            <div className="filter-group">
              <input type="text" className="date-input" placeholder={reportType === 'summary' ? "Search Product..." : "Search Material..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ minWidth: '160px' }} />
              <input type="date" className="date-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <input type="date" className="date-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              <button type="button" className="get-report-btn" onClick={fetchReport}>
                <FaFilter /> Filter
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Loading Production Data...</div>
          ) : (
            <div ref={reportRef} className="pl-table-container">
              <div className="pl-header-section">
                <h3 className="pl-statement-title">Production {reportType === 'summary' ? 'Summary' : 'Consumption'} Report</h3>
                <p className="pl-statement-subtitle">{fromDate} to {toDate}</p>
              </div>
              <table className="pl-table">
                <thead>
                  <tr>
                    <th>{reportType === 'summary' ? 'Product Name' : 'Material Name'}</th>
                    <th className="text-right">{reportType === 'summary' ? 'Total Batches' : 'Qty Used'}</th>
                    <th className="text-right">{reportType === 'summary' ? 'Produced Qty' : 'Value (Rs)'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, index) => (
                    <tr key={index}>
                      <td>{reportType === 'summary' ? row.productName : row.materialName}</td>
                      <td className="text-right">{reportType === 'summary' ? row.batchCount : Number(row.usedQty).toFixed(2)}</td>
                      <td className="text-right font-bold">
                        {Number(reportType === 'summary' ? row.totalQty : row.totalCost).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ProductionReport;