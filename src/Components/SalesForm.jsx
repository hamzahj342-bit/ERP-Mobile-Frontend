import React, { useEffect, useState } from 'react';
import "../TransactionForm.css";
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import NavigationBar from './NavigationBar';

const SalesForm = () => {
  const [customers, setCustomers] = useState([]);
  const [formData, setFormData] = useState({
    product: '',
    quantity: '',
    price: '',
    date: '',
    entityId: '',
  });

  const navigate = useNavigate();

  // Fetch only customers
  useEffect(() => {
    fetch("http://localhost:5000/api/entities")
      .then(res => res.json())
      .then(data => {
        const filtered = data.filter(e => e.type === 'customer');
        setCustomers(filtered);
      })
      .catch(err => console.error("Error fetching customers:", err));
  }, []);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...formData,
      transactionType: "sell"
    };

    try {
      const res = await fetch('http://localhost:5000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Sale completed and stock updated.');
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
      <button className='back-btn' style={{marginTop:30, marginLeft:25 }}
              onClick={() => navigate('/dashboard')}
               >
             <FaArrowLeft />
               </button>
    <form onSubmit={handleSubmit} className="form">
      <h3>Sale Invoice</h3>

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
     <div className='row '>    
        <select className='col select-customer' name="entityId" value={formData.entityId} onChange={handleChange} required>
        <option value="">Select Customer</option>
        {customers.map(customer => (
          <option key={customer.id} value={customer.id}>{customer.name}</option>
        ))}
      </select>
      <button className='col add-btn' onClick={() => navigate('/entities')}>Add Customer</button>
      </div>
      <button type="submit" className="primary-btn">
        Sell & Update Stock
      </button>
    </form>
    </div>
    </>
  );
};

export default SalesForm;
