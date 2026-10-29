import React, { useState, useEffect, useCallback } from 'react';
import NavigationBar from '../Components/NavigationBar';
import { FaArrowLeft, FaPlus, FaTrash } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import Footer from '../Components/Footer';
import { toast } from 'react-toastify';
import api from '../../api';
import '../Model.css';
import '../Transactions.css';

const emptyRow = () => ({
    rm_id: "",
    rm_name: "",
    quantity: "",
    uom_id: "",
    uom_name: "",
    supplier_id: "",
    customer_id: "",
    shop_name: "",
    current_stock: 0,
    pack_sizes: [],
    factor: 1,
});

const normalizePackSizes = (material) =>
    (material?.pack_sizes || []).map((p) => ({
        uom_id: p.uom_id,
        uom_name: p.uom?.name || p.uom_name || "",
        factor_to_base: Number(p.factor_to_base) || 1,
        is_base: !!p.is_base,
    }));

const getMaterialPackMeta = (material, preferredUomId = null) => {
    const packSizes = normalizePackSizes(material);
    const baseUomId = material?.uom_id ?? material?.uom?.id ?? packSizes[0]?.uom_id ?? "";
    const uomId = preferredUomId || baseUomId;
    const selectedPack =
        packSizes.find((p) => Number(p.uom_id) === Number(uomId)) ||
        packSizes.find((p) => p.is_base) ||
        packSizes[0] ||
        null;

    return {
        pack_sizes: packSizes,
        uom_id: selectedPack?.uom_id || uomId || "",
        uom_name:
            selectedPack?.uom_name ||
            material?.uom_name ||
            material?.uom?.name ||
            "",
        factor: Number(selectedPack?.factor_to_base) || 1,
    };
};

