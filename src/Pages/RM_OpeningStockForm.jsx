import React, { useState, useEffect } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaPlus, FaTrash } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import Footer from '../Components/Footer';
import { toast } from 'react-toastify';
import api from '../../api';
import '../Model.css';
import '../Transactions.css';

const RM_OpeningStockForm = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const queryParams = new URLSearchParams(location.search);
    const editId = queryParams.get('editId'); 
    const isEditMode = !!editId;

    // System Default Startup ID matching ledger database override
    const HARDCODED_STARTUP_SUPPLIER_ID = 999999;

    const [rows, setRows] = useState([
        { rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "" }
    ]);
    const [materials, setMaterials] = useState([]);
    const [invoiceNo, setInvoiceNo] = useState("");
    const [date, setDate] = useState("");
    const [subTotal, setSubTotal] = useState(0);
    const [globalDiscount, setGlobalDiscount] = useState("");
    const [grandTotal, setGrandTotal] = useState(0);
    const [showMaterialModal, setShowMaterialModal] = useState(false);
    const [uoms, setUoms] = useState([]);

    // --- State Controlled Modal Variables for flawless UI Sync ---
    const [newMaterialName, setNewMaterialName] = useState("");
    const [newMaterialUom, setNewMaterialUom] = useState("");

    // Generate explicit system runtime invoice number on frontend
    const generateFrontendInvoiceNo = () => {
        const uniqueSequence = Math.floor(100000 + Math.random() * 900000); 
        return `OPENING-${uniqueSequence}`;
    };

    // ---------------------------------------------------------
    // 🔥 CALCULATION MECHANICS (TAX REMOVED)
    // ---------------------------------------------------------
    const calculateTotals = (currentRows, discountValue) => {
        const currentSubTotal = currentRows.reduce((sum, row) => {
            const qty = parseFloat(row.quantity) || 0;
            const price = parseFloat(row.unitPrice) || 0;
            return sum + (qty * price);
        }, 0);

        const discount = parseFloat(discountValue) || 0;
        const netValue = Math.max(0, currentSubTotal - discount);

        setSubTotal(currentSubTotal.toFixed(2));
        setGrandTotal(netValue.toFixed(2));
    };

    // ---------------------------------------------------------
    // 🔥 ASYNC INITIALIZATION PIPELINE
    // ---------------------------------------------------------
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // Parallel fetching of setup masters
                const [materialsRes, uomsRes] = await Promise.all([
                    api.get("/add-materials"),
                    api.get('/uoms')
                ]);

                setMaterials(materialsRes.data);
                setUoms(uomsRes.data);

                if (!isEditMode) {
                    setInvoiceNo(generateFrontendInvoiceNo());
                } else {
                    // Initialization loading sequence for edit structures
                    const editRes = await api.get(`/rm-transactions/edit-preview/${editId}`);
                    const { master, details, invoiceDate } = editRes.data;

                    setInvoiceNo(master.invoice_no);
                    
                    if (invoiceDate) {
                        setDate(new Date(invoiceDate).toISOString().split('T')[0]);
                    }
                    
                    setSubTotal(parseFloat(master.subtotal || 0).toFixed(2));
                    setGlobalDiscount(master.discount || "");
                    setGrandTotal(parseFloat(master.grand_total || 0).toFixed(2));

                    if (Array.isArray(details) && details.length > 0) {
                        const mappedRows = details.map(d => {
                            const qty = Math.abs(parseFloat(d.quantity) || 0);
                            const price = parseFloat(d.unit_price) || 0;
                            const matchingMaterial = materialsRes.data.find(m => m.rm_id === parseInt(d.rm_id));

                            return {
                                rm_id: d.rm_id,
                                rm_name: d.rm_name,
                                quantity: qty,
                                unitPrice: price,
                                total: (qty * price).toFixed(2),
                                uom_id: d.uom_id || matchingMaterial?.uom?.id || "",
                                uom_name: d.uom_name || matchingMaterial?.uom?.name || ""
                            };
                        });
                        setRows(mappedRows);
                    }
                }
            } catch (err) {
                console.error("Configuration initialization tracking pipeline error:", err);
                toast.error("Failed to load required transactional data structures.");
            }
        };

        loadInitialData();
    }, [editId, isEditMode]);

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
        setRows([...rows, { rm_id: "", rm_name: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "" }]);
    };

    const deleteRow = (index) => {
        const updated = rows.filter((_, i) => i !== index);
        setRows(updated);
        calculateTotals(updated, globalDiscount);
    };

    // ---------------------------------------------------------
    // 🔥 DATA POST SUBMISSION PIPELINE
    // ---------------------------------------------------------
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!date) return toast.error("Please select a initialization runtime date.");

        const validRows = rows.filter(r => r.rm_id && parseFloat(r.quantity) > 0 && parseFloat(r.unitPrice) > 0);
        if (validRows.length === 0) return toast.error("Please add at least one execution initialization item.");

        const disc = parseFloat(globalDiscount) || 0;
        if (disc > parseFloat(subTotal)) {
            return toast.error("Global system discount limits exceeded.");
        }

        const user = JSON.parse(localStorage.getItem("user"));
        
        const initializationPayload = {
            entityid: HARDCODED_STARTUP_SUPPLIER_ID, 
            grand_total: parseFloat(grandTotal),
            sub_total: parseFloat(subTotal),
            discount: disc,
            taxable_amount: parseFloat(grandTotal), 
            tax_amount: 0.00,
            is_taxable: false,
            tax_mode: 'exclusive',
            tax_rate: 0.00,
            tax_id: null,
            type: "purchase", 
            createdby: user?.username || "system",
            invoice_no: invoiceNo,
            details: validRows.map(r => ({
                rm_id: r.rm_id,
                rm_name: r.rm_name,
                quantity: parseFloat(r.quantity),
                unit_price: parseFloat(r.unitPrice),
                total_price: parseFloat(r.total),
                uom_id: r.uom_id,
                date,
                entity_supplier_id: HARDCODED_STARTUP_SUPPLIER_ID,
            }))
        };

        try {
            if (isEditMode) {
                await api.put(`/rm-transactions/${editId}`, initializationPayload);
                toast.success(`Opening Balance Configuration Updated: ${invoiceNo}`);
            } else {
                await api.post("/rm-transactions/initialize", initializationPayload);
                toast.success(`Opening Stock Setup Complete! Code: ${invoiceNo}`);
            }
            navigate("/rm-purchase");
        } catch (err) {
            toast.error(err.response?.data?.message || "Internal transaction structure mismatch error.");
        }
    };

    // ---------------------------------------------------------
    // 🔥 SAFELY MANAGED QUICK MATERIAL ADD PIPELINE WITH SCHEMA FALLBACK
    // ---------------------------------------------------------
    const handleQuickMaterialAdd = async () => {
        if (!newMaterialName || !newMaterialUom) return toast.error("Please fill all fields");
        try {
            // Frontend validation object keys mapping backup strategy
            const payload = { 
                name: newMaterialName,               // Fallback 1
                material_name: newMaterialName,      // Fallback 2 (If backend expects material_name)
                uom_id: parseInt(newMaterialUom) 
            };

            const res = await api.post("/add-materials", payload);
            
            // Backend raw item payload schema verification logic
            const savedItem = res.data?.data || res.data;
            
            if (savedItem) {
                setMaterials(prev => [...prev, savedItem]);
                toast.success("Material Added Successfully!");
            } else {
                // Force sync re-fetch operation to prevent structural dropouts
                const refreshRes = await api.get("/add-materials");
                setMaterials(refreshRes.data);
                toast.info("Materials synced with system server context.");
            }
            
            setNewMaterialName("");
            setNewMaterialUom("");
            setShowMaterialModal(false);
        } catch (err) { 
            console.error("Quick Material Add Error Stack:", err);
            toast.error(err.response?.data?.message || "Backend rejected initialization payload validation rules."); 
        }
    };

    return (
        <div className="rm-page-wrapper">
            <NavigationBar />

            <div className="rm-content-container">
                <div className="rm-header-section">
                    <button type="button" className="back-btn" onClick={() => navigate(-1)}>
                        <FaArrowLeft />
                    </button>
                    <h2 className="form-title">{isEditMode ? `Modify Opening Stock Entry (${invoiceNo})` : "Opening Stock Entry"}</h2>
                </div>

                <div className="rm-main-card">
                    <div className="info-grid">
                        <div className="info-item">
                            <label>System Generated Invoice No</label>
                            <input type="text" value={invoiceNo} readOnly className="rm-input-field readonly-input" style={{backgroundColor: '#e2e8f0', fontWeight: 'bold'}} />
                        </div>
                        {/* <div className="info-item">
                            <label>System Account Default Target Entity</label>
                            <input type="text" value="Opening Balance Account (System Auto Set)" readOnly className="rm-input-field readonly-input" style={{backgroundColor: '#f1f5f9', color: '#4a5568'}} />
                        </div> */}
                        <div className="info-item">
                            <label>Setup / Initialization Date</label>
                            <input type="date" className="rm-input-field" value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="items-table-header">
                            <span>Material</span>
                            <span>Brand</span>
                            <span>Qty</span>
                            <span>Unit Cost Price</span>
                            <span>Total</span>
                            <span>Action</span>
                        </div>

                        {rows.map((row, index) => (
                            <div className="item-row" key={index}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <select
                                        className="rm-input-field"
                                        value={row.rm_id}
                                        onChange={(e) => {
                                            const selected = materials.find(m => m.rm_id === parseInt(e.target.value));
                                            handleChange(index, "rm_id", e.target.value);
                                            handleChange(index, "rm_name", selected?.name || selected?.material_name || "");
                                            handleChange(index, "uom_id", selected?.uom?.id || selected?.uom_id || "");
                                            handleChange(index, "uom_name", selected?.uom?.name || selected?.uom_name || "");
                                        }}
                                    >
                                        <option value="">Select Material</option>
                                        {materials.map(m => (
                                            <option key={m.rm_id} value={m.rm_id}>
                                                {m.name || m.material_name}
                                            </option>
                                        ))}
                                    </select>
                                    <button type="button" className="quick-add-btn" onClick={() => setShowMaterialModal(true)}><FaPlus /></button>
                                </div>

                                <input type="text" className="rm-input-field readonly-input" placeholder="Brand" value={row.uom_name} readOnly />
                                <input type="number" className="rm-input-field" placeholder="Qty" value={row.quantity} onChange={(e) => handleChange(index, "quantity", e.target.value)} />
                                <input type="number" className="rm-input-field" placeholder="Price" value={row.unitPrice} onChange={(e) => handleChange(index, "unitPrice", e.target.value)} />
                                <input type="text" className="rm-input-field readonly-input" placeholder='Total' value={row.total} readOnly />

                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <button type="button" className="quick-add-btn" style={{ color: '#3182ce' }} onClick={addRow}><FaPlus /></button>
                                    {rows.length > 1 && (
                                        <button type="button" className="quick-add-btn" style={{ color: '#e53e3e' }} onClick={() => deleteRow(index)}><FaTrash /></button>
                                    )}
                                </div>
                            </div>
                        ))}

                        <div className="summary-container">
                            <div className="summary-row">
                                <label>Sub Total Amount:</label>
                                <span>{subTotal}</span>
                            </div>
                            <div className="summary-row">
                                <label>System Setup Discount:</label>
                                <input type="number" className="rm-input-field" style={{ width: '120px' }} value={globalDiscount} onChange={(e) => handleGlobalDiscountChange(e.target.value)} />
                            </div>
                            <div className="summary-row grand-total-box">
                                <b>Calculated Setup Total:</b>
                                <b>{grandTotal}</b>
                            </div>
                        </div>

                        <button type="submit" className="save-btn">{isEditMode ? "Update Initialization Draft" : "Post Opening Stock Setup"}</button>
                    </form>
                </div>
            </div>
            <Footer />

            {/* 🔥 EXACT MATERIAL MODAL FROM RM_PURCHASEFORM WITH DUAL BINDING KEYS */}
            {showMaterialModal && (
                <div className="modal-overlay" onClick={() => setShowMaterialModal(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <h3>Add New Material</h3>
                        <div className="form-group">
                            <label>Material Name</label>
                            <input 
                                type="text" 
                                className="rm-input-field" 
                                value={newMaterialName} 
                                onChange={(e) => setNewMaterialName(e.target.value)} 
                                placeholder="Enter material name" 
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
                                {uoms.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="save-btn" onClick={handleQuickMaterialAdd}>Save Material</button>
                            <button type="button" className="quick-add-btn" onClick={() => setShowMaterialModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RM_OpeningStockForm;