import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaEdit, FaPlus, FaSearch, FaTrashAlt, FaBalanceScale, FaTrash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';
import Pagination from "../Components/Pagination";
import api from '../../api';
import '../css/RM/MaterialList.css'; // Importing New CSS

const MaterialsList = () => {
    const navigate = useNavigate();
    
    const [rawMaterial, setRawMaterial] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uoms, setUoms] = useState([]);
    const [categories, setCategories] = useState([]);
    const [searchTerm, setSearchTerm] = useState(""); 
    const [debouncedSearch, setDebouncedSearch] = useState(""); 
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editData, setEditData] = useState({
        rm_id: null,
        name: '',
        uom_id: '',
        unit_quantity: '',
    });

    // Pack sizes (item_uoms) editor: 1 Bora = 50 kg etc.
    const [packModalOpen, setPackModalOpen] = useState(false);
    const [packMaterial, setPackMaterial] = useState(null); // { rm_id, name, baseUomName }
    const [packRows, setPackRows] = useState([]);           // non-base rows [{ uom_id, factor_to_base }]
    const [packSaving, setPackSaving] = useState(false);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1); 
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const fetchMaterials = async () => {
        setLoading(true);
        try {
            const res = await api.get('/add-materials/with-filters', {
                params: { page, limit: 50, search: debouncedSearch }
            });
            setRawMaterial(res.data.data || []);
            setTotalPages(res.data.totalPages || 1);
        } catch (error) {
            toast.error('Failed to fetch materials');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMaterials();
    }, [page, debouncedSearch]);

    useEffect(() => {
        const fetchUoms = async () => {
            try {
                const res = await api.get('/uoms');
                setUoms(res.data);
            } catch (error) { toast.error('Failed to fetch Brands'); }
        };
        const fetchCategories = async () => {
            try { const res = await api.get('/material-categories'); setCategories(res.data); } catch (err) { toast.error('Failed to fetch categories'); }
        };
        fetchUoms();
        fetchCategories();
    }, []);

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
                await api.delete(`/add-materials/${rm_id}`);
                Swal.fire('Deleted!', 'Product removed.', 'success');
                fetchMaterials();
            } catch (error) { Swal.fire('Error!', 'Failed to delete.', 'error'); }
        }
    };

    const openEditModal = (material) => {
        setEditData({
            rm_id: material.rm_id,
            name: material.name,
            uom_id: material.uom_id,
            unit_quantity: material.unit_quantity || '',
            material_category_id: material.material_category_id || (material.material_category?.id || ''),
        });
        setEditModalOpen(true);
    };

    const openPackModal = async (material) => {
        try {
            const res = await api.get(`/add-materials/${material.rm_id}/uoms`);
            const list = Array.isArray(res.data) ? res.data : [];
            const baseRow = list.find(p => p.is_base);
            setPackMaterial({
                rm_id: material.rm_id,
                name: material.name,
                baseUomName: baseRow?.uom?.name || material.uom?.name || 'base unit',
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
            fetchMaterials();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save pack sizes');
        } finally {
            setPackSaving(false);
        }
    };

    const handleUpdateMaterial = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/add-materials/${editData.rm_id}`, editData);
            toast.success('Updated successfully');
            fetchMaterials(); 
            setEditModalOpen(false);
        } catch (error) { toast.error('Update failed'); }
    };

    return (
        <div className="page-wrapper">
            <NavigationBar />
            <div className="materials-wrapper">
                <div className="materials-container">
                    <div className="erp-page-card">
                        <div className="erp-page-header materials-header">
                            <div className="erp-page-header-left header-left">
                                <button className="back-btn erp-back-btn" type="button" onClick={() => navigate('/dashboard')}>
                                    <FaArrowLeft />
                                </button>
                                <h2 className="erp-page-title materials-title">Products</h2>
                            </div>
                            <button className="add-sale-btn erp-btn-primary" type="button" onClick={() => navigate("/add-materials")}>
                                <FaPlus /> Add Product
                            </button>
                        </div>

                        <div className="actions-bar erp-search-bar">
                            <div className="search-wrapper">
                                <input
                                    type="text"
                                    placeholder="Search material name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="search-input erp-search-input"
                                />
                            </div>
                        </div>

                        <div className="erp-table-scroll table-responsive">
                            <table className="materials-table entity-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Category</th>
                                    <th>Brand</th>
                                    {/* Mobile shop: pack / weight not used (qty = 1 per IMEI)
                                    <th>Pack Sizes</th>
                                    <th>Unit Weight</th>
                                    */}
                                    <th style={{textAlign:'right'}}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="5" style={{textAlign:'center'}}>Loading...</td></tr>
                                ) : rawMaterial.map((m) => (
                                    <tr key={m.rm_id}>
                                        <td data-label="ID">#{m.rm_id}</td>
                                        <td data-label="Name" style={{fontWeight:'600'}}>{m.name}</td>
                                        <td data-label="Category">{m.material_category?.name || '-'}</td>
                                        <td data-label="Brand">{m.uom?.name}</td>
                                        {/* Mobile shop: pack / weight not used
                                        <td data-label="Pack Sizes">
                                            {(m.pack_sizes || []).filter(p => !p.is_base).length > 0
                                                ? m.pack_sizes.filter(p => !p.is_base).map(p =>
                                                    `1 ${p.uom?.name} = ${Number(p.factor_to_base)} ${m.uom?.name}`
                                                  ).join(', ')
                                                : '-'}
                                        </td>
                                        <td data-label="Weight">{m.unit_quantity || '-'}</td>
                                        */}
                                        <td data-label="Actions" className="erp-actions-cell">
                                            <div className="action-btns erp-actions-group">
                                                <button type="button" onClick={() => openEditModal(m)} className="edit-btn-action"><FaEdit /></button>
                                                {/* <button type="button" onClick={() => openPackModal(m)} className="edit-btn-action" title="Pack Sizes (UOM conversion)"><FaBalanceScale /></button> */}
                                                <button type="button" onClick={() => handleDelete(m.rm_id, m.name)} className="delete-btn"><FaTrashAlt /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>

                        <div className="erp-pagination-wrap">
                            <Pagination
                                page={page}
                                totalPages={totalPages}
                                onPageChange={(p) => setPage(p)}
                            />
                        </div>
                    </div>
                </div>

                {/* Edit Modal */}
                {editModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>Edit Product</h3>
                            <form onSubmit={handleUpdateMaterial} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <label style={{fontSize:'0.85rem', color:'#64748b'}}>Product Name</label>
                                <input className='search-input' type="text" value={editData.name} onChange={(e)=>setEditData({...editData, name:e.target.value})} required />
                                
                                <label style={{fontSize:'0.85rem', color:'#64748b'}}>Select Brand</label>
                                <select className='search-input' value={editData.uom_id} onChange={(e)=>setEditData({...editData, uom_id:e.target.value})} required>
                                    <option value="">Select Brand</option>
                                    {uoms.map((uom) => <option key={uom.id} value={uom.id}>{uom.name}</option>)}
                                </select>

                                <label style={{fontSize:'0.85rem', color:'#64748b'}}>Select Category</label>
                                <select className='search-input' value={editData.material_category_id} onChange={(e)=>setEditData({...editData, material_category_id:e.target.value})} >
                                    <option value="">Select Category</option>
                                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>

                                <button type="submit" className="btn-add">Update Product</button>
                                <button type="button" onClick={() => setEditModalOpen(false)} style={{background:'none', border:'none', color:'#64748b', cursor:'pointer'}}>Cancel</button>
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
                                units, e.g. 1 Bora = 50 {packMaterial.baseUomName}. Stock always stays in {packMaterial.baseUomName}.
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
                                <button type="button" onClick={() => setPackModalOpen(false)} style={{background:'none', border:'none', color:'#64748b', cursor:'pointer'}}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
};

export default MaterialsList;