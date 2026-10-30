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
import ModelImeiScanBtn from '../Components/ModelImeiScanBtn';
import InvoiceContactBlock from '../Components/InvoiceContactBlock';
import { EMPTY_DEVICE_FIELDS, EMPTY_CONTACT_FIELDS, parseContactImages, serializeDeviceFields } from '../constants/mobileDeviceOptions';

const EMPTY_ROW = {
  rm_id: "",
  rm_name: "",
  // Mobile shop: 1 phone per row (IMEI unique) — Qty UI hidden; set "" to re-enable later
  quantity: "1",
  unitPrice: "",
  total: "",
  uom_id: "",
  uom_name: "",
  supplier_id: "",
  shop_name: "",
  current_stock: 0,
  pack_sizes: [],
  factor: 1,
  available_phones: [],
  source_detail_id: "",
  purchase_cost: "",
  ...EMPTY_DEVICE_FIELDS,
};

const RM_SaleForm = ({ channel = null }) => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const queryParams = new URLSearchParams(location.search);
    const invoiceType = queryParams.get('invoiceType');
    const editId = queryParams.get('editId'); 
    const isEditMode = !!editId;

    // Channel-aware navigation/labels (Retail & Wholesale tabs reuse this form)
    const channelLabel = channel === 'retail' ? 'Retail' : channel === 'wholesale' ? 'Wholesale' : null;
    const listPath = channel ? `/${channel}/sales` : '/rm-sale';

    const [rows, setRows] = useState([{ ...EMPTY_ROW }]);
    const [materials, setMaterials] = useState([]);
    const [customers, setCustomers] = useState([]);

    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [contact, setContact] = useState({ ...EMPTY_CONTACT_FIELDS });
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
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [uoms, setUoms] = useState([]);
    const [sourceDocuments, setSourceDocuments] = useState([]);
    const [selectedSourceDoc, setSelectedSourceDoc] = useState("");
    const [originalSourceItems, setOriginalSourceItems] = useState([]);

    const customerOptions = customers.map((customer) => ({ value: customer.id, label: customer.name }));
    const materialOptions = materials.map((material) => ({
        value: `${Number(material.rm_id)}-${String(material.supplier_id).trim()}`,
        label: `${material.rm_name || material.name || "Model Name"} - ${material.shop_name || 'No Supplier'}`,
    }));

    const getMaterialMeta = (material, fallbackDetail = {}) => {
        const packSizes = (material?.pack_sizes || []).map((p) => ({
            uom_id: p.uom_id,
            uom_name: p.uom?.name || p.uom_name || "",
            factor_to_base: Number(p.factor_to_base) || 1,
            is_base: !!p.is_base,
        }));
        const preferredUomId = fallbackDetail?.uom_id ?? material?.uom_id ?? material?.uom?.id ?? "";
        const selectedPack =
            packSizes.find((p) => Number(p.uom_id) === Number(preferredUomId)) ||
            packSizes.find((p) => p.is_base) ||
            packSizes[0] ||
            null;
        const uom = material?.uom || fallbackDetail?.uom || null;

        return {
            rm_id: Number(material?.rm_id ?? fallbackDetail?.material_id ?? fallbackDetail?.rm_id ?? 0),
            rm_name: material?.rm_name || material?.name || fallbackDetail?.material_name || fallbackDetail?.rm_name || "Material",
            uom_id: selectedPack?.uom_id ?? preferredUomId ?? uom?.id ?? "",
            uom_name: selectedPack?.uom_name || material?.uom_name || material?.uom?.name || fallbackDetail?.uom_name || uom?.name || "",
            supplier_id: material?.supplier_id ?? fallbackDetail?.supplier_id ?? "",
            shop_name: material?.shop_name || fallbackDetail?.shop_name || "",
            current_stock: Number(material?.current_stock ?? fallbackDetail?.current_stock ?? 0),
            pack_sizes: packSizes,
            factor: Number(selectedPack?.factor_to_base) || 1,
        };
    };

    const fetchInvoiceNo = useCallback(async () => {
        if (isEditMode) return; 
        try {
            const res = await api.get("/rm-transactions/rm-invoice", {
                params: { type: "Sale" }
            });
            setInvoiceNo(res.data.invoice_no);
        } catch (err) {
            console.error("Error fetching invoice:", err);
        }
    }, [isEditMode]);

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

    const fetchAvailablePhones = async (rmId, supplierId) => {
        try {
            const res = await api.get("/rm-transactions/available-phones", {
                params: { rm_id: rmId, supplier_id: supplierId },
            });
            return Array.isArray(res.data) ? res.data : [];
        } catch (err) {
            console.error(err);
            toast.error("Could not load available phones for this model");
            return [];
        }
    };

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // 1. Fetch Master Lists Pehle load karein
                const [materialsRes, customersRes, uomsRes, sourceDocsRes] = await Promise.all([
                    api.get("/rm-transactions/materials-with-suppliers"),
                    api.get("/entities/transactions"),
                    api.get('/uoms'),
                    api.get('/loader-documents/unposted', { params: { type: 'DC' } })
                ]);

                setMaterials(materialsRes.data);
                setUoms(uomsRes.data);
                setSourceDocuments(sourceDocsRes.data?.data || []);

                let onlyCustomers = customersRes.data.filter(ent => ent.type === "customer");

                if (!isEditMode) {
                    try {
                        const walkinRes = await api.get("/entities/walkin-customer");
                        if (walkinRes.data?.id) {
                            if (!onlyCustomers.some((c) => Number(c.id) === Number(walkinRes.data.id))) {
                                onlyCustomers = [
                                    { id: walkinRes.data.id, name: walkinRes.data.name, type: "customer" },
                                    ...onlyCustomers,
                                ];
                            }
                            setSelectedCustomer(String(walkinRes.data.id));
                        }
                    } catch (walkinErr) {
                        console.error("Error fetching walk-in customer:", walkinErr);
                    }

                    setCustomers(onlyCustomers);

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
                    setCustomers(onlyCustomers);
                    // 2. Fetch Preview Mode Details
                    const editRes = await api.get(`/rm-transactions/edit-preview/${editId}`);
                    const { master, details, invoiceDate } = editRes.data;

                    setInvoiceNo(master.invoice_no);
                    setSelectedCustomer(master.entityid || master.entity_customer_id);
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
                    } else if (master.date) {
                        setDate(new Date(master.date).toISOString().split('T')[0]);
                    }
                    
                    setSubTotal(parseFloat(master.subtotal || master.sub_total || 0).toFixed(2));
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
                        mappedRows = await Promise.all(details.map(async (d) => {
                            const cleanRmId = Number(d.rm_id);
                            const cleanSupplierId = Number(d.original_supplier_id || d.entity_supplier_id || d.supplier_id);
                            const matchingMaterial = materialsRes.data.find(m => 
                                Number(m.rm_id) === cleanRmId && Number(m.supplier_id) === cleanSupplierId
                            );

                            // Restore what the user typed (entered_qty/entered_unit_price
                            // are in the selected UOM; quantity/unit_price are base).
                            const qty = Math.abs(parseFloat(d.entered_qty ?? d.quantity ?? d.qty) || 0);
                            const price = parseFloat(d.entered_unit_price ?? d.unit_price ?? d.price ?? d.unitPrice) || 0;

                            const packSizes = matchingMaterial?.pack_sizes || [];
                            const finalUomId = d.uom_id || matchingMaterial?.uom_id || "";
                            const selectedPack = packSizes.find(p => Number(p.uom_id) === Number(finalUomId));
                            const finalUomName = selectedPack?.uom_name || matchingMaterial?.uom_name || d.uom_name || "Kg";
                            const finalRmName = matchingMaterial?.rm_name || d.rm_name || "Model Name";
                            const finalShopName = matchingMaterial?.shop_name || d.supplier_name || "Supplier";

                            let phones = cleanRmId && cleanSupplierId
                                ? await fetchAvailablePhones(cleanRmId, cleanSupplierId)
                                : [];

                            let sourceDetailId = d.source_detail_id || "";
                            // If draft saved IMEI but source_detail_id missing, match from stock units
                            if (!sourceDetailId && d.imei1) {
                                const byImei = phones.find(
                                    (p) => String(p.imei1).trim() === String(d.imei1).trim()
                                );
                                if (byImei) sourceDetailId = byImei.source_detail_id;
                            }

                            // Keep currently selected unit visible in dropdown even if API list is empty
                            const selectedUnit = sourceDetailId
                                ? phones.find((p) => String(p.source_detail_id) === String(sourceDetailId))
                                : null;
                            if (sourceDetailId && !selectedUnit) {
                                const cost = Number(d.avg_unit_cost || 0);
                                phones = [
                                    {
                                        source_detail_id: sourceDetailId,
                                        imei1: d.imei1 || "",
                                        imei2: d.imei2 || "",
                                        ram: d.ram || "",
                                        rom: d.rom || "",
                                        color: d.color || "",
                                        condition: d.condition || "",
                                        condition_percent: d.condition_percent || "",
                                        cost,
                                        label: [
                                            `IMEI ${d.imei1 || sourceDetailId}`,
                                            cost ? `Cost ${cost.toLocaleString()}` : null,
                                            d.condition || null,
                                            d.condition_percent || null,
                                            d.color || null,
                                            d.ram || d.rom ? `${d.ram || "?"}/${d.rom || "?"}` : null,
                                        ]
                                            .filter(Boolean)
                                            .join(" | "),
                                    },
                                    ...phones,
                                ];
                            } else if (!sourceDetailId && d.imei1) {
                                // Fallback option so edit still shows the phone the user picked
                                phones = [
                                    {
                                        source_detail_id: `draft-${d.imei1}`,
                                        imei1: d.imei1 || "",
                                        imei2: d.imei2 || "",
                                        ram: d.ram || "",
                                        rom: d.rom || "",
                                        color: d.color || "",
                                        condition: d.condition || "",
                                        condition_percent: d.condition_percent || "",
                                        cost: Number(d.avg_unit_cost || 0),
                                        label: [
                                            `IMEI ${d.imei1}`,
                                            d.condition || null,
                                            d.condition_percent || null,
                                            d.color || null,
                                            d.ram || d.rom ? `${d.ram || "?"}/${d.rom || "?"}` : null,
                                        ]
                                            .filter(Boolean)
                                            .join(" | "),
                                    },
                                    ...phones,
                                ];
                                sourceDetailId = `draft-${d.imei1}`;
                            }

                            const matchedPhone = phones.find(
                                (p) => String(p.source_detail_id) === String(sourceDetailId)
                            );

                            return {
                                ...EMPTY_ROW,
                                rm_id: cleanRmId,
                                rm_name: finalRmName,
                                quantity: qty || "1",
                                unitPrice: price,
                                total: (qty * price).toFixed(2),
                                uom_id: finalUomId,
                                uom_name: finalUomName,
                                supplier_id: String(cleanSupplierId || ""),
                                shop_name: finalShopName,
                                current_stock: matchingMaterial ? Number(matchingMaterial.current_stock) : qty * (Number(selectedPack?.factor_to_base) || 1),
                                pack_sizes: packSizes,
                                factor: Number(selectedPack?.factor_to_base) || 1,
                                available_phones: phones,
                                source_detail_id: sourceDetailId,
                                purchase_cost: matchedPhone?.cost ?? "",
                                imei1: d.imei1 || matchedPhone?.imei1 || "",
                                imei2: d.imei2 || matchedPhone?.imei2 || "",
                                ram: d.ram || matchedPhone?.ram || "",
                                rom: d.rom || matchedPhone?.rom || "",
                                color: d.color || matchedPhone?.color || "",
                                condition: d.condition || matchedPhone?.condition || "",
                                condition_percent:
                                    d.condition_percent || matchedPhone?.condition_percent || "",
                            };
                        }));
                        setRows(mappedRows);
                    }

                    const sourceDocId = master.source_doc_id || master.inventory_doc_id || master.grn_id || master.dc_id || null;
                    const sourceDocNo = master.source_doc_no || master.inventory_doc_no || null;
                    if (sourceDocId) {
                        if (sourceDocNo) {
                            setSourceDocuments(prev => prev.some(doc => String(doc.id) === String(sourceDocId)) ? prev : [{ id: Number(sourceDocId), no: sourceDocNo }, ...prev]);
                        }
                        await handleSourceDocumentSelection(sourceDocId, mappedRows, materialsRes.data);
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

    const handleMaterialSelection = async (index, value) => {
        const updated = [...rows];
        if (!value) {
            updated[index] = { ...EMPTY_ROW };
            setRows(updated);
            calculateTotals(updated, globalDiscount, deliveryCharges, isTaxable, taxMode, taxRate);
            return;
        }

        const [rmId, supplierId] = value.split("-");
        const selected = materials.find(m => Number(m.rm_id) === Number(rmId) && Number(m.supplier_id) === Number(supplierId));

        if (selected && Number(selected.rm_id) === Number(rmId) && Number(selected.supplier_id) === Number(supplierId)) {
            const phones = await fetchAvailablePhones(selected.rm_id, selected.supplier_id);
            updated[index] = {
                ...EMPTY_ROW,
                rm_id: Number(selected.rm_id),
                rm_name: selected.rm_name,
                uom_id: selected.uom_id,
                uom_name: selected.uom_name,
                supplier_id: String(selected.supplier_id),
                shop_name: selected.shop_name,
                current_stock: selected.current_stock,
                quantity: "1",
                unitPrice: "",
                total: "",
                pack_sizes: selected.pack_sizes || [],
                factor: 1,
                available_phones: phones,
                source_detail_id: "",
                purchase_cost: "",
            };
            if (!phones.length) {
                toast.info("No IMEI units in stock for this model/supplier. Purchase phones with IMEI first.");
            }
        }

        setRows(updated);
        calculateTotals(updated, globalDiscount, deliveryCharges, isTaxable, taxMode, taxRate);
    };

    const phoneOptionsForRow = (row, index) => {
        const taken = new Set(
            rows
                .map((r, i) => (i !== index && r.source_detail_id ? String(r.source_detail_id) : null))
                .filter(Boolean)
        );
        const opts = (row.available_phones || []).filter((p) => {
            const id = String(p.source_detail_id);
            if (row.source_detail_id && id === String(row.source_detail_id)) return true;
            return !taken.has(id);
        });
        // Ensure current selection always appears in the list
        if (row.source_detail_id && !opts.some((p) => String(p.source_detail_id) === String(row.source_detail_id))) {
            opts.unshift({
                source_detail_id: row.source_detail_id,
                imei1: row.imei1 || "",
                imei2: row.imei2 || "",
                ram: row.ram || "",
                rom: row.rom || "",
                color: row.color || "",
                condition: row.condition || "",
                condition_percent: row.condition_percent || "",
                cost: row.purchase_cost || 0,
                label: [
                    `IMEI ${row.imei1 || row.source_detail_id}`,
                    row.purchase_cost ? `Cost ${Number(row.purchase_cost).toLocaleString()}` : null,
                    row.condition || null,
                    row.condition_percent || null,
                    row.color || null,
                    row.ram || row.rom ? `${row.ram || "?"}/${row.rom || "?"}` : null,
                ]
                    .filter(Boolean)
                    .join(" | "),
            });
        }
        return opts;
    };

    const handlePhoneUnitSelection = (index, sourceDetailId) => {
        const updated = [...rows];
        const row = updated[index];
        if (!sourceDetailId) {
            updated[index] = {
                ...row,
                source_detail_id: "",
                purchase_cost: "",
                ...EMPTY_DEVICE_FIELDS,
            };
            setRows(updated);
            return;
        }
        const unit = (row.available_phones || []).find(
            (p) => String(p.source_detail_id) === String(sourceDetailId)
        );
        if (!unit) return;
        updated[index] = {
            ...row,
            source_detail_id: unit.source_detail_id,
            purchase_cost: unit.cost,
            imei1: unit.imei1 || "",
            imei2: unit.imei2 || "",
            ram: unit.ram || "",
            rom: unit.rom || "",
            color: unit.color || "",
            condition: unit.condition || "",
            condition_percent: unit.condition_percent || "",
            // Sale price stays user-entered
            quantity: "1",
        };
        setRows(updated);
        calculateTotals(updated, globalDiscount, deliveryCharges, isTaxable, taxMode, taxRate);
    };

    /** Scan IMEI → auto-select model + phone unit (stock) */
    const handleImeiModelScan = async (index, imei) => {
        const clean = String(imei || "").trim();
        if (!clean) return;
        if (rows.some((r, i) => i !== index && String(r.imei1 || "").trim() === clean)) {
            return toast.error("This IMEI is already selected on another line.");
        }
        try {
            const res = await api.get("/rm-transactions/phone-by-imei", {
                params: { imei: clean, mode: "sale" },
            });
            const phone = res.data;
            const phones = await fetchAvailablePhones(phone.rm_id, phone.supplier_id);
            let list = Array.isArray(phones) ? [...phones] : [];
            if (!list.some((p) => String(p.source_detail_id) === String(phone.source_detail_id))) {
                list = [phone, ...list];
            }
            const prevPrice = rows[index]?.unitPrice || "";
            const priceNum = parseFloat(prevPrice) || 0;
            const updated = [...rows];
            updated[index] = {
                ...EMPTY_ROW,
                rm_id: Number(phone.rm_id),
                rm_name: phone.rm_name || "",
                uom_id: phone.uom_id || "",
                uom_name: phone.uom_name || "",
                supplier_id: String(phone.supplier_id),
                shop_name: phone.shop_name || phone.supplier_name || "",
                current_stock: list.length,
                quantity: "1",
                unitPrice: prevPrice,
                total: priceNum > 0 ? priceNum.toFixed(2) : "",
                pack_sizes: [],
                factor: 1,
                available_phones: list,
                source_detail_id: phone.source_detail_id,
                purchase_cost: phone.cost,
                imei1: phone.imei1 || clean,
                imei2: phone.imei2 || "",
                ram: phone.ram || "",
                rom: phone.rom || "",
                color: phone.color || "",
                condition: phone.condition || "",
                condition_percent: phone.condition_percent || "",
            };
            setRows(updated);
            calculateTotals(updated, globalDiscount, deliveryCharges, isTaxable, taxMode, taxRate);
            toast.success(`Selected ${phone.rm_name || "phone"} — IMEI ${phone.imei1 || clean}`);
        } catch (err) {
            toast.error(err.response?.data?.message || "IMEI not found in available stock.");
        }
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

        // Re-validate stock for the new UOM (stock is tracked in base units)
        const qty = parseFloat(row.quantity) || 0;
        const baseQty = qty * row.factor;
        const available = parseFloat(row.current_stock) || 0;
        if (baseQty > available) {
            toast.error(`Out of stock! Only ${available} base units available (${(available / row.factor).toFixed(2)} ${row.uom_name}).`);
            row.quantity = "";
            row.total = "0.00";
        }

        setRows(updated);
        calculateTotals(updated, globalDiscount, deliveryCharges, isTaxable, taxMode, taxRate);
    };

    const handleSourceDocumentSelection = async (docId, existingRowsOverride = rows, materialsList = materials) => {
        setSelectedSourceDoc(docId || "");
        if (!docId) {
            setRows(Array.isArray(existingRowsOverride) && existingRowsOverride.length > 0 ? existingRowsOverride : [{ ...EMPTY_ROW }]);
            setOriginalSourceItems([]);
            return;
        }

        try {
            const res = await api.get(`/loader-documents/${docId}`);
            const sourceDoc = res.data?.data || res.data;
            const details = sourceDoc.LoaderDocumentDetails || sourceDoc.details || [];
            setSourceDocuments(prev => prev.some(doc => String(doc.id) === String(docId)) ? prev : [{ id: Number(docId), no: sourceDoc.no || `Source Document ${docId}` }, ...prev]);

            if (sourceDoc.entity_id) {
                setSelectedCustomer(String(sourceDoc.entity_id));
            }
            if (sourceDoc.date) {
                setDate(sourceDoc.date.split('T')[0]);
            }

            const fallbackRows = Array.isArray(existingRowsOverride) && existingRowsOverride.length > 0
                ? existingRowsOverride
                : [{ ...EMPTY_ROW }];

            const mappedRows = details.map((detail) => {
                const cleanRmId = Number(detail.material_id || detail.rm_id);
                const cleanSupplierId = detail.supplier_id ? Number(detail.supplier_id) : null;
                const existingRow = fallbackRows.find((row) => Number(row.rm_id) === cleanRmId) || {};
                const matchingMaterial = materialsList.find((m) => Number(m.rm_id) === cleanRmId && Number(m.supplier_id) === cleanSupplierId);
                const meta = getMaterialMeta(matchingMaterial, detail);
                const enteredQty = Number(detail.entered_qty ?? detail.quantity ?? 0);
                const baseQty = Number(detail.quantity || 0);
                const strictMatch = Boolean(matchingMaterial && Number(matchingMaterial.rm_id) === cleanRmId && Number(matchingMaterial.supplier_id) === cleanSupplierId);
                const latestUnitPrice = strictMatch ? Number(matchingMaterial.unit_price ?? detail.unit_price ?? 0) : 0;
                const quantityValue = existingRow.quantity ?? enteredQty;
                const calculatedTotal = (Number(quantityValue || 0) * latestUnitPrice).toFixed(2);

                return {
                    ...existingRow,
                    rm_id: cleanRmId,
                    rm_name: meta.rm_name,
                    quantity: quantityValue,
                    unitPrice: latestUnitPrice,
                    total: calculatedTotal,
                    uom_id: meta.uom_id,
                    uom_name: meta.uom_name,
                    supplier_id: cleanSupplierId ? String(cleanSupplierId) : "",
                    shop_name: meta.shop_name,
                    current_stock: meta.current_stock,
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
            calculateTotals(nextRows, globalDiscount, deliveryCharges, isTaxable, taxMode, taxRate);
            setOriginalSourceItems(mappedRows.map((item) => ({
                ...item,
                quantity: Number(item.quantity || 0),
                source_base_qty: Number(item.source_base_qty || 0),
                factor: Number(item.factor) || 1,
            })));
            toast.success(`Loaded ${sourceDoc.no} for autofill.`);
        } catch (err) {
            console.error("Error loading source document:", err);
            toast.error("Failed to load selected DC document.");
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
                updated[index].total = "0.00";
                setRows(updated);
                calculateTotals(updated, globalDiscount, deliveryCharges, isTaxable, taxMode, taxRate);
                return;
            }

            // Stock is tracked in BASE units; convert entered qty before checking
            const available = parseFloat(updated[index].current_stock) || 0;
            if (inputQty * factor > available) {
                const availableInUom = factor !== 1 ? ` (${(available / factor).toFixed(2)} ${updated[index].uom_name})` : "";
                toast.error(`Out of stock! Only ${available} units available${availableInUom}.`);
                updated[index][field] = "";
                updated[index].total = "0.00";
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
        setRows([...rows, { ...EMPTY_ROW }]);
    };

    const deleteRow = (index) => {
        const updated = rows.filter((_, i) => i !== index);
        setRows(updated);
        calculateTotals(updated, globalDiscount, deliveryCharges, isTaxable, taxMode, taxRate);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCustomer) return toast.error("Please select a customer.");
        if (!date) return toast.error("Please select a sale date.");

        const validRows = rows.filter(r => r.rm_id && parseFloat(r.quantity) > 0 && parseFloat(r.unitPrice) > 0);
        if (validRows.length === 0) return toast.error("Please add at least one valid material row.");
        const missingImei = validRows.findIndex((r) => !String(r.imei1 || "").trim());
        if (missingImei >= 0) return toast.error(`IMEI 1 is required on line ${missingImei + 1}`);
        const missingUnit = validRows.findIndex(
            (r) => Array.isArray(r.available_phones) && r.available_phones.length > 0 && !r.source_detail_id && !String(r.imei1 || "").trim()
        );
        if (missingUnit >= 0) {
            return toast.error(`Select a phone unit (IMEI) on line ${missingUnit + 1}`);
        }

        const user = JSON.parse(localStorage.getItem("user"));
        const saleData = {
            entityid: selectedCustomer,
            grand_total: parseFloat(grandTotal),
            sub_total: parseFloat(subTotal),
            discount: parseFloat(globalDiscount) || 0,
            delivery_charges: parseFloat(deliveryCharges),
            taxable_amount: parseFloat(taxableAmount),
            tax_amount: parseFloat(taxAmount),
            is_taxable: isTaxable,
            tax_mode: taxMode,
            tax_rate: parseFloat(taxRate),
            tax_id: taxId,
            type: "sale", 
            channel,
            createdby: user?.username || "guest",
            invoice_no: invoiceNo,
            ...contact,
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
                date,
                entity_customer_id: selectedCustomer,
                ...serializeDeviceFields(r),
                source_detail_id:
                    r.source_detail_id && !String(r.source_detail_id).startsWith("draft-")
                        ? Number(r.source_detail_id)
                        : null,
            })),
            source_doc_id: selectedSourceDoc ? Number(selectedSourceDoc) : null,
            source_doc_type: selectedSourceDoc ? "DC" : null,
        };

        try {
            if (isEditMode) {
                await api.put(`/rm-transactions/${editId}`, saleData);
                toast.success(`Sale Draft Updated Successfully! Code: ${invoiceNo}`);
            } else {
                const res = await api.post("/rm-transactions", saleData);
                toast.success(`Sale Transaction Saved as Draft! Invoice: ${res.data.invoice_no}`);
            }
            navigate(listPath);
        } catch (err) {
            toast.error(err.response?.data?.message || "Error saving sale transaction.");
        }
    };

    const handleQuickCustomerAdd = async () => {
        const name = document.getElementById('new_cust_name').value;
        const contact = document.getElementById('new_cust_contact').value;
        const address = document.getElementById('new_cust_address').value;
        if (!name) return toast.error("Customer name is required");
        try {
            const res = await api.post("/entities", { name, contact, address, type: "customer" });
            setCustomers(prev => [...prev, res.data]);
            setSelectedCustomer(res.data.id);
            setShowCustomerModal(false);
            toast.success("Customer Added!");
        } catch (err) { toast.error("Failed to add customer"); }
    };

    return (
        <div className="rm-page-wrapper">
            <NavigationBar />
            <div className="rm-content-container">
                <div className="rm-header-section">
                    <button type="button" className="back-btn erp-back-btn" onClick={() => navigate(listPath)}>
                        <FaArrowLeft />
                    </button>
                    <h2 className="form-title erp-page-title">{isEditMode ? `Modify ${channelLabel ? channelLabel + ' ' : ''}Sale Draft (${invoiceNo})` : (channelLabel ? `${channelLabel} Sale` : "Sale")}</h2>
                </div>

                <div className="rm-main-card">
                    <div className="info-grid">
                        <div className="info-item">
                            <label>Invoice No</label>
                            <input type="text" value={invoiceNo} readOnly className="rm-input-field readonly-input" style={{backgroundColor: '#f1f5f9'}} />
                        </div>
                        <div className="info-item">
                            <label>Customer</label>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <Select
                                    className="rm-input-field"
                                    classNamePrefix="react-select"
                                    options={customerOptions}
                                    value={customerOptions.find((option) => String(option.value) === String(selectedCustomer)) || null}
                                    onChange={(selectedOption) => setSelectedCustomer(selectedOption?.value || "")}
                                    isSearchable
                                    isClearable
                                    isDisabled={!!selectedSourceDoc}
                                />
                                <button type="button" className="quick-add-btn" onClick={() => setShowCustomerModal(true)} disabled={!!selectedSourceDoc}><FaPlus /></button>
                            </div>
                        </div>
                        <div className="info-item">
                            <label>Sale Date</label>
                            <input type="date" className="rm-input-field" value={date} onChange={(e) => setDate(e.target.value)} readOnly={!!selectedSourceDoc} />
                        </div>
                        {/* Source DC dropdown hidden for mobile shop
                        <div className="info-item">
                            <label>Source DC</label>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <select className="rm-input-field" value={selectedSourceDoc} onChange={(e) => handleSourceDocumentSelection(e.target.value)}>
                                    <option value="">Select DC (optional)</option>
                                    {sourceDocuments.map(doc => (
                                        <option key={doc.id} value={doc.id}>{doc.no}</option>
                                    ))}
                                </select>
                                <button type="button" className="quick-add-btn" onClick={() => navigate('/dc-form')}><FaPlus /></button>
                            </div>
                        </div>
                        */}
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="rm-items-scroll">
                        <div className="items-table-header" style={{ display: 'grid', gridTemplateColumns: '3.5fr 1.2fr 1.5fr 1fr', gap: '12px', fontWeight: 'bold', paddingBottom: '10px' }}>
                            <span>Model Name</span>
                            <span>Brand</span>
                            {/* <span>Qty</span> */}
                            <span>Unit Price</span>
                            {/* <span>Total</span> */}
                            <span>Action</span>
                        </div>

                        {rows.map((row, index) => {
                            // Value formation strictly forcing exact syntax matching pattern
                            const currentSelectionValue = row.rm_id && row.supplier_id ? `${Number(row.rm_id)}-${String(row.supplier_id).trim()}` : "";

                            return (
                                <div className="item-row" key={index} style={{ display: 'grid', gridTemplateColumns: '3.5fr 1.2fr 1.5fr 1fr', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                                    
                                    <div className="erp-col-stack" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                        <Select
                                            className="rm-input-field"
                                            classNamePrefix="react-select"
                                            options={materialOptions}
                                            value={materialOptions.find((option) => option.value === currentSelectionValue) || null}
                                            onChange={(selectedOption) => handleMaterialSelection(index, selectedOption?.value || "")}
                                            isSearchable
                                            isClearable
                                            isDisabled={!!selectedSourceDoc}
                                            placeholder="Select model / supplier"
                                        />
                                        </div>
                                        <ModelImeiScanBtn
                                            disabled={!!selectedSourceDoc}
                                            onScanned={(imei) => handleImeiModelScan(index, imei)}
                                            title="Scan IMEI — auto select model & phone"
                                        />
                                        </div>
                                        {row.rm_id && (
                                            <small className='text-success' style={{ fontSize: '12px', paddingLeft: '4px', marginTop: '2px' }}>
                                                In stock: {phoneOptionsForRow(row, index).length || Number(row.current_stock) || 0} phone(s)
                                            </small>
                                        )}
                                        {row.rm_id ? (
                                            <select
                                                className="rm-input-field"
                                                value={row.source_detail_id ? String(row.source_detail_id) : ""}
                                                onChange={(e) => handlePhoneUnitSelection(index, e.target.value)}
                                                disabled={!!selectedSourceDoc}
                                                style={{ marginTop: '2px', fontSize: '12px' }}
                                            >
                                                <option value="">
                                                    {phoneOptionsForRow(row, index).length
                                                        ? "Select phone (IMEI | Cost | Cond | Color | RAM/ROM)"
                                                        : "No available IMEI units"}
                                                </option>
                                                {phoneOptionsForRow(row, index).map((p) => (
                                                    <option key={String(p.source_detail_id)} value={String(p.source_detail_id)}>
                                                        {p.label}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : null}
                                        {row.source_detail_id && row.purchase_cost !== "" && row.purchase_cost != null ? (
                                            <small style={{ fontSize: '11px', color: '#64748b', paddingLeft: '4px' }}>
                                                Purchase cost: {Number(row.purchase_cost).toLocaleString()} (COGS) — enter sale price →
                                            </small>
                                        ) : null}
                                    </div>

                                    {Array.isArray(row.pack_sizes) && row.pack_sizes.length > 1 ? (
                                        <select
                                            className="rm-input-field"
                                            style={{ marginTop: '0px' }}
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
                                        <input type="text" className="rm-input-field readonly-input" style={{ marginTop: '0px' }} placeholder="Brand" value={row.uom_name} readOnly />
                                    )}
                                    {/* Qty hidden — each row = 1 phone (qty defaults to 1)
                                    <div className="erp-col-stack" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <input type="number" className="rm-input-field" placeholder="Qty" value={row.quantity} onChange={(e) => handleChange(index, "quantity", e.target.value)} />
                                        {Number(row.factor) !== 1 && parseFloat(row.quantity) > 0 && (
                                            <small style={{ fontSize: '11px', color: '#3182ce', paddingLeft: '4px' }}>
                                                = {(parseFloat(row.quantity) * Number(row.factor)).toFixed(2)} base units
                                            </small>
                                        )}
                                    </div>
                                    */}
                                    <input type="number" className="rm-input-field" placeholder="Price" value={row.unitPrice} onChange={(e) => handleChange(index, "unitPrice", e.target.value)} />
                                    {/* <input type="text" className="rm-input-field readonly-input" placeholder='Total' value={row.total} readOnly /> */}

                                    <div className="erp-row-actions">
                                        <button type="button" className="quick-add-btn" style={{ color: '#3182ce' }} onClick={addRow} disabled={!!selectedSourceDoc}><FaPlus /></button>
                                        {rows.length > 1 && (
                                            <button type="button" className="quick-add-btn" style={{ color: '#e53e3e' }} onClick={() => deleteRow(index)} disabled={!!selectedSourceDoc}><FaTrash /></button>
                                        )}
                                    </div>
                                    <DeviceLineFields
                                        row={row}
                                        index={index}
                                        onChange={handleChange}
                                        disabled={!!selectedSourceDoc}
                                        fieldsLocked={!!row.source_detail_id}
                                    />
                                </div>
                            );
                        })}
                        </div>

                        <InvoiceContactBlock contact={contact} setContact={setContact} />

                        <div className="summary-container" style={{ marginTop: '20px' }}>
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
                                <input type="number" className="rm-input-field" style={{ width: '120px' }} value={globalDiscount} onChange={(e) => handleGlobalDiscountChange(e.target.value)} />
                            </div>
                            <div className="summary-row">
                                <label>Delivery Charges:</label>
                                <input type="number" className="rm-input-field" style={{ width: '120px' }} value={deliveryCharges} onChange={(e) => handleDeliveryChargesChange(e.target.value)} />
                            </div>
                            <div className="summary-row grand-total-box">
                                <b>Grand Total:</b>
                                <b>{grandTotal}</b>
                            </div>
                        </div>

                        <div className="erp-form-actions">
                            <button type="submit" className="save-btn">{isEditMode ? "Update Sale Draft" : "Save Sale Draft"}</button>
                        </div>
                    </form>
                </div>
            </div>
            <Footer />
            {showCustomerModal && (
                <div className="modal-overlay" onClick={() => setShowCustomerModal(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Add New Customer</h3>
                           
                        </div>
                        <div className="modal-body">
                            <div className="form-group"><label>Name *</label><input type="text" id="new_cust_name" className="rm-input-field" /></div>
                            <div className="form-group"><label>Address</label><input type="text" id="new_cust_address" className="rm-input-field" /></div>
                            <div className="form-group"><label>Contact</label><input type="text" id="new_cust_contact" className="rm-input-field" /></div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="save-btn" onClick={handleQuickCustomerAdd}>Save Customer</button>
                            <button type="button" className="modal-cancel-btn" onClick={() => setShowCustomerModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RM_SaleForm;