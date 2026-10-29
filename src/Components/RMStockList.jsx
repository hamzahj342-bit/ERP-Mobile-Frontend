import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationBar from '../Components/NavigationBar'; 
import Footer from '../Components/Footer';           
import Pagination from '../Components/Pagination';
import PhoneUnitsSublist from './PhoneUnitsSublist';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaBoxes, FaUserTag, FaWarehouse, FaTags } from 'react-icons/fa';
import api from "../../api"; 
import "../css/RM/RMStockList.css"; // CSS Import
import "./PhoneUnitsSublist.css";

const RMStockList = () => {
    const [stock, setStock] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(""); 
    const [debouncedSearch, setDebouncedSearch] = useState(""); 
    const [viewMode, setViewMode] = useState('entity');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [categories, setCategories] = useState([]);
    const [activeCategoryId, setActiveCategoryId] = useState(null);
    const [activeCategoryName, setActiveCategoryName] = useState('');
    const [hasPackSizes, setHasPackSizes] = useState(false);
    const [expandedKey, setExpandedKey] = useState(null);
    const [phoneUnits, setPhoneUnits] = useState([]);
    const [phonesLoading, setPhonesLoading] = useState(false);
    const navigate = useNavigate();

    // Debounce Logic
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1); 
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const fetchStock = async () => {
        setLoading(true);
        try {
            if (viewMode === 'category' && !activeCategoryId) {
                setStock([]);
                setTotalPages(1);
                return;
            }

            let endpoint = "/rm-stock/list";
            const params = { page, limit: 50, search: debouncedSearch };

            if (viewMode === 'material' || viewMode === 'category') {
                endpoint = "/rm-stock/material-list";
            }

            if (viewMode === 'category' && activeCategoryId) {
                params.category_id = activeCategoryId;
            }

            const res = await api.get(endpoint, { params });
            if (res.data && res.data.data) {
                setStock(res.data.data);
                setTotalPages(res.data.totalPages || 1);
                setHasPackSizes(Boolean(res.data.has_pack_sizes));
            } else {
                setStock([]);
                setTotalPages(1);
                setHasPackSizes(false);
            }
        } catch (err) {
            toast.error(`Failed to load inventory.`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStock(); }, [page, debouncedSearch, viewMode, activeCategoryId]);

    useEffect(() => {
        setSearchTerm("");
        setPage(1);
        setExpandedKey(null);
        setPhoneUnits([]);
        if (viewMode !== 'category') {
            setActiveCategoryId(null);
            setActiveCategoryName('');
        }
    }, [viewMode]);

    const rowKey = (item, index) =>
        viewMode === 'entity'
            ? `e-${item.stock_id || `${item.rm_id}-${item.entity_id}`}`
            : `m-${item.rm_id || index}`;

    const handleRowClick = async (item, index) => {
        const key = rowKey(item, index);
        if (expandedKey === key) {
            setExpandedKey(null);
            setPhoneUnits([]);
            return;
        }
        if (!item.rm_id) return;
        setExpandedKey(key);
        setPhonesLoading(true);
        setPhoneUnits([]);
        try {
            const params = { rm_id: item.rm_id };
            if (viewMode === 'entity' && item.entity_id) {
                params.supplier_id = item.entity_id;
            }
            const res = await api.get('/rm-transactions/available-phones', { params });
            setPhoneUnits(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load phone units');
            setPhoneUnits([]);
        } finally {
            setPhonesLoading(false);
        }
    };

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await api.get('/material-categories');
                setCategories(res.data);
            } catch (err) {
                toast.error('Failed to load categories');
            }
        };
        fetchCategories();
    }, []);

    const categoryFilteredStock = activeCategoryId ? stock : [];

    // Show Pack Stock only when at least one RM has a pack size defined
    const showPackStock = hasPackSizes || stock.some(
        (item) => Array.isArray(item.pack_breakdown) && item.pack_breakdown.length > 0
    );

    const displayStock = (viewMode === 'category' && activeCategoryId) ? categoryFilteredStock : stock;
    // entity: ID Material Supplier Sold Available [Pack] Valuation Brand
    // summary: Material Sold Available [Pack] Valuation Brand
    const emptyColSpan =
        (viewMode === 'entity' ? 7 : 5) + (showPackStock ? 1 : 0);

    return (
        <div className="page-wrapper">
            <NavigationBar />
            <div className="stock-page-wrapper">
                <div className="stock-container">
                    
                    <div className="erp-page-header stock-header-flex">
                        <div className="erp-page-header-left">
                            <button className="back-btn erp-back-btn" type="button" onClick={() => navigate('/dashboard')}>
                                <FaArrowLeft />
                            </button>
                            <h2 className="erp-page-title">Stock</h2>
                        </div>

                        <div className="view-toggle-container">
                            <button type="button" className={`view-toggle-btn ${viewMode === 'entity' ? 'active' : ''}`} onClick={() => setViewMode('entity')}>
                                <FaUserTag /> Entity View
                            </button>
                            <button type="button" className={`view-toggle-btn ${viewMode === 'material' ? 'active' : ''}`} onClick={() => setViewMode('material')}>
                                <FaBoxes /> Summary View
                            </button>
                            <button type="button" className={`view-toggle-btn ${viewMode === 'category' ? 'active' : ''}`} onClick={() => setViewMode('category')}>
                                <FaTags /> Category View
                            </button>
                        </div>
                    </div>

                    <div className="stock-card-main erp-page-card">
                        <div className="stock-toolbar">
                            <h3 className="stock-section-title">
                                <FaWarehouse /> {
                                    viewMode === 'entity'
                                        ? 'Batch-wise Inventory'
                                        : viewMode === 'material'
                                            ? 'Total Material Stock'
                                            : activeCategoryId
                                                ? `Category Stock - ${activeCategoryName}`
                                                : 'Category-Wise Inventory'
                                }
                            </h3>
                            <div className="search-box-wrapper">
                                <input
                                    type="text"
                                    placeholder={viewMode === 'entity' ? "Search Material or Supplier..." : "Filter Materials..."}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="stock-search-input"
                                />
                            </div>
                        </div>
                        {viewMode === 'category' && (
                            <div className="category-filter-row">
                                {categories.length > 0 ? categories.map((category) => (
                                    <button
                                        type="button"
                                        key={category.id}
                                        className={`category-filter-btn ${activeCategoryId === category.id ? 'active' : ''}`}
                                        onClick={() => {
                                            setActiveCategoryId(category.id);
                                            setActiveCategoryName(category.name);
                                        }}
                                    >
                                        {category.name}
                                    </button>
                                )) : (
                                    <span style={{ color: '#64748b', fontSize: '12px' }}>No categories available.</span>
                                )}
                            </div>
                        )}

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}><div className="loader"></div><p>Fetching Stock...</p></div>
                        ) : viewMode === 'category' && !activeCategoryId ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                Select a category above to view stock details.
                            </div>
                        ) : (
                            <div className="erp-table-scroll prod-table-container">
                                <table className="stock-table-responsive entity-table">
                                    <thead>
                                        <tr>
                                            {viewMode === 'entity' && <th>ID</th>}
                                            <th>Material</th>
                                            {viewMode === 'entity' && <th>Supplier</th>}
                                            {/* Avg Cost / Consumed hidden — mobile shop uses per-IMEI cost */}
                                            <th style={{ textAlign: 'center' }}>Sold</th>
                                            <th style={{ textAlign: 'center' }}>Available</th>
                                            {showPackStock && (
                                                <th style={{ textAlign: 'center' }}>Pack Stock</th>
                                            )}
                                            <th>Valuation</th>
                                            <th>Brand</th> 
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayStock.length > 0 ? displayStock.map((item, index) => {
                                            const key = rowKey(item, index);
                                            const isOpen = expandedKey === key;
                                            return (
                                            <React.Fragment key={key}>
                                            <tr
                                                className={`stock-row-clickable${isOpen ? ' stock-row-expanded' : ''}`}
                                                onClick={() => handleRowClick(item, index)}
                                                title="Click to show available phone units"
                                            >
                                                {viewMode === 'entity' && <td data-label="ID"><span style={{color:'#94a3b8', fontSize: '0.8rem'}}>#{item.stock_id}</span></td>}
                                                <td data-label="Material" style={{ fontWeight: '600', color: '#1e293b' }}>{item.material_name}</td> 
                                                {viewMode === 'entity' && <td data-label="Supplier" style={{ color: '#475569' }}>{item.supplier_name}</td>}
                                                <td data-label="Sold" style={{ textAlign: 'center', color: '#ef4444' }}>{parseFloat(item.sold_qty || 0).toFixed(2)}</td>
                                                <td data-label="Available" style={{ textAlign: 'center' }}>
                                                    <span className="stock-qty-bold">{parseFloat(item.current_stock || 0).toFixed(2)}</span>
                                                </td>
                                                {showPackStock && (
                                                    <td data-label="Pack Stock" style={{ textAlign: 'center', fontSize: '0.9rem', color: '#334155' }}>
                                                        {item.pack_stock_display || '-'}
                                                    </td>
                                                )}
                                                <td data-label="Valuation" style={{ fontWeight: '600' }}>{parseFloat(item.current_stock_price || 0).toFixed(2)}</td>
                                                <td data-label="Brand"><span className="uom-badge">{item.uom_name}</span></td> 
                                            </tr>
                                            {isOpen ? (
                                                <PhoneUnitsSublist
                                                    units={phoneUnits}
                                                    loading={phonesLoading}
                                                    showSupplier={viewMode !== 'entity'}
                                                    colSpan={emptyColSpan}
                                                />
                                            ) : null}
                                            </React.Fragment>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan={emptyColSpan} className="erp-empty-cell">No records found for current search.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="erp-pagination-wrap">
                            <Pagination page={page} totalPages={totalPages} onPageChange={(newPage) => setPage(newPage)} />
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default RMStockList;