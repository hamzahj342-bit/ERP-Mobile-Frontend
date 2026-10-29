import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import * as XLSX from "xlsx-js-style";
import { FaArrowLeft, FaFileExcel, FaFileInvoice, FaFilePdf, FaImage } from "react-icons/fa";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import Select from "react-select";
import NavigationBar from "../../Components/NavigationBar";
import Footer from "../../Components/Footer";
import api from "../../../api";
import "./EntityLedgerReport.css";
import { localToday, localYearStart } from "../../utils/localDate";

const formatMoney = (n) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatQty = (n) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 });

/** Build flat table rows (txn + invoice lines) for PDF / exports */
function buildLedgerTableBody(report) {
  const body = [
    [
      { content: "Opening Balance", colSpan: 9, styles: { fontStyle: "bold", fillColor: [241, 245, 249] } },
      { content: formatMoney(report.openingBalance), styles: { fontStyle: "bold", halign: "right", fillColor: [241, 245, 249] } },
    ],
  ];

  (report.transactions || []).forEach((t) => {
    body.push([
      t.transaction_date || "",
      t.invoice_no || "-",
      t.description || "-",
      "",
      "",
      "",
      t.invoice?.grand_total != null && (t.invoice?.lines || []).length
        ? formatMoney(t.invoice.grand_total)
        : "-",
      t.debit > 0 ? formatMoney(t.debit) : "-",
      t.credit > 0 ? formatMoney(t.credit) : "-",
      formatMoney(t.balance),
    ]);

    (t.invoice?.lines || []).forEach((line) => {
      body.push([
        "",
        "",
        "",
        line.item_name || "",
        formatQty(line.qty),
        formatMoney(line.unit_price),
        formatMoney(line.amount),
        "",
        "",
        "",
      ]);
    });
  });

  body.push([
    { content: "Closing Balance", colSpan: 9, styles: { fontStyle: "bold", fillColor: [220, 252, 231] } },
    {
      content: formatMoney(report.closingBalance),
      styles: { fontStyle: "bold", halign: "right", fillColor: [220, 252, 231] },
    },
  ]);

  return body;
}

/** Slice a tall canvas into landscape-ish page PNGs and download each */
async function downloadCanvasAsPages(canvas, baseName) {
  // ~A4 landscape height relative to capture width (keeps each image readable)
  const pageHeightPx = Math.max(900, Math.floor((canvas.width * 210) / 297));
  const totalH = canvas.height;
  const pages = Math.max(1, Math.ceil(totalH / pageHeightPx));

  for (let i = 0; i < pages; i++) {
    const sy = i * pageHeightPx;
    const sh = Math.min(pageHeightPx, totalH - sy);
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = sh;
    const ctx = pageCanvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(canvas, 0, sy, canvas.width, sh, 0, 0, canvas.width, sh);

    const link = document.createElement("a");
    link.href = pageCanvas.toDataURL("image/png");
    link.download = pages === 1 ? `${baseName}.png` : `${baseName}_page${i + 1}.png`;
    link.click();
    // Stagger so browser does not block multi-file downloads
    if (i < pages - 1) await new Promise((r) => setTimeout(r, 350));
  }

  return pages;
}

