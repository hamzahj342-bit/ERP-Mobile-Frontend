import React, { useState, useEffect, useCallback } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaPlus, FaTrash } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import Footer from '../Components/Footer';
import { toast } from 'react-toastify';
import api from '../../api';
import Select from 'react-select';
import '../Model.css';
import '../Transactions.css';
import DeviceLineFields from '../Components/DeviceLineFields';
import InvoiceContactBlock from '../Components/InvoiceContactBlock';
import { EMPTY_DEVICE_FIELDS, EMPTY_CONTACT_FIELDS, parseContactImages, serializeDeviceFields } from '../constants/mobileDeviceOptions';

const emptyPurchaseRow = () => ({
    rm_id: "",
    rm_name: "",
    // Mobile shop: 1 phone per row (IMEI unique) — Qty UI hidden; set "1" to re-enable later
    quantity: "1",
    unitPrice: "",
    total: "",
    uom_id: "",
    uom_name: "",
    pack_sizes: [],
    factor: 1,
    ...EMPTY_DEVICE_FIELDS,
});

const RM_PurchaseForm = ({ channel = null }) => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const queryParams = new URLSearchParams(location.search);
    const invoiceType = queryParams.get('invoiceType');
    const editId = queryParams.get('editId'); 
    const isEditMode = !!editId;

    const channelLabel = channel === 'retail' ? 'Retail' : channel === 'wholesale' ? 'Wholesale' : channel === 'pos' ? 'POS' : null;
    const listPath = channel ? `/${channel}/purchases` : '/rm-purchase';
    const isPos = channel === 'pos';
    // POS purchase rows carry a Sale Price column (updates the product's selling price)
    // Qty + Total columns hidden (1 unit/phone per line)
    const gridColumns = isPos ? '2.5fr 1fr 1fr 1fr 0.5fr' : undefined;

    const [rows, setRows] = useState([emptyPurchaseRow()]);
    const [materials, setMaterials] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [contact, setContact] = useState({ ...EMPTY_CONTACT_FIELDS });

    const [selectedSupplier, setSelectedSupplier] = useState("");
    const [invoiceNo, setInvoiceNo] = useState("");
    const [date, setDate] = useState("");
    const [subTotal, setSubTotal] = useState(0);
    const [globalDiscount, setGlobalDiscount] = useState("");
    const [deliveryCharges, setDeliveryCharges] = useState("");
    const [taxableAmount, setTaxableAmount] = useState(0);
    const [taxAmount, setTaxAmount] = useState(0);
    const [isTaxable, setIsTaxable] = useState(() => invoiceType !== 'nonTaxable');
    const [taxMode, setTaxMode] = useState('exclusive'); 
    const [taxRate, setTaxRate] = useState(0);
    const [taxId, setTaxId] = useState(null);
    const [grandTotal, setGrandTotal] = useState(0);
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [showMaterialModal, setShowMaterialModal] = useState(false);
    const [uoms, setUoms] = useState([]);
    const [sourceDocuments, setSourceDocuments] = useState([]);
    const [selectedSourceDoc, setSelectedSourceDoc] = useState("");
    const [originalSourceItems, setOriginalSourceItems] = useState([]);
    // --- State Controlled Modal Variables for flawless UI Sync ---
