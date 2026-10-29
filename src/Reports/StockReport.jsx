import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { toast } from 'react-toastify';
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';
import PhoneUnitsSublist from '../Components/PhoneUnitsSublist';
import api from '../../api';
import { FaBox, FaWarehouse, FaArrowLeft, FaFileExcel, FaFilePdf, FaImage, FaSync } from 'react-icons/fa';
import '../Profitloss.css';
import '../Components/PhoneUnitsSublist.css';

// Export Libraries
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from 'xlsx-js-style';
import html2canvas from 'html2canvas';
import { localToday } from '../utils/localDate';

const StockReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef();
  const today = localToday();

  const [reportType, setReportType] = useState('rm'); 
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [rmData, setRmData] = useState([]);
  const [fgData, setFgData] = useState([]);
  const [hasPackSizes, setHasPackSizes] = useState(false);
  const [expandedRmId, setExpandedRmId] = useState(null);
  const [phoneUnits, setPhoneUnits] = useState([]);
  const [phonesLoading, setPhonesLoading] = useState(false);

  const fetchStockReport = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/reports/stock-report?type=${reportType}`);
      if (reportType === 'rm') {
        setRmData(response.data.rawMaterials || []);
        setHasPackSizes(Boolean(response.data.has_pack_sizes));
      } else {
        setFgData(response.data.finishedGoods || []);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockReport();
    setExpandedRmId(null);
    setPhoneUnits([]);
  }, [reportType]);

  const handleRmRowClick = async (row) => {
    const rmId = row.rm_id;
    if (!rmId) return;
    if (expandedRmId === rmId) {
      setExpandedRmId(null);
      setPhoneUnits([]);
      return;
    }
    setExpandedRmId(rmId);
    setPhonesLoading(true);
    setPhoneUnits([]);
    try {
      const res = await api.get('/rm-transactions/available-phones', {
        params: { rm_id: rmId },
      });
      setPhoneUnits(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load phone units');
      setPhoneUnits([]);
    } finally {
      setPhonesLoading(false);
    }
  };

  // Filter Logic
  const filteredRM = rmData.filter(item => 
    (item['RawMaterial.name'] || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFG = fgData.filter(item => 
    (item['product.name'] || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Show Pack Stock only when at least one RM has a pack size defined
  const showPackStock = hasPackSizes || rmData.some(
    (item) => Array.isArray(item.pack_breakdown) && item.pack_breakdown.length > 0
  );

  // Calculate Totals for Footer
  const totalRMStock = filteredRM.reduce((acc, i) => acc + Number(i.total_current_stock), 0);
  const totalRMValue = filteredRM.reduce((acc, i) => acc + Number(i.total_stock_price), 0);
  const totalRMConsumed = filteredRM.reduce((acc, i) => acc + Number(i.total_consumed), 0);

  const totalFGQty = filteredFG.reduce((acc, i) => acc + Number(i.total_qty_remaining), 0);
  const totalFGValue = filteredFG.reduce((acc, i) => {
    if (i.total_stock_value != null) return acc + Number(i.total_stock_value);
    return acc + Number(i.unit_cost) * Number(i.total_qty_remaining);
  }, 0);
  const totalFGConsumed = filteredFG.reduce((acc, i) => acc + Number(i.total_consumed), 0);

  // --- EXPORT FUNCTIONS ---
  const exportToExcel = () => {
    let wb = XLSX.utils.book_new();
    const headerStyle = {
      fill: { fgColor: { rgb: "2196F3" } },
      font: { color: { rgb: "FFFFFF" }, bold: true },
      alignment: { horizontal: "center" }
    };

    if (reportType === 'rm') {
      // Avg Cost / Consumed hidden — mobile shop uses per-IMEI cost
      const headerLabels = showPackStock
        ? ["Material Name", "Base Stock", "Pack Stock", "Stock Value"]
        : ["Material Name", "Base Stock", "Stock Value"];
      const headers = headerLabels.map(h => ({ v: h, s: headerStyle }));
      const rows = filteredRM.map(i => {
        const row = [
          i['RawMaterial.name'],
          `${Number(i.total_current_stock).toLocaleString()}${i.base_uom_name ? ` ${i.base_uom_name}` : ''}`,
        ];
        if (showPackStock) row.push(i.pack_stock_display || '-');
        row.push(Number(i.total_stock_price));
        return row;
      });
      const emptyCols = showPackStock ? ["", "", "", ""] : ["", "", ""];
      const totalRow = showPackStock
        ? [{v: "GRAND TOTAL", s: {font: {bold: true}}}, totalRMStock, "", totalRMValue]
        : [{v: "GRAND TOTAL", s: {font: {bold: true}}}, totalRMStock, totalRMValue];
      rows.push(emptyCols);
      rows.push(totalRow);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    } else {
      const headers = ["Product Name", "Remaining Qty", "Unit Cost", "Total Value"].map(h => ({ v: h, s: headerStyle }));
      const rows = filteredFG.map(i => [
        i['product.name'] || i.product_name,
        Number(i.total_qty_remaining),
        Number(i.unit_cost),
        Number(i.total_stock_value != null ? i.total_stock_value : Number(i.unit_cost) * Number(i.total_qty_remaining))
      ]);
      rows.push(["", "", "", ""]);
      rows.push([{v: "GRAND TOTAL", s: {font: {bold: true}}}, totalFGQty, "", totalFGValue]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, "Finished Goods");
    }
    XLSX.writeFile(wb, `Stock_Report_${today}.xlsx`);
  };

  const exportToPDF = () => {
    const currentData = reportType === 'rm' ? filteredRM : filteredFG;
    
    if (!currentData || currentData.length === 0) {
      toast.error("No data available to export!");
      return;
    }

    const loadingToast = toast.loading("Generating PDF..."); 
    
    try {
      const doc = new jsPDF();
      const title = `Stock Report - ${reportType === 'rm' ? 'Inventory' : 'Finished Goods'}`;
      
      doc.setFontSize(16);
      doc.text(title, 14, 15);
      doc.setFontSize(10);
      doc.text(`Date: ${today}`, 14, 22);
      
      if (reportType === 'rm') {
        const bodyData = filteredRM.map(i => {
          const row = [
            i['RawMaterial.name'] || 'N/A',
            `${Number(i.total_current_stock).toLocaleString()}${i.base_uom_name ? ` ${i.base_uom_name}` : ''}`,
          ];
          if (showPackStock) row.push(i.pack_stock_display || '-');
          row.push(Number(i.total_stock_price).toLocaleString());
          return row;
        });
        
        const totalRow = [
          { content: "GRAND TOTAL", styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, 
          { content: totalRMStock.toLocaleString(), styles: { fontStyle: 'bold' } }, 
        ];
        if (showPackStock) totalRow.push("");
        totalRow.push(
          { content: totalRMValue.toLocaleString(), styles: { fontStyle: 'bold' } }
        );
        bodyData.push(totalRow);

        autoTable(doc, {
          startY: 28,
          head: [showPackStock
            ? ['Material Name', 'Base Stock', 'Pack Stock', 'Value']
            : ['Material Name', 'Base Stock', 'Value']],
          body: bodyData,
          headStyles: { fillColor: [46, 125, 50] },
          theme: 'grid'
        });
      } else {
        const bodyData = filteredFG.map(i => [
          i['product.name'] || 'N/A', 
          Number(i.total_qty_remaining).toLocaleString(), 
          Number(i.unit_cost).toFixed(2), 
          (Number(i.total_stock_value != null ? i.total_stock_value : Number(i.unit_cost) * Number(i.total_qty_remaining))).toLocaleString(),
          Number(i.total_consumed || 0).toLocaleString() // Consumed Column
        ]);

        // Grand Total Row with Consumed Total
        bodyData.push([
          { content: "GRAND TOTAL", styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, 
          { content: totalFGQty.toLocaleString(), styles: { fontStyle: 'bold' } }, 
          "", 
          { content: totalFGValue.toLocaleString(), styles: { fontStyle: 'bold' } },
          { content: totalFGConsumed.toLocaleString(), styles: { fontStyle: 'bold' } } // Yahan total add kiya
        ]);

        autoTable(doc, {
          startY: 28,
          head: [['Product Name', 'Qty Remaining', 'Unit Cost', 'Total Value', 'Consumed']],
          body: bodyData,
          headStyles: { fillColor: [21, 101, 192] },
          theme: 'grid'
        });
      }

      doc.save(`Stock_Report_${today}.pdf`);
      toast.success("PDF Downloaded Successfully!", { id: loadingToast });

    } catch (error) {
      console.error("PDF Error:", error);
      toast.error("Failed to generate PDF!", { id: loadingToast });
    }
  };
  const exportToPNG = async () => {
    if (reportRef.current) {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const link = document.createElement('a');
      link.href = canvas.toDataURL("image/png");
      link.download = `Stock_Report_${today}.png`;
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
                    <FaWarehouse className="report-title-icon" /> Inventory Analytics
                  </h3>
                  <p className="report-description">Current stock levels for inventory and finished goods.</p>
                </div>
              </div>
              <div className="export-btn-group">
                <button type="button" className="icon-button bg-pdf" onClick={exportToPDF} title="PDF"><FaFilePdf /></button>
                <button type="button" className="icon-button bg-excel" onClick={exportToExcel} title="Excel"><FaFileExcel /></button>
                <button type="button" className="icon-button bg-png" onClick={exportToPNG} title="PNG"><FaImage /></button>
              </div>
            </div>

            <div className="filter-group">
              <input type="text" className="date-input" placeholder="Search items..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ minWidth: '180px' }} />
              <button type="button" className="get-report-btn" onClick={fetchStockReport}>
                <FaSync /> Refresh
              </button>
            </div>

            {/* Finished Goods tab hidden — mobile shop inventory only
            <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #e2e8f0', marginTop: '8px' }}>
              <button type="button" onClick={() => setReportType('rm')}>
                <FaWarehouse /> Inventory Stock
              </button>
              <button type="button" onClick={() => setReportType('fg')}>
                <FaBox /> Finished Goods (Batches)
              </button>
            </div>
            */}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Loading Inventory Data...</div>
          ) : (
            <div ref={reportRef} className="pl-table-container">
              <div className="pl-header-section">
                <h3 className="pl-statement-title">Stock Report - {reportType === 'rm' ? 'Inventory' : 'Finished Goods'}</h3>
                <p className="pl-statement-subtitle">As of {today}</p>
              </div>

              {reportType === 'rm' ? (
                <table className="pl-table">
                  <thead>
                    <tr>
                      <th>Material Name</th>
                      <th className="text-center">Base Stock</th>
                      {showPackStock && <th className="text-center">Pack Stock</th>}
                      <th className="text-center">Stock Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRM.map((row, index) => {
                      const isOpen = expandedRmId === row.rm_id;
                      const colSpan = 3 + (showPackStock ? 1 : 0);
                      return (
                        <React.Fragment key={row.rm_id || index}>
                          <tr
                            className={`stock-row-clickable${isOpen ? ' stock-row-expanded' : ''}`}
                            onClick={() => handleRmRowClick(row)}
                            title="Click to show available phone units"
                            style={{ cursor: 'pointer' }}
                          >
                            <td className="font-bold">{row['RawMaterial.name']}</td>
                            <td className="text-center">
                              <span style={{ color: '#2e7d32', background: '#e8f5e9', padding: '2px 8px', borderRadius: '10px', fontSize: '0.85em', fontWeight: 'bold' }}>
                                {Number(row.total_current_stock).toLocaleString()}{row.base_uom_name ? ` ${row.base_uom_name}` : ''}
                              </span>
                            </td>
                            {showPackStock && (
                              <td className="text-center" style={{ color: '#1565c0' }}>{row.pack_stock_display || '-'}</td>
                            )}
                            <td className="text-center">{Number(row.total_stock_price).toLocaleString()}</td>
                          </tr>
                          {isOpen ? (
                            <PhoneUnitsSublist
                              units={phoneUnits}
                              loading={phonesLoading}
                              showSupplier
                              colSpan={colSpan}
                            />
                          ) : null}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold">
                      <td>GRAND TOTAL</td>
                      <td className="text-center" style={{ color: '#2e7d32' }}>{totalRMStock.toLocaleString()}</td>
                      {showPackStock && <td></td>}
                      <td className="text-center">{totalRMValue.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <table className="pl-table">
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th className="text-center">Qty Remaining</th>
                      <th className="text-center">Unit Cost (Avg)</th>
                      <th className="text-center">Total Value</th>
                      <th className="text-center">Consumed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFG.map((row, index) => (
                      <tr key={index}>
                        <td className="font-bold">{row['product.name']}</td>
                        <td className="text-center">
                          <span style={{ color: '#2e7d32', background: '#e8f5e9', padding: '2px 8px', borderRadius: '10px', fontSize: '0.85em', fontWeight: 'bold' }}>
                            {Number(row.total_qty_remaining).toLocaleString()}
                          </span>
                        </td>
                        <td className="text-center">{Number(row.unit_cost).toFixed(2)}</td>
                        <td className="text-center">
                          <span style={{ color: '#2196f3', background: '#ebf3ff', padding: '2px 8px', borderRadius: '10px', fontSize: '0.85em', fontWeight: 'bold' }}>
                            {(Number(row.total_stock_value != null ? row.total_stock_value : Number(row.unit_cost) * Number(row.total_qty_remaining))).toLocaleString()}
                          </span>
                        </td>
                        <td className="text-center">
                          <span style={{ color: '#ff9800', background: '#fff3e0', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                            {Number(row.total_consumed || 0).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold">
                      <td>GRAND TOTAL</td>
                      <td className="text-center" style={{ color: '#2e7d32' }}>{totalFGQty.toLocaleString()}</td>
                      <td></td>
                      <td className="text-center" style={{ color: '#2196f3' }}>{totalFGValue.toLocaleString()}</td>
                      <td className="text-center" style={{ color: '#ff9800' }}>{totalFGConsumed.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default StockReport;