const EntityLedgerWithInvoiceReport = () => {
  const navigate = useNavigate();
  const reportRef = useRef(null);

  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState("");
  const [entityType, setEntityType] = useState("supplier");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [taxFilter, setTaxFilter] = useState("all");

  useEffect(() => {
    if (!fromDate || !toDate) {
      setFromDate(localYearStart());
      setToDate(localToday());
    }
  }, []);

  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const res = await api.get("/entities/ledger-entities", {
          params: { type: entityType },
        });
        setEntities(
          (res.data || []).map((entity) => ({
            value: entity.id,
            label: entity.entity_relation_id
              ? `${entity.name} (Dual Account - Linked)`
              : `${entity.name} (${entity.type || entityType})`,
          }))
        );
        setSelectedEntity("");
        setReport(null);
      } catch {
        toast.error("Failed to load entities");
        setEntities([]);
      }
    };
    fetchEntities();
  }, [entityType]);

  useEffect(() => {
    if (selectedEntity && fromDate && toDate && entities.length > 0) {
      const t = setTimeout(() => fetchLedger(), 300);
      return () => clearTimeout(t);
    }
  }, [selectedEntity, fromDate, toDate, taxFilter, entities.length]);

  const fetchLedger = async () => {
    if (!selectedEntity || !fromDate || !toDate) {
      toast.error("Please select entity and dates");
      return;
    }
    setLoading(true);
    try {
      const res = await api.get("/reports/entity-ledger-with-invoice", {
        params: {
          entity_id: selectedEntity,
          fromDate,
          toDate,
          tax_filter: taxFilter,
        },
      });
      setReport(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load ledger with invoice");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!report) return;
    const headerStyle = {
      fill: { fgColor: { rgb: "1E293B" } },
      font: { color: { rgb: "FFFFFF" }, bold: true },
    };
    const numStyle = { alignment: { horizontal: "right" }, numFmt: "#,##0.00" };
    const rows = [
      [{ v: `Entity Ledger With Invoice: ${report.entity.name}`, s: { font: { bold: true, sz: 14 } } }],
      [{ v: `Period: ${fromDate} to ${toDate}` }],
      [],
      [
        { v: "DATE", s: headerStyle },
        { v: "INVOICE #", s: headerStyle },
        { v: "PARTICULARS", s: headerStyle },
        { v: "ITEM", s: headerStyle },
        { v: "QTY", s: headerStyle },
        { v: "RATE", s: headerStyle },
        { v: "AMOUNT", s: headerStyle },
        { v: "DEBIT", s: headerStyle },
        { v: "CREDIT", s: headerStyle },
        { v: "BALANCE", s: headerStyle },
      ],
      [
        { v: "Opening Balance" },
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        { v: Number(report.openingBalance), s: { ...numStyle, font: { bold: true } } },
      ],
    ];

    (report.transactions || []).forEach((t) => {
      rows.push([
        { v: t.transaction_date },
        { v: t.invoice_no || "" },
        { v: t.description || "" },
        "",
        "",
        "",
        "",
        { v: Number(t.debit || 0), s: numStyle },
        { v: Number(t.credit || 0), s: numStyle },
        { v: Number(t.balance || 0), s: { ...numStyle, font: { bold: true } } },
      ]);
      (t.invoice?.lines || []).forEach((line) => {
        rows.push([
          "",
          "",
          "",
          { v: line.item_name || "" },
          { v: Number(line.qty || 0) },
          { v: Number(line.unit_price || 0), s: numStyle },
          { v: Number(line.amount || 0), s: numStyle },
          "",
          "",
          "",
        ]);
      });
    });

    rows.push([
      { v: "Closing Balance", s: { font: { bold: true } } },
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      { v: Number(report.closingBalance), s: { ...numStyle, font: { bold: true } } },
    ]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
      { wch: 14 },
      { wch: 16 },
      { wch: 36 },
      { wch: 28 },
      { wch: 10 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LedgerWithInvoice");
    XLSX.writeFile(wb, `${report.entity.name}_Ledger_With_Invoice.xlsx`);
  };

  const exportToPNG = async () => {
    if (!report || !reportRef.current) return toast.warning("No report to export.");
    try {
      toast.info("Preparing image(s)...");
      const canvas = await html2canvas(reportRef.current, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: reportRef.current.scrollWidth,
        windowHeight: reportRef.current.scrollHeight,
      });
      const base = `${report.entity.name}_Ledger_With_Invoice`;
      const pages = await downloadCanvasAsPages(canvas, base);
      toast.success(pages > 1 ? `Downloaded ${pages} image pages.` : "Image downloaded.");
    } catch (err) {
      console.error(err);
      toast.error("Image export failed. Try PDF for long reports.");
    }
  };

  const exportToPDF = () => {
    if (!report) return toast.warning("No report to export.");

    const doc = new jsPDF("l", "mm", "a4");
    const entityName = report.entity?.name || "Entity";

    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text("Entity Ledger With Invoice", 14, 14);
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(`${entityName}  |  ${fromDate} to ${toDate}`, 14, 21);
    doc.text(`Opening: ${formatMoney(report.openingBalance)}`, 14, 27);

    autoTable(doc, {
      startY: 32,
      head: [
        [
          "Date",
          "Invoice #",
          "Particulars",
          "Item",
          "Qty",
          "Rate",
          "Amount",
          "Debit",
          "Credit",
          "Balance",
        ],
      ],
      body: buildLedgerTableBody(report),
      styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak", valign: "middle" },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold", fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 28 },
        2: { cellWidth: 48 },
        3: { cellWidth: 36 },
        4: { cellWidth: 18, halign: "right" },
        5: { cellWidth: 22, halign: "right" },
        6: { cellWidth: 24, halign: "right" },
        7: { cellWidth: 24, halign: "right" },
        8: { cellWidth: 24, halign: "right" },
        9: { cellWidth: 26, halign: "right" },
      },
      didParseCell: (data) => {
        // Fix typo-safe right align for numeric cols
        if (data.section === "body" && data.column.index >= 4) {
          data.cell.styles.halign = "right";
        }
      },
      margin: { left: 10, right: 10, bottom: 14 },
      theme: "grid",
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont(undefined, "normal");
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 8);
    }

    doc.save(`${entityName}_Ledger_With_Invoice.pdf`);
    toast.success(pageCount > 1 ? `PDF saved (${pageCount} pages).` : "PDF saved.");
  };

  const selectStyles = {
    control: (p) => ({
      ...p,
      minWidth: "220px",
      minHeight: "32px",
      height: "32px",
      borderRadius: "6px",
      borderColor: "#e2e8f0",
      fontSize: "12px",
      boxShadow: "none",
    }),
    valueContainer: (p) => ({ ...p, padding: "0 8px", height: "30px" }),
    indicatorsContainer: (p) => ({ ...p, height: "30px" }),
    input: (p) => ({ ...p, margin: 0, padding: 0 }),
    singleValue: (p) => ({ ...p, fontSize: "12px", color: "#334155" }),
    placeholder: (p) => ({ ...p, fontSize: "12px", color: "#94a3b8" }),
    menu: (p) => ({ ...p, zIndex: 9999, fontSize: "12px" }),
    option: (p) => ({ ...p, fontSize: "12px", padding: "6px 10px" }),
  };

  return (
    <>
      <NavigationBar />
      <div className="elr-page">
        <div className="elr-card">
          <div className="elr-header">
            <div className="elr-header-top">
              <div className="elr-header-left">
                <button type="button" className="back-btn erp-back-btn" onClick={() => navigate("/entities-menu")}>
                  <FaArrowLeft />
                </button>
                <div>
                  <h2 className="elr-title">
                    <FaFileInvoice /> Entity Ledger With Invoice
                  </h2>
                  <p className="elr-subtitle">
                    Party ledger with invoice line items (item, qty, rate, amount) under each document.
                  </p>
                </div>
              </div>

              {report && (
                <div className="elr-export-group">
                  <button type="button" className="icon-button bg-pdf" onClick={exportToPDF} title="PDF">
                    <FaFilePdf />
                  </button>
                  <button type="button" className="icon-button bg-excel" onClick={exportToExcel} title="Excel">
                    <FaFileExcel />
                  </button>
                  <button type="button" className="icon-button bg-png" onClick={exportToPNG} title="Image">
                    <FaImage />
                  </button>
                </div>
              )}
            </div>

            <div className="elr-filters">
              <select
                className="date-input"
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                style={{ minWidth: 120 }}
              >
                <option value="supplier">Suppliers</option>
                <option value="customer">Customers</option>
                <option value="employee">Employees</option>
              </select>

              <Select
                options={entities}
                value={entities.find((o) => o.value === selectedEntity) || null}
                onChange={(opt) => setSelectedEntity(opt ? opt.value : "")}
                placeholder="Search entity..."
                isClearable
                isSearchable
                styles={selectStyles}
              />

              <input type="date" className="date-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <input type="date" className="date-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              <button type="button" className="elr-get-btn" onClick={fetchLedger}>
                {loading ? "..." : "Get Report"}
              </button>

              <div className="elr-tax-group">
                {["all", "taxable", "non-taxable"].map((filter) => (
                  <button
                    type="button"
                    key={filter}
                    onClick={() => setTaxFilter(filter)}
                    className={`elr-tax-btn${taxFilter === filter ? " active" : ""}`}
                  >
                    {filter === "all" ? "All" : filter}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {report && (
            <div ref={reportRef} className="elr-result">
              <h3 className="elr-result-title">Ledger + Invoice Detail: {report.entity.name}</h3>

              <div className="elr-meta">
                <span>
                  <strong>Opening:</strong>{" "}
                  <span className="elr-meta-value">{formatMoney(report.openingBalance)}</span>
                </span>
                <span>
                  <strong>Period:</strong> {fromDate} to {toDate}
                </span>
              </div>

              <div className="elr-table-scroll">
                <table className="elr-table elr-invoice-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Invoice #</th>
                      <th>Particulars</th>
                      <th>Item</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Rate</th>
                      <th className="text-right">Amount</th>
                      <th className="text-right">Debit</th>
                      <th className="text-right">Credit</th>
                      <th className="text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="elr-opening-row">
                      <td colSpan={9}>
                        <strong>Opening Balance</strong>
                      </td>
                      <td className="text-right font-bold">{formatMoney(report.openingBalance)}</td>
                    </tr>

                    {(report.transactions || []).map((t) => {
                      const lines = t.invoice?.lines || [];
                      return (
                        <React.Fragment key={t.id}>
                          <tr className="elr-txn-row">
                            <td>{t.transaction_date}</td>
                            <td>{t.invoice_no || "-"}</td>
                            <td>
                              {t.description || "-"}
                              {t.invoice?.doc_type ? (
                                <span className="elr-doc-tag"> {t.invoice.doc_type}</span>
                              ) : null}
                            </td>
                            <td colSpan={3} className="elr-muted">
                              {lines.length ? `${lines.length} line(s)` : "-"}
                            </td>
                            <td className="text-right">
                              {t.invoice?.grand_total != null && lines.length
                                ? formatMoney(t.invoice.grand_total)
                                : "-"}
                            </td>
                            <td className="text-right">{t.debit > 0 ? formatMoney(t.debit) : "-"}</td>
                            <td className="text-right">{t.credit > 0 ? formatMoney(t.credit) : "-"}</td>
                            <td className="text-right font-bold">{formatMoney(t.balance)}</td>
                          </tr>
                          {lines.map((line) => (
                            <tr key={line.line_id} className="elr-line-row">
                              <td colSpan={3} />
                              <td>{line.item_name}</td>
                              <td className="text-right">{formatQty(line.qty)}</td>
                              <td className="text-right">{formatMoney(line.unit_price)}</td>
                              <td className="text-right">{formatMoney(line.amount)}</td>
                              <td colSpan={3} />
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="elr-closing">
                <strong>Net Closing Balance: </strong>
                <span className="elr-closing-value">PKR {formatMoney(report.closingBalance)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default EntityLedgerWithInvoiceReport;
