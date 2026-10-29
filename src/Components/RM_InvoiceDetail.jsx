import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "./NavigationBar";
import Footer from "./Footer";
import { FaArrowLeft } from "react-icons/fa";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import api from "../../api";
import { parseContactImages } from "../constants/mobileDeviceOptions";
import "../Invoice.css";

const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || "http://localhost:5000";

const toImageSrc = (url) => {
    if (!url) return null;
    if (String(url).startsWith("http")) return url;
    return `${IMAGE_BASE_URL}${String(url).startsWith("/") ? "" : "/"}${url}`;
};

const deviceSpecLine = (item) => {
    const parts = [];
    if (item.ram) parts.push(`RAM ${item.ram}`);
    if (item.rom) parts.push(`ROM ${item.rom}`);
    if (item.color) parts.push(item.color);
    if (item.condition) parts.push(item.condition);
    return parts.join(" · ");
};

const standardizeInvoice = (data, type) => {
    let detailArray;
    if (type === "RAW MATERIAL") {
        detailArray = data.RmDetails || [];
    } else if (type === "FINISHED PRODUCT") {
        detailArray = data.details || [];
    } else {
        detailArray = [];
    }

    const items = detailArray.map((item) => ({
        display_name:
            type === "RAW MATERIAL"
                ? item.rm_name
                : item.product_name || item.fp_name,
        quantity: item.quantity,
        uom: item.uom,
        unit_price: item.entered_unit_price != null ? item.entered_unit_price : item.unit_price,
        total_price: item.total_price,
        imei1: item.imei1 || "",
        imei2: item.imei2 || "",
        ram: item.ram || "",
        rom: item.rom || "",
        color: item.color || "",
        condition: item.condition || "",
        pack_uom_name: item.pack_uom_name || "",
        base_uom_name: item.base_uom_name || "",
        entered_qty: item.entered_qty,
    }));

    const dateSource = data.date || detailArray[0]?.date;
    const isMobile =
        Boolean(data.is_mobile_invoice) ||
        items.some((d) => d.imei1 && String(d.imei1).trim());

    return {
        ...data,
        type,
        display_type: type === "RAW MATERIAL" ? (isMobile ? "Mobile" : "Inventory") : "Finished Product",
        is_mobile_invoice: isMobile,
        items,
        date: dateSource,
    };
};

