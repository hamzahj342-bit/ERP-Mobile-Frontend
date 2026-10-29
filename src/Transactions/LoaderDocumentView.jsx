import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx-js-style";
import { FaArrowLeft, FaFileExcel, FaFilePdf, FaImage } from "react-icons/fa";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import api from "../../api";
import '../Invoice.css'; // Utilizing your custom invoice styles

const LoaderDocumentView = ({ docType }) => {
  const { docNo } = useParams();
  const navigate = useNavigate();
  const printRef = useRef(null);

  const [documentData, setDocumentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);

  const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || "http://localhost:5000";
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const docTitle = docType === "GRN" ? "Goods Receive Note" : "Delivery Challan";
  const docLabel = docType === "GRN" ? "Supplier" : "Customer";
  const docHeading = docType === "GRN"
    ? "GOODS RECEIVE NOTE"
    : docType === "DC-FP"
      ? "DELIVERY CHALLAN - FINISHED PRODUCT"
      : "DELIVERY CHALLAN";

  const fetchDocument = async () => {
    try {
      setLoading(true);
      const [listRes, companiesRes] = await Promise.all([
        api.get("/loader-documents", { params: { type: docType, page: 1, limit: 500 } }),
        api.get("/companies")
      ]);

      const docs = Array.isArray(listRes.data?.data) ? listRes.data.data : [];
      const selectedDoc = docs.find((item) => item.no === docNo);

      if (!selectedDoc) {
        setDocumentData(null);
        return;
      }

      const detailRes = await api.get(`/loader-documents/${selectedDoc.id}`);
      const payload = detailRes.data?.data || detailRes.data || null;

      setCompanies(companiesRes.data || []);
      setDocumentData({ master: selectedDoc, payload });
    } catch (error) {
      console.error("Error loading document view:", error);
      toast.error("Unable to load document details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocument();
  }, [docNo, docType]);

  const getLogoUrl = () => {
    if (!user?.profile_image) return null;

    if (user.profile_image.startsWith("http")) {
      return user.profile_image;
    }

    const cleanFileName = user.profile_image.replace("uploads\\", "").replace("uploads/", "");
    return `${IMAGE_BASE_URL}/uploads/${cleanFileName}`.replace(/\\/g, "/");
  };

  const currentCompanyName =
    companies.find((company) => company.id === Number(user?.company_id))?.name ||
    "AK ELECTRICAL";

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const cleanMaterialLabel = (label = "") => String(label).replace(/\s*\(DC_FP\)$/, "").trim();

  const exportToExcel = () => {
    if (!documentData) return;

    const rows = [];
    rows.push([{ v: `${docHeading}`, s: { font: { bold: true, sz: 16 } } }, "", ""]);
    rows.push([{ v: `Document No: ${documentData.master?.no || docNo}`, s: { font: { bold: true } } }, "", ""]);
    rows.push([{ v: `Date: ${formatDate(documentData.master?.date)}`, s: { font: { italic: true } } }, "", ""]);
    rows.push([{ v: `${docLabel}: ${documentData.master?.entity?.name || "N/A"}`, s: { font: { italic: true } } }, "", ""]);
    rows.push([{ v: `Driver: ${documentData.master?.driver?.driver_name || "N/A"}` }, "", ""]);
    rows.push([{ v: `Vehicle: ${documentData.master?.vehicle_no || "N/A"}` }, "", ""]);
    rows.push([]);
    rows.push([
      { v: "Material Description", s: { fill: { fgColor: { rgb: "2C3E50" } }, font: { color: { rgb: "FFFFFF" }, bold: true }, alignment: { horizontal: "center" } } },
      { v: "Qty", s: { fill: { fgColor: { rgb: "2C3E50" } }, font: { color: { rgb: "FFFFFF" }, bold: true }, alignment: { horizontal: "center" } } },
      { v: "", s: { fill: { fgColor: { rgb: "2C3E50" } } } }
    ]);

    const detailRows = documentData.payload?.LoaderDocumentDetails || documentData.payload?.details || [];
    let excelTotalQty = 0;

    detailRows.forEach((item) => {
      const qty = parseFloat(item.quantity || 0);
      excelTotalQty += qty;
      rows.push([
        { v: cleanMaterialLabel(item.material_name || item.rm_name || item.name || "-") },
        { v: qty },
        ""
      ]);
    });

    // Add total row to Excel export
    rows.push([
      { v: "Total Quantity", s: { font: { bold: true }, alignment: { horizontal: "right" } } },
      { v: excelTotalQty, s: { font: { bold: true } } },
      ""
    ]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 36 }, { wch: 16 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, docType);
    XLSX.writeFile(wb, `${docType}-${documentData.master?.no || docNo}.xlsx`);
  };

  const exportToPNG = async () => {
    if (!printRef.current) return;
    const canvas = await html2canvas(printRef.current, { useCORS: true, scale: 3, ignoreElements: (element) => element.classList.contains("no-print") });
    const link = document.createElement("a");
    link.download = `${docType}-${documentData?.master?.no || docNo}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const exportToPDF = () => {
    if (!printRef.current) return;
    html2canvas(printRef.current, { useCORS: true, scale: 2, ignoreElements: (element) => element.classList.contains("no-print") }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${docType}-${documentData?.master?.no || docNo}.pdf`);
    });
  };

  if (loading) return <p className="p-5 text-center">Loading document...</p>;
  if (!documentData) return <p className="p-5 text-center text-danger">Document not found or failed to load.</p>;

  const detailRows = documentData.payload?.LoaderDocumentDetails || documentData.payload?.details || [];
  const master = documentData.master;

  // Calculate the sum of all material quantities
  const totalQuantity = detailRows.reduce((sum, item) => sum + parseFloat(item.quantity || 0), 0);

  return (
    <div className="d-flex flex-column min-vh-100">
      <NavigationBar />
      
      <div className="invoice-container flex-grow-1" style={{ marginTop: '70px', marginBottom: '30px' }}>
        <div className="invoice-box shadow-lg" id="invoice-content" ref={printRef}> 
          
          <header className="invoice-header">
            <div className="company-info" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              {/* Dynamic Logo Wrapper */}
              {user?.profile_image ? (
                <img 
                  src={getLogoUrl()} 
                  alt="Company Logo" 
                  style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} 
                  crossOrigin="anonymous" 
                />
              ) : (
                <div style={{ width: '80px', height: '80px', background: '#eee', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#888', border: '1px solid #ddd' }}>
                  NO LOGO
                </div>
              )}
              <div>
                {/* Dynamic Company Name */}
                <p className="title text" style={{ textTransform: 'uppercase', fontWeight: 'bold', fontSize: '1.2rem', margin: 0 }}>
                  {currentCompanyName}
                </p>
                <h4 className="subtitle">{docHeading}</h4>
              </div>
            </div>
            <div className="invoice-id">
              <h1 className="id-number">#{master?.no || docNo}</h1>
            </div>
          </header>

          <section className="invoice-details-section">
            <div className="details-row">
              <div className="billed-to">
                <p className="label">Party Details</p>
                <h5 className="customer-name"><b>Name: </b>{master?.entity?.name || 'N/A'}</h5>
                <p className="customer-detail"><b>Type: </b>{docTitle}</p>
              </div>

              <div className="invoice-dates">
                <div className="date-item">
                  <p className="label">Date Issued</p>
                  <p className="value">{formatDate(master?.date)}</p>
                </div>
                <div className="date-item">
                  <p className="label">Driver Name</p>
                  <p className="value">{master?.driver?.driver_name || 'N/A'}</p>
                </div>
                <div className="date-item">
                  <p className="label">Vehicle No.</p>
                  <p className="value">{master?.vehicle_no || 'N/A'}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="item-table-section">
            <h5 className="section-title">Item Details</h5>
            <div className="table-responsive">
              <table className="item-table">
                <thead>
                  <tr>
                    <th className="product-col">Material Description</th>
                    <th className="qty-col text-right">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {detailRows.length > 0 ? (
                    <>
                      {detailRows.map((item, index) => (
                        <tr key={index}>
                          <td className="product-col">{cleanMaterialLabel(item.material_name || item.rm_name || item.name || "-")}</td>
                          <td className="qty-col text-right">{parseFloat(item.quantity || 0)}</td>
                        </tr>
                      ))}
                      {/* Integrated Total Quantity Summary Row */}
                      <tr style={{ fontWeight: 'bold', borderTop: '2px solid #444', backgroundColor: '#f9f9f9' }}>
                        <td className="product-col text-right" style={{ paddingRight: '15px' }}>Total Quantity:</td>
                        <td className="qty-col text-right">{totalQuantity}</td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td colSpan="2" className="text-center text-muted py-4">No details found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="invoice-footer">
            <div className="note-section" style={{ width: '100%' }}>
              <p className="note" style={{ textAlign: 'center' }}>
                Thank you. This is a computer-generated document.
              </p>
              
              {/* Document Action Trigger Controls */}
              <div className="action-buttons-group no-print" style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => navigate(-1)} className="back-button" style={{ padding: '10px 20px', cursor: 'pointer' }}>
                  <FaArrowLeft className="me-1" /> Back
                </button>
                <button type="button" onClick={exportToExcel} className="download-button bg-excel" style={{ cursor: 'pointer' }}>
                  <FaFileExcel /> 
                </button>
                <button type="button" onClick={exportToPNG} className="download-button bg-png" style={{ cursor: 'pointer' }}>
                  <FaImage /> 
                </button>
                <button type="button" onClick={exportToPDF} className="download-button bg-pdf" style={{ cursor: 'pointer' }}>
                  <FaFilePdf />
                </button>
              </div>
            </div>
          </footer>

        </div>
      </div>

      <Footer />
    </div>
  );
};

export default LoaderDocumentView;