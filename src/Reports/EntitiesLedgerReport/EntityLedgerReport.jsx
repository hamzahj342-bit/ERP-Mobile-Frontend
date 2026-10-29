import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import * as XLSX from "xlsx-js-style";
import { FaArrowLeft, FaBook, FaFileExcel, FaFilePdf, FaImage, FaExchangeAlt } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Select from "react-select";
import NavigationBar from "../../Components/NavigationBar";
import Footer from "../../Components/Footer";
import api from "../../../api";
import "./EntityLedgerReport.css";
import { localToday, localYearStart } from "../../utils/localDate";

const EntityLedgerReport = ({
  pageTitle = "Entity Ledger Report",
  entityType = "", // customer or supplier
  entityLabel = "Entity",
  description = "View detailed transactional history and running balances.",
  backPath = "/entities-menu"
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams(); 
  const reportRef = useRef(null);

  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [taxFilter, setTaxFilter] = useState('all');

  // URL query parameter check karne ke liye: kya dual-role entity exist karti hai?
  const dynamicHasRelation = searchParams.get("has_relation") === "true";

  // 1. --- Default Dates Auto-Setup ---
  useEffect(() => {
    if (!fromDate || !toDate) {
      setFromDate(localYearStart());
      setToDate(localToday());
    }
  }, []);

  // 2. --- Load Entities Dropdown Data ---
  useEffect(() => {
    const fetchEntities = async () => {
      try {
        // Agar dynamic relation report open hui hai toh parameters manage karein
        const res = await api.get("/entities/ledger-entities", {
          params: dynamicHasRelation ? { fetch_all_linked: "true" } : { type: entityType }
        });

        const formattedEntities = res.data.map((entity) => ({
          value: entity.id,
          label: entity.entity_relation_id 
            ? `${entity.name} (Dual Account - Linked)` 
            : `${entity.name} (${entity.type || entityType})`
        }));
        setEntities(formattedEntities);

        // URL parsing for focus entity target
        const urlEntityId = searchParams.get("entity_id");
        if (urlEntityId) {
          setSelectedEntity(Number(urlEntityId));
        }
      } catch (err) {
        toast.error("Failed to load entities drop-down");
      }
    };
    fetchEntities();
  }, [entityType, dynamicHasRelation, searchParams]);

  // 3. --- Auto-Fetch Processing Trigger ---
  useEffect(() => {
    if (selectedEntity && fromDate && toDate && entities.length > 0) {
      const delayFetch = setTimeout(() => {
        fetchLedger();
      }, 300);
      return () => clearTimeout(delayFetch);
    }
  }, [selectedEntity, fromDate, toDate, entities.length]);

  const fetchLedger = async () => {
    if (!selectedEntity || !fromDate || !toDate) {
      toast.error("Please select parameters correctly");
      return;
    }
    setLoading(true);
    try {
      const res = await api.get("/reports/entity-ledger", {
        params: {
          entity_id: selectedEntity,
          fromDate,
          toDate,
          tax_filter: taxFilter,
          // Backend ko explicitly dynamic parameter pass kar rhe hain jo cross-referencing verify karega
          check_relation: dynamicHasRelation ? "true" : "false" 
        }
      });
      setReport(res.data);
      toast.success("Ledger synchronized successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Operational exception fetching statement matrix");
    } finally {
      setLoading(false);
    }
  };

  const calculateRunningBalance = (index, items, openingBalance) => {
    let balance = openingBalance;
    for (let i = 0; i <= index; i++) {
      balance += (items[i].debit - items[i].credit);
    }
    return balance;
  };

  // Excel Export Definition
  const exportToExcel = () => {
    if (!report) return;

    const headerStyle = {
      fill: { fgColor: { rgb: "1E293B" } },
      font: { color: { rgb: "FFFFFF" }, bold: true },
      alignment: { horizontal: "center" }
    };

    const subHeaderStyle = {
      fill: { fgColor: { rgb: "F1F5F9" } },
      font: { bold: true },
      border: { bottom: { style: "thin" } }
    };

    const numStyle = { alignment: { horizontal: "right" }, numFmt: "#,##0.00" };

    const rows = [
      [{ v: `Statement Ledger Report: ${report.entity.name}`, s: { font: { bold: true, sz: 14 } } }, "", "", "", ""],
      [{ v: `Period Limits: ${fromDate} to ${toDate}`, s: { font: { italic: true } } }, "", "", "", ""],
      [],
      [{ v: "Opening Balance Summary", s: subHeaderStyle }, "", "", "", { v: Number(report.openingBalance), s: { ...numStyle, font: { bold: true } } }],
      [{ v: "TRANSACTION DATE", s: headerStyle }, { v: "NARRATION / REMARKS", s: headerStyle }, { v: "DEBIT VALUE", s: headerStyle }, { v: "CREDIT VALUE", s: headerStyle }, { v: "NET BALANCE", s: headerStyle }],
    ];

    report.transactions.forEach((t, index) => {
      const rb = calculateRunningBalance(index, report.transactions, report.openingBalance);
      rows.push([
        { v: t.transaction_date },
        { v: t.description },
        { v: Number(t.debit), s: numStyle },
        { v: Number(t.credit), s: numStyle },
        { v: Number(rb), s: { ...numStyle, font: { bold: true } } }
      ]);
    });

    rows.push(
      [],
      [{ v: "Closing Balance Position", s: { ...subHeaderStyle, fill: { fgColor: { rgb: "DCFCE7" } } } }, "", "", "", { v: Number(report.closingBalance), s: { ...numStyle, font: { bold: true }, fill: { fgColor: { rgb: "DCFCE7" } } } }]
    );

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 18 }, { wch: 45 }, { wch: 18 }, { wch: 18 }, { wch: 20 }];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "StatementLedger");
    XLSX.writeFile(wb, `${report.entity.name}_Statement.xlsx`);
  };

  const exportToPNG = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2 });
    const link = document.createElement('a');
    link.href = canvas.toDataURL("image/png");
    link.download = `${report.entity.name}_Statement.png`;
    link.click();
  };

  const exportToPDF = () => {
    if (!reportRef.current) return;
    html2canvas(reportRef.current, { scale: 3 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
      pdf.save(`${report.entity.name}_Statement.pdf`);
    });
  };

  const customSelectStyles = {
    control: (provided) => ({
      ...provided,
      minWidth: "220px",
      minHeight: "32px",
      height: "32px",
      borderRadius: "6px",
      borderColor: "#e2e8f0",
      fontSize: "12px",
      boxShadow: "none"
    }),
    valueContainer: (provided) => ({
      ...provided,
      padding: "0 8px",
      height: "30px"
    }),
    indicatorsContainer: (provided) => ({
      ...provided,
      height: "30px"
    }),
    input: (provided) => ({
      ...provided,
      margin: 0,
      padding: 0
    }),
    singleValue: (provided) => ({
      ...provided,
      fontSize: "12px",
      color: "#334155"
    }),
    placeholder: (provided) => ({
      ...provided,
      fontSize: "12px",
      color: "#94a3b8"
    }),
    menu: (provided) => ({ ...provided, zIndex: 9999, fontSize: "12px" }),
    option: (provided) => ({
      ...provided,
      fontSize: "12px",
      padding: "6px 10px"
    })
  };

  return (
    <>
      <NavigationBar />
      <div className="elr-page">
        <div className="elr-card">
          <div className="elr-header">
            <div className="elr-header-top">
              <div className="elr-header-left">
                <button
                  type="button"
                  className="back-btn erp-back-btn"
                  onClick={() => navigate(backPath)}
                >
                  <FaArrowLeft />
                </button>
                <div>
                  <h2 className="elr-title">
                    <FaBook />
                    {dynamicHasRelation ? "Dual Role Statement Ledger" : pageTitle}
                  </h2>
                  <p className="elr-subtitle">{description}</p>
                </div>
              </div>

              {report && (
                <div className="elr-export-group">
                  <button type="button" className="icon-button bg-pdf" onClick={exportToPDF} title="PDF"><FaFilePdf /></button>
                  <button type="button" className="icon-button bg-excel" onClick={exportToExcel} title="Excel"><FaFileExcel /></button>
                  <button type="button" className="icon-button bg-png" onClick={exportToPNG} title="Capture Image"><FaImage /></button>
                </div>
              )}
            </div>

            <div className="elr-filters">
              <Select
                options={entities}
                value={entities.find(option => option.value === selectedEntity) || null}
                onChange={(selectedOption) => setSelectedEntity(selectedOption ? selectedOption.value : "")}
                placeholder={`Search Account Name...`}
                isClearable
                isSearchable
                styles={customSelectStyles}
              />

              <input type="date" className="date-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <input type="date" className="date-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              <button type="button" className="elr-get-btn" onClick={fetchLedger}>{loading ? "..." : "Get Report"}</button>

              <div className="elr-tax-group">
                {['all', 'taxable', 'non-taxable'].map(filter => (
                  <button
                    type="button"
                    key={filter}
                    onClick={() => setTaxFilter(filter)}
                    className={`elr-tax-btn${taxFilter === filter ? " active" : ""}`}
                  >
                    {filter === 'all' ? 'All' : filter}
                  </button>
                ))}
              </div>
            </div>

            {(dynamicHasRelation || report?.entity?.entity_relation_id) && (
              <div className="elr-alert">
                <FaExchangeAlt />
                <span>
                  <strong>Cross-Linked Account:</strong> entity_relation_id detected. System unified statement processing for combined Customer/Supplier ledgers.
                </span>
              </div>
            )}
          </div>

          {report && (
            <div ref={reportRef} className="elr-result">
              <h3 className="elr-result-title">
                Statement Analysis: {report.entity.name}
              </h3>

              <div className="elr-meta">
                <span>
                  <strong>Opening Position:</strong>{" "}
                  <span className="elr-meta-value">{Number(report.openingBalance).toLocaleString()}</span>
                </span>
                <span>
                  <strong>Date Period:</strong> {fromDate} to {toDate}
                </span>
              </div>

              <div className="elr-table-scroll">
                <table className="elr-table">
                  <thead>
                    <tr>
                      <th>Transaction Date</th>
                      <th>Particulars / Description</th>
                      <th className="text-right">Debit (+)</th>
                      <th className="text-right">Credit (-)</th>
                      <th className="text-right">Net Running Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.transactions.map((t, index) => {
                      const rb = calculateRunningBalance(index, report.transactions, report.openingBalance);
                      return (
                        <tr key={index}>
                          <td>{t.transaction_date}</td>
                          <td>{t.description}</td>
                          <td className="text-right">{t.debit > 0 ? Number(t.debit).toLocaleString() : "-"}</td>
                          <td className="text-right">{t.credit > 0 ? Number(t.credit).toLocaleString() : "-"}</td>
                          <td className="text-right font-bold">{Number(rb).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="elr-closing">
                <strong>Net Closing Balance: </strong>
                <span className="elr-closing-value">PKR {Number(report.closingBalance).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default EntityLedgerReport;