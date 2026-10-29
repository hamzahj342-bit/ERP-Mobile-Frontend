import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import '../Invoice.css';
import api from "../../api";
import { parseContactImages } from "../constants/mobileDeviceOptions";

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

const RM_InvoiceDetail = () => {
    const { invoiceNo } = useParams();
    const navigate = useNavigate();

    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [companies, setCompanies] = useState([]);

    const user = JSON.parse(localStorage.getItem("user"));

    const getLogoUrl = () => {
        if (!user?.profile_image) return null;
        if (user.profile_image.startsWith("http")) return user.profile_image;
        const cleanFileName = user.profile_image.replace("uploads\\", "").replace("uploads/", "");
        return `${IMAGE_BASE_URL}/uploads/${cleanFileName}`.replace(/\\/g, "/");
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const compRes = await api.get('/companies');
                setCompanies(compRes.data);
                if (invoiceNo) {
                    const invRes = await api.get(`/rm-invoice/${invoiceNo}`);
                    setInvoice(invRes.data);
                }
            } catch (err) {
                console.error("Error fetching data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [invoiceNo]);

    const currentCompanyName =
        companies.find((c) => c.id === Number(user?.company_id))?.name || "Mobile Shop";

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const handleDownloadPDF = () => {
        const input = document.getElementById("invoice-detail");
        html2canvas(input, {
            useCORS: true,
            scale: 2,
            ignoreElements: (element) => element.classList.contains('no-print'),
        }).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Invoice-${invoice.invoice_no}.pdf`);
        });
    };

    const handleDownloadImage = () => {
        const input = document.getElementById("invoice-detail");
        html2canvas(input, {
            useCORS: true,
            scale: 3,
            ignoreElements: (element) => element.classList.contains('no-print'),
        }).then((canvas) => {
            const link = document.createElement('a');
            link.download = `Invoice-${invoice.invoice_no}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    };

    if (loading) return <p className="p-5 text-center">Loading invoice...</p>;
    if (!invoice) return <p className="p-5 text-center text-danger">Invoice not found!</p>;

    const isMobile =
        Boolean(invoice.is_mobile_invoice) ||
        (invoice.RmDetails || []).some((d) => d.imei1 && String(d.imei1).trim());

    const showPackQty =
        !isMobile &&
        ((invoice.RmDetails || []).some((item) => {
            const packUom = (item.pack_uom_name || item.uom?.name || "").trim().toLowerCase();
            const baseUom = (item.base_uom_name || "").trim().toLowerCase();
            if (packUom && baseUom && packUom !== baseUom) return true;
            const packQty = Math.abs(Number(item.entered_qty ?? item.quantity) || 0);
            const baseQty = Math.abs(Number(item.quantity) || 0);
            return Math.abs(packQty - baseQty) > 1e-9;
        }) || Boolean(invoice.has_pack_sizes));

    const contactImages = parseContactImages(invoice.contact_image);
    const hasContact =
        invoice.contact_name ||
        invoice.contact_phone ||
        invoice.contact_cnic ||
        contactImages.length > 0;

    const typeLabel = (() => {
        const t = String(invoice.type || "").toLowerCase();
        if (t.includes("purchase") && t.includes("return")) return "Purchase Return";
        if (t.includes("sale") && t.includes("return")) return "Sale Return";
        if (t.includes("purchase")) return "Purchase";
        if (t.includes("sale")) return "Sale";
        return invoice.type || "Inventory";
    })();

    return (
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
                            <h4 className="subtitle">{typeLabel} Invoice</h4>
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
                                {invoice.entity?.name || 'N/A'}
                            </h5>
                            <p className="customer-detail">
                                <b>Address: </b>
                                {invoice.entity?.address || 'N/A'}
                            </p>
                            <p className="customer-detail">
                                <b>Contact: </b>
                                {invoice.entity?.contact || 'N/A'}
                            </p>
                            <p className="customer-detail">
                                <b>Type:</b> {typeLabel}
                            </p>
                        </div>
                        <div className="invoice-dates">
                            <div className="date-item">
                                <p className="label">Date Issued</p>
                                <p className="value">
                                    {formatDate(invoice.RmDetails?.[0]?.date || invoice.date)}
                                </p>
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
                                    <p><b>Name:</b> {invoice.contact_name}</p>
                                ) : null}
                                {invoice.contact_phone ? (
                                    <p><b>Phone:</b> {invoice.contact_phone}</p>
                                ) : null}
                                {invoice.contact_cnic ? (
                                    <p><b>CNIC:</b> {invoice.contact_cnic}</p>
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
                    <h5 className="section-title">{isMobile ? "Phone Details" : "Item Details"}</h5>
                    <div className="table-responsive">
                        <table className="item-table">
                            <thead>
                                <tr>
                                    <th className="product-col">{isMobile ? "Model / Device" : "Material Description"}</th>
                                    {isMobile ? (
                                        <th className="uom-col">Brand</th>
                                    ) : (
                                        <>
                                            {showPackQty && <th className="qty-col text-right">Pack Qty</th>}
                                            <th className="qty-col text-right">{showPackQty ? 'Base Qty' : 'Qty'}</th>
                                        </>
                                    )}
                                    <th className="price-col text-right">{isMobile ? "Price" : "Unit Price"}</th>
                                    <th className="amount-col text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice.RmDetails?.map((item, i) => {
                                    const packQty = Math.abs(Number(item.entered_qty ?? item.quantity) || 0);
                                    const baseQty = Math.abs(Number(item.quantity) || 0);
                                    const packUom = item.pack_uom_name || item.uom?.name || "";
                                    const baseUom = item.base_uom_name || packUom;
                                    const unitPrice = item.entered_unit_price != null
                                        ? Number(item.entered_unit_price)
                                        : Number(item.unit_price);
                                    const specs = deviceSpecLine(item);

                                    return (
                                        <tr key={item.detail_id || i}>
                                            <td className="product-col">
                                                <div className="inv-model-name">{item.rm_name}</div>
                                                {isMobile ? (
                                                    <div className="inv-device-meta">
                                                        {item.imei1 ? (
                                                            <div><span>IMEI 1</span> {item.imei1}</div>
                                                        ) : null}
                                                        {item.imei2 ? (
                                                            <div><span>IMEI 2</span> {item.imei2}</div>
                                                        ) : null}
                                                        {specs ? <div className="inv-device-specs">{specs}</div> : null}
                                                    </div>
                                                ) : null}
                                            </td>
                                            {isMobile ? (
                                                <td className="uom-col">{item.uom?.name || packUom || "—"}</td>
                                            ) : (
                                                <>
                                                    {showPackQty && (
                                                        <td className="qty-col text-right">
                                                            {packQty.toLocaleString(undefined, { maximumFractionDigits: 4 })} {packUom}
                                                        </td>
                                                    )}
                                                    <td className="qty-col text-right">
                                                        {baseQty.toLocaleString(undefined, { maximumFractionDigits: 4 })} {baseUom}
                                                    </td>
                                                </>
                                            )}
                                            <td className="price-col text-right">{unitPrice.toLocaleString()}</td>
                                            <td className="amount-col text-right">
                                                {Number(item.total_price).toLocaleString()}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>

                <footer className="invoice-footer">
                    <div className="total-area">
                        <div className="total-box shadow">
                            <div style={{ marginBottom: '10px' }}>
                                {invoice.is_taxable ? (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                            <span>Sub Total</span>
                                            <span>Rs. {Number(invoice.subtotal || 0).toLocaleString()}</span>
                                        </div>
                                        {Number(invoice.discount) > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                <span>Discount</span>
                                                <span>Rs. {Number(invoice.discount).toLocaleString()}</span>
                                            </div>
                                        )}
                                        {Number(invoice.delivery_charges) > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                <span>Delivery Charges</span>
                                                <span>Rs. {Number(invoice.delivery_charges).toLocaleString()}</span>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                            <span>Taxable Amount</span>
                                            <span>
                                                Rs.{" "}
                                                {Number(
                                                    invoice.taxable_amount ||
                                                        invoice.subtotal - (invoice.discount || 0)
                                                ).toLocaleString()}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                            <span>Tax ({Number(invoice.tax_rate || 0).toFixed(2)}%)</span>
                                            <span>Rs. {Number(invoice.tax_amount || 0).toLocaleString()}</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {Number(invoice.discount) > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                <span>Discount</span>
                                                <span>Rs. {Number(invoice.discount).toLocaleString()}</span>
                                            </div>
                                        )}
                                        {Number(invoice.delivery_charges) > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                <span>Delivery Charges</span>
                                                <span>Rs. {Number(invoice.delivery_charges).toLocaleString()}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            <h4 className="total-label">GRAND TOTAL</h4>
                            <h2 className="total-value">Rs. {Number(invoice.grand_total).toLocaleString()}</h2>
                        </div>
                    </div>

                    <div className="note-section">
                        <p className="note">Thank you for your business. This is a computer-generated invoice.</p>
                        <div className="action-buttons-group no-print">
                            <button type="button" onClick={() => navigate(-1)} className="back-button">
                                ← Back
                            </button>
                            <button type="button" onClick={handleDownloadImage} className="download-img-button">
                                Save as Image
                            </button>
                            <button type="button" onClick={handleDownloadPDF} className="download-pdf-button">
                                Save as PDF
                            </button>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default RM_InvoiceDetail;
