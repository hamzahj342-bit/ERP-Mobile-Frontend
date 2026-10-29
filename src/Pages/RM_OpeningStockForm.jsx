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
import { EMPTY_DEVICE_FIELDS } from '../constants/mobileDeviceOptions';

const emptyOpeningRow = () => ({
    rm_id: "",
    rm_name: "",
    quantity: "1",
    unitPrice: "",
    total: "",
    uom_id: "",
    uom_name: "",
    ...EMPTY_DEVICE_FIELDS,
});

const RM_OpeningStockForm = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const queryParams = new URLSearchParams(location.search);
    const editId = queryParams.get('editId');
    const isEditMode = !!editId;

    const HARDCODED_STARTUP_SUPPLIER_ID = 999999;
    const listPath = '/rm-opening-stock-entry';

    const [rows, setRows] = useState([emptyOpeningRow()]);
    const [materials, setMaterials] = useState([]);
    const [invoiceNo, setInvoiceNo] = useState("");
    const [date, setDate] = useState("");
    const [subTotal, setSubTotal] = useState(0);
    const [globalDiscount, setGlobalDiscount] = useState("");
    const [grandTotal, setGrandTotal] = useState(0);
    const [showMaterialModal, setShowMaterialModal] = useState(false);
    const [uoms, setUoms] = useState([]);
    const [newMaterialName, setNewMaterialName] = useState("");
    const [newMaterialUom, setNewMaterialUom] = useState("");

    const materialOptions = materials.map((material) => ({
        value: material.rm_id,
        label: material.name || material.material_name || material.rm_name || "Model",
    }));

    const fetchInvoiceNo = useCallback(async () => {
        if (isEditMode) return;
        try {
            const res = await api.get("/rm-transactions/rm-invoice", {
                params: { type: "Opening" },
            });
            setInvoiceNo(res.data.invoice_no);
        } catch (err) {
            console.error("Error fetching opening invoice no:", err);
            toast.error("Could not load next OPENING invoice number.");
        }
    }, [isEditMode]);

    const calculateTotals = (currentRows, discountValue) => {
        const currentSubTotal = currentRows.reduce((sum, row) => {
            const qty = parseFloat(row.quantity) || 0;
            const price = parseFloat(row.unitPrice) || 0;
            return sum + qty * price;
        }, 0);

        const discount = parseFloat(discountValue) || 0;
        const netValue = Math.max(0, currentSubTotal - discount);

        setSubTotal(currentSubTotal.toFixed(2));
        setGrandTotal(netValue.toFixed(2));
    };

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [materialsRes, uomsRes] = await Promise.all([
                    api.get("/add-materials"),
                    api.get("/uoms"),
                ]);

                setMaterials(materialsRes.data);
                setUoms(uomsRes.data);

                if (!isEditMode) {
                    await fetchInvoiceNo();
                } else {
                    const editRes = await api.get(`/rm-transactions/edit-preview/${editId}`);
                    const { master, details, invoiceDate } = editRes.data;

                    setInvoiceNo(master.invoice_no);

                    if (invoiceDate) {
                        setDate(new Date(invoiceDate).toISOString().split("T")[0]);
                    }

                    setSubTotal(parseFloat(master.subtotal || 0).toFixed(2));
                    setGlobalDiscount(master.discount || "");
                    setGrandTotal(parseFloat(master.grand_total || 0).toFixed(2));

                    if (Array.isArray(details) && details.length > 0) {
                        const mappedRows = details.map((d) => {
                            const qty = Math.abs(parseFloat(d.quantity) || 1);
                            const price = parseFloat(d.unit_price) || 0;
                            const matchingMaterial = materialsRes.data.find(
                                (m) => m.rm_id === parseInt(d.rm_id, 10)
                            );

                            return {
                                ...emptyOpeningRow(),
                                rm_id: d.rm_id,
                                rm_name: d.rm_name,
                                quantity: "1",
                                unitPrice: price,
                                total: (qty * price).toFixed(2),
                                uom_id: d.uom_id || matchingMaterial?.uom?.id || "",
                                uom_name: d.uom_name || matchingMaterial?.uom?.name || "",
                                imei1: d.imei1 || "",
                                imei2: d.imei2 || "",
                                ram: d.ram || "",
                                rom: d.rom || "",
                                color: d.color || "",
                                condition: d.condition || "",
                            };
                        });
                        setRows(mappedRows);
                    }
                }
            } catch (err) {
                console.error("Opening stock load error:", err);
                toast.error("Failed to load opening stock form data.");
            }
        };

        loadInitialData();
    }, [editId, isEditMode, fetchInvoiceNo]);

    const handleChange = (index, field, value) => {
        const updated = [...rows];
        updated[index][field] = value;

        if (field === "quantity" || field === "unitPrice") {
            const qty = parseFloat(updated[index].quantity) || 0;
            const price = parseFloat(updated[index].unitPrice) || 0;
            updated[index].total = (qty * price).toFixed(2);
        }

        setRows(updated);
        calculateTotals(updated, globalDiscount);
    };

    const handleGlobalDiscountChange = (value) => {
        setGlobalDiscount(value);
        calculateTotals(rows, value);
    };

    const addRow = () => {
        setRows([...rows, emptyOpeningRow()]);
    };

    const deleteRow = (index) => {
        const updated = rows.filter((_, i) => i !== index);
        setRows(updated);
        calculateTotals(updated, globalDiscount);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!date) return toast.error("Please select a setup date.");

        const validRows = rows.filter(
            (r) => r.rm_id && parseFloat(r.quantity) > 0 && parseFloat(r.unitPrice) > 0
        );
        if (validRows.length === 0) return toast.error("Please add at least one phone line.");

        const missingImei = validRows.findIndex((r) => !String(r.imei1 || "").trim());
        if (missingImei >= 0) {
            return toast.error(`IMEI 1 is required on line ${missingImei + 1}`);
        }

        const disc = parseFloat(globalDiscount) || 0;
        if (disc > parseFloat(subTotal)) {
            return toast.error("Discount cannot exceed sub total.");
        }

        const user = JSON.parse(localStorage.getItem("user"));

        const payload = {
            entityid: HARDCODED_STARTUP_SUPPLIER_ID,
            grand_total: parseFloat(grandTotal),
            sub_total: parseFloat(subTotal),
            discount: disc,
            taxable_amount: parseFloat(grandTotal),
            tax_amount: 0.0,
            is_taxable: false,
            tax_mode: "exclusive",
            tax_rate: 0.0,
            tax_id: null,
            type: "purchase",
            createdby: user?.username || "system",
            invoice_no: invoiceNo,
            details: validRows.map((r) => ({
                rm_id: r.rm_id,
                rm_name: r.rm_name,
                quantity: 1,
                unit_price: parseFloat(r.unitPrice),
                total_price: parseFloat(r.unitPrice),
                uom_id: r.uom_id,
                date,
                entity_supplier_id: HARDCODED_STARTUP_SUPPLIER_ID,
                imei1: r.imei1,
                imei2: r.imei2 || null,
                ram: r.ram || null,
                rom: r.rom || null,
                color: r.color || null,
                condition: r.condition || null,
            })),
        };

        try {
            if (isEditMode) {
                await api.put(`/rm-transactions/${editId}`, payload);
                toast.success(`Opening stock updated: ${invoiceNo}`);
            } else {
                const res = await api.post("/rm-transactions/initialize", payload);
                const savedNo = res.data?.invoice_no || invoiceNo;
                toast.success(`Opening stock saved: ${savedNo}`);
            }
            navigate(listPath);
        } catch (err) {
            toast.error(err.response?.data?.message || "Error saving opening stock.");
        }
    };

    const handleQuickMaterialAdd = async () => {
        if (!newMaterialName || !newMaterialUom) return toast.error("Please fill all fields");
        try {
            const payload = {
                name: newMaterialName,
                material_name: newMaterialName,
                uom_id: parseInt(newMaterialUom, 10),
            };

            const res = await api.post("/add-materials", payload);
            const savedItem = res.data?.data || res.data;

            if (savedItem) {
                setMaterials((prev) => [...prev, savedItem]);
                toast.success("Model added!");
            } else {
                const refreshRes = await api.get("/add-materials");
                setMaterials(refreshRes.data);
                toast.info("Models synced.");
            }

            setNewMaterialName("");
            setNewMaterialUom("");
            setShowMaterialModal(false);
        } catch (err) {
            console.error("Quick Model Add Error:", err);
            toast.error(err.response?.data?.message || "Failed to add model.");
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
                    <h2 className="form-title erp-page-title">
                        {isEditMode ? `Modify Opening Stock (${invoiceNo})` : "Opening Stock Entry"}
                    </h2>
                </div>

                <div className="rm-main-card">
                    <div className="info-grid">
                        <div className="info-item">
                            <label>Invoice No</label>
                            <input
                                type="text"
                                value={invoiceNo}
                                readOnly
                                className="rm-input-field readonly-input"
                                style={{ backgroundColor: "#e2e8f0", fontWeight: "bold" }}
                            />
                        </div>
                        <div className="info-item">
                            <label>Setup Date</label>
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
                                <span>Unit Cost</span>
                                <span>Action</span>
                            </div>

                            {rows.map((row, index) => (
                                <div className="item-row" key={index}>
                                    <div style={{ display: "flex", gap: "8px" }}>
                                        <Select
                                            className="rm-input-field"
                                            classNamePrefix="react-select"
                                            options={materialOptions}
                                            value={
                                                materialOptions.find(
                                                    (option) => String(option.value) === String(row.rm_id)
                                                ) || null
                                            }
                                            isSearchable
                                            isClearable
                                            onChange={(selectedOption) => {
                                                const selectedValue = selectedOption?.value || "";
                                                const selected = materials.find(
                                                    (m) => m.rm_id === parseInt(selectedValue, 10)
                                                );
                                                handleChange(index, "rm_id", selectedValue);
                                                handleChange(
                                                    index,
                                                    "rm_name",
                                                    selected?.name || selected?.material_name || ""
                                                );
                                                handleChange(
                                                    index,
                                                    "uom_id",
                                                    selected?.uom?.id || selected?.uom_id || ""
                                                );
                                                handleChange(
                                                    index,
                                                    "uom_name",
                                                    selected?.uom?.name || selected?.uom_name || ""
                                                );
                                            }}
                                        />
                                        <button
                                            type="button"
                                            className="quick-add-btn"
                                            onClick={() => setShowMaterialModal(true)}
                                        >
                                            <FaPlus />
                                        </button>
                                    </div>

                                    <input
                                        type="text"
                                        className="rm-input-field readonly-input"
                                        placeholder="Brand"
                                        value={row.uom_name}
                                        readOnly
                                    />
                                    <input
                                        type="number"
                                        className="rm-input-field"
                                        placeholder="Cost"
                                        value={row.unitPrice}
                                        onChange={(e) => handleChange(index, "unitPrice", e.target.value)}
                                    />

                                    <div className="erp-row-actions">
                                        <button
                                            type="button"
                                            className="quick-add-btn"
                                            style={{ color: "#3182ce" }}
                                            onClick={addRow}
                                        >
                                            <FaPlus />
                                        </button>
                                        {rows.length > 1 && (
                                            <button
                                                type="button"
                                                className="quick-add-btn"
                                                style={{ color: "#e53e3e" }}
                                                onClick={() => deleteRow(index)}
                                            >
                                                <FaTrash />
                                            </button>
                                        )}
                                    </div>
                                    <DeviceLineFields row={row} index={index} onChange={handleChange} />
                                </div>
                            ))}
                        </div>

                        <div className="summary-container">
                            <div className="summary-row">
                                <label>Sub Total:</label>
                                <span>{subTotal}</span>
                            </div>
                            <div className="summary-row">
                                <label>Discount:</label>
                                <input
                                    type="number"
                                    className="rm-input-field"
                                    style={{ width: "120px" }}
                                    value={globalDiscount}
                                    onChange={(e) => handleGlobalDiscountChange(e.target.value)}
                                />
                            </div>
                            <div className="summary-row grand-total-box">
                                <b>Grand Total:</b>
                                <b>{grandTotal}</b>
                            </div>
                        </div>

                        <div className="erp-form-actions">
                            <button type="submit" className="save-btn">
                                {isEditMode ? "Update Opening Stock" : "Post Opening Stock"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            <Footer />

            {showMaterialModal && (
                <div
                    className="modal-overlay"
                    onClick={() => {
                        setShowMaterialModal(false);
                        setNewMaterialName("");
                        setNewMaterialUom("");
                    }}
                >
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
                            <select
                                className="rm-input-field"
                                value={newMaterialUom}
                                onChange={(e) => setNewMaterialUom(e.target.value)}
                            >
                                <option value="">Select Brand</option>
                                {uoms.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="save-btn" onClick={handleQuickMaterialAdd}>
                                Save Model
                            </button>
                            <button
                                type="button"
                                className="modal-cancel-btn"
                                onClick={() => {
                                    setShowMaterialModal(false);
                                    setNewMaterialName("");
                                    setNewMaterialUom("");
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RM_OpeningStockForm;