const RM_InvoiceDetail = () => {
    const [invoiceNo, setInvoiceNo] = useState("");
    const [invoice, setInvoice] = useState(null);
    const [error, setError] = useState("");
    const [companies, setCompanies] = useState([]);
    const navigate = useNavigate();

    const user = JSON.parse(localStorage.getItem("user"));

    const getLogoUrl = () => {
        if (!user?.profile_image) return null;
        if (user.profile_image.startsWith("http")) return user.profile_image;
        const cleanFileName = user.profile_image.replace("uploads\\", "").replace("uploads/", "");
        return `${IMAGE_BASE_URL}/uploads/${cleanFileName}`.replace(/\\/g, "/");
    };

    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const res = await api.get("/companies");
                setCompanies(res.data);
            } catch (err) {
                console.error("Error fetching companies", err);
            }
        };
        fetchCompanies();
    }, []);

    const currentCompanyName =
        companies.find((c) => c.id === Number(user?.company_id))?.name || "Mobile Shop";

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "Invalid Date Format";
        return date.toLocaleDateString("en-GB", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const generatePdf = () => {
        const input = document.getElementById("invoice-detail");
        if (!input) return;
        html2canvas(input, {
            scale: 2,
            useCORS: true,
            ignoreElements: (el) => el.classList.contains("no-print"),
        }).then((canvas) => {
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Invoice-${invoice.invoice_no}.pdf`);
        });
    };

    const generateImage = () => {
        const input = document.getElementById("invoice-detail");
        if (!input) return;
        html2canvas(input, {
            scale: 3,
            useCORS: true,
            ignoreElements: (el) => el.classList.contains("no-print"),
        }).then((canvas) => {
            const link = document.createElement("a");
            link.download = `Invoice-${invoice.invoice_no}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        });
    };

    const handleSearch = async () => {
        setError("");
        setInvoice(null);
        try {
            const rmRes = await api.get(`/rm-invoice/${invoiceNo}`);
            if (rmRes.data.RmDetails) {
                setInvoice(standardizeInvoice(rmRes.data, "RAW MATERIAL"));
                return;
            }
        } catch (err) {
            console.log("Searching in FP...");
        }

        try {
            const fpRes = await api.get(`/fp-invoice/${invoiceNo}`);
            if (fpRes.data.details) {
                setInvoice(standardizeInvoice(fpRes.data, "FINISHED PRODUCT"));
                return;
            }
        } catch (err) {
            console.error("Not found in both.");
        }

        setError("Invoice not found in our records.");
    };

    const isMobile = Boolean(invoice?.is_mobile_invoice);
    const contactImages = invoice ? parseContactImages(invoice.contact_image) : [];
    const hasContact =
        invoice &&
        (invoice.contact_name ||
            invoice.contact_phone ||
            invoice.contact_cnic ||
            contactImages.length > 0);

    return (
        <>
            <NavigationBar />
            <div className="page-container">
                <button
                    className="back-btn"
                    style={{ marginTop: "30px" }}
                    onClick={() => navigate("/dashboard")}
                >
                    <FaArrowLeft />
                </button>
                <div className="rm-card">
                    <h2>Search Invoice</h2>
                    <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                        <input
                            className="input"
                            type="text"
                            placeholder="Enter Invoice No (e.g. INV-P-0001)"
                            value={invoiceNo}
                            onChange={(e) => setInvoiceNo(e.target.value)}
                        />
                        <button
                            onClick={handleSearch}
                            className="btn btn-secondary"
                            style={{ height: "46px" }}
                        >
                            Search
                        </button>
                    </div>

                    {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}

                    {invoice && (
                        <div className="invoice-container">
                            <div id="invoice-detail" className="invoice-box shadow-lg">
                                <header className="invoice-header">
                                    <div className="company-info">
                                        {user?.profile_image ? (
                                            <img
                                                className="invoice-logo"
                                                src={getLogoUrl()}
                                                alt="Logo"
                                                crossOrigin="anonymous"
                                            />
                                        ) : (
                                            <div className="invoice-logo-fallback">NO LOGO</div>
                                        )}
                                        <div>
                                            <p className="title text">{currentCompanyName}</p>
                                            <h4 className="subtitle">
                                                {invoice.display_type || invoice.type} Invoice
                                            </h4>
                                        </div>
                                    </div>
                                    <div className="invoice-id">
                                        <p className="title">Invoice No.</p>
                                        <h1 className="id-number">#{invoice.invoice_no}</h1>
                                    </div>
                                </header>

                                <section className="invoice-details-section">
                                    <div className="details-row">
                                        <div className="billed-to">
                                            <p className="label">Billed To</p>
                                            <h5 className="customer-name">
                                                <b>Name: </b>
                                                {invoice.entity?.name ||
                                                    invoice.customer?.name ||
                                                    "N/A"}
                                            </h5>
                                            <p className="customer-detail">
                                                <b>Address: </b>
                                                {invoice.entity?.address ||
                                                    invoice.customer?.address ||
                                                    "N/A"}
                                            </p>
                                            <p className="customer-detail">
                                                <b>Contact: </b>
                                                {invoice.entity?.contact ||
                                                    invoice.customer?.contact ||
                                                    "N/A"}
                                            </p>
                                        </div>

                                        <div className="invoice-dates">
                                            <div className="date-item">
                                                <p className="label">Date Issued</p>
                                                <p className="value">{formatDate(invoice.date)}</p>
                                            </div>
                                            <div className="date-item">
                                                <p className="label">Created By</p>
                                                <p className="value">{invoice.createdby}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {hasContact ? (
                                        <div className="invoice-contact-print">
                                            <p className="label">Deal Contact / KYC</p>
                                            <div className="invoice-contact-print-grid">
                                                {invoice.contact_name ? (
                                                    <p>
                                                        <b>Name:</b> {invoice.contact_name}
                                                    </p>
                                                ) : null}
                                                {invoice.contact_phone ? (
                                                    <p>
                                                        <b>Phone:</b> {invoice.contact_phone}
                                                    </p>
                                                ) : null}
                                                {invoice.contact_cnic ? (
                                                    <p>
                                                        <b>CNIC:</b> {invoice.contact_cnic}
                                                    </p>
                                                ) : null}
                                            </div>
                                            {contactImages.length > 0 ? (
                                                <div className="invoice-contact-photos">
                                                    {contactImages.map((url, i) => (
                                                        <img
                                                            key={`${url}-${i}`}
                                                            src={toImageSrc(url)}
                                                            alt={`Contact ${i + 1}`}
                                                            crossOrigin="anonymous"
                                                        />
                                                    ))}
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </section>

                                <section className="item-table-section">
                                    <table className="item-table">
                                        <thead>
                                            <tr>
                                                <th className="product-col">
                                                    {isMobile ? "Model / Device" : "Description"}
                                                </th>
                                                {isMobile ? (
                                                    <th className="uom-col">Brand</th>
                                                ) : (
                                                    <>
                                                        <th className="qty-col text-right">Qty</th>
                                                        <th className="uom-col text-right">Brand</th>
                                                    </>
                                                )}
                                                <th className="price-col text-right">Price</th>
                                                <th className="amount-col text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {invoice.items.map((item, index) => {
                                                const specs = deviceSpecLine(item);
                                                return (
                                                    <tr key={index}>
                                                        <td className="product-col">
                                                            <div className="inv-model-name">
                                                                {item.display_name}
                                                            </div>
                                                            {isMobile ? (
                                                                <div className="inv-device-meta">
                                                                    {item.imei1 ? (
                                                                        <div>
                                                                            <span>IMEI 1</span>{" "}
                                                                            {item.imei1}
                                                                        </div>
                                                                    ) : null}
                                                                    {item.imei2 ? (
                                                                        <div>
                                                                            <span>IMEI 2</span>{" "}
                                                                            {item.imei2}
                                                                        </div>
                                                                    ) : null}
                                                                    {specs ? (
                                                                        <div className="inv-device-specs">
                                                                            {specs}
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            ) : null}
                                                        </td>
                                                        {isMobile ? (
                                                            <td className="uom-col">
                                                                {item.uom?.name || "—"}
                                                            </td>
                                                        ) : (
                                                            <>
                                                                <td className="qty-col text-right">
                                                                    {item.quantity}
                                                                </td>
                                                                <td className="uom-col text-right">
                                                                    {item.uom?.name || "N/A"}
                                                                </td>
                                                            </>
                                                        )}
                                                        <td className="price-col text-right">
                                                            {Number(item.unit_price).toLocaleString()}
                                                        </td>
                                                        <td className="amount-col text-right">
                                                            {Number(item.total_price).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </section>

                                <footer className="invoice-footer">
                                    <div className="total-area">
                                        <div className="total-box shadow">
                                            {invoice.is_taxable ? (
                                                <div>
                                                    <div style={{ marginBottom: "10px" }}>
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                justifyContent: "space-between",
                                                                marginBottom: "6px",
                                                            }}
                                                        >
                                                            <span>Sub Total</span>
                                                            <span>
                                                                Rs.{" "}
                                                                {Number(
                                                                    invoice.subtotal || 0
                                                                ).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        {Number(invoice.discount) > 0 && (
                                                            <div
                                                                style={{
                                                                    display: "flex",
                                                                    justifyContent: "space-between",
                                                                    marginBottom: "6px",
                                                                }}
                                                            >
                                                                <span>Discount</span>
                                                                <span>
                                                                    Rs.{" "}
                                                                    {Number(
                                                                        invoice.discount
                                                                    ).toLocaleString()}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                justifyContent: "space-between",
                                                                marginBottom: "6px",
                                                            }}
                                                        >
                                                            <span>Taxable Amount</span>
                                                            <span>
                                                                Rs.{" "}
                                                                {Number(
                                                                    invoice.taxable_amount ||
                                                                        invoice.subtotal -
                                                                            invoice.discount ||
                                                                        0
                                                                ).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                justifyContent: "space-between",
                                                                marginBottom: "6px",
                                                            }}
                                                        >
                                                            <span>
                                                                Tax (
                                                                {Number(
                                                                    invoice.tax_rate || 0
                                                                ).toFixed(2)}
                                                                %)
                                                            </span>
                                                            <span>
                                                                Rs.{" "}
                                                                {Number(
                                                                    invoice.tax_amount || 0
                                                                ).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <h4 className="total-label">GRAND TOTAL</h4>
                                                    <h2 className="total-value">
                                                        Rs.{" "}
                                                        {Number(
                                                            invoice.grand_total
                                                        ).toLocaleString()}
                                                    </h2>
                                                </div>
                                            ) : (
                                                <div>
                                                    {Number(invoice.discount) > 0 && (
                                                        <h5 style={{ marginBottom: "5px" }}>
                                                            Discount: Rs.{" "}
                                                            {Number(
                                                                invoice.discount
                                                            ).toLocaleString()}
                                                        </h5>
                                                    )}
                                                    <h4 className="total-label">GRAND TOTAL</h4>
                                                    <h2 className="total-value">
                                                        Rs.{" "}
                                                        {Number(
                                                            invoice.grand_total
                                                        ).toLocaleString()}
                                                    </h2>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="note-section">
                                        <p className="note">
                                            Computer generated invoice. No signature required.
                                        </p>
                                        <div
                                            className="action-buttons-group no-print"
                                            style={{
                                                display: "flex",
                                                gap: "10px",
                                                justifyContent: "center",
                                                marginTop: "15px",
                                            }}
                                        >
                                            <button
                                                onClick={generateImage}
                                                className="download-img-button"
                                                style={{
                                                    backgroundColor: "#27ae60",
                                                    color: "white",
                                                }}
                                            >
                                                Save Image
                                            </button>
                                            <button
                                                onClick={generatePdf}
                                                className="download-pdf-button"
                                            >
                                                Save PDF
                                            </button>
                                        </div>
                                    </div>
                                </footer>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </>
    );
};

export default RM_InvoiceDetail;
