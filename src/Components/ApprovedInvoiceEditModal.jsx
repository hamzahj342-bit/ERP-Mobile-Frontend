import React, { useEffect, useState, useMemo } from 'react';
import { FaTimes, FaSave, FaSpinner, FaCalendarAlt, FaHashtag, FaUser, FaTag } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../../api';

const ApprovedInvoiceEditModal = ({ open, onClose, invoiceId, invoiceCategory, onSaved }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [details, setDetails] = useState([]);
  const [invoiceDate, setInvoiceDate] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!open || !invoiceId) return;
    setInvoice(null);
    setDetails([]);
    setErrorMsg('');
    fetchApprovedInvoicePreview();
  }, [open, invoiceId]);

  const fetchApprovedInvoicePreview = async () => {
    try {
      setLoading(true);
      const route = invoiceCategory === 'fp' ? '/fp-sale' : '/rm-transactions';
      const res = await api.get(`${route}/edit-approved-preview/${invoiceId}`);
      const payload = res.data?.success ? res.data.data : res.data;
      
      const master = invoiceCategory === 'fp' ? payload : (payload.master || payload);
      const rows = invoiceCategory === 'fp' ? (payload.details || []) : (payload.details || []);
      const dateString = payload.invoiceDate || master?.date;

      setInvoice(master);
      setDetails(rows.map((row) => ({
        ...row,
        quantity: Number(row.quantity) || 0,
        unit_price: Number(row.unit_price) || 0,
        total_price: Number(row.total_price) || 0,
      })));

      setInvoiceDate(dateString ? new Date(dateString).toISOString().split('T')[0] : '');
    } catch (err) {
      console.error('Error fetching approved invoice preview:', err);
      setErrorMsg(err.response?.data?.message || 'Unable to load approved invoice details.');
    } finally {
      setLoading(false);
    }
  };

