import React, { useEffect, useState } from 'react';
import "../TransactionForm.css";
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import NavigationBar from './NavigationBar';
import Footer from './Footer';

const PurchaseForm = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [formData, setFormData] = useState({
    product: '',
    quantity: '',
    price: '',
    date: '',
    entityId: '',
  });

  const navigate = useNavigate();

  // Fetch only suppliers
  useEffect(() => {
    fetch("http://localhost:5000/api/entities")
      .then(res => res.json())
      .then(data => {
        const filtered = data.filter(e => e.type === 'supplier');
        setSuppliers(filtered);
      })
      .catch(err => console.error("Error fetching suppliers:", err));
  }, []);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...formData,
      transactionType: "buy"
    };

    try {
      const res = await fetch('http://localhost:5000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Purchase completed and stock updated.');
        setFormData({ product: '', quantity: '', price: '', date: '', entityId: '' });
      } else {
        const error = await res.json();
        alert(error.error || "Transaction failed.");
      }
    } catch (error) {
      console.error("Transaction error:", error);
    }
  };

  return (
    <>
    <NavigationBar />
    <div className='page-container'>
      <button className='back-btn' style={{marginTop:"30px"}}
        onClick={() => navigate('/dashboard')}
         >
       <FaArrowLeft />
         </button>
    <form onSubmit={handleSubmit} className="form">
      <h3>Purchase Invoice</h3>

      <input
        name="product"
        value={formData.product}
        onChange={handleChange}
        placeholder="Product Name"
        required
      />

      <input
        name="quantity"
        type="number"
        value={formData.quantity}
        onChange={handleChange}
        placeholder="Quantity"
        required
      />

      <input
        name="price"
        type="number"
        value={formData.price}
        onChange={handleChange}
        placeholder="Price"
        required
      />

      <input
        name="date"
        type="date"
        value={formData.date}
        onChange={handleChange}
        required
      />
      <div className="row">
      <select className='col select-customer' name="entityId" value={formData.entityId} onChange={handleChange} required>
        <option value="">Select Supplier</option>
        {suppliers.map(supplier => (
          <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
        ))}
      </select>
      <button className='col add-btn' onClick={() => navigate('/entities')}>Add Suppliers</button>
      </div>
      <button type="submit" className="primary-btn">
        Buy & Update Stock
      </button>
    </form>
    </div>
    <Footer />
    </>
  );
};

export default PurchaseForm;
