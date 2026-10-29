import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaSave } from "react-icons/fa";
import { toast } from "react-toastify";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import api from "../../api";

const RM_Adjustment = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user"));
    
    const [materials, setMaterials] = useState([]);
    const [formData, setFormData] = useState({
        rm_id: "",
        system_qty: 0,
        physical_qty: 0, 
        type: "Deduct", // Add or Deduct
        adjustment_qty: "", 
        unit_price: 0,
        total_price: 0,
        reason: "",
        adjusted_by: user ? user.username : "guest"
    });

    useEffect(() => {
        api.get("/inventory-adjustment/rm-stock").then(res => setMaterials(res.data));
    }, []);

    const handleMaterialChange = (id) => {
        const selected = materials.find(m => m.rm_id === parseInt(id));
        if (selected) {
            setFormData({
                ...formData,
                rm_id: id,
                system_qty: selected.current_stock || 0,
                unit_price: selected.avg_unit_cost || 0,
                physical_qty: "",
                adjustment_qty: "",
                type: "Deduct",
                total_price: 0
            });
        }
    };

    // Logic: Jab Physical Count likha jaye
    const handlePhysicalChange = (val) => {
        const physical = parseFloat(val);
        const system = parseFloat(formData.system_qty);
        
        if (!isNaN(physical)) {
            const diff = physical - system;
            const absDiff = Math.abs(diff);
            const adjType = diff >= 0 ? "Add" : "Deduct";
            const total = absDiff * formData.unit_price;

            setFormData({
                ...formData,
                physical_qty: val,
                adjustment_qty: absDiff,
                type: adjType,
                total_price: total.toFixed(2)
            });
        } else {
            setFormData({ ...formData, physical_qty: val, adjustment_qty: "", total_price: 0 });
        }
    };

    // Logic: Jab Direct Adjustment Qty likhi jaye
    const handleAdjustmentChange = (val) => {
        const adj = parseFloat(val);
        const total = !isNaN(adj) ? (adj * formData.unit_price) : 0;

        setFormData({
            ...formData,
            adjustment_qty: val,
            physical_qty: "", // Direct entry pe physical ko clear rakhein
            total_price: total.toFixed(2)
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.rm_id || formData.adjustment_qty === "") {
            return toast.error("Please fill required fields");
        }
        const payload = {
        ...formData,
        item_id: formData.rm_id, // backend mapping
        item_type: 'RM'          // specific type
    };

        try {
            await api.post("/inventory-adjustment", payload);
            toast.success("Stock Adjusted!");
            navigate('/inventory-adjustment');
        } catch (err) {
            toast.error("Error processing adjustment");
        }
    };

    return (
        <>
            <NavigationBar />
            <div className="rm-page">
    <div style={{ alignItems: 'center', gap: '20px', marginTop: '30px' }}>
        <button className="back-btn" onClick={() => navigate('/inventory-adjustment')}>
            <FaArrowLeft />
        </button>
        <h3 style={{ margin: 0, fontWeight: 'bold' }}>RM Stock Adjustment</h3>
    </div>
    <hr style={{ margin: '20px 0' }} />

    <form onSubmit={handleSubmit}>
        {/* Row 1: Item Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Product</label>
                <select className="input" onChange={(e) => handleMaterialChange(e.target.value)} value={formData.rm_id}>
                    <option value="">Select Material</option>
                    {materials.map(m => (
                        <option key={m.rm_id} value={m.rm_id}>{m.material_name}</option>
                    ))}
                </select>
            </div>
            <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>System Stock</label>
                <input className="input" type="number" value={formData.system_qty} readOnly style={{ background: '#f4f4f4' }} />
            </div>
            <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Unit Price</label>
                <input className="input" type="number" value={formData.unit_price} readOnly style={{ background: '#f4f4f4' }} />
            </div>
        </div>

        {/* Row 2: Adjustment Input */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.5fr', gap: '20px', marginBottom: '20px' }}>
            <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Physical Count</label>
                <input 
                    className="input" 
                    type="number" 
                    value={formData.physical_qty}
                    onChange={(e) => handlePhysicalChange(e.target.value)}
                    placeholder="Enter count"
                />
            </div>
            <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Type</label>
                <select 
                    className="input" 
                    value={formData.type} 
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    style={{ 
                        fontWeight: 'bold',
                        backgroundColor: formData.type === 'Deduct' ? '#fff5f5' : '#f5fff5',
                        borderLeft: formData.type === 'Deduct' ? '5px solid #e74c3c' : '5px solid #2ecc71'
                    }}
                >
                    <option value="Deduct">Deduct (-)</option>
                    <option value="Add">Add (+)</option>
                </select>
            </div>
            <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Adjustment Quantity</label>
                <input 
                    className="input" 
                    type="number" 
                    value={formData.adjustment_qty}
                    onChange={(e) => handleAdjustmentChange(e.target.value)}
                    placeholder="0.00"
                />
            </div>
            <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Financial Impact (Total Cost)</label>
                <input className="input" type="number" value={formData.total_price} readOnly style={{ background: '#f4f4f4', fontWeight: 'bold' }} />
            </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Reason / Remarks</label>
            <input 
                className="input" 
                type="text" 
                value={formData.reason} 
                onChange={(e) => setFormData({...formData, reason: e.target.value})} 
                placeholder="Why are you adjusting this stock?" 
            />
        </div>

        <div style={{ textAlign: 'right' }}>
            <button type="submit" className="save-btn" >
                Save Adjustment
            </button>
        </div>
    </form>
</div>
            <Footer />
        </>
    );
};

export default RM_Adjustment;