import React, { useState, useEffect, useCallback } from "react";
import NavigationBar from "../Components/NavigationBar";
import { FaArrowLeft, FaPlus, FaTrash } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import Footer from "../Components/Footer";
import { toast } from "react-toastify";
import api from "../../api";
import Select from "react-select";
import '../Model.css';
import '../Transactions.css';

const FP_SaleForm = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const queryParams = new URLSearchParams(location.search);
    const invoiceType = queryParams.get('invoiceType');
    const editId = queryParams.get('editId');
    const isEditMode = !!editId;

    const [rows, setRows] = useState([
        { product_master_id: "", product_name: "", recipe_id: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", stock: 0 }
    ]);

    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [sourceDocuments, setSourceDocuments] = useState([]);
    const [selectedSourceDoc, setSelectedSourceDoc] = useState("");
    const [originalSourceItems, setOriginalSourceItems] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [invoiceNo, setInvoiceNo] = useState("");
    const [date, setDate] = useState("");
    const [showCustomerModal, setShowCustomerModal] = useState(false);

    const [subTotal, setSubTotal] = useState(0);
    const [taxableAmount, setTaxableAmount] = useState(0);
    const [taxAmount, setTaxAmount] = useState(0);
    const [globalDiscount, setGlobalDiscount] = useState("");
    const [deliveryCharges, setDeliveryCharges] = useState("");
    const [grandTotal, setGrandTotal] = useState(0);
    const [isTaxable, setIsTaxable] = useState(() => invoiceType !== 'nonTaxable');
    const [taxMode, setTaxMode] = useState('exclusive');
    const [taxRate, setTaxRate] = useState(0);
    const [taxId, setTaxId] = useState(null);

    const customerOptions = customers.map((customer) => ({ value: customer.id, label: customer.name }));
    const productOptions = products.map((product) => ({
        value: product.recipe_id,
        label: product.display_name || product.product_name,
    }));

    const fetchInvoiceNo = useCallback(async () => {
        if (isEditMode) return;
        try {
            const res = await api.get("/fp-sale/invoice-no", { params: { type: "Sale" } });
            setInvoiceNo(res.data.invoice_no);
        } catch (err) {
            console.error("Error fetching invoice:", err);
        }
    }, [isEditMode]);

    // ---------------------------------------------------------
    // CALCULATION LOGIC MATRIX
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
    // 🔥 MASTER DATA & EDIT MODE AUTO-FILL (BUG-FREE WRAPPER MAPPING)
    // ---------------------------------------------------------
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // Parallel API Requests
                const [productsRes, customersRes] = await Promise.all([
                    api.get("/fp-sale/products-for-sale"),
                    api.get("/entities/transactions")
                ]);

                // Fetch unposted DC-FP documents for optional source selection
                try {
                    const srcRes = await api.get('/loader-documents/unposted', { params: { type: 'DC-FP' } });
                    setSourceDocuments(srcRes.data?.data || []);
                } catch (srcErr) {
                    console.warn('Could not fetch DC-FP source documents:', srcErr);
                }

                setProducts(productsRes.data);
                const onlyCustomers = customersRes.data.filter(ent => ent.type === "customer");
                setCustomers(onlyCustomers);

                if (!isEditMode) {
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
                    // Fetch edit view data
                    const editRes = await api.get(`/fp-sale/edit-preview/${editId}`);
                    
                    // Handling both formats: direct object OR nested wrapper object { success, data: { master, details } }
                    const responseData = editRes.data?.data ? editRes.data.data : editRes.data;
                    
                    // Extracting safely with structural fallbacks
                    const master = responseData?.master || responseData;
                    const details = responseData?.details || responseData?.Sale_Details || [];
                    const sourceDocId = master.source_doc_id || master.inventory_doc_id || null;
                    const sourceDocNo = master.source_doc_no || master.inventory_doc_no || null;

                    if (!master || !master.invoice_no) {
                        console.error("Malformed payload received:", editRes.data);
                        throw new Error("Invoice master record configuration is missing or invalid.");
                    }

                    setInvoiceNo(master.invoice_no);
                    setSelectedCustomer(master.entity_customer_id || master.entityid);
                    if (sourceDocId) {
                        setSelectedSourceDoc(String(sourceDocId));
                        setSourceDocuments(prev => prev.some(doc => String(doc.id) === String(sourceDocId)) ? prev : [{ id: Number(sourceDocId), no: sourceDocNo || `Source ${sourceDocId}` }, ...prev]);
                    }
                    
                    // Reading date directly from master structure as per database design
                    const incomingDate = master.date || master.invoiceDate;
                    if (incomingDate) {
                        setDate(new Date(incomingDate).toISOString().split('T')[0]);
                    }
                    
                    setSubTotal(parseFloat(master.sub_total || master.subtotal || 0).toFixed(2));
                    setGlobalDiscount(master.discount || "");
                    setIsTaxable(master.is_taxable);
                    setTaxMode(master.tax_mode || 'exclusive');
                    setTaxRate(Number(master.tax_rate) || 0);
                    setTaxId(master.tax_id);
                    setTaxableAmount(parseFloat(master.taxable_amount || 0).toFixed(2));
                    setTaxAmount(parseFloat(master.tax_amount || 0).toFixed(2));
                    setGrandTotal(parseFloat(master.grand_total || 0).toFixed(2));

                    if (Array.isArray(details) && details.length > 0) {
                        const mappedRows = details.map(d => {
                            const qty = Math.abs(parseFloat(d.quantity) || 0);
                            const price = parseFloat(d.unit_price) || 0;
                            const matchingProduct = productsRes.data.find(p => String(p.recipe_id) === String(d.recipe_id));

                            return {
                                product_master_id: d.product_master_id,
                                product_name: d.product_name,
                                recipe_id: d.recipe_id,
                                quantity: qty,
                                unitPrice: price,
                                total: (qty * price).toFixed(2),
                                uom_id: d.uom_id || matchingProduct?.uom_id || "",
                                uom_name: d.uom_name || matchingProduct?.uom_name || "",
                                stock: Number(matchingProduct?.current_stock) || 0,
                                source_doc_id: sourceDocId,
                                source_doc_no: sourceDocNo,
                                source_doc_type: sourceDocId ? 'DC-FP' : null,
                                original_source_quantity: Number(d.original_source_quantity || qty)
                            };
                        });
                        setRows(mappedRows);
                        setOriginalSourceItems(mappedRows.map(item => ({ product_master_id: item.product_master_id, original_source_quantity: Number(item.original_source_quantity || item.quantity || 0) })));
                    }
                }
            } catch (err) {
                console.error("Error loading initial form data:", err);
                toast.error("Failed to load required data.");
                if (isEditMode) navigate("/fp-sale-list");
            }
        };

        loadInitialData();
    }, [editId, isEditMode, navigate, fetchInvoiceNo]);

    const handleSourceDocumentSelection = async (docId, existingRowsOverride = rows, productsList = products) => {
        setSelectedSourceDoc(docId || "");
        if (!docId) {
            setRows(Array.isArray(existingRowsOverride) && existingRowsOverride.length > 0 ? existingRowsOverride : [{ product_master_id: "", product_name: "", recipe_id: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", stock: 0 }]);
            setOriginalSourceItems([]);
            return;
        }

        try {
            const res = await api.get(`/loader-documents/${docId}`);
            const sourceDoc = res.data?.data || res.data;
            const details = sourceDoc.LoaderDocumentDetails || sourceDoc.details || [];
            setSourceDocuments(prev => prev.some(doc => String(doc.id) === String(docId)) ? prev : [{ id: Number(docId), no: sourceDoc.no || `Source ${docId}` }, ...prev]);

            if (sourceDoc.entity_id) setSelectedCustomer(sourceDoc.entity_id && String(sourceDoc.entity_id));
            if (sourceDoc.date) setDate(sourceDoc.date.split('T')[0]);

            const fallbackRows = Array.isArray(existingRowsOverride) && existingRowsOverride.length > 0 ? existingRowsOverride : [{ product_master_id: "", product_name: "", recipe_id: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", stock: 0 }];

            const mappedRows = details.map((detail) => {
                const productId = Number(detail.material_id || detail.product_master_id || 0);
                const existingRow = fallbackRows.find(r => Number(r.product_master_id) === productId) || {};
                const targetRecipeId = Number(detail.recipe_id || detail.supplier_id || 0);
                const matchingProduct = productsList.find((p) => {
                    const candidateProductId = Number(p.product_master_id || p.id || 0);
                    const candidateRecipeId = Number(p.recipe_id || 0);
                    const productIdMatch = candidateProductId > 0 && candidateProductId === productId;
                    const recipeIdMatch = targetRecipeId > 0 && candidateRecipeId > 0 && candidateRecipeId === targetRecipeId;
                    return productIdMatch || recipeIdMatch;
                });

                const isStrictIdMatch = Boolean(matchingProduct && (
                    (productId > 0 && Number(matchingProduct.product_master_id || matchingProduct.id || 0) === productId) ||
                    (targetRecipeId > 0 && Number(matchingProduct.recipe_id || 0) === targetRecipeId)
                ));
                const latestUnitPrice = isStrictIdMatch ? Number(detail.unit_price ?? matchingProduct?.unit_price ?? 0) : 0;

                // Compute original_source_quantity as: DC remaining (detail.quantity) + existing invoice qty (if present)
                const existingQty = Number(existingRow.quantity || 0);
                const dcRemaining = Number(detail.quantity || 0);
                const originalSourceQty = dcRemaining + existingQty;
                const quantityValue = existingRow.quantity ?? Number(detail.quantity || 0);
                const calculatedTotal = (Number(quantityValue || 0) * latestUnitPrice).toFixed(2);

                return {
                    ...existingRow,
                    product_master_id: productId,
                    product_name: matchingProduct?.product_name || detail.material_name || detail.product_name || "Product",
                    recipe_id: matchingProduct?.recipe_id || detail.recipe_id || detail.supplier_id || "",
                    quantity: quantityValue,
                    unitPrice: latestUnitPrice,
                    total: calculatedTotal,
                    uom_id: matchingProduct?.uom_id || detail.uom_id || "",
                    uom_name: matchingProduct?.uom_name || detail.uom_name || "",
                    stock: Number(matchingProduct?.current_stock) || Number(detail.quantity || 0),
                    source_doc_id: sourceDoc.id,
                    source_doc_no: sourceDoc.no,
                    source_doc_type: sourceDoc.type,
                    original_source_quantity: originalSourceQty
                };
            });

            const nextRows = mappedRows.length > 0 ? mappedRows : fallbackRows;
            setRows(nextRows);
            calculateTotals(nextRows, globalDiscount, deliveryCharges, isTaxable, taxMode, taxRate);
            setOriginalSourceItems(mappedRows.map(item => ({
                product_master_id: item.product_master_id,
                original_source_quantity: Number(item.quantity || 0)
            })));
        } catch (err) {
            console.error('Error loading DC-FP source document:', err);
            toast.error('Failed to load selected DC-FP document.');
        }
    };

    const calculateRowTotal = (row) => {
        const qty = parseFloat(row.quantity) || 1;
        const price = parseFloat(row.unitPrice) || 0;
        return (qty * price).toFixed(2);
    };

    const handleChange = (index, field, value) => {
        const updated = [...rows];

        if (field === "quantity") {
            const inputQty = parseFloat(value) || 0;
            const productId = Number(updated[index].product_master_id || 0);
            const originalItem = originalSourceItems.find(item => Number(item.product_master_id) === productId);
            const maxAllowed = parseFloat(originalItem?.original_source_quantity || updated[index]?.original_source_quantity || 0);

            if (selectedSourceDoc && originalItem && inputQty > maxAllowed) {
                toast.error(`Error: Maximum quantity allowed is ${maxAllowed}. You cannot exceed the original quantity.`);
                updated[index].quantity = String(maxAllowed);
                const price = parseFloat(updated[index].unitPrice) || 0;
                updated[index].total = (maxAllowed * price).toFixed(2);
                setRows(updated);
                calculateTotals(updated, globalDiscount, deliveryCharges, isTaxable, taxMode, taxRate);
                updated[index].quantity = "";
                updated[index].total = "0.00";
                setRows(updated);
                calculateTotals(updated, globalDiscount, deliveryCharges, isTaxable, taxMode, taxRate);
                return;
            }
        }

        updated[index][field] = value;

        if (field === "quantity" || field === "unitPrice") {
            updated[index].total = calculateRowTotal(updated[index]);
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
        setRows([...rows, { product_master_id: "", product_name: "", recipe_id: "", quantity: "", unitPrice: "", total: "", uom_id: "", uom_name: "", stock: 0 }]);
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

        const validRows = rows.filter(r => r.product_master_id && parseFloat(r.quantity) > 0 && parseFloat(r.unitPrice) > 0);
        if (validRows.length === 0) return toast.error("Please add at least one valid product row.");

        const disc = parseFloat(globalDiscount) || 0;
        if (disc > parseFloat(subTotal)) {
            return toast.error("Global Discount cannot exceed the Total Sub Amount.");
        }

        const user = JSON.parse(localStorage.getItem("user"));
        
        // Exact FP Master DB alignment payload
        const saleData = {
            entity_customer_id: selectedCustomer,
            grand_total: parseFloat(grandTotal),
            sub_total: parseFloat(subTotal),
            discount: disc,
            delivery_charges: parseFloat(deliveryCharges) || 0,
            taxable_amount: parseFloat(taxableAmount),
            tax_amount: parseFloat(taxAmount),
            is_taxable: isTaxable,
            tax_mode: taxMode,
            tax_rate: parseFloat(taxRate),
            tax_id: taxId,
            type: "Sale",
            date: date, // Purely on Master root level
            createdby: user?.username || "guest",
            invoice_no: invoiceNo,
            source_doc_id: selectedSourceDoc ? Number(selectedSourceDoc) : null,
            source_doc_type: selectedSourceDoc ? "DC-FP" : null,
            details: validRows.map(r => ({
                product_master_id: r.product_master_id,
                product_name: r.product_name,
                recipe_id: r.recipe_id,
                quantity: parseFloat(r.quantity),
                unit_price: parseFloat(r.unitPrice),
                total_price: parseFloat(r.total),
                uom_id: r.uom_id
                // Date key here has been excluded as requested
            }))
        };

        try {
            if (isEditMode) {
                await api.put(`/fp-sale/${editId}`, saleData);
                toast.success(`Sale Draft Updated Successfully! Code: ${invoiceNo}`);
            } else {
                await api.post("/fp-sale", saleData);
                toast.success(`Sale Transaction Saved Successfully! Invoice: ${invoiceNo}`);
            }
            navigate("/fp-sale-list");
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
                    <button type="button" className="back-btn erp-back-btn" onClick={() => navigate("/fp-sale-list")}>
                        <FaArrowLeft />
                    </button>
                    <h2 className="form-title erp-page-title">{isEditMode ? `Modify Sale Draft (${invoiceNo})` : "Finished Goods Sale"}</h2>
                </div>

                <div className="rm-main-card">
                    <div className="info-grid">
                        <div className="info-item">
                            <label>Invoice No</label>
                            <input type="text" value={invoiceNo} readOnly className="rm-input-field readonly-input" style={{ backgroundColor: '#f1f5f9' }} />
                        </div>
                        <div className="info-item">
                            <label>Customer</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
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
                        <div className="info-item">
                            <label>Source DC-FP</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <select className="rm-input-field" value={selectedSourceDoc} onChange={(e) => handleSourceDocumentSelection(e.target.value)}>
                                    <option value="">Select DC-FP (optional)</option>
                                    {sourceDocuments.map(doc => (
                                        <option key={doc.id} value={doc.id}>{doc.no}</option>
                                    ))}
                                </select>
                                <button type="button" className="quick-add-btn" onClick={() => navigate('/dc-fp-form')}><FaPlus /></button>
                            </div>
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
                                    <Select
                                        className="rm-input-field"
                                        classNamePrefix="react-select"
                                        options={productOptions}
                                        value={productOptions.find((option) => String(option.value) === String(row.recipe_id)) || null}
                                        isSearchable
                                        isClearable
                                        isDisabled={!!selectedSourceDoc}
                                        onChange={(selectedOption) => {
                                            const selectedValue = selectedOption?.value || "";
                                            const selected = products.find(p => String(p.recipe_id) === String(selectedValue));
                                            const updated = [...rows];

                                            if (selected && String(selected.recipe_id) === String(selectedValue)) {
                                                const validatedUnitPrice = Number(selected.unit_price ?? 0);
                                                updated[index] = {
                                                    ...updated[index],
                                                    product_master_id: selected.product_master_id,
                                                    product_name: selected.product_name,
                                                    recipe_id: selected.recipe_id,
                                                    uom_name: selected.uom_name,
                                                    uom_id: selected.uom_id,
                                                    stock: Number(selected.current_stock) || 0,
                                                    unitPrice: validatedUnitPrice,
                                                    total: calculateRowTotal({
                                                        ...updated[index],
                                                        unitPrice: validatedUnitPrice,
                                                        quantity: updated[index].quantity || 1,
                                                    })
                                                };
                                                setRows(updated);
                                                calculateTotals(updated, globalDiscount, deliveryCharges, isTaxable, taxMode, taxRate);
                                            } else {
                                                updated[index] = {
                                                    ...updated[index],
                                                    product_master_id: "",
                                                    product_name: "",
                                                    recipe_id: "",
                                                    uom_name: "",
                                                    uom_id: "",
                                                    stock: 0,
                                                    unitPrice: "",
                                                    total: "0.00"
                                                };
                                                setRows(updated);
                                                calculateTotals(updated, globalDiscount, deliveryCharges, isTaxable, taxMode, taxRate);
                                            }
                                        }}
                                        styles={{ container: (base) => ({ ...base, marginTop: "20px" }) }}
                                    />
                                    <small className="text-success" style={{fontSize: '11px', paddingLeft: '2px' }}>Available: {row.stock}</small>
                                </div>

                                <input type="text" className="rm-input-field readonly-input" placeholder="UOM" value={row.uom_name} readOnly />
                                <input type="number" className="rm-input-field" placeholder="Qty" value={row.quantity} onChange={(e) => handleChange(index, "quantity", e.target.value)} />
                                <input type="number" className="rm-input-field" placeholder="Price" value={row.unitPrice} onChange={(e) => handleChange(index, "unitPrice", e.target.value)} />
                                <input type="text" className="rm-input-field readonly-input" placeholder="Total" value={row.total} readOnly />

                                <div className="erp-row-actions">
                                    <button type="button" className="quick-add-btn" style={{ color: '#3182ce' }} onClick={addRow} disabled={!!selectedSourceDoc}><FaPlus /></button>
                                    {rows.length > 1 && (
                                        <button type="button" className="quick-add-btn" style={{ color: '#e53e3e' }} onClick={() => deleteRow(index)} disabled={!!selectedSourceDoc}><FaTrash /></button>
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
                            <button type="submit" className="save-btn">{isEditMode ? "Update Sale Draft" : "Save Sale Transaction"}</button>
                        </div>
                    </form>
                </div>
            </div>
            <Footer />

            {/* Quick Customer Add Modal */}
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
                            <button className="save-btn" onClick={handleQuickCustomerAdd}>Save Customer</button>
                            <button className="quick-add-btn" onClick={() => setShowCustomerModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FP_SaleForm;