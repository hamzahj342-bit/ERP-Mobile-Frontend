import React, { useState, useEffect, useCallback } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaPlus, FaTrash } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import Footer from '../Components/Footer';
import { toast } from 'react-toastify';
import api from '../../api';
import '../Model.css';
import '../Transactions.css';

const DC_FP_Form = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const editId = queryParams.get('editId');
    const isEditMode = !!editId;

    const [rows, setRows] = useState([{ rm_id: "", rm_name: "", quantity: "", uom_id: "", uom_name: "", supplier_id: "", shop_name: "", current_stock: 0 }]);
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [selectedDriver, setSelectedDriver] = useState("");
    const [vehicleNo, setVehicleNo] = useState("");
    const [dcNo, setDcNo] = useState("");
    const [date, setDate] = useState("");
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [showDriverModal, setShowDriverModal] = useState(false);

    const fetchDCNo = useCallback(async () => {
        if (isEditMode) return;
        try {
            const res = await api.get("/loader-documents/next-number", { params: { type: "DC-FP" } });
            setDcNo(res.data.doc_no);
        } catch (err) {
            console.error("Error fetching DC-FP number:", err);
        }
    }, [isEditMode]);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [productsRes, entitiesRes, driversRes] = await Promise.all([
                    api.get("/fp-sale/products-for-sale"),
                    api.get("/entities/transactions"),
                    api.get("/drivers")
                ]);

                setProducts(productsRes.data);
                setDrivers(driversRes.data);
                setCustomers(entitiesRes.data.filter(ent => ent.type === 'customer'));

                if (!isEditMode) {
                    fetchDCNo();
                } else {
                    const editRes = await api.get(`/loader-documents/${editId}`);
                    const responseEnvelope = editRes.data || {};
                    const targetData = responseEnvelope.data || responseEnvelope;

                    const docNo = targetData.no || "";
                    const custId = targetData.entity_id || targetData.customer_id;
                    const drvId = targetData.driver_id;
                    const vNo = targetData.vehicle_no || "";
                    const docDate = targetData.date || targetData.documentDate;
                    const details = targetData.LoaderDocumentDetails || targetData.details || [];

                    setDcNo(docNo);
                    setSelectedCustomer(custId ? String(custId) : "");
                    setSelectedDriver(drvId ? String(drvId) : "");
                    setVehicleNo(vNo);
                    if (docDate) setDate(new Date(docDate).toISOString().split('T')[0]);

                    if (Array.isArray(details) && details.length > 0) {
                        const mappedRows = details.map((d) => {
                            const rmId = Number(d.material_id || d.rm_id || 0);
                            const matchingProduct = productsRes.data.find(p => Number(p.product_master_id) === rmId || Number(p.recipe_id) === rmId || Number(p.id) === rmId);
                            return {
                                id: d.id || null,
                                rm_id: rmId,
                                rm_name: d.material_name || d.rm_name || matchingProduct?.display_name || matchingProduct?.product_name || 'Material',
                                quantity: Math.abs(Number(d.quantity || d.qty) || 0),
                                uom_id: d.uom_id || matchingProduct?.uom_id || '',
                                uom_name: d.uom_name || matchingProduct?.uom_name || matchingProduct?.uom || '',
                                supplier_id: d.supplier_id ? String(d.supplier_id) : '',
                                shop_name: d.supplier_name || '',
                                current_stock: Number(d.quantity || 0)
                            };
                        });
                        setRows(mappedRows);
                    }
                }
            } catch (err) {
                console.error("Error loading initial data for DC-FP form:", err);
                toast.error("Failed to load required data.");
                navigate("/dc-fp-list");
            }
        };
        loadInitialData();
    }, [editId, isEditMode, fetchDCNo, navigate]);



    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCustomer) return toast.error("Please select a customer.");
        if (!selectedDriver) return toast.error("Please select a driver.");
        if (!vehicleNo.trim()) return toast.error("Please provide a vehicle number.");
        if (!date) return toast.error("Please select a document date.");
        if (rows.some(r => parseFloat(r.quantity) > parseFloat(r.current_stock))) return toast.error("Dispatched quantity cannot exceed available stock.");

        const validRows = rows.filter(r => r.rm_id && parseFloat(r.quantity) > 0);
        if (validRows.length === 0) return toast.error("Please add at least one valid material row.");

        const user = JSON.parse(localStorage.getItem("user"));
        const payload = {
            no: dcNo,
            type: "DC-FP",
            driver_id: Number(selectedDriver),
            vehicle_no: vehicleNo,
            date,
            created_by: user?.id || null,
            updated_by: user?.id || null,
            entity_id: Number(selectedCustomer),
            details: validRows.map(r => ({
                id: r.id || undefined,
                material_id: Number(r.rm_id),
                material_name: r.rm_name,
                quantity: parseFloat(r.quantity),
                uom_id: r.uom_id ? Number(r.uom_id) : null,
                supplier_id: r.supplier_id ? Number(r.supplier_id) : null
            }))
        };

        try {
            if (isEditMode) {
                await api.put(`/loader-documents/${editId}`, payload);
                toast.success(`DC-FP Updated Successfully!`);
            } else {
                const res = await api.post("/loader-documents", payload);
                toast.success(`DC-FP Saved Successfully! No: ${res.data.no}`);
            }
            navigate("/dc-fp-list");
        } catch (err) {
            toast.error(err.response?.data?.message || "Error saving DC-FP record.");
        }
    };

    return (
        <div className="rm-page-wrapper">
            <NavigationBar />
            <div className="rm-content-container">
                <div className="rm-header-section">
                    <button type="button" className="back-btn erp-back-btn" onClick={() => navigate(-1)}><FaArrowLeft /></button>
                    <h2 className="form-title erp-page-title">{isEditMode ? `Modify DC-FP (${dcNo})` : "New Delivery Challan - Finished Product (DC-FP)"}</h2>
                </div>

                <div className="rm-main-card">
                    <div className="info-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                        <div className="info-item">
                            <label>DC-FP No</label>
                            <input type="text" value={dcNo} readOnly className="rm-input-field readonly-input" style={{backgroundColor: '#f1f5f9'}} />
                        </div>
                        <div className="info-item">
                            <label>Customer</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <select className="rm-input-field" value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
                                    <option value="">Select Customer</option>
                                    {customers.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                                </select>
                                <button type="button" className="quick-add-btn" onClick={() => setShowCustomerModal(true)}><FaPlus /></button>
                            </div>
                        </div>
                        <div className="info-item">
                            <label>Driver</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <select className="rm-input-field" value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)}>
                                    <option value="">Select Driver</option>
                                    {drivers.map(d => <option key={d.id} value={String(d.id)}>{d.driver_name}</option>)}
                                </select>
                                <button type="button" className="quick-add-btn" onClick={() => setShowDriverModal(true)}><FaPlus /></button>
                            </div>
                        </div>
                        <div className="info-item">
                            <label>Vehicle No</label>
                            <input type="text" className="rm-input-field" placeholder='e.g LET-6731' value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} />
                        </div>
                        <div className="info-item">
                            <label>Date</label>
                            <input type="date" className="rm-input-field" value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="rm-items-scroll">
                        <div className="items-table-header" style={{ display: 'grid', gridTemplateColumns: '4.5fr 1.5fr 2fr 1.5fr', gap: '12px', fontWeight: 'bold', paddingBottom: '10px' }}>
                            <span>Material</span>
                            <span>UOM</span>
                            <span>Dispatched Qty</span>
                            <span>Action</span>
                        </div>

                        {rows.map((row, index) => {
                            const currentSelectionValue = row.rm_id ? String(row.rm_id) : "";

                            return (
                                <div className="item-row" key={index} style={{ display: 'grid', gridTemplateColumns: '4.5fr 1.5fr 2fr 1.5fr', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <select className="rm-input-field" value={currentSelectionValue} onChange={(e) => {
                                            const val = e.target.value;
                                            const updated = [...rows];
                                            if (!val) {
                                                updated[index] = { ...updated[index], rm_id: "", rm_name: "", uom_id: "", uom_name: "", supplier_id: "", shop_name: "", current_stock: 0 };
                                            } else {
                                                const selId = Number(val);
                                                const prod = products.find(p => Number(p.product_master_id) === selId || Number(p.recipe_id) === selId || Number(p.id) === selId);
                                                updated[index] = {
                                                    ...updated[index],
                                                    rm_id: selId,
                                                    rm_name: prod?.display_name || prod?.product_name || 'Product',
                                                    uom_id: prod?.uom_id || prod?.uom || '',
                                                    uom_name: prod?.uom_name || prod?.uom || '',
                                                    supplier_id: prod?.supplier_id ? String(prod.supplier_id) : updated[index].supplier_id,
                                                    shop_name: prod?.supplier_name || updated[index].shop_name || '',
                                                    current_stock: Number(prod?.current_stock || 0)
                                                };
                                            }
                                            setRows(updated);
                                        }}>
                                            <option value="">Select Material</option>
                                            {products.map(p => (
                                                <option key={p.product_master_id || p.recipe_id || p.id} value={p.product_master_id || p.recipe_id || p.id}>{p.display_name || p.product_name}</option>
                                            ))}
                                        </select>
                                        {row.rm_id && (
                                            <small className='text-success' style={{ fontSize: '12px', paddingLeft: '4px', marginTop: '2px' }}>Available: {row.current_stock}</small>
                                        )}
                                    </div>

                                    <input type="text" className="rm-input-field readonly-input" style={{ marginTop: '0px' }} placeholder="UOM" value={row.uom_name} readOnly />
                                    <input type="number" className="rm-input-field" placeholder="Qty" value={row.quantity} onChange={(e) => {
                                        const updated = [...rows]; updated[index].quantity = e.target.value; setRows(updated);
                                    }} />
                                    <div className="erp-row-actions">
                                        <button type="button" className="quick-add-btn" style={{ color: '#3182ce' }} onClick={() => setRows([...rows, { rm_id: "", rm_name: "", quantity: "", uom_id: "", uom_name: "", supplier_id: "", shop_name: "", current_stock: 0 }])}><FaPlus /></button>
                                        {rows.length > 1 && (
                                            <button type="button" className="quick-add-btn" style={{ color: '#e53e3e' }} onClick={() => setRows(rows.filter((_, i) => i !== index))}><FaTrash /></button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        </div>

                        <div className="erp-form-actions">
                            <button type="submit" className="save-btn">{isEditMode ? 'Update DC-FP' : 'Save DC-FP'}</button>
                        </div>
                    </form>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default DC_FP_Form;
