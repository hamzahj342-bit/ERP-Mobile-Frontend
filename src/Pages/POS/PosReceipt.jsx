import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPrint } from 'react-icons/fa';
import api from '../../../api';

// 80mm thermal-style receipt. Opened right after a POS sale and reprintable
// from the POS sales list (/pos/sales → RECEIPT).
const PosReceipt = () => {
    const { invoiceNo } = useParams();
    const navigate = useNavigate();

    const [invoice, setInvoice] = useState(null);
    const [companyName, setCompanyName] = useState('');
    const [loading, setLoading] = useState(true);

    const user = JSON.parse(localStorage.getItem('user') || 'null');

    useEffect(() => {
        const load = async () => {
            try {
                const [invRes, compRes] = await Promise.all([
                    api.get(`/rm-invoice/${invoiceNo}`),
                    api.get('/companies'),
                ]);
                setInvoice(invRes.data);
                const company = (compRes.data || []).find(c => c.id === Number(user?.company_id));
                setCompanyName(company?.name || '');
            } catch (err) {
                console.error('Error loading receipt:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [invoiceNo]);

    if (loading) return <p style={{ textAlign: 'center', padding: '40px' }}>Loading receipt...</p>;
    if (!invoice) return <p style={{ textAlign: 'center', padding: '40px', color: '#e53e3e' }}>Receipt not found!</p>;

    const details = invoice.RmDetails || [];
    const createdAt = invoice.createdat ? new Date(invoice.createdat) : new Date();

    const money = (v) => Number(v || 0).toFixed(2);

    return (
        <div style={{ background: '#f1f5f9', minHeight: '100vh', padding: '20px 0' }}>
            {/* Print rules: only the receipt paper prints, at 80mm width */}
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #pos-receipt, #pos-receipt * { visibility: visible; }
                    #pos-receipt {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 80mm;
                        box-shadow: none !important;
                        margin: 0 !important;
                    }
                    @page { size: 80mm auto; margin: 2mm; }
                }
            `}</style>

            <div className="no-print" style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '16px' }}>
                <button
                    onClick={() => navigate('/pos/sales')}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                    <FaArrowLeft style={{ marginRight: '6px' }} />Back to Sales
                </button>
                <button
                    onClick={() => window.print()}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#2b6cb0', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
                >
                    <FaPrint style={{ marginRight: '6px' }} />Print Receipt
                </button>
            </div>

            <div
                id="pos-receipt"
                style={{
                    width: '302px', /* ~80mm at 96dpi */
                    margin: '0 auto',
                    background: '#fff',
                    padding: '14px 12px',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '12px',
                    color: '#000',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, textTransform: 'uppercase' }}>{companyName || 'RETAIL STORE'}</div>
                    <div style={{ fontSize: '11px', marginTop: '2px' }}>SALE RECEIPT</div>
                </div>

                <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '6px 0', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Invoice:</span><span style={{ fontWeight: 700 }}>{invoice.invoice_no}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Date:</span><span>{createdAt.toLocaleDateString()} {createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Customer:</span><span>{invoice.entity?.name || 'Walk-in Customer'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Cashier:</span><span>{invoice.createdby || '-'}</span>
                    </div>
                </div>

                {/* Lines */}
                <div style={{ display: 'flex', fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: '3px' }}>
                    <span style={{ flex: 2 }}>Item</span>
                    <span style={{ flex: 1, textAlign: 'right' }}>Qty</span>
                    <span style={{ flex: 1, textAlign: 'right' }}>Price</span>
                    <span style={{ flex: 1, textAlign: 'right' }}>Total</span>
                </div>
                {details.map((d, i) => {
                    const qty = Number(d.entered_qty ?? d.quantity) || 0;
                    const lineTotal = Number(d.total_price) || 0;
                    const price = qty > 0 ? lineTotal / qty : 0;
                    return (
                        <div key={i} style={{ padding: '4px 0', borderBottom: '1px dotted #999' }}>
                            <div>{d.rm_name}</div>
                            <div style={{ display: 'flex' }}>
                                <span style={{ flex: 2, fontSize: '10px', color: '#333' }}>
                                    {d.pack_uom_name || d.uom?.name || ''}
                                </span>
                                <span style={{ flex: 1, textAlign: 'right' }}>{qty}</span>
                                <span style={{ flex: 1, textAlign: 'right' }}>{money(price)}</span>
                                <span style={{ flex: 1, textAlign: 'right', fontWeight: 700 }}>{money(lineTotal)}</span>
                            </div>
                        </div>
                    );
                })}

                {/* Totals */}
                <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Sub Total:</span><span>{money(invoice.subtotal)}</span>
                    </div>
                    {Number(invoice.discount) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Discount:</span><span>-{money(invoice.discount)}</span>
                        </div>
                    )}
                    {invoice.is_taxable && Number(invoice.tax_amount) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Tax ({Number(invoice.tax_rate)}%):</span><span>{money(invoice.tax_amount)}</span>
                        </div>
                    )}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '14px',
                        borderTop: '1px dashed #000', marginTop: '4px', paddingTop: '4px'
                    }}>
                        <span>TOTAL:</span><span>{money(invoice.grand_total)}</span>
                    </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '12px', borderTop: '1px dashed #000', paddingTop: '8px', fontSize: '11px' }}>
                    <div>Thank you for shopping!</div>
                    <div style={{ marginTop: '2px' }}>{invoice.invoice_no}</div>
                </div>
            </div>
        </div>
    );
};

export default PosReceipt;
