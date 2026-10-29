import React, { useState, useEffect, useRef, useMemo } from 'react';
import NavigationBar from '../../Components/NavigationBar';
import Footer from '../../Components/Footer';
import { FaArrowLeft, FaBarcode, FaTrash, FaCashRegister, FaSearch } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import api from '../../../api';
import '../../Model.css';
import '../../Transactions.css';

// POS counter screen: barcode scan + product picker, instant save (auto-approve).
const PosSaleScreen = () => {
    const navigate = useNavigate();
    const barcodeRef = useRef(null);

    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [walkinId, setWalkinId] = useState(null);

    // Sellable POS items: rm + supplier + current stock + pack sizes
    const [stockItems, setStockItems] = useState([]);
    // POS product master: barcode + sale_price per rm_id
    const [posProducts, setPosProducts] = useState([]);

    const [rows, setRows] = useState([]);
    const [barcodeInput, setBarcodeInput] = useState('');
    const [searchText, setSearchText] = useState('');
    const [showPicker, setShowPicker] = useState(false);

    const [globalDiscount, setGlobalDiscount] = useState('');
    const [isTaxable, setIsTaxable] = useState(false);
    const [taxRate, setTaxRate] = useState(0);
    const [taxId, setTaxId] = useState(null);
    const [taxMode, setTaxMode] = useState('exclusive');
    const [saving, setSaving] = useState(false);

    const productByRm = useMemo(() => {
        const map = {};
        for (const p of posProducts) map[p.rm_id] = p;
        return map;
    }, [posProducts]);

    useEffect(() => {
        const load = async () => {
            try {
                const [walkinRes, custRes, stockRes, prodRes, taxRes] = await Promise.all([
                    api.get('/pos/walkin-customer'),
                    api.get('/entities/transactions'),
                    api.get('/rm-transactions/materials-with-suppliers', { params: { channel: 'pos' } }),
                    api.get('/pos/products', { params: { limit: 1000 } }),
                    api.get('/tax-master/latest/active').catch(() => null),
                ]);

                const onlyCustomers = (custRes.data || []).filter(e => e.type === 'customer');
                // Make sure the walk-in customer is present in the dropdown
                if (walkinRes.data?.id && !onlyCustomers.some(c => c.id === walkinRes.data.id)) {
                    onlyCustomers.unshift({ id: walkinRes.data.id, name: walkinRes.data.name });
                }
                setCustomers(onlyCustomers);
                setWalkinId(walkinRes.data?.id || null);
                setSelectedCustomer(walkinRes.data?.id ? String(walkinRes.data.id) : '');

                setStockItems(Array.isArray(stockRes.data) ? stockRes.data : []);
                setPosProducts(prodRes.data?.data || []);

                if (taxRes?.data?.id) {
                    setTaxId(taxRes.data.id);
                    setTaxRate(Number(taxRes.data.tax_rate) || 0);
                    setTaxMode(taxRes.data.taxtype || 'exclusive');
                }
            } catch (err) {
                console.error('Error loading POS sale data:', err);
                toast.error('Failed to load POS data.');
            }
        };
        load();
    }, []);

    // Keep the scanner input focused for continuous scanning
    useEffect(() => {
        barcodeRef.current?.focus();
    }, [rows.length]);

    /* ------------------- totals ------------------- */
    const subTotal = rows.reduce((sum, r) => sum + ((parseFloat(r.quantity) || 0) * (parseFloat(r.unitPrice) || 0)), 0);
    const discount = parseFloat(globalDiscount) || 0;
    const netValue = Math.max(0, subTotal - discount);
    let taxableAmount = netValue;
    let taxAmount = 0;
    let grandTotal = netValue;
    if (isTaxable && taxRate > 0) {
        const rate = taxRate / 100;
        if (taxMode === 'inclusive') {
            taxableAmount = netValue / (1 + rate);
            taxAmount = netValue - taxableAmount;
            grandTotal = netValue;
        } else {
            taxAmount = netValue * rate;
            grandTotal = netValue + taxAmount;
        }
    }

    /* ------------------- add / edit lines ------------------- */

    // Add a sellable stock item as a line (or +1 qty if already on the bill)
    const addItem = (item) => {
        const product = productByRm[item.rm_id];
        const salePrice = product?.sale_price != null ? Number(product.sale_price) : '';

        const existingIdx = rows.findIndex(r =>
            Number(r.rm_id) === Number(item.rm_id) &&
            Number(r.supplier_id) === Number(item.supplier_id)
        );

        if (existingIdx >= 0) {
            const updated = [...rows];
            const row = updated[existingIdx];
            const newQty = (parseFloat(row.quantity) || 0) + 1;
            if (newQty * (Number(row.factor) || 1) > Number(row.current_stock) + 1e-9) {
                toast.error(`Out of stock! Only ${row.current_stock} ${item.uom_name || 'units'} available.`);
                return;
            }
            row.quantity = newQty;
            row.total = (newQty * (parseFloat(row.unitPrice) || 0)).toFixed(2);
            setRows(updated);
            return;
        }

        if (Number(item.current_stock) < 1) {
            toast.error(`"${item.rm_name}" is out of stock.`);
            return;
        }

        setRows(prev => [...prev, {
            rm_id: item.rm_id,
            rm_name: item.rm_name,
            barcode: product?.barcode || '',
            quantity: 1,
            unitPrice: salePrice === '' ? '' : salePrice,
            total: salePrice === '' ? '0.00' : Number(salePrice).toFixed(2),
            uom_id: item.uom_id,
            uom_name: item.uom_name,
            supplier_id: item.supplier_id,
            current_stock: Number(item.current_stock) || 0,
            pack_sizes: item.pack_sizes || [],
            factor: 1,
            sale_price_base: salePrice === '' ? 0 : Number(salePrice),
        }]);
    };

    const handleBarcodeSubmit = (e) => {
        e.preventDefault();
        const code = barcodeInput.trim();
        setBarcodeInput('');
        if (!code) return;

        const product = posProducts.find(p => (p.barcode || '').trim() === code);
        if (!product) {
            toast.error(`No POS product found for barcode "${code}".`);
            return;
        }

        // Prefer a stock entry with available quantity
        const entries = stockItems.filter(s => Number(s.rm_id) === Number(product.rm_id));
        const entry = entries.find(s => Number(s.current_stock) > 0) || entries[0];
        if (!entry) {
            toast.error(`"${product.name}" has no stock. Purchase it first.`);
            return;
        }
        addItem(entry);
    };

    const pickerResults = useMemo(() => {
        const q = searchText.trim().toLowerCase();
        if (!q) return stockItems;
        return stockItems.filter(s => {
            const product = productByRm[s.rm_id];
            return (
                (s.rm_name || '').toLowerCase().includes(q) ||
                (product?.barcode || '').toLowerCase().includes(q)
            );
        });
    }, [searchText, stockItems, productByRm]);

    const handleRowChange = (index, field, value) => {
        const updated = [...rows];
        const row = updated[index];

        if (field === 'quantity') {
            const qty = parseFloat(value) || 0;
            const factor = Number(row.factor) || 1;
            if (qty * factor > Number(row.current_stock) + 1e-9) {
                const availableInUom = factor !== 1 ? ` (${(row.current_stock / factor).toFixed(2)} ${row.uom_name})` : '';
                toast.error(`Out of stock! Only ${row.current_stock} base units available${availableInUom}.`);
                return;
            }
        }

        row[field] = value;
        const qty = parseFloat(row.quantity) || 0;
        const price = parseFloat(row.unitPrice) || 0;
        row.total = (qty * price).toFixed(2);
        setRows(updated);
    };

    // UOM change: qty/price are re-interpreted in the new UOM; price auto-scales
    const handleUomChange = (index, uomId) => {
        const updated = [...rows];
        const row = updated[index];
        const pack = (row.pack_sizes || []).find(p => Number(p.uom_id) === Number(uomId));
        if (!pack) return;
        row.uom_id = pack.uom_id;
        row.uom_name = pack.uom_name;
        row.factor = Number(pack.factor_to_base) || 1;
        // Auto-fill price per selected UOM from the base sale price
        if (row.sale_price_base) {
            row.unitPrice = Number((row.sale_price_base * row.factor).toFixed(4));
        }
        const qty = parseFloat(row.quantity) || 0;
        row.total = (qty * (parseFloat(row.unitPrice) || 0)).toFixed(2);
        setRows(updated);
    };

    const deleteRow = (index) => setRows(rows.filter((_, i) => i !== index));

    /* ------------------- save (instant approve) ------------------- */
    const handleSave = async () => {
        if (!selectedCustomer) return toast.error('Please select a customer.');
        const validRows = rows.filter(r => r.rm_id && parseFloat(r.quantity) > 0 && parseFloat(r.unitPrice) > 0);
        if (validRows.length === 0) return toast.error('Add at least one item with quantity and price.');
        if (discount > subTotal) return toast.error('Discount cannot exceed the sub total.');

        const user = JSON.parse(localStorage.getItem('user'));
        const today = new Date().toISOString().split('T')[0];

        const payload = {
            entityid: selectedCustomer,
            grand_total: parseFloat(grandTotal.toFixed(2)),
            sub_total: parseFloat(subTotal.toFixed(2)),
            discount,
            taxable_amount: parseFloat(taxableAmount.toFixed(2)),
            tax_amount: parseFloat(taxAmount.toFixed(2)),
            is_taxable: isTaxable,
            tax_mode: taxMode,
            tax_rate: parseFloat(taxRate),
            tax_id: isTaxable ? taxId : null,
            type: 'sale',
            channel: 'pos',
            createdby: user?.username || 'guest',
            details: validRows.map(r => ({
                rm_id: Number(r.rm_id),
                rm_name: r.rm_name,
                quantity: parseFloat(r.quantity),
                unit_price: parseFloat(r.unitPrice),
                total_price: parseFloat(r.total),
                uom_id: r.uom_id,
                entity_supplier_id: Number(r.supplier_id),
                original_supplier_id: Number(r.supplier_id),
                supplier_id: Number(r.supplier_id),
                date: today,
                entity_customer_id: selectedCustomer,
            })),
        };

        setSaving(true);
        try {
            const res = await api.post('/pos/sales', payload);
            const invoiceNo = res.data?.invoice_no;
            const result = await Swal.fire({
                title: 'Sale Completed!',
                text: `Invoice ${invoiceNo} approved — stock and ledger updated.`,
                icon: 'success',
                showCancelButton: true,
                confirmButtonColor: '#2b6cb0',
                confirmButtonText: 'Print Receipt',
                cancelButtonText: 'New Sale',
            });
            if (result.isConfirmed && invoiceNo) {
                navigate(`/pos/receipt/${invoiceNo}`);
            } else {
                // Reset for the next customer
                setRows([]);
                setGlobalDiscount('');
                setSelectedCustomer(walkinId ? String(walkinId) : '');
                // Refresh stock figures
                const stockRes = await api.get('/rm-transactions/materials-with-suppliers', { params: { channel: 'pos' } });
                setStockItems(Array.isArray(stockRes.data) ? stockRes.data : []);
                barcodeRef.current?.focus();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error saving POS sale.');
        } finally {
            setSaving(false);
        }
    };

    const gridCols = '2fr 1fr 0.8fr 1fr 1fr 0.5fr';

    return (
        <div className="rm-page-wrapper">
            <NavigationBar />
            <div className="rm-content-container">
                <div className="rm-header-section">
                    <button className="back-btn" onClick={() => navigate('/pos/sales')}>
                        <FaArrowLeft />
                    </button>
                    <h2 className="form-title"><FaCashRegister style={{ marginRight: '8px' }} />POS Sale</h2>
                </div>

                <div className="rm-main-card">
                    {/* Top bar: customer + barcode + picker */}
                    <div className="info-grid">
                        <div className="info-item">
                            <label>Customer</label>
                            <select
                                className="rm-input-field"
                                value={selectedCustomer}
                                onChange={(e) => setSelectedCustomer(e.target.value)}
                            >
                                <option value="">Select Customer</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}{c.id === walkinId ? ' (default)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="info-item">
                            <label><FaBarcode /> Scan Barcode (Enter to add)</label>
                            <form onSubmit={handleBarcodeSubmit}>
                                <input
                                    ref={barcodeRef}
                                    type="text"
                                    className="rm-input-field"
                                    placeholder="Scan or type barcode, press Enter"
                                    value={barcodeInput}
                                    onChange={(e) => setBarcodeInput(e.target.value)}
                                    autoFocus
                                />
                            </form>
                        </div>
                        <div className="info-item" style={{ position: 'relative' }}>
                            <label><FaSearch /> Find Product</label>
                            <input
                                type="text"
                                className="rm-input-field"
                                placeholder="Search by name or barcode..."
                                value={searchText}
                                onChange={(e) => { setSearchText(e.target.value); setShowPicker(true); }}
                                onFocus={() => setShowPicker(true)}
                                onBlur={() => setTimeout(() => setShowPicker(false), 200)}
                            />
                            {showPicker && (
                                <div style={{
                                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30,
                                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
                                    maxHeight: '260px', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                                }}>
                                    {pickerResults.length === 0 ? (
                                        <div style={{ padding: '12px', color: '#94a3b8', fontSize: '0.85rem' }}>No products found</div>
                                    ) : pickerResults.map((s, i) => {
                                        const product = productByRm[s.rm_id];
                                        return (
                                            <div
                                                key={`${s.rm_id}-${s.supplier_id}-${i}`}
                                                onMouseDown={() => { addItem(s); setSearchText(''); setShowPicker(false); }}
                                                style={{
                                                    padding: '10px 12px', cursor: 'pointer', display: 'flex',
                                                    justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9'
                                                }}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.rm_name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>{product?.barcode || ''}</div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontWeight: 600, color: '#16a34a', fontSize: '0.9rem' }}>
                                                        {product?.sale_price != null ? Number(product.sale_price).toFixed(2) : '-'}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                        Stock: {Number(s.current_stock).toLocaleString()} {s.uom_name}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bill lines */}
                    <div className="items-table-header" style={{ gridTemplateColumns: gridCols }}>
                        <span>Product</span>
                        <span>UOM</span>
                        <span>Qty</span>
                        <span>Price</span>
                        <span>Total</span>
                        <span></span>
                    </div>

                    {rows.length === 0 && (
                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>
                            <FaBarcode size={32} style={{ marginBottom: '10px' }} />
                            <p>Scan a barcode or search a product to start the bill.</p>
                        </div>
                    )}

                    {rows.map((row, index) => (
                        <div className="item-row" key={index} style={{ gridTemplateColumns: gridCols }}>
                            <div>
                                <div style={{ fontWeight: 600 }}>{row.rm_name}</div>
                                <small style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{row.barcode}</small>
                            </div>

                            {Array.isArray(row.pack_sizes) && row.pack_sizes.length > 1 ? (
                                <select
                                    className="rm-input-field"
                                    value={row.uom_id}
                                    onChange={(e) => handleUomChange(index, e.target.value)}
                                >
                                    {row.pack_sizes.map(p => (
                                        <option key={p.uom_id} value={p.uom_id}>
                                            {p.uom_name}{!p.is_base ? ` (=${Number(p.factor_to_base)} base)` : ''}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input type="text" className="rm-input-field readonly-input" value={row.uom_name} readOnly />
                            )}

                            <input
                                type="number"
                                min="0"
                                step="any"
                                className="rm-input-field"
                                value={row.quantity}
                                onChange={(e) => handleRowChange(index, 'quantity', e.target.value)}
                            />
                            <input
                                type="number"
                                min="0"
                                step="any"
                                className="rm-input-field"
                                value={row.unitPrice}
                                onChange={(e) => handleRowChange(index, 'unitPrice', e.target.value)}
                            />
                            <input type="text" className="rm-input-field readonly-input" value={row.total} readOnly />
                            <button type="button" className="quick-add-btn" style={{ color: '#e53e3e' }} onClick={() => deleteRow(index)}>
                                <FaTrash />
                            </button>
                        </div>
                    ))}

                    {/* Totals */}
                    <div className="summary-container">
                        <div className="summary-row">
                            <label>Sub Total:</label>
                            <span>{subTotal.toFixed(2)}</span>
                        </div>
                        <div className="summary-row">
                            <label>Discount:</label>
                            <input
                                type="number"
                                min="0"
                                className="rm-input-field"
                                style={{ width: '120px' }}
                                value={globalDiscount}
                                onChange={(e) => setGlobalDiscount(e.target.value)}
                            />
                        </div>
                        <div className="summary-row">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={isTaxable}
                                    onChange={(e) => setIsTaxable(e.target.checked)}
                                    style={{ marginRight: '6px' }}
                                />
                                Apply Tax ({taxRate}% {taxMode})
                            </label>
                            {isTaxable && <span>{taxAmount.toFixed(2)}</span>}
                        </div>
                        <div className="summary-row grand-total-box">
                            <b>Grand Total:</b>
                            <b>{grandTotal.toFixed(2)}</b>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="save-btn"
                        disabled={saving || rows.length === 0}
                        onClick={handleSave}
                    >
                        {saving ? 'Processing...' : `COMPLETE SALE — ${grandTotal.toFixed(2)}`}
                    </button>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default PosSaleScreen;
