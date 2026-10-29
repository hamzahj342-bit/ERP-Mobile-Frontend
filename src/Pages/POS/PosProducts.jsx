import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaEdit, FaPlus, FaTrashAlt, FaBalanceScale, FaTrash, FaBarcode } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import NavigationBar from '../../Components/NavigationBar';
import Footer from '../../Components/Footer';
import Pagination from '../../Components/Pagination';
import api from '../../../api';
import '../../css/RM/MaterialList.css';

const emptyForm = {
    rm_id: null,
    name: '',
    barcode: '',
    uom_id: '',
    material_category_id: '',
    sale_price: '',
};

const PosProducts = () => {
    const navigate = useNavigate();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uoms, setUoms] = useState([]);
    const [categories, setCategories] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    // Pack sizes (item_uoms) editor — reuses the shared endpoints
    const [packModalOpen, setPackModalOpen] = useState(false);
    const [packMaterial, setPackMaterial] = useState(null);
    const [packRows, setPackRows] = useState([]);
    const [packSaving, setPackSaving] = useState(false);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await api.get('/pos/products', {
                params: { page, limit: 50, search: debouncedSearch }
            });
            setProducts(res.data.data || []);
            setTotalPages(res.data.totalPages || 1);
        } catch (error) {
            toast.error('Failed to fetch POS products');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [page, debouncedSearch]);

    useEffect(() => {
        const fetchLookups = async () => {
            try {
                const [uomRes, catRes] = await Promise.all([
                    api.get('/uoms'),
                    api.get('/material-categories'),
                ]);
                setUoms(uomRes.data || []);
                setCategories(catRes.data || []);
            } catch (err) {
                toast.error('Failed to fetch UOMs/categories');
            }
        };
        fetchLookups();
    }, []);

    const openCreateModal = () => {
        setFormData(emptyForm);
        setModalOpen(true);
    };

    const openEditModal = (p) => {
        setFormData({
            rm_id: p.rm_id,
            name: p.name || '',
            barcode: p.barcode || '',
            uom_id: p.uom_id || p.uom?.id || '',
            material_category_id: p.material_category_id || p.material_category?.id || '',
            sale_price: p.sale_price ?? '',
        });
        setModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return toast.error('Product name is required');
        if (!formData.barcode.trim()) return toast.error('Barcode is required');
        if (!formData.uom_id) return toast.error('Base UOM is required');
        if (formData.sale_price === '' || Number(formData.sale_price) < 0) {
            return toast.error('A valid sale price is required');
        }

        setSaving(true);
        try {
            const payload = {
                name: formData.name.trim(),
                barcode: formData.barcode.trim(),
                uom_id: formData.uom_id,
                material_category_id: formData.material_category_id || null,
                sale_price: Number(formData.sale_price),
            };
            if (formData.rm_id) {
                await api.put(`/pos/products/${formData.rm_id}`, payload);
                toast.success('Product updated');
            } else {
                await api.post('/pos/products', payload);
                toast.success('Product created');
            }
            setModalOpen(false);
            fetchProducts();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to save product');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (rm_id, name) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `Do you want to delete ${name}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/pos/products/${rm_id}`);
                Swal.fire('Deleted!', 'Product removed.', 'success');
                fetchProducts();
            } catch (error) {
                Swal.fire('Error!', error.response?.data?.error || 'Failed to delete.', 'error');
            }
        }
    };

    const openPackModal = async (product) => {
        try {
            const res = await api.get(`/add-materials/${product.rm_id}/uoms`);
            const list = Array.isArray(res.data) ? res.data : [];
            const baseRow = list.find(p => p.is_base);
            setPackMaterial({
                rm_id: product.rm_id,
                name: product.name,
                baseUomName: baseRow?.uom?.name || product.uom?.name || 'base unit',
            });
            setPackRows(
                list.filter(p => !p.is_base).map(p => ({
                    uom_id: p.uom_id,
                    factor_to_base: Number(p.factor_to_base),
                }))
            );
            setPackModalOpen(true);
        } catch (err) {
            toast.error('Failed to load pack sizes');
        }
    };

    const handleSavePackSizes = async () => {
        for (const row of packRows) {
            if (!row.uom_id) return toast.error('Please select a UOM for every pack size row.');
            if (!(Number(row.factor_to_base) > 0)) return toast.error('Conversion factor must be greater than 0.');
        }
        const uomIds = packRows.map(r => Number(r.uom_id));
        if (new Set(uomIds).size !== uomIds.length) return toast.error('Each UOM can only appear once.');

        setPackSaving(true);
        try {
            await api.put(`/add-materials/${packMaterial.rm_id}/uoms`, { uoms: packRows });
            toast.success('Pack sizes updated');
            setPackModalOpen(false);
            fetchProducts();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save pack sizes');
        } finally {
            setPackSaving(false);
        }
    };

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
                                <h2><FaBarcode style={{ marginRight: '8px' }} />POS Products</h2>
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
                        <button className="add-sale-btn" onClick={openCreateModal}>
                            <FaPlus /> Add New Product
                        </button>
                    </div>

                    <div className="table-responsive">
                        <table className="materials-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Barcode</th>
                                    <th>Category</th>
                                    <th>UOM</th>
                                    <th>Sale Price</th>
                                    <th>Stock</th>
                                    <th>Pack Sizes</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="9" style={{ textAlign: 'center' }}>Loading...</td></tr>
                                ) : products.length === 0 ? (
                                    <tr><td colSpan="9" style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>No POS products yet. Add your first product.</td></tr>
                                ) : products.map((p) => (
                                    <tr key={p.rm_id}>
                                        <td data-label="ID">#{p.rm_id}</td>
                                        <td data-label="Name" style={{ fontWeight: '600' }}>{p.name}</td>
                                        <td data-label="Barcode"><span style={{ fontFamily: 'monospace' }}>{p.barcode}</span></td>
                                        <td data-label="Category">{p.material_category?.name || '-'}</td>
                                        <td data-label="UOM">{p.uom?.name}</td>
                                        <td data-label="Sale Price" style={{ fontWeight: '600', color: '#16a34a' }}>
                                            {p.sale_price != null ? Number(p.sale_price).toFixed(2) : '-'}
                                        </td>
                                        <td data-label="Stock">{Number(p.current_stock || 0).toLocaleString()}</td>
                                        <td data-label="Pack Sizes">
                                            {(p.pack_sizes || []).filter(ps => !ps.is_base).length > 0
                                                ? p.pack_sizes.filter(ps => !ps.is_base).map(ps =>
                                                    `1 ${ps.uom?.name} = ${Number(ps.factor_to_base)} ${p.uom?.name}`
                                                ).join(', ')
                                                : '-'}
                                        </td>
                                        <td data-label="Actions">
                                            <div className="action-btns">
                                                <button onClick={() => openEditModal(p)} className="edit-btn-action"><FaEdit /></button>
                                                <button onClick={() => openPackModal(p)} className="edit-btn-action" title="Pack Sizes (UOM conversion)"><FaBalanceScale /></button>
                                                <button onClick={() => handleDelete(p.rm_id, p.name)} className="delete-btn"><FaTrashAlt /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: '30px' }}>
                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            onPageChange={(p) => setPage(p)}
                        />
                    </div>
                </div>

                {/* Create / Edit Modal */}
                {modalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>{formData.rm_id ? 'Edit Product' : 'Add POS Product'}</h3>
                            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <label style={{ fontSize: '0.85rem', color: '#64748b' }}>Product Name *</label>
                                <input
                                    className='search-input'
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />

                                <label style={{ fontSize: '0.85rem', color: '#64748b' }}>Barcode * (scan or type)</label>
                                <input
                                    className='search-input'
                                    type="text"
                                    value={formData.barcode}
                                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                    placeholder="e.g. 8964000123456"
                                    required
                                />

                                <label style={{ fontSize: '0.85rem', color: '#64748b' }}>Base UOM *</label>
                                <select
                                    className='search-input'
                                    value={formData.uom_id}
                                    onChange={(e) => setFormData({ ...formData, uom_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select UOM</option>
                                    {uoms.map((uom) => <option key={uom.id} value={uom.id}>{uom.name}</option>)}
                                </select>

                                <label style={{ fontSize: '0.85rem', color: '#64748b' }}>Category</label>
                                <select
                                    className='search-input'
                                    value={formData.material_category_id}
                                    onChange={(e) => setFormData({ ...formData, material_category_id: e.target.value })}
                                >
                                    <option value="">Select Category</option>
                                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>

                                <label style={{ fontSize: '0.85rem', color: '#64748b' }}>Sale Price (per base unit) *</label>
                                <input
                                    className='search-input'
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={formData.sale_price}
                                    onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                                    required
                                />

                                <button type="submit" className="btn-add" disabled={saving}>
                                    {saving ? 'Saving...' : formData.rm_id ? 'Update Product' : 'Create Product'}
                                </button>
                                <button type="button" onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>Cancel</button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Pack Sizes (UOM conversion) Modal */}
                {packModalOpen && packMaterial && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ maxWidth: '520px' }}>
                            <h3>Pack Sizes — {packMaterial.name}</h3>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                                Base unit: <b>{packMaterial.baseUomName}</b>. Define bigger/smaller selling
                                units, e.g. 1 Carton = 12 {packMaterial.baseUomName}. Stock always stays in {packMaterial.baseUomName}.
                            </p>

                            {packRows.length === 0 && (
                                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No extra pack sizes yet.</p>
                            )}

                            {packRows.map((row, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '0.9rem' }}>1</span>
                                    <select
                                        className='search-input'
                                        style={{ flex: 1 }}
                                        value={row.uom_id}
                                        onChange={(e) => {
                                            const updated = [...packRows];
                                            updated[idx] = { ...updated[idx], uom_id: e.target.value };
                                            setPackRows(updated);
                                        }}
                                    >
                                        <option value="">Select UOM</option>
                                        {uoms
                                            .filter(u => u.name !== packMaterial.baseUomName)
                                            .map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                    <span style={{ fontSize: '0.9rem' }}>=</span>
                                    <input
                                        className='search-input'
                                        type="number"
                                        min="0"
                                        step="any"
                                        style={{ width: '110px' }}
                                        placeholder="Factor"
                                        value={row.factor_to_base}
                                        onChange={(e) => {
                                            const updated = [...packRows];
                                            updated[idx] = { ...updated[idx], factor_to_base: e.target.value };
                                            setPackRows(updated);
                                        }}
                                    />
                                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{packMaterial.baseUomName}</span>
                                    <button
                                        type="button"
                                        className="delete-btn"
                                        onClick={() => setPackRows(packRows.filter((_, i) => i !== idx))}
                                    >
                                        <FaTrash />
                                    </button>
                                </div>
                            ))}

                            <button
                                type="button"
                                className="edit-btn-action"
                                style={{ marginBottom: '15px' }}
                                onClick={() => setPackRows([...packRows, { uom_id: '', factor_to_base: '' }])}
                            >
                                <FaPlus /> Add Pack Size
                            </button>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <button type="button" className="btn-add" disabled={packSaving} onClick={handleSavePackSizes}>
                                    {packSaving ? 'Saving...' : 'Save Pack Sizes'}
                                </button>
                                <button type="button" onClick={() => setPackModalOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
};

export default PosProducts;
