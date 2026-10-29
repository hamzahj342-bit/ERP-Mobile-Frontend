import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaBoxes } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import NavigationBar from '../../Components/NavigationBar';
import Footer from '../../Components/Footer';
import Pagination from '../../Components/Pagination';
import api from '../../../api';
import '../../css/RM/MaterialList.css';

const PosStock = () => {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    useEffect(() => {
        const fetchStock = async () => {
            setLoading(true);
            try {
                const res = await api.get('/pos/stock', {
                    params: { page, limit: 50, search: debouncedSearch }
                });
                setRows(res.data.data || []);
                setTotalPages(res.data.totalPages || 1);
            } catch (err) {
                toast.error('Failed to fetch POS stock');
            } finally {
                setLoading(false);
            }
        };
        fetchStock();
    }, [page, debouncedSearch]);

    return (
        <div className="page-wrapper">
            <NavigationBar />
            <div className="materials-wrapper">
                <div className="materials-container">
                    <div className="materials-header">
                        <div className="header-left" style={{ marginTop: '30px' }}>
                            <button className="back-btn" onClick={() => navigate('/dashboard')}>
                                <FaArrowLeft />
                            </button>
                            <div className="materials-title">
                                <h2><FaBoxes style={{ marginRight: '8px' }} />POS Stock</h2>
                            </div>
                        </div>
                    </div>

                    <div className="actions-bar">
                        <div className="search-wrapper">
                            <input
                                type="text"
                                placeholder="Search by name or barcode..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="materials-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Product</th>
                                    <th>Barcode</th>
                                    <th>UOM</th>
                                    <th>Sale Price</th>
                                    <th>Current Stock</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="6" style={{ textAlign: 'center' }}>Loading...</td></tr>
                                ) : rows.length === 0 ? (
                                    <tr><td colSpan="6" style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>No POS stock records.</td></tr>
                                ) : rows.map((r) => (
                                    <tr key={r.rm_id}>
                                        <td data-label="ID">#{r.rm_id}</td>
                                        <td data-label="Product" style={{ fontWeight: '600' }}>{r.name}</td>
                                        <td data-label="Barcode"><span style={{ fontFamily: 'monospace' }}>{r.barcode}</span></td>
                                        <td data-label="UOM">{r.uom_name}</td>
                                        <td data-label="Sale Price" style={{ color: '#16a34a', fontWeight: '600' }}>
                                            {r.sale_price != null ? Number(r.sale_price).toFixed(2) : '-'}
                                        </td>
                                        <td data-label="Stock" style={{ fontWeight: '600' }}>
                                            {Number(r.current_stock || 0).toLocaleString()} {r.uom_name}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: '30px' }}>
                        <Pagination page={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} />
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default PosStock;