const GRN_Form = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const queryParams = new URLSearchParams(location.search);
    const editId = queryParams.get('editId');
    const isEditMode = !!editId;

    const [rows, setRows] = useState([emptyRow()]);
    const [materials, setMaterials] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [drivers, setDrivers] = useState([]);

    const [selectedSupplier, setSelectedSupplier] = useState("");
    const [selectedDriver, setSelectedDriver] = useState("");
    const [vehicleNo, setVehicleNo] = useState("");
    const [grnNo, setGrnNo] = useState("");
    const [date, setDate] = useState("");

    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [showDriverModal, setShowDriverModal] = useState(false);

    const [modalSupplier, setModalSupplier] = useState({ name: "", contact: "", address: "" });
    const [modalDriver, setModalDriver] = useState({ name: "", contact: "", cnic: "" });

    const fetchGRNNo = useCallback(async () => {
        if (isEditMode) return;
        try {
            const res = await api.get("/loader-documents/next-number", {
                params: { type: "GRN" }
            });
            setGrnNo(res.data.doc_no);
        } catch (err) {
            console.error("Error fetching GRN number:", err);
        }
    }, [isEditMode]);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [materialsRes, entitiesRes, driversRes] = await Promise.all([
                    api.get("/add-materials"),
                    api.get("/entities/transactions"),
                    api.get("/drivers")
                ]);

                setMaterials(materialsRes.data);
                setDrivers(driversRes.data);

                const filteredSuppliers = entitiesRes.data.filter(ent => ent.type === 'supplier');
                setSuppliers(filteredSuppliers);

                if (!isEditMode) {
                    fetchGRNNo();
                } else {
                    const editRes = await api.get(`/loader-documents/${editId}`);
                    const master = editRes.data?.data;

                    if (master) {
                        setGrnNo(master.no);
                        setSelectedSupplier(master.entity_id);
                        setSelectedDriver(master.driver_id);
                        setVehicleNo(master.vehicle_no);

                        if (master.date) {
                            setDate(new Date(master.date).toISOString().split('T')[0]);
                        } else if (master.created_at) {
                            setDate(new Date(master.created_at).toISOString().split('T')[0]);
                        }

                        const nestedDetails = master.LoaderDocumentDetails || master.details || [];

                        if (Array.isArray(nestedDetails) && nestedDetails.length > 0) {
                            const mappedRows = nestedDetails.map((d) => {
                                const cleanRmId = Number(d.material_id || d.rm_id);
                                const cleanSupplierId = d.supplier_id ? Number(d.supplier_id) : null;
                                const cleanCustomerId = d.customer_id ? Number(d.customer_id) : null;

                                const matchingMaterial = materialsRes.data.find(m =>
                                    Number(m.rm_id) === cleanRmId
                                );

                                const packMeta = getMaterialPackMeta(matchingMaterial, d.uom_id);
                                // Prefer entered (pack) qty; fall back to base for legacy rows
                                const qty = Math.abs(parseFloat(d.entered_qty ?? d.quantity ?? d.qty) || 0);

                                return {
                                    id: d.id || null,
                                    rm_id: cleanRmId,
                                    rm_name: matchingMaterial?.name || matchingMaterial?.rm_name || d.material_name || "Material",
                                    quantity: qty,
                                    uom_id: packMeta.uom_id,
                                    uom_name: packMeta.uom_name,
                                    pack_sizes: packMeta.pack_sizes,
                                    factor: packMeta.factor,
                                    supplier_id: cleanSupplierId ? String(cleanSupplierId) : "",
                                    customer_id: cleanCustomerId ? String(cleanCustomerId) : "",
                                    shop_name: matchingMaterial?.shop_name || d.supplier_name || "",
                                    current_stock: matchingMaterial ? Number(matchingMaterial.current_stock) : 0
                                };
                            });
                            setRows(mappedRows);
                        }
                    }
                }
            } catch (err) {
                console.error("Error loading initial data:", err);
                toast.error("Failed to load required data.");
                navigate("/grn-list");
            }
        };

        loadInitialData();
    }, [editId, isEditMode, navigate, fetchGRNNo]);

    const handleMaterialSelection = (index, value) => {
        const updated = [...rows];
        if (!value) {
            updated[index] = emptyRow();
            setRows(updated);
            return;
        }

        const selected = materials.find(m => Number(m.rm_id) === Number(value));

        if (selected) {
            const packMeta = getMaterialPackMeta(selected);
            updated[index] = {
                ...updated[index],
                rm_id: Number(selected.rm_id),
                rm_name: selected.rm_name || selected.name,
                uom_id: packMeta.uom_id,
                uom_name: packMeta.uom_name,
                pack_sizes: packMeta.pack_sizes,
                factor: packMeta.factor,
                supplier_id: String(selected.supplier_id || ""),
                customer_id: "",
                shop_name: selected.shop_name || "",
                current_stock: selected.current_stock || 0,
                quantity: "",
            };
        }

        setRows(updated);
    };

    const handleUomSelection = (index, uomId) => {
        const updated = [...rows];
        const row = { ...updated[index] };
        const pack = (row.pack_sizes || []).find((p) => Number(p.uom_id) === Number(uomId));
        if (!pack) return;

        row.uom_id = pack.uom_id;
        row.uom_name = pack.uom_name;
        row.factor = Number(pack.factor_to_base) || 1;
        updated[index] = row;
        setRows(updated);
    };

    const handleChange = (index, field, value) => {
        const updated = [...rows];
        updated[index][field] = value;
        setRows(updated);
    };

    const addRow = () => {
        setRows([...rows, emptyRow()]);
    };

    const deleteRow = (index) => {
        const updated = rows.filter((_, i) => i !== index);
        setRows(updated);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedSupplier) return toast.error("Please select a master supplier.");
        if (!selectedDriver) return toast.error("Please select a driver.");
        if (!vehicleNo.trim()) return toast.error("Please provide a vehicle number.");
        if (!date) return toast.error("Please select a document date.");

        const validRows = rows.filter(r => r.rm_id && parseFloat(r.quantity) > 0);
        if (validRows.length === 0) return toast.error("Please add at least one valid material row.");

        const user = JSON.parse(localStorage.getItem("user"));

        const payload = {
            no: grnNo,
            type: "GRN",
            driver_id: Number(selectedDriver),
            vehicle_no: vehicleNo,
            date,
            created_by: user?.id || null,
            updated_by: user?.id || null,
            entity_id: Number(selectedSupplier),
            // Send entered qty + selected uom; backend converts to base
            details: validRows.map(r => ({
                id: r.id || undefined,
                material_id: Number(r.rm_id),
                material_name: r.rm_name,
                quantity: parseFloat(r.quantity),
                uom_id: r.uom_id ? Number(r.uom_id) : null,
                supplier_id: r.supplier_id ? Number(r.supplier_id) : null,
                customer_id: r.customer_id ? Number(r.customer_id) : null
            }))
        };

        try {
            if (isEditMode) {
                await api.put(`/loader-documents/${editId}`, payload);
                toast.success(`GRN Draft Updated Successfully! Code: ${grnNo}`);
            } else {
                const res = await api.post("/loader-documents", payload);
                toast.success(`GRN Saved Successfully! Document No: ${res.data.no || grnNo}`);
            }
            navigate("/grn-list");
        } catch (err) {
            toast.error(err.response?.data?.message || "Error saving GRN record.");
        }
    };

    const handleQuickSupplierAdd = async () => {
        if (!modalSupplier.name.trim()) return toast.error("Supplier name is required.");
        try {
            const res = await api.post("/entities", {
                name: modalSupplier.name.trim(),
                contact: modalSupplier.contact.trim(),
                address: modalSupplier.address.trim(),
                type: "supplier"
            });
            setSuppliers(prev => [...prev, res.data]);
            setSelectedSupplier(res.data.id);
            setModalSupplier({ name: "", contact: "", address: "" });
            setShowSupplierModal(false);
            toast.success("Supplier Linked Successfully!");
        } catch (err) {
            toast.error("Failed to add supplier.");
        }
    };

    const handleQuickDriverAdd = async () => {
        if (!modalDriver.name.trim()) return toast.error("Driver name is required.");
        try {
            const res = await api.post("/drivers", {
                driver_name: modalDriver.name.trim(),
                contact_no: modalDriver.contact.trim(),
                cnic: modalDriver.cnic.trim()
            });
            setDrivers(prev => [...prev, res.data]);
            setSelectedDriver(res.data.id);
            setModalDriver({ name: "", contact: "", cnic: "" });
            setShowDriverModal(false);
            toast.success("Driver Added!");
        } catch (err) {
            toast.error("Failed to add driver.");
        }
    };

    return (
        <div className="rm-page-wrapper">
            <NavigationBar />
            <div className="rm-content-container">
                <div className="rm-header-section">
                    <button type="button" className="back-btn erp-back-btn" onClick={() => navigate(-1)}>
                        <FaArrowLeft />
                    </button>
                    <h2 className="form-title erp-page-title">
                        {isEditMode ? `Modify GRN (${grnNo})` : "New Goods Receipt Note (GRN)"}
                    </h2>
                </div>

                <div className="rm-main-card">
                    <div className="info-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                        <div className="info-item">
                            <label>GRN No</label>
                            <input type="text" value={grnNo} readOnly className="rm-input-field readonly-input" style={{backgroundColor: '#f1f5f9'}} />
                        </div>
                        <div className="info-item">
                            <label>Supplier (Master)</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <select className="rm-input-field" value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)}>
                                    <option value="">Select Supplier</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <button type="button" className="quick-add-btn" onClick={() => setShowSupplierModal(true)}><FaPlus /></button>
                            </div>
                        </div>
                        <div className="info-item">
                            <label>Driver</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <select className="rm-input-field" value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)}>
                                    <option value="">Select Driver</option>
                                    {drivers.map(d => <option key={d.id} value={d.id}>{d.driver_name}</option>)}
                                </select>
                                <button type="button" className="quick-add-btn" onClick={() => setShowDriverModal(true)}><FaPlus /></button>
                            </div>
                        </div>
                        <div className="info-item">
                            <label>Vehicle No</label>
                            <input type="text" placeholder="e.g. LET-1234" className="rm-input-field" value={vehicleNo || ''} onChange={(e) => setVehicleNo(e.target.value)} />
                        </div>
                        <div className="info-item">
                            <label>Date</label>
                            <input type="date" className="rm-input-field" value={date || ''} onChange={(e) => setDate(e.target.value)} />
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="rm-items-scroll">
                        <div className="items-table-header" style={{ display: 'grid', gridTemplateColumns: '4.5fr 1.5fr 2fr 1.5fr', gap: '12px', fontWeight: 'bold', paddingBottom: '10px' }}>
                            <span>Material</span>
                            <span>Brand</span>
                            <span>Received Qty</span>
                            <span>Action</span>
                        </div>

                        {rows.map((row, index) => {
                            const currentSelectionValue = row.rm_id ? String(Number(row.rm_id)) : "";

                            return (
                                <div className="item-row" key={index} style={{ display: 'grid', gridTemplateColumns: '4.5fr 1.5fr 2fr 1.5fr', gap: '12px', alignItems: 'start', marginBottom: '12px' }}>
                                    <select
                                        className="rm-input-field"
                                        value={currentSelectionValue || ""}
                                        onChange={(e) => handleMaterialSelection(index, e.target.value)}
                                    >
                                        <option value="">Select Material</option>
                                        {materials.map(m => (
                                            <option key={m.rm_id} value={Number(m.rm_id)}>
                                                {m.rm_name || m.name}
                                            </option>
                                        ))}
                                    </select>

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
                                        <input type="text" className="rm-input-field readonly-input" placeholder="UOM" value={row.uom_name || ''} readOnly />
                                    )}

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <input type="number" step="any" className="rm-input-field" placeholder="Qty" value={row.quantity || ''} onChange={(e) => handleChange(index, "quantity", e.target.value)} />
                                        {Number(row.factor) !== 1 && parseFloat(row.quantity) > 0 && (
                                            <small style={{ fontSize: '11px', color: '#3182ce', paddingLeft: '4px' }}>
                                                = {(parseFloat(row.quantity) * Number(row.factor)).toFixed(2)} base units
                                            </small>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', gap: '5px', marginTop: '4px' }}>
                                        <button type="button" className="quick-add-btn" style={{ color: '#3182ce' }} onClick={addRow}><FaPlus /></button>
                                        {rows.length > 1 && (
                                            <button type="button" className="quick-add-btn" style={{ color: '#e53e3e' }} onClick={() => deleteRow(index)}><FaTrash /></button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        </div>

                        <div className="erp-form-actions">
                            <button type="submit" className="save-btn">
                                {isEditMode ? "Update GRN" : "Save GRN"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            <Footer />

            {showSupplierModal && (
                <div className="modal-overlay" onClick={() => setShowSupplierModal(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Add New Supplier</h3>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Name *</label>
                                <input
                                    type="text"
                                    className="rm-input-field"
                                    value={modalSupplier.name}
                                    onChange={(e) => setModalSupplier({...modalSupplier, name: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label>Address</label>
                                <input
                                    type="text"
                                    className="rm-input-field"
                                    value={modalSupplier.address}
                                    onChange={(e) => setModalSupplier({...modalSupplier, address: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label>Contact</label>
                                <input
                                    type="text"
                                    className="rm-input-field"
                                    value={modalSupplier.contact}
                                    onChange={(e) => setModalSupplier({...modalSupplier, contact: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="save-btn" onClick={handleQuickSupplierAdd}>Save</button>
                            <button className="quick-add-btn" onClick={() => setShowSupplierModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {showDriverModal && (
                <div className="modal-overlay" onClick={() => setShowDriverModal(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Add New Driver</h3>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Driver Name *</label>
                                <input
                                    type="text"
                                    className="rm-input-field"
                                    value={modalDriver.name}
                                    onChange={(e) => setModalDriver({...modalDriver, name: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label>Contact Number</label>
                                <input
                                    type="text"
                                    className="rm-input-field"
                                    value={modalDriver.contact}
                                    onChange={(e) => setModalDriver({...modalDriver, contact: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label>CNIC</label>
                                <input
                                    type="text"
                                    className="rm-input-field"
                                    value={modalDriver.cnic}
                                    onChange={(e) => setModalDriver({...modalDriver, cnic: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="save-btn" onClick={handleQuickDriverAdd}>Save Driver</button>
                            <button className="quick-add-btn" onClick={() => setShowDriverModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GRN_Form;