// Dynamic Label & Value Setup (Supplier vs Customer)
  // Dynamic Label & Value Setup (Supplier vs Customer)
  const entityInfo = useMemo(() => {
    if (!invoice) return { label: 'Party / Entity', value: 'N/A' };

    const type = invoice.type || invoice.transaction_type || '';
    
    const isRmCategory = invoiceCategory === 'rm';
    const isSupplier = isRmCategory && (type === 'Purchase' || type === 'Return');

    // First detail row values
    const firstRow = details[0] || {};

    // Dynamic field extraction based on exact enum logic
    const nameValue = isSupplier
      ? (
          firstRow.supplier_name ||
          firstRow.supplier?.name ||
          firstRow.entity_supplier_name ||
          invoice.supplier_name ||
          invoice.supplier?.name ||
          invoice.entity_supplier_name ||
          invoice.entity_name ||
          invoice.party_name ||
          'N/A'
        )
      : (
          firstRow.customer_name ||
          firstRow.customer?.name ||
          firstRow.entity_customer_name ||
          invoice.customer_name ||
          invoice.customer?.name ||
          invoice.entity_customer_name ||
          invoice.entity_name ||
          invoice.party_name ||
          'N/A'
        );

    return {
      label: isSupplier ? 'Supplier Name' : 'Customer Name',
      value: nameValue
    };
  }, [invoice, details, invoiceCategory]);

  const handleRowChange = (index, field, value) => {
    const updated = [...details];
    if (field === 'quantity' || field === 'unit_price') {
      const numeric = value === '' ? '' : Number(value);
      if (value !== '' && (Number.isNaN(numeric) || numeric < 0)) return;
      
      updated[index][field] = numeric;
      updated[index].total_price = Number((Number(updated[index].quantity || 0) * Number(updated[index].unit_price || 0)).toFixed(2));
    }
    setDetails(updated);
  };

  const grandTotal = useMemo(() => {
    return details.reduce((sum, row) => sum + (Number(row.quantity || 0) * Number(row.unit_price || 0)), 0);
  }, [details]);

  const saveApprovedInvoice = async () => {
    if (!invoice) return;
    const invalidRow = details.find((row) => Number(row.quantity) <= 0 || Number(row.unit_price) < 0);
    
    if (invalidRow) {
      toast.error('All line quantities must be greater than 0 and unit prices cannot be negative.');
      return;
    }

    const payload = {
      date: invoiceDate,
      details: details.map((row) => ({
        detail_id: row.detail_id || row.id,
        quantity: Number(row.quantity),
        unit_price: Number(row.unit_price),
        uom_id: row.uom_id,
        date: row.date || invoiceDate,
      }))
    };

    try {
      setSaving(true);
      const route = invoiceCategory === 'fp' ? '/fp-sale' : '/rm-transactions';
      await api.put(`${route}/${invoiceId}/edit-approved`, payload);
      toast.success('Approved invoice updated successfully.');
      if (typeof onSaved === 'function') onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving approved invoice edit:', err);
      toast.error(err.response?.data?.message || 'Failed to save approved invoice edit.');
    } finally {
      setSaving(false);
    }
  };

  // Strict structural return condition
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div 
        className="modal-box p-4" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxHeight: '90vh', 
          width: '85vw',
          minWidth: '1050px', 
          overflowY: 'auto',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          background: '#ffffff',
          border: '1px solid #e2e8f0'
        }}
      >
        {/* Header section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', color: '#1e293b' }}>Edit Approved Invoice</h3>
              {invoice && (
                <span style={{ padding: '2px 10px', fontSize: '0.75rem', fontWeight: '600', borderRadius: '12px', background: '#eef2ff', color: '#4f46e5', border: '1px solid #e0e7ff' }}>
                  {invoice.type || invoice.transaction_type || 'Approved'}
                </span>
              )}
            </div>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
              Modifying quantity, unit price, or date will automatically adjust inventory layers and re-post general ledgers.
            </p>
          </div>
          <button type="button" className="close-btn" onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}>
            <FaTimes />
          </button>
        </div>

        {/* Dynamic States rendering */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '10px', color: '#94a3b8' }}>
            <FaSpinner className="spin" size={28} style={{ color: '#4f46e5' }} />
            <span style={{ fontSize: '0.9rem' }}>Fetching secure invoice data snapshot...</span>
          </div>
        ) : errorMsg ? (
          <div style={{ color: '#b91c1c', padding: '16px', background: '#fee2e2', borderRadius: '8px', border: '1px solid #fca5a5', fontSize: '0.9rem' }}>
            {errorMsg}
          </div>
        ) : !invoice ? (
          <div style={{ padding: '16px', background: '#fef3c7', color: '#d97706', borderRadius: '8px', border: '1px solid #fcd34d', fontSize: '0.9rem' }}>
            Unable to fetch specific invoice record.
          </div>
        ) : (
          <>
            {/* Top Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>
                <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>
                  <FaHashtag /> Invoice No
                </label>
                <input type="text" readOnly value={invoice.invoice_no || invoice.invoiceNo || ''} className="rm-input-field readonly-input" style={{ width: '100%', background: '#f1f5f9', color: '#475569' }} />
              </div>
              <div>
                <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>
                  <FaTag /> Type
                </label>
                <input type="text" readOnly value={invoice.type || invoice.transaction_type || 'N/A'} className="rm-input-field readonly-input" style={{ width: '100%', background: '#f1f5f9', color: '#475569' }} />
              </div>
              <div>
                <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>
                  <FaUser /> {entityInfo.label}
                </label>
                <input type="text" readOnly value={entityInfo.value} className="rm-input-field readonly-input" style={{ width: '100%', background: '#f1f5f9', color: '#475569', textOverflow: 'ellipsis' }} />
              </div>
              <div>
                <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', color: '#4f46e5', marginBottom: '6px' }}>
                  <FaCalendarAlt /> Date
                </label>
                <input
                  type="date"
                  className="rm-input-field"
                  style={{ width: '100%', border: '1px solid #a5b4fc', outline: 'none' }}
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
            </div>

            {/* Line items data mapping */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#334155', textTransform: 'uppercase' }}>Line Items Ledger</h4>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>{details.length} Rows</span>
              </div>
              
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table className="product-table" style={{ minWidth: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#475569', fontWeight: '600' }}>Item Description</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#475569', fontWeight: '600', width: '120px' }}>Brand</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#475569', fontWeight: '600', width: '140px' }}>Quantity</th>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#475569', fontWeight: '600', width: '160px' }}>Unit Price</th>
                      <th style={{ padding: '12px', textAlign: 'right', color: '#475569', fontWeight: '600', width: '160px' }}>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.map((row, index) => {
                      const uomDisplay = (row.uom_name && row.uom_name.trim() !== '')
                        ? row.uom_name
                        : row.uom_code || row.uom || row.Uom?.name || row.Uom?.uom_name || row.unit_of_measure || (row.uom_id ? `UOM #${row.uom_id}` : '-');

                      return (
                        <tr key={row.detail_id || row.id || index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px', color: '#1e293b', fontWeight: '500' }}>
                            {row.rm_name || row.product_name || 'Item'}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ padding: '2px 6px', background: '#f1f5f9', borderRadius: '4px', fontSize: '0.75rem', color: '#475569', border: '1px solid #e2e8f0' }}>
                              {uomDisplay}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              value={row.quantity}
                              onChange={(e) => handleRowChange(index, 'quantity', e.target.value)}
                              className="rm-input-field"
                              style={{ width: '100%', boxSizing: 'border-box' }}
                            />
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.unit_price}
                              onChange={(e) => handleRowChange(index, 'unit_price', e.target.value)}
                              className="rm-input-field"
                              style={{ width: '100%', boxSizing: 'border-box' }}
                            />
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: '#1e293b' }}>
                            Rs. {(Number(row.quantity || 0) * Number(row.unit_price || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Computation calculation banner */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '30px', background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '12px 24px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#4c1d95' }}>Grand Total Summary:</span>
                <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#6d28d9' }}>
                  Rs. {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Footer Control Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Cancel
              </button>
              <button 
                type="button" 
                className="save-btn" 
                onClick={saveApprovedInvoice} 
                disabled={saving || loading || !invoice}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {saving ? (
                  <><FaSpinner className="spin" /> Saving Changes...</>
                ) : (
                  <><FaSave /> Save Changes</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ApprovedInvoiceEditModal;