import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaPlus, FaTrash } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import Footer from '../Components/Footer';
import { toast } from 'react-toastify';
import api from "../../api";
import '../Transactions.css';
import DeviceLineFields from '../Components/DeviceLineFields';
import ModelImeiScanBtn from '../Components/ModelImeiScanBtn';
import InvoiceContactBlock from '../Components/InvoiceContactBlock';
import { EMPTY_DEVICE_FIELDS, EMPTY_CONTACT_FIELDS, parseContactImages, serializeDeviceFields } from '../constants/mobileDeviceOptions';

const emptyRow = () => ({
    rm_id: "",
    rm_name: "",
    // Mobile shop: 1 phone per row (IMEI unique) — Qty UI hidden; set "" to re-enable later
    quantity: "1",
    unitPrice: "",
    total: "",
    uom_id: "",
    uom_name: "",
    stock: 0,
    pack_sizes: [],
    factor: 1,
    ...EMPTY_DEVICE_FIELDS,
});

const normalizePackSizes = (material) =>
    (material?.pack_sizes || []).map((p) => ({
        uom_id: p.uom_id,
        uom_name: p.uom_name || p.uom?.name || "",
        factor_to_base: Number(p.factor_to_base) || 1,
        is_base: !!p.is_base,
    }));

const RM_ReturnForm = ({ channel = null }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const queryParams = new URLSearchParams(location.search);
    const invoiceType = queryParams.get('invoiceType');
    const editId = queryParams.get('editId');
    const isEditMode = !!editId;

    const channelLabel = channel === 'retail' ? 'Retail' : channel === 'wholesale' ? 'Wholesale' : channel === 'pos' ? 'POS' : null;
    const listPath = channel ? `/${channel}/purchase-returns` : '/rm-return';

    const [rows, setRows] = useState([emptyRow()]);
    const [materials, setMaterials] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState("");
    const [contact, setContact] = useState({ ...EMPTY_CONTACT_FIELDS });
    const [date, setDate] = useState("");
    const [invoiceNo, setInvoiceNo] = useState("");
    const [subTotal, setSubTotal] = useState(0);
    const [taxableAmount, setTaxableAmount] = useState(0);
    const [taxAmount, setTaxAmount] = useState(0);
    const [isTaxable, setIsTaxable] = useState(() => invoiceType !== 'nonTaxable');
    const [taxMode, setTaxMode] = useState('exclusive');
    const [taxRate, setTaxRate] = useState(0);
    const [taxId, setTaxId] = useState(null);
    const [globalDiscount, setGlobalDiscount] = useState(0);
    const [grandTotal, setGrandTotal] = useState(0);

    useEffect(() => {
        const loadSuppliers = async () => {
            try {
                const res = await api.get("/rm-transactions/eligible-suppliers", { params: channel ? { channel } : {} });
                let list = Array.isArray(res.data) ? res.data : [];

                if (!isEditMode) {
                    try {
                        const walkinRes = await api.get("/entities/walkin-supplier");
                        if (walkinRes.data?.id) {
                            if (!list.some((s) => Number(s.id) === Number(walkinRes.data.id))) {
                                list = [
                                    { id: walkinRes.data.id, name: walkinRes.data.name, type: "supplier" },
                                    ...list,
                                ];
                            }
                            setSelectedSupplier(String(walkinRes.data.id));
                        }
                    } catch (walkinErr) {
                        console.error("Error fetching walk-in supplier:", walkinErr);
                    }
                }

                setSuppliers(list);
            } catch (err) {
                console.error("Error fetching eligible suppliers:", err);
            }
        };
        loadSuppliers();
    }, [channel, isEditMode]);

    useEffect(() => {
        if (!selectedSupplier) {
            setMaterials([]);
            if (!isEditMode) {
                setTaxId(null);
                setTaxRate(0);
                setTaxMode('exclusive');
                updateGrandTotal(rows, isTaxable, 'exclusive', 0, globalDiscount);
            }
            return;
        }

        api.get(`/rm-transactions/materials/${selectedSupplier}`, { params: channel ? { channel } : {} })
            .then((res) => {
                if (Array.isArray(res.data)) setMaterials(res.data);
                else setMaterials([]);
            })
            .catch((err) => {
                console.error("Error fetching supplier materials:", err);
                setMaterials([]);
            });

        if (!isEditMode) {
            api.get(`/rm-transactions/supplier-last-tax/${selectedSupplier}`)
                .then((res) => {
                    setTaxId(res.data.tax_id || null);
                    setTaxRate(Number(res.data.tax_rate) || 0);
                    setTaxMode(res.data.tax_mode || 'exclusive');
                    updateGrandTotal(rows, isTaxable, res.data.tax_mode || 'exclusive', Number(res.data.tax_rate) || 0, globalDiscount);
                })
                .catch((err) => {
                    console.error("Error fetching supplier tax rate:", err);
                    setTaxId(null);
                    setTaxRate(0);
                    setTaxMode('exclusive');
                    updateGrandTotal(rows, isTaxable, 'exclusive', 0, globalDiscount);
                });
        }
    }, [selectedSupplier, isEditMode]);

    useEffect(() => {
        if (isEditMode) return;
        api.get("/rm-transactions/rm-invoice", { params: { type: "Return" } })
            .then(res => setInvoiceNo(res.data.invoice_no))
            .catch(err => console.error("Error fetching invoice number:", err));
    }, [isEditMode]);

    useEffect(() => {
        const loadDraftDataForEdit = async () => {
            if (!isEditMode) return;

            try {
                const res = await api.get(`/rm-transactions/edit-preview/${editId}`);
                const { master, details, invoiceDate } = res.data;

                setInvoiceNo(master.invoice_no);
                setSelectedSupplier(master.entityid);
                setContact({
                    contact_name: master.contact_name || "",
                    contact_phone: master.contact_phone || "",
                    contact_cnic: master.contact_cnic || "",
                    contact_image: parseContactImages(master.contact_image),
                    biometric_id: master.biometric_id || null,
                    biometric_verified_at: master.biometric_verified_at || null,
                });

                if (invoiceDate) {
                    setDate(new Date(invoiceDate).toISOString().split('T')[0]);
                }

                setIsTaxable(master.is_taxable);
                setTaxMode(master.tax_mode || 'exclusive');
                setTaxRate(Number(master.tax_rate) || 0);
                setTaxId(master.tax_id);
                setGlobalDiscount(master.discount || 0);

                if (Array.isArray(details) && details.length > 0) {
                    const mappedRows = await Promise.all(details.map(async (d) => {
                        // Prefer entered (pack) qty/price so edit restores what user typed
                        const qty = Math.abs(parseFloat(d.entered_qty ?? d.quantity) || 0);
                        const price = parseFloat(d.entered_unit_price ?? d.unit_price) || 0;

                        let itemStock = 0;
                        try {
                            const stockRes = await api.get(`/rm-transactions/stock/${d.rm_id}/${master.entityid}`);
                            itemStock = stockRes.data.stock || 0;
                        } catch (e) {
                            console.error("Error fetching stock during edit mapping:", e);
                        }

                        return {
                            ...emptyRow(),
                            rm_id: d.rm_id,
                            rm_name: d.rm_name || "",
                            quantity: qty,
                            unitPrice: price,
                            total: (qty * price).toFixed(2),
                            uom_id: d.uom_id,
                            uom_name: d.uom_name || "",
                            stock: itemStock,
                            pack_sizes: [],
                            factor: 1,
                            imei1: d.imei1 || "",
                            imei2: d.imei2 || "",
                            ram: d.ram || "",
                            rom: d.rom || "",
                            color: d.color || "",
                            condition: d.condition || "",
                            condition_percent: d.condition_percent || "",
                        };
                    }));
                    setRows(mappedRows);
                    updateGrandTotal(mappedRows, master.is_taxable, master.tax_mode || 'exclusive', Number(master.tax_rate) || 0, master.discount || 0);
                }
            } catch (err) {
                console.error("Error loading return draft data:", err);
                toast.error("Failed to load return transaction draft details.");
                navigate(listPath);
            }
        };

        loadDraftDataForEdit();
    }, [editId, isEditMode]);

    // Attach pack_sizes / factor once materials load (create + edit).
    // Depends on rows so edit-mode mapping that lands after materials still gets enriched.
    useEffect(() => {
        if (materials.length === 0 || rows.length === 0) return;

        let changed = false;
        const updatedRows = rows.map((row) => {
            if (!row.rm_id) return row;
            const found = materials.find((m) => Number(m.rm_id) === Number(row.rm_id));
            if (!found) return row;

            const packSizes = normalizePackSizes(found);
            const uomId = row.uom_id || found.uom_id || found.uom?.id || "";
            const selectedPack = packSizes.find((p) => Number(p.uom_id) === Number(uomId));
            const next = {
                ...row,
                uom_id: uomId,
                uom_name: selectedPack?.uom_name || row.uom_name || found.uom_name || found.uom?.uom_name || found.uom?.name || "",
                pack_sizes: packSizes,
                factor: Number(selectedPack?.factor_to_base) || 1,
            };

            if (
                String(next.uom_id) !== String(row.uom_id) ||
                next.uom_name !== row.uom_name ||
                Number(next.factor) !== Number(row.factor) ||
                JSON.stringify(next.pack_sizes) !== JSON.stringify(row.pack_sizes || [])
            ) {
                changed = true;
            }
            return next;
        });

        if (changed) setRows(updatedRows);
    }, [materials, rows]);

    const fetchStock = async (rm_id, index, currentRows = rows) => {
        if (!selectedSupplier) return currentRows;
        try {
            const res = await api.get(`/rm-transactions/stock/${rm_id}/${selectedSupplier}`);
            const updatedRows = [...currentRows];
            updatedRows[index] = { ...updatedRows[index], stock: res.data.stock || 0 };
            setRows(updatedRows);
            return updatedRows;
        } catch (err) {
            console.error("Error fetching stock:", err);
            return currentRows;
        }
    };

    const getBaseQty = (row) => {
        const qty = parseFloat(row.quantity) || 0;
        const factor = Number(row.factor) || 1;
        return qty * factor;
    };

    const handleChange = (index, field, value) => {
        const updatedRows = [...rows];
        updatedRows[index] = { ...updatedRows[index], [field]: value };

        if (field === "quantity" || field === "unitPrice") {
            const qty = parseFloat(updatedRows[index].quantity) || 0;
            const price = parseFloat(updatedRows[index].unitPrice) || 0;
            const baseQty = getBaseQty(updatedRows[index]);
            const available = Number(updatedRows[index].stock) || 0;

            if (field === "quantity" && baseQty > available + 1e-9) {
                toast.error(`Only ${available} base units available!`);
                updatedRows[index].quantity = "";
                updatedRows[index].total = "";
            } else {
                updatedRows[index].total = (qty * price).toFixed(2);
            }
        }
        setRows(updatedRows);
        updateGrandTotal(updatedRows, isTaxable, taxMode, taxRate);
    };

    const handleUomSelection = (index, uomId) => {
        const updatedRows = [...rows];
        const row = { ...updatedRows[index] };
        const pack = (row.pack_sizes || []).find((p) => Number(p.uom_id) === Number(uomId));
        if (!pack) return;

        row.uom_id = pack.uom_id;
        row.uom_name = pack.uom_name;
        row.factor = Number(pack.factor_to_base) || 1;

        const qty = parseFloat(row.quantity) || 0;
        const price = parseFloat(row.unitPrice) || 0;
        const baseQty = qty * row.factor;
        const available = Number(row.stock) || 0;

        if (qty > 0 && baseQty > available + 1e-9) {
            toast.error(`Only ${available} base units available!`);
            row.quantity = "";
            row.total = "";
        } else if (qty > 0) {
            row.total = (qty * price).toFixed(2);
        }

        updatedRows[index] = row;
        setRows(updatedRows);
        updateGrandTotal(updatedRows, isTaxable, taxMode, taxRate);
    };

    const handleMaterialSelect = async (index, rmIdValue) => {
        const selected = materials.find((m) => Number(m.rm_id) === parseInt(rmIdValue, 10));
        const packSizes = normalizePackSizes(selected);
        const defaultUomId = selected?.uom_id ?? selected?.uom?.id ?? packSizes[0]?.uom_id ?? "";
        const selectedPack = packSizes.find((p) => Number(p.uom_id) === Number(defaultUomId)) || packSizes[0];

        let updatedRows = [...rows];
        updatedRows[index] = {
            ...updatedRows[index],
            rm_id: rmIdValue,
            rm_name: selected?.rm_name || "",
            uom_id: selectedPack?.uom_id || "",
            uom_name: selectedPack?.uom_name || selected?.uom_name || "",
            pack_sizes: packSizes,
            factor: Number(selectedPack?.factor_to_base) || 1,
            quantity: "1",
            unitPrice: "",
            total: "",
        };
        setRows(updatedRows);
        updateGrandTotal(updatedRows, isTaxable, taxMode, taxRate);

        const id = parseInt(rmIdValue, 10);
        if (!isNaN(id)) await fetchStock(id, index, updatedRows);
    };

    /** Scan IMEI → auto-select in-stock phone for this supplier (purchase return) */
    const handleImeiModelScan = async (index, imei) => {
        if (!selectedSupplier) {
            return toast.error("Select a supplier first, then scan IMEI.");
        }
        const clean = String(imei || "").trim();
        if (!clean) return;
        if (rows.some((r, i) => i !== index && String(r.imei1 || "").trim() === clean)) {
            return toast.error("This IMEI is already selected on another line.");
        }
        try {
            const res = await api.get("/rm-transactions/phone-by-imei", {
                params: {
                    imei: clean,
                    mode: "purchaseReturn",
                    supplier_id: selectedSupplier,
                },
            });
            const phone = res.data;
            const matchedMat = materials.find((m) => Number(m.rm_id) === Number(phone.rm_id));
            const packSizes = normalizePackSizes(matchedMat);
            const prevPrice = rows[index]?.unitPrice || "";
            const costPrice = prevPrice || String(phone.cost || "");
            const priceNum = parseFloat(costPrice) || 0;
            let updatedRows = [...rows];
            updatedRows[index] = {
                ...emptyRow(),
                rm_id: phone.rm_id,
                rm_name: phone.rm_name || matchedMat?.rm_name || "",
                uom_id: phone.uom_id || packSizes[0]?.uom_id || "",
                uom_name: phone.uom_name || packSizes[0]?.uom_name || "",
                pack_sizes: packSizes,
                factor: 1,
                quantity: "1",
                unitPrice: costPrice,
                total: priceNum > 0 ? priceNum.toFixed(2) : "",
                stock: matchedMat ? Number(matchedMat.current_stock || 0) : 1,
                imei1: phone.imei1 || clean,
                imei2: phone.imei2 || "",
                ram: phone.ram || "",
                rom: phone.rom || "",
                color: phone.color || "",
                condition: phone.condition || "",
                condition_percent: phone.condition_percent || "",
            };
            setRows(updatedRows);
            updateGrandTotal(updatedRows, isTaxable, taxMode, taxRate);
            if (phone.rm_id) await fetchStock(phone.rm_id, index, updatedRows);
            toast.success(`Selected ${phone.rm_name || "phone"} — IMEI ${phone.imei1 || clean}`);
        } catch (err) {
            toast.error(err.response?.data?.message || "IMEI not found in this supplier's stock.");
        }
    };

    const updateGrandTotal = (currentRows, currentIsTaxable = isTaxable, currentTaxMode = taxMode, currentTaxRate = taxRate, discountValue = globalDiscount) => {
        const currentSubTotal = currentRows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
        const discount = parseFloat(discountValue) || 0;
        const netValue = Math.max(0, currentSubTotal - discount);

        let calculatedTaxable = netValue;
        let calculatedTaxAmount = 0;
        let calculatedGrand = netValue;

        if (currentIsTaxable && (parseFloat(currentTaxRate) || 0) > 0) {
            const rate = parseFloat(currentTaxRate) / 100;
            if (currentTaxMode === 'inclusive') {
                calculatedTaxable = netValue / (1 + rate);
                calculatedTaxAmount = netValue - calculatedTaxable;
                calculatedGrand = netValue;
            } else {
                calculatedTaxable = netValue;
                calculatedTaxAmount = calculatedTaxable * rate;
                calculatedGrand = calculatedTaxable + calculatedTaxAmount;
            }
        }

        setSubTotal(currentSubTotal.toFixed(2));
        setTaxableAmount(calculatedTaxable.toFixed(2));
        setTaxAmount(calculatedTaxAmount.toFixed(2));
        setGrandTotal(Math.max(0, calculatedGrand).toFixed(2));
    };

    const addRow = () => {
        setRows([...rows, emptyRow()]);
    };

    const deleteRow = (index) => {
        const updatedRows = rows.filter((_, i) => i !== index);
        setRows(updatedRows);
        updateGrandTotal(updatedRows);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedSupplier) return toast.error("Please select a supplier.");
        if (!date) return toast.error("Please select a return date.");

        const validRows = rows.filter(r => r.rm_id && parseFloat(r.quantity) > 0);
        if (validRows.length === 0) return toast.error("Please add at least one material item.");
        const missingImei = validRows.findIndex((r) => !String(r.imei1 || "").trim());
        if (missingImei >= 0) return toast.error(`IMEI 1 is required on line ${missingImei + 1}`);

        for (const r of validRows) {
            const baseQty = (parseFloat(r.quantity) || 0) * (Number(r.factor) || 1);
            if (baseQty > (Number(r.stock) || 0) + 1e-9) {
                return toast.error(`${r.rm_name}: return qty exceeds available stock (${r.stock} base units).`);
            }
        }

        const user = JSON.parse(localStorage.getItem("user"));
        const returnData = {
            entityid: selectedSupplier,
            grand_total: parseFloat(grandTotal),
            sub_total: parseFloat(subTotal),
            taxable_amount: parseFloat(taxableAmount),
            tax_amount: parseFloat(taxAmount),
            is_taxable: isTaxable,
            tax_mode: taxMode,
            tax_rate: parseFloat(taxRate),
            tax_id: taxId,
            type: "PurchaseReturn",
            channel,
            createdby: user ? user.username : "guest",
            invoice_no: invoiceNo,
            ...contact,
            details: validRows.map(r => ({
                rm_id: r.rm_id,
                rm_name: r.rm_name,
                quantity: parseFloat(r.quantity),
                unit_price: r.unitPrice,
                total_price: r.total,
                uom_id: r.uom_id,
                date: date,
                ...serializeDeviceFields(r),
            }))
        };

        try {
            if (isEditMode) {
                await api.put(`/rm-transactions/${editId}`, returnData);
                toast.success("Purchase Return Draft Updated Successfully");
            } else {
                await api.post("/rm-transactions", returnData);
                toast.success("Purchase Return Transaction Successful");
            }
            navigate(listPath);
        } catch (err) {
            toast.error(err.response?.data?.message || "Error saving return transaction data!");
        }
    };

    return (
        <div className="rm-page-wrapper">
            <NavigationBar />

            <div className="rm-content-container">
                <div className="rm-header-section">
                    <button type="button" className="back-btn erp-back-btn" onClick={() => navigate(listPath)}>
                        <FaArrowLeft />
                    </button>
                    <h2 className="form-title erp-page-title">{isEditMode ? `Modify ${channelLabel ? channelLabel + ' ' : ''}Return Draft (${invoiceNo})` : (channelLabel ? `${channelLabel} Purchase Return` : "Purchase Return")}</h2>
                </div>

                <div className="rm-main-card">
                    <div className="info-grid">
                        <div className="info-item">
                            <label>Invoice No</label>
                            <input type="text" value={invoiceNo} readOnly className="rm-input-field readonly-input" style={{backgroundColor: '#e2e8f0'}} />
                        </div>
                        <div className="info-item">
                            <label>Select Supplier</label>
                            <select
                                className="rm-input-field"
                                value={selectedSupplier}
                                onChange={(e) => setSelectedSupplier(e.target.value)}
                            >
                                <option value="">Select Supplier</option>
                                {suppliers.map((ent) => (
                                    <option key={ent.id} value={ent.id}>{ent.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="info-item">
                            <label>Return Date</label>
                            <input
                                type="date"
                                className="rm-input-field"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="rm-items-scroll">
                        <div className="items-table-header">
                            <span>Model Name</span>
                            <span>Brand</span>
                            {/* <span>Quantity</span> */}
                            <span>Unit Price</span>
                            {/* <span>Total Price</span> */}
                            <span>Action</span>
                        </div>

                        {rows.map((row, index) => (
                            <div className="item-row" key={index}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                                    <select
                                        className="rm-input-field"
                                        value={row.rm_id}
                                        onChange={(e) => handleMaterialSelect(index, e.target.value)}
                                        style={{ flex: 1, minWidth: 0 }}
                                    >
                                        <option value="">Select Model Name</option>
                                        {Array.isArray(materials) && materials.map((m) => (
                                            <option key={m.rm_id} value={m.rm_id}>{m.rm_name}</option>
                                        ))}
                                    </select>
                                    <ModelImeiScanBtn
                                        disabled={!selectedSupplier}
                                        onScanned={(imei) => handleImeiModelScan(index, imei)}
                                        title="Scan IMEI — auto select phone to return"
                                    />
                                    </div>
                                    <small style={{ marginTop: '4px', fontSize: '11px', fontWeight: 'bold' }} className="text-success">
                                        Available: {row.stock} base units
                                    </small>
                                </div>

                                {Array.isArray(row.pack_sizes) && row.pack_sizes.length > 1 ? (
                                    <select
                                        className="rm-input-field"
                                        value={row.uom_id}
                                        onChange={(e) => handleUomSelection(index, e.target.value)}
                                    >
                                        {row.pack_sizes.map((p) => (
                                            <option key={p.uom_id} value={p.uom_id}>
                                                {p.uom_name}{!p.is_base ? ` (=${Number(p.factor_to_base)} base)` : ''}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input type="text" className="rm-input-field readonly-input" placeholder="Brand" value={row.uom_name || ""} readOnly />
                                )}

                                {/* Qty hidden — each row = 1 phone (qty defaults to 1)
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <input
                                        type="number"
                                        className="rm-input-field"
                                        placeholder="Qty"
                                        value={row.quantity}
                                        onChange={(e) => handleChange(index, "quantity", e.target.value)}
                                    />
                                    {Number(row.factor) !== 1 && parseFloat(row.quantity) > 0 && (
                                        <small style={{ fontSize: '11px', color: '#3182ce', paddingLeft: '4px' }}>
                                            = {(parseFloat(row.quantity) * Number(row.factor)).toFixed(2)} base units
                                        </small>
                                    )}
                                </div>
                                */}

                                <input
                                    type="number"
                                    className="rm-input-field"
                                    placeholder="Unit Price"
                                    value={row.unitPrice}
                                    onChange={(e) => handleChange(index, "unitPrice", e.target.value)}
                                />

                                {/* <input type="text" className="rm-input-field readonly-input" value={row.total} readOnly placeholder='Total Price'/> */}

                                <div className="erp-row-actions">
                                    <button type="button" className="quick-add-btn" style={{ color: '#3182ce' }} onClick={addRow}>
                                        <FaPlus />
                                    </button>
                                    {rows.length > 1 && (
                                        <button type="button" className="quick-add-btn" style={{ color: '#e53e3e' }} onClick={() => deleteRow(index)}>
                                            <FaTrash />
                                        </button>
                                    )}
                                </div>
                                <DeviceLineFields row={row} index={index} onChange={handleChange} />
                            </div>
                        ))}
                        </div>

                        <InvoiceContactBlock contact={contact} setContact={setContact} />

                        <div className="summary-container">
                            <div className="summary-row">
                                <label>Sub Total:</label>
                                <span>{subTotal}</span>
                            </div>
                            {isTaxable && (
                                <>
                                    <div className="summary-row">
                                        <label>Tax Rate (%)</label>
                                        <input
                                            type="number"
                                            className="rm-input-field readonly-input"
                                            value={taxRate}
                                            readOnly
                                            style={{ width: '120px' }}
                                        />
                                    </div>
                                    <div className="summary-row">
                                        <label>Taxable Amount:</label>
                                        <span>{taxableAmount}</span>
                                    </div>
                                    <div className="summary-row">
                                        <label>Tax Amount:</label>
                                        <span>{taxAmount}</span>
                                    </div>
                                </>
                            )}
                            <div className="summary-row grand-total-box">
                                <b>Grand Total:</b>
                                <b>{grandTotal}</b>
                            </div>
                        </div>

                        <div className="erp-form-actions">
                            <button type="submit" className="save-btn">
                                {isEditMode ? "Update Return Draft" : "Save"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default RM_ReturnForm;
