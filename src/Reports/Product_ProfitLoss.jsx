import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx-js-style';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { 
    FaArrowLeft, FaFileExcel, FaFilePdf, FaChartLine, FaImage, FaCalendarAlt 
} from 'react-icons/fa';

import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import api from "../../api";
import '../Profitloss.css'; 
import { localToday, localYearStart } from '../utils/localDate';

const SegmentedProfitLossReport = () => {
    const navigate = useNavigate();
    const reportRef = useRef(null);

    const [fromDate, setFromDate] = useState(localYearStart());
    const [toDate, setToDate] = useState(localToday());
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState(null);

    const loadReportData = async () => {
        if (!fromDate || !toDate) {
            toast.error("Please select date range");
            return;
        }
        setLoading(true);
        try {
            const res = await api.get('/reports/segmented-profit-loss', {
                params: { from_date: fromDate, to_date: toDate }
            });
            if (res.data.success) {
                setReport(res.data.data);
                toast.dismiss();
                toast.success("Segmented Report loaded successfully");
            } else {
                toast.error(res.data.message || "Failed to load data");
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Server error executing matrices";
            toast.error(`Failed: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let isMounted = true;
        if (fromDate && toDate) {
            const delayCall = setTimeout(() => {
                if (isMounted) {
                    loadReportData();
                }
            }, 50);

            return () => {
                isMounted = false;
                clearTimeout(delayCall);
            };
        }
    }, [fromDate, toDate]);

    const formatCurr = (v) => {
        const num = Number(v || 0);
        if (num === 0) return '-';
        return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    
    const calcMarginRatio = (gp, sales) => sales > 0 ? ((gp / sales) * 100).toFixed(1) + '%' : '0.0%';

    // ────────────────────────────────────────────────────────────────────────
    // 📗 FIXED EXCEL EXPORT (MATH SIGN FIX)
    // ────────────────────────────────────────────────────────────────────────
    const downloadExcel = () => {
        if (!report) return;

        const titleStyle = {
            font: { name: "Calibri", bold: true, sz: 16, color: { rgb: "1A202C" } },
            alignment: { horizontal: "left" }
        };

        const durationStyle = {
            font: { name: "Calibri", italic: true, sz: 11, color: { rgb: "718096" } },
            alignment: { horizontal: "left" }
        };

        const headerStyle = {
            fill: { fgColor: { rgb: "1A202C" } },
            font: { name: "Calibri", color: { rgb: "FFFFFF" }, bold: true, sz: 11 },
            alignment: { horizontal: "center", vertical: "center" }
        };

        const sectionStyle = {
            fill: { fgColor: { rgb: "F8FAFC" } },
            font: { name: "Calibri", bold: true, sz: 10, color: { rgb: "4A5568" } },
            border: { bottom: { style: "thin", color: { rgb: "CBD5E1" } } }
        };

        const amountStyle = { font: { name: "Calibri", sz: 10 }, alignment: { horizontal: "right" }, numFmt: "#,##0.00" };
        const totalStyle = { font: { name: "Calibri", bold: true, sz: 11 }, fill: { fgColor: { rgb: "E2E8F0" } }, border: { top: { style: "thin" }, bottom: { style: "double" } } };

        const rmRatio = calcMarginRatio(report.segments.raw_material.gross_profit, report.segments.raw_material.net_sales);
        const fpRatio = calcMarginRatio(report.segments.finished_product.gross_profit, report.segments.finished_product.net_sales);
        const totalRatio = calcMarginRatio(report.totals.total_gross_profit, report.totals.total_sales);

        const rows = [
            [{ v: "SEGMENTED PROFIT & LOSS REPORT", s: titleStyle }],
            [{ v: `Duration Timeline: ${fromDate} to ${toDate}`, s: durationStyle }],
            [],
            [{ v: "Financial Line Elements", s: headerStyle }, { v: "Inventory", s: headerStyle }, { v: "Finished Goods (FP)", s: headerStyle }, { v: "Consolidated Total", s: headerStyle }],
            [{ v: "Operational Revenue", s: sectionStyle }, "", "", ""],
            [{ v: "Gross Sales Revenue" }, { v: Number(report.segments.raw_material.sales), s: amountStyle }, { v: Number(report.segments.finished_product.sales), s: amountStyle }, { v: Number(report.segments.raw_material.sales + report.segments.finished_product.sales), s: amountStyle }],
            
            // 🌟 Math Signs aligned to mirror accounting formatting standards
            [{ v: "Less: Sales Returns" }, { v: Number(report.segments.raw_material.returns) * -1, s: amountStyle }, { v: Number(report.segments.finished_product.returns) * -1, s: amountStyle }, { v: Number(report.segments.raw_material.returns + report.segments.finished_product.returns) * -1, s: amountStyle }],
            
            [{ v: "Total Net Revenue", s: totalStyle }, { v: Number(report.segments.raw_material.net_sales), s: amountStyle }, { v: Number(report.segments.finished_product.net_sales), s: amountStyle }, { v: Number(report.totals.total_sales), s: totalStyle }],
            [{ v: "Direct Costs Breakdown", s: sectionStyle }, "", "", ""],
            [{ v: "Less: Cost of Goods Sold (COGS)" }, { v: Number(report.segments.raw_material.cogs) * -1, s: amountStyle }, { v: Number(report.segments.finished_product.cogs) * -1, s: amountStyle }, { v: Number(report.totals.total_cogs) * -1, s: amountStyle }],
            [{ v: "Gross Profit Margin", s: totalStyle }, { v: Number(report.segments.raw_material.gross_profit), s: amountStyle }, { v: Number(report.segments.finished_product.gross_profit), s: amountStyle }, { v: Number(report.totals.total_gross_profit), s: totalStyle }],
            [{ v: "Gross Profit Margin Ratio (%)" }, { v: rmRatio }, { v: fpRatio }, { v: totalRatio }],
            [{ v: "Indirect Overheads & Adjustments", s: sectionStyle }, "", "", ""],
            [{ v: "Add: Inventory System Adjustment Profit" }, "", "", { v: Number(report.totals.inventory_adjustment_revenue), s: amountStyle }],
            
            // 🌟 FIXED: Multiplication by -1 makes sure Excel prints negative format natively
            [{ v: "Less: General Expenses & Wastages" }, "", "", { v: Number(report.totals.other_expenses) * -1, s: amountStyle }],
            
            [{ v: "Consolidated Net Profit", s: totalStyle }, "", "", { v: Number(report.totals.actual_net_profit), s: totalStyle }]
        ];

        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch: 38 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
        const wb = XLSX.utils.book_new();
        wb.SheetNames.push("Segmented_P_L");
        wb.Sheets["Segmented_P_L"] = ws;
        XLSX.writeFile(wb, `Segmented_Profit_Loss_${fromDate}_to_${toDate}.xlsx`);
        toast.success("Excel Report Exported");
    };

    // ────────────────────────────────────────────────────────────────────────
    // 📸 IMAGE EXPORT
    // ────────────────────────────────────────────────────────────────────────
    const downloadImage = async () => {
        if (!reportRef.current) {
            toast.error("Report reference element not found");
            return;
        }
        try {
            const canvas = await html2canvas(reportRef.current, { 
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff"
            });
            const link = document.createElement('a');
            link.href = canvas.toDataURL("image/png");
            link.download = `Segmented_Profit_Loss_${fromDate}_to_${toDate}.png`;
            link.click();
            toast.success("Image exported successfully");
        } catch (error) {
            toast.error("Failed to export Image");
            console.error(error);
        }
    };

    // ────────────────────────────────────────────────────────────────────────
    // 📄 PDF EXPORT
    // ────────────────────────────────────────────────────────────────────────
    const downloadPDF = () => {
        if (!reportRef.current) {
            toast.error("Report reference element not found");
            return;
        }
        
        toast.info("Generating PDF format...");
        
        html2canvas(reportRef.current, { 
            scale: 2, 
            useCORS: true,
            backgroundColor: "#ffffff"
        }).then((canvas) => {
            const imgData = canvas.toDataURL("image/jpeg", 1.0);
            const pdf = new jsPDF("p", "mm", "a4");
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const contentWidth = canvas.width;
            const contentHeight = canvas.height;
            
            const ratio = Math.min((pdfWidth - 10) / contentWidth, (pdfHeight - 10) / contentHeight);
            
            const imgWidth = contentWidth * ratio;
            const imgHeight = contentHeight * ratio;
            
            const pageX = (pdfWidth - imgWidth) / 2;
            const pageY = 6; 

            pdf.addImage(imgData, "JPEG", pageX, pageY, imgWidth, imgHeight);
            pdf.save(`Segmented_Profit_Loss_${fromDate}_to_${toDate}.pdf`);
            toast.success("PDF exported successfully");
        }).catch((err) => {
            toast.error("Failed to generate PDF document");
            console.error(err);
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
                                <button type="button" className="back-btn erp-back-btn" onClick={() => navigate("/reports")}>
                                    <FaArrowLeft />
                                </button>
                                <div>
                                    <h3 className="report-title">
                                        <FaChartLine className="report-title-icon" /> Segmented Profit & Loss
                                    </h3>
                                    <p className="report-description">RM vs FP segmented revenue, costs, and net profit analysis.</p>
                                </div>
                            </div>
                            {report && (
                                <div className="export-btn-group">
                                    <button type="button" className="icon-button bg-pdf" onClick={downloadPDF} title="PDF"><FaFilePdf /></button>
                                    <button type="button" className="icon-button bg-excel" onClick={downloadExcel} title="Excel"><FaFileExcel /></button>
                                    <button type="button" className="icon-button bg-png" onClick={downloadImage} title="PNG"><FaImage /></button>
                                </div>
                            )}
                        </div>

                        <div className="filter-group">
                            <input type="date" className="date-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                            <input type="date" className="date-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                            <button type="button" className="get-report-btn" onClick={loadReportData} disabled={loading}>
                                {loading ? "Syncing..." : "Get Report"}
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Syncing profit & loss records...</div>
                    ) : report && (
                        <div ref={reportRef} className="pl-table-container">
                            <div className="pl-header-section">
                                <h3 className="pl-statement-title">SEGMENTED PROFIT & LOSS STATEMENT</h3>
                                <p className="pl-statement-subtitle">For the Period: {fromDate} to {toDate}</p>
                            </div>

                            <table className="pl-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40%' }}>Financial Line</th>
                                        <th className="text-right" style={{ width: '20%' }}>Inventory</th>
                                        <th className="text-right" style={{ width: '20%' }}>Finished Goods (FP)</th>
                                        <th className="text-right" style={{ width: '20%' }}>Consolidated Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="row-section-head">
                                        <td colSpan="4">Operational Revenue</td>
                                    </tr>
                                    <tr>
                                        <td style={{ paddingLeft: '28px' }}>Sales Revenue</td>
                                        <td className="text-right" style={{ color: '#2e7d32' }}>{formatCurr(report.segments.raw_material.sales)}</td>
                                        <td className="text-right" style={{ color: '#2e7d32' }}>{formatCurr(report.segments.finished_product.sales)}</td>
                                        <td className="text-right font-bold" style={{ color: '#2e7d32' }}>{formatCurr(report.segments.raw_material.sales + report.segments.finished_product.sales)}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ paddingLeft: '28px' }}>Sales Returns</td>
                                        <td className="text-right" style={{ color: '#c62828' }}>({formatCurr(report.segments.raw_material.returns)})</td>
                                        <td className="text-right" style={{ color: '#c62828' }}>({formatCurr(report.segments.finished_product.returns)})</td>
                                        <td className="text-right" style={{ color: '#c62828' }}>({formatCurr(report.segments.raw_material.returns + report.segments.finished_product.returns)})</td>
                                    </tr>
                                    <tr className="font-bold" style={{ background: '#f1f5f9' }}>
                                        <td>Total Net Revenue</td>
                                        <td className="text-right">{formatCurr(report.segments.raw_material.net_sales)}</td>
                                        <td className="text-right">{formatCurr(report.segments.finished_product.net_sales)}</td>
                                        <td className="text-right" style={{ color: '#2e7d32' }}>{formatCurr(report.totals.total_sales)}</td>
                                    </tr>

                                    <tr className="row-section-head">
                                        <td colSpan="4">Direct Costs Breakdown</td>
                                    </tr>
                                    <tr>
                                        <td style={{ paddingLeft: '28px' }}>Cost of Goods Sold (COGS)</td>
                                        <td className="text-right" style={{ color: '#c62828' }}>({formatCurr(report.segments.raw_material.cogs)})</td>
                                        <td className="text-right" style={{ color: '#c62828' }}>({formatCurr(report.segments.finished_product.cogs)})</td>
                                        <td className="text-right font-bold" style={{ color: '#c62828' }}>({formatCurr(report.totals.total_cogs)})</td>
                                    </tr>

                                    <tr className="font-bold" style={{ background: '#f1f5f9' }}>
                                        <td>Gross Profit Margin</td>
                                        <td className="text-right" style={{ color: Number(report.segments.raw_material.gross_profit) < 0 ? '#c62828' : '#2e7d32' }}>
                                            {formatCurr(report.segments.raw_material.gross_profit)}
                                        </td>
                                        <td className="text-right" style={{ color: Number(report.segments.finished_product.gross_profit) < 0 ? '#c62828' : '#2e7d32' }}>
                                            {formatCurr(report.segments.finished_product.gross_profit)}
                                        </td>
                                        <td className="text-right font-bold" style={{ color: Number(report.totals.total_gross_profit) < 0 ? '#c62828' : '#2e7d32' }}>
                                            {formatCurr(report.totals.total_gross_profit)}
                                        </td>
                                    </tr>
                                    <tr style={{ backgroundColor: '#fafafa', fontSize: '12px' }}>
                                        <td style={{ paddingLeft: '28px', color: '#94a3b8' }}>GP Margin Ratio (%)</td>
                                        <td className="text-right font-bold">{calcMarginRatio(report.segments.raw_material.gross_profit, report.segments.raw_material.net_sales)}</td>
                                        <td className="text-right font-bold">{calcMarginRatio(report.segments.finished_product.gross_profit, report.segments.finished_product.net_sales)}</td>
                                        <td className="text-right font-bold">{calcMarginRatio(report.totals.total_gross_profit, report.totals.total_sales)}</td>
                                    </tr>

                                    <tr className="row-section-head">
                                        <td colSpan="4">Indirect Overheads & Adjustments</td>
                                    </tr>
                                    <tr>
                                        <td style={{ paddingLeft: '28px' }}>Add: Inventory Adjustment Profit</td>
                                        <td className="text-right" style={{ color: '#94a3b8' }}>-</td>
                                        <td className="text-right" style={{ color: '#94a3b8' }}>-</td>
                                        <td className="text-right" style={{ color: '#2e7d32' }}>+{formatCurr(report.totals.inventory_adjustment_revenue)}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ paddingLeft: '28px' }}>Less: General Expenses & Wastages</td>
                                        <td className="text-right" style={{ color: '#94a3b8' }}>-</td>
                                        <td className="text-right" style={{ color: '#94a3b8' }}>-</td>
                                        <td className="text-right" style={{ color: '#c62828' }}>({formatCurr(report.totals.other_expenses)})</td>
                                    </tr>

                                    {(() => {
                                        const netProfitVal = Number(report.totals.actual_net_profit || 0);
                                        const isLoss = netProfitVal < 0;
                                        return (
                                            <tr className="font-bold" style={{
                                                backgroundColor: isLoss ? '#ffe8e8' : '#f0fdf4',
                                                borderTop: isLoss ? '2px solid #fca5a5' : '2px solid #a7f3d0'
                                            }}>
                                                <td>{isLoss ? 'NET LOSS' : 'NET PROFIT'}</td>
                                                <td className="text-right" style={{ color: '#94a3b8' }}>-</td>
                                                <td className="text-right" style={{ color: '#94a3b8' }}>-</td>
                                                <td className="text-right font-bold" style={{ color: isLoss ? '#c62828' : '#2e7d32' }}>
                                                    Rs {isLoss ? `(${formatCurr(Math.abs(netProfitVal))})` : formatCurr(netProfitVal)}
                                                </td>
                                            </tr>
                                        );
                                    })()}
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

export default SegmentedProfitLossReport;