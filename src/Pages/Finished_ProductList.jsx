import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationBar from '../Components/NavigationBar'; 
import Footer from '../Components/Footer';           
import Pagination from '../Components/Pagination';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaSearch, FaEdit } from 'react-icons/fa'; // Added FaEdit icon
import api from "../../api"; 
import "../css/FP/FinishedProductList.css"; 

const FinishedProductList = () => {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState(""); 
    const [debouncedSearch, setDebouncedSearch] = useState(""); 
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const navigate = useNavigate();

    // Debounce Logic
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1); 
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const fetchFinishedProducts = async () => {
        setLoading(true);
        try {
            const res = await api.get("/finished-products", {
                params: {
                    page: page,
                    limit: 50,
                    search: debouncedSearch
                }
            });

            if (res.data && res.data.data) {
                setProducts(res.data.data);
                setTotalPages(res.data.totalPages || 1);
            }
            setLoading(false);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load stock data.");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFinishedProducts();
    }, [page, debouncedSearch]);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    };

    return (
        <div className="page-wrapper">
            <NavigationBar />
            
            <div className="stock-page-wrapper">
                <div className="stock-container">
                    
                    <div className="erp-page-card stock-card">
                    <div className="erp-page-header prod-header">
                        <div className="erp-page-header-left">
                            <button className="back-btn erp-back-btn" type="button" onClick={() => navigate('/dashboard')}>
                                <FaArrowLeft />
                            </button>
                            <h2 className="erp-page-title">Finished Goods Stock Summary</h2>
                        </div>
                    </div>

                        {/* Search Bar */}
                        <div className="search-box-wrapper">
                            <FaSearch className="search-icon-inside" />
                            <input
                                type="text"
                                placeholder="Search by Product Name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="stock-search-input erp-search-input"
                            />
                        </div>

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '50px' }}>
                                <div className="loader"></div>
                                <p>Loading stock records...</p>
                            </div>
                        ) : (
                            <div className="erp-table-scroll prod-table-container">
                                <table className="stock-table stock-table-responsive">
                                    <thead>
                                        <tr>
                                            <th>Batch ID</th>
                                            <th>Product Name</th>
                                            <th style={{ textAlign: 'center' }}>Produced</th>
                                            <th style={{ textAlign: 'center' }}>Sold</th>
                                            <th style={{ textAlign: 'center' }}>Internal Use</th>
                                            <th style={{ textAlign: 'center' }}>Available Stock</th>
                                            <th>Unit Cost</th>
                                            <th>Production Date</th>
                                            <th style={{ textAlign: 'center' }}>Actions</th> {/* Added Header */}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.length > 0 ? products.map((item) => {
                                            const currentStock = Number(item.quantity) - Number(item.sold) - Number(item.consumed_qty || 0);
                                            const isEditable = currentStock > 0; // Check if stock is available for edit

                                            return (
                                                <tr key={item.id}>
                                                    <td data-label="Batch ID" style={{ color: '#64748b', fontFamily: 'monospace' }}>#{item.id}</td>
                                                    <td data-label="Product Name" style={{ fontWeight: '600', color: '#1e293b' }}>
                                                        {item.product_master?.name || 'N/A'}
                                                    </td>
                                                    <td data-label="Produced" style={{ textAlign: 'center' }}>{parseFloat(item.quantity).toFixed(2)}</td>
                                                    <td data-label="Sold" style={{ textAlign: 'center' }} className="sold-text">
                                                        {parseFloat(item.sold).toFixed(2)}
                                                    </td>
                                                    <td data-label="Internal Use" style={{ textAlign: 'center' }} className="consumed-text">
                                                        {parseFloat(item.consumed_qty || 0).toFixed(2)}
                                                    </td>
                                                    <td data-label="Available Stock" style={{ textAlign: 'center' }}>
                                                        <span className={`stock-label ${currentStock > 0 ? 'stock-positive' : 'stock-zero'}`}>
                                                            {currentStock.toFixed(2)}
                                                        </span>
                                                    </td>
                                                    <td data-label="Unit Cost">{parseFloat(item.unit_cost).toFixed(2)}</td>
                                                    <td data-label="Production Date" style={{ whiteSpace: 'nowrap' }}>{formatDate(item.createdat)}</td>
                                                    
                                                    {/* 🚀 Action Button Cell */}
                                                    <td data-label="Actions" className="erp-actions-cell" style={{ textAlign: 'center' }}>
                                                        <div className="erp-actions-group">
                                                        <button 
                                                            type="button"
                                                            className={`edit-btn-action ${!isEditable ? 'disabled-btn' : ''}`}
                                                            onClick={() => isEditable && navigate(`/production-form/${item.product_batch_id}`)}
                                                            disabled={!isEditable}
                                                            title={isEditable ? "Edit Production" : "Cannot edit: Stock is fully consumed/sold"}
                                                            style={{
                                                                background: isEditable ? '#d97706' : '#cbd5e1',
                                                                color: '#ffffff',
                                                                border: 'none',
                                                                padding: '6px 10px',
                                                                borderRadius: '4px',
                                                                cursor: isEditable ? 'pointer' : 'not-allowed',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                transition: 'all 0.2s ease'
                                                            }}
                                                        >
                                                            <FaEdit size={14} />
                                                        </button>
                                                        </div>
                                                    </td> 
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan="9" style={{ textAlign: 'center', padding: '30px' }}>
                                                    No stock records found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="erp-pagination-wrap">
                            <Pagination
                                page={page}
                                totalPages={totalPages}
                                onPageChange={(newPage) => setPage(newPage)}
                            />
                        </div>
                    </div>
                </div>
            </div>
            
            <Footer />
        </div>
    );
};

export default FinishedProductList;