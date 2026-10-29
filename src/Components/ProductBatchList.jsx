import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaLayerGroup, FaHistory } from 'react-icons/fa';
import api from "../../api"; 
import "../css/FP/ProductBatchList.css"; // CSS Link

const ProductBatchList = () => {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchBatches = async () => {
            try {
                const res = await api.get("/product-batches");
                setBatches(res.data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching batches:", err);
                toast.error("Failed to load product batch data.");
                setLoading(false);
            }
        };
        fetchBatches();
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="page-wrapper">
                <NavigationBar />
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                    <div className="loader"></div>
                    <p style={{ marginLeft: '10px' }}>Loading Batch Records...</p>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="page-wrapper">
            <NavigationBar />
            
            <div className="batch-list-wrapper">
                <div className="batch-container">
                    
                    <div className="erp-page-card batch-card">
                    <div className="erp-page-header batch-header-area">
                        <div className="erp-page-header-left">
                            <button className="back-btn erp-back-btn" type="button" onClick={() => navigate('/dashboard')}>
                                <FaArrowLeft />
                            </button>
                            <h2 className="erp-page-title"><FaLayerGroup style={{ color: '#475569', marginRight: '10px' }} /> Finished Goods Batches</h2>
                        </div>
                    </div>

                        {batches.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                <FaHistory size={40} style={{ marginBottom: '10px', opacity: 0.5 }} />
                                <p>No production batches found in records.</p>
                            </div>
                        ) : (
                            <div className="erp-table-scroll batch-table-container">
                                <table className="batch-table">
                                    <thead>
                                        <tr>
                                            <th>Batch ID</th>
                                            <th>Product Name</th>
                                            <th>Remaining Qty</th>
                                            <th>Unit Cost</th>
                                            <th>Batch Valuation</th>
                                            <th>Created By</th>
                                            <th>Production Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {batches.map((batch) => {
                                            const remaining = parseFloat(batch.qty_remaining || 0);
                                            const cost = parseFloat(batch.unit_cost || 0);
                                            return (
                                                <tr key={batch.id}>
                                                    <td data-label="Batch ID"><span className="batch-id-tag">BATCH-{batch.id}</span></td>
                                                    <td data-label="Product Name" style={{ fontWeight: '600', color: '#1e293b' }}>
                                                        {batch.product?.name || 'Unknown Product'}
                                                    </td>
                                                    <td data-label="Remaining Qty">
                                                        <span className={`qty-pill ${remaining > 0 ? 'qty-active' : 'qty-empty'}`}>
                                                            {remaining.toFixed(3)}
                                                        </span>
                                                    </td>
                                                    <td data-label="Unit Cost" style={{ color: '#64748b' }}>{cost.toFixed(2)}</td>
                                                    <td data-label="Batch Valuation" style={{ fontWeight: 'bold' }}>
                                                        {(remaining * cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td data-label="Created By">
                                                        <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                                                            {batch.createdby || 'System'}
                                                        </span>
                                                    </td>
                                                    <td data-label="Production Date" style={{ whiteSpace: 'nowrap' }}>{formatDate(batch.createdat)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <Footer />
        </div>
    );
};

export default ProductBatchList;