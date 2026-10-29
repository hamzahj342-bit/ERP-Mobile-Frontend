import React, { useState, useEffect, useCallback } from "react";
import NavigationBar from "../Components/NavigationBar";
import { FaArrowLeft, FaPlus, FaTrash } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import Footer from "../Components/Footer";
import { toast } from "react-toastify";
import api from "../../api";
import '../Model.css';
import '../Transactions.css'; // Shared layout matrices

const FP_SaleReturnForm = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // FP_SaleForm ki tarhan exact routing params mapping
    const queryParams = new URLSearchParams(location.search);
    const invoiceType = queryParams.get('invoiceType');
    const editId = queryParams.get('editId'); // Matching your FP_Sale edit parameter name
    const isEditMode = !!editId;

    const [rows, setRows] = useState([
        { product_master_id: "", product_name: "", recipe_id: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", stock: 0 }
    ]);

    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [invoiceNo, setInvoiceNo] = useState("");
    const [date, setDate] = useState("");

    const [subTotal, setSubTotal] = useState(0);
    const [taxableAmount, setTaxableAmount] = useState(0);
    const [taxAmount, setTaxAmount] = useState(0);
    const [grandTotal, setGrandTotal] = useState(0);
    const [isTaxable, setIsTaxable] = useState(() => invoiceType !== 'nonTaxable');
    const [taxMode, setTaxMode] = useState('exclusive');
    const [taxRate, setTaxRate] = useState(0);
    const [taxId, setTaxId] = useState(null);
    const [loading, setLoading] = useState(false);

    // --- Customer Fetch logic tailored for Return workflow ---
    const fetchCustomersForReturn = async () => {
        try {
            const res = await api.get("/fp-sale/customers-for-return");
            setCustomers(res.data);
        } catch (err) { 
            console.error("Error fetching return entities:", err); 
        }
    };

    const fetchInvoiceNo = useCallback(async () => {
        if (isEditMode) return;
        try {
            const res = await api.get("/fp-sale/invoice-no", { params: { type: "SaleReturn" } });
            setInvoiceNo(res.data.invoice_no);
        } catch (err) { 
            console.error("Error fetching invoice:", err); 
        }
    }, [isEditMode]);

    // --- Calculation Logic Matrix (FP_Sale Sync) ---
    const calculateTotals = (currentRows, currentIsTaxable = isTaxable, currentTaxMode = taxMode, currentTaxRate = taxRate) => {
        const currentSubTotal = currentRows.reduce((sum, row) => {
            const qty = parseFloat(row.quantity) || 0;
            const price = parseFloat(row.unitPrice) || 0;
            return sum + (qty * price);
        }, 0);

        const netValue = Math.max(0, currentSubTotal); // Sale Return me discrete discount use nahi ho raha baseline configuration me

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

    // --- Master Data Loading & Edit Mode Auto-Fill Structure ---
    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            try {
                // Initialize fallback entities first
                await fetchCustomersForReturn();
                
                if (!isEditMode) {
                    await fetchInvoiceNo();
                } else {
                    // Hits edit view end-point for tracking
                    const editRes = await api.get(`/fp-sale/edit-preview/${editId}`);
                    
                    // Handling both formats: direct object OR nested object wrapper { data: { master, details } }
                    const responseData = editRes.data?.data ? editRes.data.data : editRes.data;
                    const master = responseData?.master || responseData;
                    const details = responseData?.details || responseData?.Sale_Details || [];

                    if (!master || !master.invoice_no) {
                        throw new Error("Invoice master record layout initialization missing.");
                    }

                    setInvoiceNo(master.invoice_no);
                    setSelectedCustomer(master.entity_customer_id || master.entityid);
                    
                    if (master.date || master.invoiceDate) {
                        setDate(new Date(master.date || master.invoiceDate).toISOString().split('T')[0]);
                    }
                    
                    setSubTotal(parseFloat(master.sub_total || 0).toFixed(2));
                    setIsTaxable(master.is_taxable);
                    setTaxMode(master.tax_mode || 'exclusive');
                    setTaxRate(Number(master.tax_rate) || 0);
                    setTaxId(master.tax_id);
                    setTaxableAmount(parseFloat(master.taxable_amount || 0).toFixed(2));
                    setTaxAmount(parseFloat(master.tax_amount || 0).toFixed(2));
                    setGrandTotal(parseFloat(master.grand_total || 0).toFixed(2));

                    // Customer specific products dynamically stream down mapping
                    const custProductRes = await api.get(`/fp-sale/products-by-customer/${master.entity_customer_id || master.entityid}`);
                    setProducts(custProductRes.data);

                    if (Array.isArray(details) && details.length > 0) {
                        const mappedRows = details.map(d => {
                            const qty = Math.abs(parseFloat(d.quantity) || 0);
                            const price = parseFloat(d.unit_price) || 0;
                            const matchingProduct = custProductRes.data.find(p => String(p.recipe_id) === String(d.recipe_id));

                            // Safe inventory return allowance allocation
                            const baseReturnStock = parseFloat(matchingProduct?.max_return_qty) || 0;
                            const totalReturnAllowed = baseReturnStock + qty;

                            return {
                                product_master_id: d.product_master_id,
                                product_name: d.product_name,
                                recipe_id: d.recipe_id,
                                quantity: qty,
                                unitPrice: price,
                                total: (qty * price).toFixed(2),
                                uom_id: d.uom_id || matchingProduct?.uom_id || "",
                                uom_name: d.uom_name || matchingProduct?.uom_name || "",
                                stock: totalReturnAllowed // sets temporary bounds dynamically for processing modifications
                            };
                        });
                        setRows(mappedRows);
                    }
                }
            } catch (err) {
                console.error("Initialization failed:", err);
                toast.error("Failed to compile return layout initialization states.");
                if (isEditMode) navigate("/fp-salereturn-list");
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, [editId, isEditMode, navigate, fetchInvoiceNo]);

    // --- On-The-Fly Customer Choice Workflow ---
    const handleCustomerChange = async (customerId) => {
        if (isEditMode) return; // Frozen protection context inside update modes
        setSelectedCustomer(customerId);
        if (!customerId) {
            setProducts([]);
            return;
        }

        try {
            const res = await api.get(`/fp-sale/products-by-customer/${customerId}`);
            setProducts(res.data);
            
            // Auto tax system fetch loop configuration matching customer master records
            const taxRes = await api.get(`/fp-sale/customer-last-tax/${customerId}`).catch(() => null);
            if (taxRes && taxRes.data) {
                setTaxId(taxRes.data.tax_id || null);
                setTaxRate(Number(taxRes.data.tax_rate) || 0);
                setTaxMode('exclusive');
                calculateTotals(rows, isTaxable, 'exclusive', Number(taxRes.data.tax_rate) || 0);
            }
        } catch (err) {
            console.error("Failed to query customer product maps:", err);
        }
    };

    const handleChange = (index, field, value) => {
        const updated = [...rows];
        updated[index][field] = value;

        if (field === "quantity" || field === "unitPrice") {
            const qty = parseFloat(updated[index].quantity) || 0;
            const price = parseFloat(updated[index].unitPrice) || 0;
            const allowedStock = parseFloat(updated[index].stock) || 0;

            if (field === "quantity" && qty > allowedStock) {
                toast.error(`Return warning! Max allowable index threshold is ${allowedStock} units!`);
                updated[index].quantity = "";
                updated[index].total = "0.00";
            } else {
                updated[index].total = (qty * price).toFixed(2);
            }
        }

        setRows(updated);
        calculateTotals(updated, isTaxable, taxMode, taxRate);
    };

    const addRow = () => {
        setRows([...rows, { product_master_id: "", product_name: "", recipe_id: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", stock: 0 }]);
    };

    const deleteRow = (index) => {
        const updated = rows.filter((_, i) => i !== index);
        setRows(updated);
        calculateTotals(updated, isTaxable, taxMode, taxRate);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCustomer) return toast.error("Please select a customer.");
        if (!date) return toast.error("Please select a return validation date.");

        const validRows = rows.filter(r => r.product_master_id && parseFloat(r.quantity) > 0 && parseFloat(r.unitPrice) > 0);
        if (validRows.length === 0) return toast.error("Please insert at least one qualified ledger line items.");

        const user = JSON.parse(localStorage.getItem("user"));
        
        const saleReturnData = {
            entity_customer_id: selectedCustomer,
            grand_total: parseFloat(grandTotal),
            sub_total: parseFloat(subTotal),
            taxable_amount: parseFloat(taxableAmount),
            tax_amount: parseFloat(taxAmount),
            is_taxable: isTaxable,
            tax_mode: taxMode,
            tax_rate: parseFloat(taxRate),
            tax_id: taxId,
            type: "SaleReturn",
            date: date,
            createdby: user?.username || "guest",
            invoice_no: invoiceNo,
            details: validRows.map(r => ({
                product_master_id: r.product_master_id,
                product_name: r.product_name,
                recipe_id: r.recipe_id,
                quantity: parseFloat(r.quantity),
                unit_price: parseFloat(r.unitPrice),
                total_price: parseFloat(r.total),
                uom_id: r.uom_id
            }))
        };

        try {
            if (isEditMode) {
                // HTTP PUT endpoint architecture for updates matching FP_Sale design setup
                await api.put(`/fp-sale/${editId}`, saleReturnData);
                toast.success(`Sale Return Updated Successfully! Code: ${invoiceNo}`);
            } else {
                await api.post("/fp-sale", saleReturnData);
                toast.success(`Sale Return Transaction Logged! Code: ${invoiceNo}`);
            }
            navigate("/fp-salereturn-list");
        } catch (err) {
            toast.error(err.response?.data?.message || "Error storing transaction arrays to remote server nodes.");
        }
    };

    if (loading) {
        return (
            <div className="rm-page-wrapper">
                <NavigationBar />
                <div className="rm-content-container">
                    <div className="erp-loader">Fetching Sale Return Configuration Logs...</div>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="rm-page-wrapper">
            <NavigationBar />
            <div className="rm-content-container">
                <div className="rm-header-section">
                    <button type="button" className="back-btn erp-back-btn" onClick={() => navigate("/fp-salereturn-list")}>
                        <FaArrowLeft />
                    </button>
                    <h2 className="form-title erp-page-title">
                        {isEditMode ? `Modify Return Draft (${invoiceNo})` : "Finished Goods Sale Return"}
                    </h2>
                </div>

                <div className="rm-main-card">
                    <div className="info-grid">
                        <div className="info-item">
                            <label>Return Invoice No</label>
                            <input type="text" value={invoiceNo} readOnly className="rm-input-field readonly-input" style={{ backgroundColor: '#f1f5f9' }} />
                        </div>
                        <div className="info-item">
                            <label>Customer</label>
                            <select 
                                className="rm-input-field" 
                                value={selectedCustomer} 
                                onChange={(e) => handleCustomerChange(e.target.value)}
                                disabled={isEditMode}
                                style={isEditMode ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed' } : {}}
                            >
                                <option value="">Select Customer</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="info-item">
                            <label>Return Date</label>
                            <input type="date" className="rm-input-field" value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="rm-items-scroll">
                        <div className="items-table-header">
                            <span>Product Selection</span>
                            <span>UOM</span>
                            <span>Qty</span>
                            <span>Unit Price</span>
                            <span>Total</span>
                            <span>Action</span>
                        </div>

                        {rows.map((row, index) => (
                            <div className="item-row" key={index} style={{ alignItems: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <select
                                        className="rm-input-field"
                                        value={row.recipe_id}
                                        onChange={(e) => {
                                            const selected = products.find(p => String(p.recipe_id) === String(e.target.value));
                                            if (selected) {
                                                const maxQty = parseFloat(selected.max_return_qty) || Number(selected.current_stock) || 0;
                                                handleChange(index, "product_master_id", selected.product_master_id);
                                                handleChange(index, "recipe_id", selected.recipe_id);
                                                handleChange(index, "product_name", selected.product_name || selected.name);
                                                handleChange(index, "uom_name", selected.uom_name);
                                                handleChange(index, "uom_id", selected.uom_id);
                                                handleChange(index, "stock", maxQty);
                                            } else {
                                                handleChange(index, "product_master_id", "");
                                                handleChange(index, "recipe_id", "");
                                                handleChange(index, "product_name", "");
                                                handleChange(index, "uom_name", "");
                                                handleChange(index, "uom_id", "");
                                                handleChange(index, "stock", 0);
                                            }
                                        }}
                                        style={{ marginTop: '20px'}}
                                    >
                                        <option value="">Select Product</option>
                                        {products.map((p) => {
                                            const productName = p.display_name || p.product_name || p.name || `${p.recipe_id}`;
                                            const recipeLabel = p.display_name
                                                ? ''
                                                : (p.recipe_name ? ` (${p.recipe_name})` : (p.name && p.product_name ? ` (${p.name})` : ''));
                                            return (
                                                <option key={p.recipe_id} value={p.recipe_id}>
                                                    {productName}{recipeLabel}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    <small style={{ color: "gray", fontSize: '11px', paddingLeft: '2px' }}>Max Allowable: {row.stock}</small>
                                </div>

                                <input type="text" className="rm-input-field readonly-input" placeholder="UOM" value={row.uom_name} readOnly />
                                <input type="number" className="rm-input-field" placeholder="Qty" value={row.quantity} onChange={(e) => handleChange(index, "quantity", e.target.value)} />
                                <input type="number" className="rm-input-field" placeholder="Price" value={row.unitPrice} onChange={(e) => handleChange(index, "unitPrice", e.target.value)} />
                                <input type="text" className="rm-input-field readonly-input" placeholder="Total" value={row.total} readOnly />

                                <div className="erp-row-actions">
                                    <button type="button" className="quick-add-btn" style={{ color: '#3182ce' }} onClick={addRow}><FaPlus /></button>
                                    {rows.length > 1 && (
                                        <button type="button" className="quick-add-btn" style={{ color: '#e53e3e' }} onClick={() => deleteRow(index)}><FaTrash /></button>
                                    )}
                                </div>
                            </div>
                        ))}
                        </div>

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
                                {isEditMode ? "Update Return Draft" : "Save Return Transaction"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default FP_SaleReturnForm;