import React from 'react';
import { FaTimes } from 'react-icons/fa';

const InvoiceTypeModal = ({ open, onClose, onSelect, title = 'Choose Invoice Type' }) => {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box p-4 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="m-0">{title}</h3>
          <button className="close-x btn btn-link p-0 text-dark" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <p className="mt-3 text-secondary">Select the invoice type before opening the form.</p>
        <div className="d-flex gap-3 justify-content-between mt-4">
          <button type="button" className="btn btn-success flex-fill" onClick={() => onSelect('taxable')}>
            Taxable Invoice
          </button>
          <button type="button" className="btn btn-outline-secondary flex-fill" onClick={() => onSelect('nonTaxable')}>
            Non Taxable Invoice
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceTypeModal;