const [newMaterialName, setNewMaterialName] = useState("");
const [newMaterialUom, setNewMaterialUom] = useState("");
const [showBrandModal, setShowBrandModal] = useState(false);
const [newBrandName, setNewBrandName] = useState("");
const [isAddingBrand, setIsAddingBrand] = useState(false);

    const supplierOptions = suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }));
    const materialOptions = materials.map((material) => ({
        value: material.rm_id,
        label: material.name || material.rm_name || "Model Name",
    }));

    // Normalize pack sizes coming from /add-materials (association shape)
    const normalizePackSizes = (material) =>
        (material?.pack_sizes || []).map(p => ({
            uom_id: p.uom_id,
            uom_name: p.uom?.name || p.uom_name || "",
            factor_to_base: Number(p.factor_to_base) || 1,
            is_base: !!p.is_base,
        }));

    const getMaterialMeta = (material, fallbackDetail = {}) => {
        const packSizes = normalizePackSizes(material);
        // Prefer source-doc / detail UOM (pack) when present, else material base
        const preferredUomId = fallbackDetail?.uom_id ?? material?.uom_id ?? material?.uom?.id ?? "";
        const selectedPack =
            packSizes.find((p) => Number(p.uom_id) === Number(preferredUomId)) ||
            packSizes.find((p) => p.is_base) ||
            packSizes[0] ||
            null;
        const uom = material?.uom || fallbackDetail?.uom || null;

        return {
            rm_id: Number(material?.rm_id ?? fallbackDetail?.material_id ?? fallbackDetail?.rm_id ?? 0),
            rm_name: material?.name || material?.rm_name || fallbackDetail?.material_name || fallbackDetail?.rm_name || "Material",
            uom_id: selectedPack?.uom_id ?? preferredUomId ?? uom?.id ?? "",
            uom_name: selectedPack?.uom_name || material?.uom_name || material?.uom?.name || fallbackDetail?.uom_name || uom?.name || "",
            supplier_id: material?.supplier_id ?? fallbackDetail?.supplier_id ?? "",
            shop_name: material?.shop_name || fallbackDetail?.shop_name || "",
            current_stock: Number(material?.current_stock ?? fallbackDetail?.current_stock ?? 0),
            pack_sizes: packSizes,
            factor: Number(selectedPack?.factor_to_base) || 1,
            sale_price: material?.sale_price ?? "",
        };
    };

    const fetchInvoiceNo = useCallback(async () => {
        if (isEditMode) return; 
        try {
            const res = await api.get("/rm-transactions/rm-invoice", {
                params: { type: "Purchase" }
            });
            setInvoiceNo(res.data.invoice_no);
        } catch (err) {
            console.error("Error fetching invoice:", err);
        }
    }, [isEditMode]);

    // ---------------------------------------------------------
    // 🔥 FIXED CALCULATION LOGIC (REUSED SAFELY)
    // ---------------------------------------------------------
    const calculateTotals = (currentRows, discountValue, deliveryValue = deliveryCharges, currentIsTaxable = isTaxable, currentTaxMode = taxMode, currentTaxRate = taxRate) => {
        const currentSubTotal = currentRows.reduce((sum, row) => {
            const qty = parseFloat(row.quantity) || 0;
            const price = parseFloat(row.unitPrice) || 0;
            return sum + (qty * price);
        }, 0);

        const delivery = parseFloat(deliveryValue) || 0;
        const discount = parseFloat(discountValue) || 0;
        const taxableBase = Math.max(0, currentSubTotal - discount);

        let calculatedTaxable = taxableBase;
        let calculatedTaxAmount = 0;
        let calculatedGrand = taxableBase + delivery;

        if (currentIsTaxable && (parseFloat(currentTaxRate) || 0) > 0) {
            const rate = parseFloat(currentTaxRate) / 100;
            if (currentTaxMode === 'inclusive') {
                calculatedTaxable = taxableBase / (1 + rate);
                calculatedTaxAmount = taxableBase - calculatedTaxable;
                calculatedGrand = taxableBase + delivery;
            } else {
                calculatedTaxable = taxableBase;
                calculatedTaxAmount = calculatedTaxable * rate;
                calculatedGrand = calculatedTaxable + calculatedTaxAmount + delivery;
            }
        }

        setSubTotal(currentSubTotal.toFixed(2));
        setTaxableAmount(calculatedTaxable.toFixed(2));
        setTaxAmount(calculatedTaxAmount.toFixed(2));
        setGrandTotal(Math.max(0, calculatedGrand).toFixed(2));
    };

    useEffect(() => {
        calculateTotals(rows, globalDiscount, deliveryCharges, isTaxable, taxMode, taxRate);
    }, [rows, globalDiscount, deliveryCharges, isTaxable, taxMode, taxRate]);

    // ---------------------------------------------------------
    // 🔥 MASTER DATA & EDIT MODE AUTO-FILL (COMBINED TO PREVENT LOOPS)
    // ---------------------------------------------------------
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // Parallel API Requests (POS purchase uses POS products, no GRN)
                const [materialsRes, suppliersRes, uomsRes, sourceDocsRes] = await Promise.all([
                    isPos ? api.get("/pos/products", { params: { limit: 1000 } }) : api.get("/add-materials"),
                    api.get("/entities/transactions"),
                    api.get('/uoms'),
                    isPos ? Promise.resolve({ data: { data: [] } }) : api.get('/loader-documents/unposted', { params: { type: 'GRN' } })
                ]);

                const materialsData = isPos ? (materialsRes.data?.data || []) : materialsRes.data;
                setMaterials(materialsData);
                setUoms(uomsRes.data);
                setSourceDocuments(sourceDocsRes.data?.data || []);

                let onlySuppliers = suppliersRes.data.filter(ent => ent.type === "supplier");

                // If NOT Edit Mode, load default tax + Walk-in Supplier
                if (!isEditMode) {
                    try {
                        const walkinRes = await api.get("/entities/walkin-supplier");
                        if (walkinRes.data?.id) {
                            if (!onlySuppliers.some((s) => Number(s.id) === Number(walkinRes.data.id))) {
                                onlySuppliers = [
                                    { id: walkinRes.data.id, name: walkinRes.data.name, type: "supplier" },
                                    ...onlySuppliers,
                                ];
                            }
                            setSelectedSupplier(String(walkinRes.data.id));
                        }
                    } catch (walkinErr) {
                        console.error("Error fetching walk-in supplier:", walkinErr);
                    }

                    setSuppliers(onlySuppliers);

                    try {
                        const taxRes = await api.get("/tax-master/latest/active");
                        setTaxId(taxRes.data.id);
                        setTaxRate(Number(taxRes.data.tax_rate) || 0);
                        setTaxMode(taxRes.data.taxtype || 'exclusive');
                    } catch (taxErr) {
                        console.error("Error fetching latest tax:", taxErr);
                        setTaxMode('exclusive');
                    }
                    fetchInvoiceNo();
                } else {
                    setSuppliers(onlySuppliers);
                    // IF EDIT MODE -> Fetch data after dependencies are loaded
                    const editRes = await api.get(`/rm-transactions/edit-preview/${editId}`);
                    const { master, details, invoiceDate } = editRes.data;

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
                    
                    setSubTotal(parseFloat(master.subtotal || 0).toFixed(2));
                    setGlobalDiscount(master.discount || "");
                    setDeliveryCharges(parseFloat(master.delivery_charges || 0).toFixed(2));
                    setIsTaxable(master.is_taxable);
                    setTaxMode(master.tax_mode || 'exclusive');
                    setTaxRate(Number(master.tax_rate) || 0);
                    setTaxId(master.tax_id);
                    setTaxableAmount(parseFloat(master.taxable_amount || 0).toFixed(2));
                    setTaxAmount(parseFloat(master.tax_amount || 0).toFixed(2));
                    setGrandTotal(parseFloat(master.grand_total || 0).toFixed(2));

                    let mappedRows = [];
                    if (Array.isArray(details) && details.length > 0) {
                        mappedRows = details.map(d => {
                            // Entered values are in the selected UOM; quantity/unit_price are base
                            const qty = Math.abs(parseFloat(d.entered_qty ?? d.quantity) || 0);
                            const price = parseFloat(d.entered_unit_price ?? d.unit_price) || 0;
                            const matchingMaterial = materialsData.find(m => Number(m.rm_id) === Number(d.rm_id));

                            const packSizes = normalizePackSizes(matchingMaterial);
                            const uomId = d.uom_id || matchingMaterial?.uom?.id || matchingMaterial?.uom_id || "";
                            const selectedPack = packSizes.find(p => Number(p.uom_id) === Number(uomId));

                            return {
                                ...emptyPurchaseRow(),
                                rm_id: d.rm_id,
                                rm_name: d.rm_name,
                                quantity: qty,
                                unitPrice: price,
                                total: (qty * price).toFixed(2),
                                uom_id: uomId,
                                uom_name: selectedPack?.uom_name || d.uom_name || matchingMaterial?.uom?.name || matchingMaterial?.uom_name || "",
                                pack_sizes: packSizes,
                                factor: Number(selectedPack?.factor_to_base) || 1,
                                salePrice: matchingMaterial?.sale_price ?? "",
                                imei1: d.imei1 || "",
                                imei2: d.imei2 || "",
                                ram: d.ram || "",
                                rom: d.rom || "",
                                color: d.color || "",
                                condition: d.condition || "",
                                condition_percent: d.condition_percent || "",
                            };
                        });
                        setRows(mappedRows);
                    }

                    const sourceDocId = master.source_doc_id || master.inventory_doc_id || master.grn_id || master.dc_id || null;
                    const sourceDocNo = master.source_doc_no || master.inventory_doc_no || null;
                    if (sourceDocId) {
                        if (sourceDocNo) {
                            setSourceDocuments(prev => prev.some(doc => String(doc.id) === String(sourceDocId)) ? prev : [{ id: Number(sourceDocId), no: sourceDocNo }, ...prev]);
                        }
                        await handleSourceDocumentSelection(sourceDocId, mappedRows, materialsData);
                    }
                }
            } catch (err) {
                console.error("Error loading initial form data:", err);
                toast.error("Failed to load required data.");
                if (isEditMode) navigate(listPath);
            }
        };

        loadInitialData();
    }, [editId, isEditMode, navigate, fetchInvoiceNo]);

    const handleSourceDocumentSelection = async (docId, existingRowsOverride = rows, materialsList = materials) => {
        setSelectedSourceDoc(docId || "");
        if (!docId) {
            setRows(Array.isArray(existingRowsOverride) && existingRowsOverride.length > 0 ? existingRowsOverride : [emptyPurchaseRow()]);
            setOriginalSourceItems([]);
            return;
        }

        try {
            const res = await api.get(`/loader-documents/${docId}`);
            const sourceDoc = res.data?.data || res.data;
            const details = sourceDoc.LoaderDocumentDetails || sourceDoc.details || [];
            setSourceDocuments(prev => prev.some(doc => String(doc.id) === String(docId)) ? prev : [{ id: Number(docId), no: sourceDoc.no || `Source Document ${docId}` }, ...prev]);

            if (sourceDoc.entity_id) {
                setSelectedSupplier(String(sourceDoc.entity_id));
            }
            if (sourceDoc.date) {
                setDate(sourceDoc.date.split('T')[0]);
            }

            const fallbackRows = Array.isArray(existingRowsOverride) && existingRowsOverride.length > 0
                ? existingRowsOverride
                : [emptyPurchaseRow()];

            const mappedRows = details.map((detail) => {
                const cleanRmId = Number(detail.material_id || detail.rm_id);
                const existingRow = fallbackRows.find((row) => Number(row.rm_id) === cleanRmId) || {};
                const matchingMaterial = materialsList.find((m) => Number(m.rm_id) === cleanRmId);
                const meta = getMaterialMeta(matchingMaterial, detail);
                const enteredQty = Number(detail.entered_qty ?? detail.quantity ?? 0);
                const baseQty = Number(detail.quantity || 0);

                return {
                    ...existingRow,
                    rm_id: cleanRmId,
                    rm_name: meta.rm_name,
                    quantity: existingRow.quantity ?? enteredQty,
                    unitPrice: existingRow.unitPrice ?? "",
                    total: existingRow.total ?? "0.00",
                    uom_id: meta.uom_id,
                    uom_name: meta.uom_name,
                    pack_sizes: meta.pack_sizes,
                    factor: meta.factor,
                    source_base_qty: baseQty,
                    source_doc_id: sourceDoc.id,
                    source_doc_no: sourceDoc.no,
                    source_doc_type: sourceDoc.type,
                };
            });

            const nextRows = mappedRows.length > 0 ? mappedRows : fallbackRows;
            setRows(nextRows);
            setOriginalSourceItems(mappedRows.map((item) => ({
                ...item,
                quantity: Number(item.quantity || 0),
                source_base_qty: Number(item.source_base_qty || 0),
                factor: Number(item.factor) || 1,
            })));
            toast.success(`Loaded ${sourceDoc.no} for autofill.`);
        } catch (err) {
            console.error("Error loading source document:", err);
            toast.error("Failed to load selected GRN document.");
        }
    };

    const handleChange = (index, field, value) => {
        const updated = [...rows];

        if (field === "quantity") {
            const inputQty = parseFloat(value) || 0;
            const originalItem = originalSourceItems[index];
            const factor = Number(updated[index]?.factor) || Number(originalItem?.factor) || 1;
            const inputBase = inputQty * factor;
            const maxBase = Number(originalItem?.source_base_qty ?? originalItem?.quantity ?? 0);

            if (selectedSourceDoc && originalItem && inputBase > maxBase + 1e-9) {
                toast.error(`Error: Maximum allowed is ${maxBase} base units from the source document.`);
                const cappedEntered = factor > 0 ? maxBase / factor : maxBase;
                updated[index].quantity = String(cappedEntered);
                setRows(updated);
                calculateTotals(updated, globalDiscount, deliveryCharges, isTaxable, taxMode, taxRate);
                return;
            }
        }
        updated[index][field] = value;

        if (field === "quantity" || field === "unitPrice") {
            const qty = parseFloat(updated[index].quantity) || 0;
            const price = parseFloat(updated[index].unitPrice) || 0;
            updated[index].total = (qty * price).toFixed(2);
        }

        setRows(updated);
        calculateTotals(updated, globalDiscount, deliveryCharges, isTaxable, taxMode, taxRate);
    };

    const handleGlobalDiscountChange = (value) => {
        setGlobalDiscount(value);
        calculateTotals(rows, value, deliveryCharges, isTaxable, taxMode, taxRate);
    };
    const handleDeliveryChargesChange = (value) => {
        setDeliveryCharges(value);
        calculateTotals(rows, globalDiscount, value, isTaxable, taxMode, taxRate);
    };

    const addRow = () => {
        setRows([...rows, emptyPurchaseRow()]);
    };

    // UOM change on a line: qty/price are re-interpreted in the new UOM
    const handleUomSelection = (index, uomId) => {
        const updated = [...rows];
        const row = updated[index];
        const pack = (row.pack_sizes || []).find(p => Number(p.uom_id) === Number(uomId));
        if (!pack) return;

        row.uom_id = pack.uom_id;
        row.uom_name = pack.uom_name;
        row.factor = Number(pack.factor_to_base) || 1;

        setRows(updated);
        calculateTotals(updated, globalDiscount, deliveryCharges, isTaxable, taxMode, taxRate);
    };

    const deleteRow = (index) => {
        const updated = rows.filter((_, i) => i !== index);
        setRows(updated);
        calculateTotals(updated, globalDiscount, deliveryCharges, isTaxable, taxMode, taxRate);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedSupplier) return toast.error("Please select a supplier.");
        if (!date) return toast.error("Please select a purchase date.");

        const validRows = rows.filter(r => r.rm_id && parseFloat(r.quantity) > 0 && parseFloat(r.unitPrice) > 0);
        if (validRows.length === 0) return toast.error("Please add at least one valid material row.");
        const missingImei = validRows.findIndex((r) => !String(r.imei1 || "").trim());
        if (missingImei >= 0) return toast.error(`IMEI 1 is required on line ${missingImei + 1}`);

        const disc = parseFloat(globalDiscount) || 0;
        if (disc > parseFloat(subTotal)) {
            return toast.error("Global Discount cannot exceed the Total Sub Amount.");
        }

        const user = JSON.parse(localStorage.getItem("user"));
        const purchaseData = {
            entityid: selectedSupplier,
            grand_total: parseFloat(grandTotal),
            sub_total: parseFloat(subTotal),
            discount: disc,
            delivery_charges: parseFloat(deliveryCharges),
            taxable_amount: parseFloat(taxableAmount),
            tax_amount: parseFloat(taxAmount),
            is_taxable: isTaxable,
            tax_mode: taxMode,
            tax_rate: parseFloat(taxRate),
            tax_id: taxId,
            type: "purchase",
            channel,
            createdby: user?.username || "guest",
            invoice_no: invoiceNo,
            ...contact,
            details: validRows.map(r => ({
                rm_id: r.rm_id,
                rm_name: r.rm_name,
                quantity: parseFloat(r.quantity),
                unit_price: parseFloat(r.unitPrice),
                total_price: parseFloat(r.total),
                uom_id: r.uom_id,
                date,
                entity_supplier_id: selectedSupplier,
                ...serializeDeviceFields(r),
                // POS: update the product's selling price alongside the purchase
                ...(isPos && r.salePrice !== "" && r.salePrice != null
                    ? { new_sale_price: parseFloat(r.salePrice) }
                    : {}),
            })),
            source_doc_id: selectedSourceDoc ? Number(selectedSourceDoc) : null,
            source_doc_type: selectedSourceDoc ? "GRN" : null,
        };

        try {
            if (isEditMode) {
                await api.put(`/rm-transactions/${editId}`, purchaseData);
                toast.success(`Invoice Draft Updated Successfully! Code: ${invoiceNo}`);
            } else {
                const res = await api.post("/rm-transactions", purchaseData);
                toast.success(`Purchase Transaction Saved as Draft! Invoice: ${res.data.invoice_no}`);
            }
            navigate(listPath);
        } catch (err) {
            toast.error(err.response?.data?.message || "Error saving purchase transaction.");
        }
    };

    const handleQuickSupplierAdd = async () => {
        const name = document.getElementById('new_sup_name').value;
        const contact = document.getElementById('new_sup_contact').value;
        const address = document.getElementById('new_sup_address').value;
        if (!name) return toast.error("Supplier name is required");
        try {
            const res = await api.post("/entities", { name, contact, address, type: "supplier" });
            setSuppliers(prev => [...prev, res.data]);
            setSelectedSupplier(res.data.id);
            setShowSupplierModal(false);
            toast.success("Supplier Added!");
        } catch (err) { toast.error("Failed to add supplier"); }
    };

    const handleQuickMaterialAdd = async () => {
    if (!newMaterialName || !newMaterialUom) return toast.error("Please fill all fields");
    
    try {
        const payload = { 
            name: newMaterialName, 
            material_name: newMaterialName, // Fallback if backend looks for material_name
            uom_id: parseInt(newMaterialUom) 
        };

        const res = await api.post("/add-materials", payload);
        
        // Handling both raw object and nested data responses safely
        const savedItem = res.data?.data || res.data;
        
        if (savedItem) {
            setMaterials(prev => [...prev, savedItem]);
            toast.success("Model added!");
        } else {
            // Safe fallback: re-sync list from backend if response format is messy
            const refreshRes = await api.get("/add-materials");
            setMaterials(refreshRes.data);
            toast.info("Materials list synchronized.");
        }
        
        // Reset and close
        setNewMaterialName("");
        setNewMaterialUom("");
        setShowMaterialModal(false);
        setShowBrandModal(false);
        setNewBrandName("");
    } catch (err) { 
        console.error("Quick Material Add Error:", err);
        toast.error(err.response?.data?.message || "Failed to add material"); 
    }
};

    const handleQuickBrandAdd = async () => {
        const name = String(newBrandName || "").trim();
        if (!name) return toast.error("Brand name is required");
        setIsAddingBrand(true);
        try {
            const res = await api.post("/uoms", { name });
            const saved = res.data;
            setUoms((prev) => {
                if (prev.some((u) => Number(u.id) === Number(saved.id))) return prev;
                return [...prev, saved].sort((a, b) =>
                    String(a.name || "").localeCompare(String(b.name || ""))
                );
            });
            setNewMaterialUom(String(saved.id));
            setNewBrandName("");
            setShowBrandModal(false);
            toast.success("Brand added!");
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to add brand");
        } finally {
            setIsAddingBrand(false);
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
                    <h2 className="form-title erp-page-title">{isEditMode ? `Modify ${channelLabel ? channelLabel + ' ' : ''}Purchase Draft (${invoiceNo})` : (channelLabel ? `${channelLabel} Purchase` : "Purchase")}</h2>
                </div>

                <div className="rm-main-card">
                    <div className="info-grid">
                        <div className="info-item">
                            <label>Invoice No</label>
                            <input type="text" value={invoiceNo} readOnly className="rm-input-field readonly-input" style={{backgroundColor: isEditMode ? '#e2e8f0' : '#f1f5f9'}} />
                        </div>
                        <div className="info-item">
                            <label>Supplier</label>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <Select
                                    className="rm-input-field"
                                    classNamePrefix="react-select"
                                    options={supplierOptions}
                                    value={supplierOptions.find((option) => String(option.value) === String(selectedSupplier)) || null}
                                    onChange={(selectedOption) => setSelectedSupplier(selectedOption?.value || "")}
                                    isSearchable
                                    isClearable
                                    isDisabled={!!selectedSourceDoc}
                                />
                                <button type="button" className="quick-add-btn" onClick={() => setShowSupplierModal(true)} disabled={!!selectedSourceDoc}><FaPlus /></button>
                            </div>
                        </div>
                        <div className="info-item">
                            <label>Purchase Date</label>
                            <input type="date" className="rm-input-field" value={date} onChange={(e) => setDate(e.target.value)} readOnly={!!selectedSourceDoc} />
                        </div>
                        {/* Source GRN dropdown hidden for mobile shop
                        {!isPos && (
                        <div className="info-item">
                            <label>Source GRN</label>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <select className="rm-input-field" value={selectedSourceDoc} onChange={(e) => handleSourceDocumentSelection(e.target.value)}>
                                    <option value="">Select GRN (optional)</option>
                                    {sourceDocuments.map(doc => (
                                        <option key={doc.id} value={doc.id}>{doc.no}</option>
                                    ))}
                                </select>
                                <button type="button" className="quick-add-btn" onClick={() => navigate('/grn-form')}><FaPlus /></button>
                            </div>
                        </div>
                        )}
                        */}
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="rm-items-scroll">
                        <div className="items-table-header" style={gridColumns ? { gridTemplateColumns: gridColumns } : undefined}>
                            <span>{isPos ? 'Product' : 'Model Name'}</span>
                            <span>Brand</span>
                            {/* <span>Qty</span> */}
                            <span>Unit Price</span>
                            {isPos && <span>Sale Price</span>}
                            {/* <span>Total</span> */}
                            <span>Action</span>
                        </div>

                        {rows.map((row, index) => (
                            <div className="item-row" key={index} style={gridColumns ? { gridTemplateColumns: gridColumns } : undefined}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <Select
                                        className="rm-input-field"
                                        classNamePrefix="react-select"
                                        options={materialOptions}
                                        value={materialOptions.find((option) => String(option.value) === String(row.rm_id)) || null}
                                        isSearchable
                                        isClearable
                                        isDisabled={!!selectedSourceDoc}
                                        onChange={(selectedOption) => {
                                            const selectedValue = selectedOption?.value || "";
                                            const selected = materials.find(m => m.rm_id === parseInt(selectedValue));
                                            const meta = getMaterialMeta(selected);
                                            handleChange(index, "rm_id", selectedValue);
                                            handleChange(index, "rm_name", meta.rm_name);
                                            handleChange(index, "uom_id", meta.uom_id);
                                            handleChange(index, "uom_name", meta.uom_name);
                                            handleChange(index, "pack_sizes", meta.pack_sizes);
                                            handleChange(index, "factor", 1);
                                            if (isPos) handleChange(index, "salePrice", meta.sale_price ?? "");
                                        }}
                                    />
                                    {isPos ? (
                                        <button type="button" className="quick-add-btn" title="Manage POS products" onClick={() => navigate('/pos/products')}><FaPlus /></button>
                                    ) : (
                                        <button type="button" className="quick-add-btn" onClick={() => setShowMaterialModal(true)} disabled={!!selectedSourceDoc}><FaPlus /></button>
                                    )}
                                </div>

                                {Array.isArray(row.pack_sizes) && row.pack_sizes.length > 1 ? (
                                    <select
                                        className="rm-input-field"
                                        value={row.uom_id}
                                        onChange={(e) => handleUomSelection(index, e.target.value)}
                                    >
                                        {row.pack_sizes.map(p => (
                                            <option key={p.uom_id} value={p.uom_id}>
                                                {p.uom_name}{!p.is_base ? ` (=${Number(p.factor_to_base)} base)` : ''}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input type="text" className="rm-input-field readonly-input" placeholder="Brand" value={row.uom_name} readOnly />
                                )}
                                {/* Qty hidden — each row = 1 phone (qty still defaults to 1 in state)
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <input type="number" className="rm-input-field" placeholder="Qty" value={row.quantity} onChange={(e) => handleChange(index, "quantity", e.target.value)} />
                                    {Number(row.factor) !== 1 && parseFloat(row.quantity) > 0 && (
                                        <small style={{ fontSize: '11px', color: '#3182ce', paddingLeft: '4px' }}>
                                            = {(parseFloat(row.quantity) * Number(row.factor)).toFixed(2)} base units
                                        </small>
                                    )}
                                </div>
                                */}
                                <input type="number" className="rm-input-field" placeholder="Price" value={row.unitPrice} onChange={(e) => handleChange(index, "unitPrice", e.target.value)} />
                                {isPos && (
                                    <input
                                        type="number"
                                        className="rm-input-field"
                                        placeholder="Sale Price"
                                        title="Selling price per base unit — updates the product"
                                        value={row.salePrice ?? ""}
                                        onChange={(e) => handleChange(index, "salePrice", e.target.value)}
                                    />
                                )}
                                {/* <input type="text" className="rm-input-field readonly-input" placeholder='Total' value={row.total} readOnly /> */}

                                <div className="erp-row-actions">
                                    <button type="button" className="quick-add-btn" style={{ color: '#3182ce' }} onClick={addRow} disabled={!!selectedSourceDoc}><FaPlus /></button>
                                    {rows.length > 1 && (
                                        <button type="button" className="quick-add-btn" style={{ color: '#e53e3e' }} onClick={() => deleteRow(index)} disabled={!!selectedSourceDoc}><FaTrash /></button>
                                    )}
                                </div>
                                <DeviceLineFields row={row} index={index} onChange={handleChange} disabled={!!selectedSourceDoc} />
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
                            <div className="summary-row">
                                <label>Discount:</label>
                                <input type="number" placeholder='0.00' className="rm-input-field" style={{ width: '120px' }} value={globalDiscount} onChange={(e) => handleGlobalDiscountChange(e.target.value)} />
                            </div>
                            {/* <div className="summary-row">
                                <label>Delivery Charges:</label>
                                <input type="number" placeholder='0.00' className="rm-input-field" style={{ width: '120px' }} value={deliveryCharges} onChange={(e) => handleDeliveryChargesChange(e.target.value)} />
                            </div> */}
                            <div className="summary-row grand-total-box">
                                <b>Grand Total:</b>
                                <b>{grandTotal}</b>
                            </div>
                        </div>

                        <div className="erp-form-actions">
                            <button type="submit" className="save-btn">{isEditMode ? "Update Draft" : "Save Draft"}</button>
                        </div>
                    </form>
                </div>
            </div>
            <Footer />

            {showSupplierModal && (
                <div className="modal-overlay" onClick={() => setShowSupplierModal(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <h3>Add New Supplier</h3>
                        <div className="form-group"><label>Name</label><input type="text" id="new_sup_name" className="rm-input-field" /></div>
                        <div className="form-group"><label>Address</label><textarea id="new_sup_address" className="rm-input-field"></textarea></div>
                        <div className="form-group"><label>Contact</label><input type="text" id="new_sup_contact" className="rm-input-field" /></div>
                        <div className="modal-actions">
                            <button type="button" className="save-btn" onClick={handleQuickSupplierAdd}>Save Supplier</button>
                            <button type="button" className="modal-cancel-btn" onClick={() => setShowSupplierModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {showMaterialModal && (
    <div className="modal-overlay" onClick={() => {
        setShowMaterialModal(false);
        setNewMaterialName("");
        setNewMaterialUom("");
        setShowBrandModal(false);
        setNewBrandName("");
    }}>
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Add New Model</h3>
            <div className="form-group">
                <label>Model Name</label>
                <input 
                    type="text" 
                    className="rm-input-field" 
                    value={newMaterialName}
                    onChange={(e) => setNewMaterialName(e.target.value)}
                    placeholder="Enter model name"
                />
            </div>
            <div className="form-group">
                <label>Brand</label>
                <div className="modal-brand-row">
                    <select 
                        className="rm-input-field modal-brand-select"
                        value={newMaterialUom}
                        onChange={(e) => setNewMaterialUom(e.target.value)}
                        disabled={showBrandModal}
                    >
                        <option value="">Select Brand</option>
                        {uoms.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <button
                        type="button"
                        className="quick-add-btn modal-brand-add-btn"
                        title="Add Brand"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowBrandModal((open) => !open);
                            setNewBrandName("");
                        }}
                    >
                        <FaPlus />
                    </button>
                </div>
                {showBrandModal && (
                    <div className="modal-brand-inline">
                        <label>New Brand Name</label>
                        <input
                            type="text"
                            className="rm-input-field"
                            value={newBrandName}
                            onChange={(e) => setNewBrandName(e.target.value)}
                            placeholder="e.g. iPhone, Samsung"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleQuickBrandAdd();
                                }
                            }}
                        />
                        <div className="modal-brand-inline-actions">
                            <button
                                type="button"
                                className="save-btn"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleQuickBrandAdd();
                                }}
                                disabled={isAddingBrand}
                            >
                                {isAddingBrand ? "Saving…" : "Save Brand"}
                            </button>
                            <button
                                type="button"
                                className="modal-cancel-btn"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowBrandModal(false);
                                    setNewBrandName("");
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <div className="modal-actions">
                <button type="button" className="save-btn" onClick={handleQuickMaterialAdd}>Save Model</button>
                <button type="button" className="modal-cancel-btn" onClick={() => {
                    setShowMaterialModal(false);
                    setNewMaterialName("");
                    setNewMaterialUom("");
                    setShowBrandModal(false);
                    setNewBrandName("");
                }}>Cancel</button>
            </div>
        </div>
    </div>
)}
        </div>
    );
};

export default RM_PurchaseForm;