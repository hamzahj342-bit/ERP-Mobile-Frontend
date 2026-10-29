import React, { useEffect, useState } from 'react';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../ProductCard.css'
import NavigationBar from './NavigationBar';
import Footer from './Footer';


const ProductCard = () => {
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({ name: '', price: '', quantity: '', image:null });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({ id: null, name: '', price: '', quantity: '', image:null });

  const navigate = useNavigate();


  // 🟢 Load all products on page load
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const res = await fetch('http://localhost:5000/api/products');
    const data = await res.json();
    setProducts(data);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const handleImageChange = (e) => {
  setFormData({ ...formData, image: e.target.files[0] });
};


  const handleCreateProduct = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("name", formData.name);
    fd.append("price", formData.price);
    fd.append("quantity", formData.quantity);
    fd.append("image", formData.image);
    const res = await fetch('http://localhost:5000/api/products', {
      method: 'POST',
      body: fd,
    });
    if (res.ok) {
      setFormData({ name: '', price: '', quantity: '', image: null });
      fetchProducts();
    }
  };

  const handleDelete = async (id) => {
    await fetch(`http://localhost:5000/api/products/${id}`, { method: 'DELETE' });
    fetchProducts();
  };

  const openEditModal = (product) => {
    setEditData(product);
    setEditModalOpen(true);
  };

  const handleEditChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };
  const handleEditImageChange = (e) => {
  setEditData({ ...editData, image: e.target.files[0] });
};

  const handleUpdateProduct = async (e) => {
   e.preventDefault();
  const fd = new FormData();
  fd.append("name", editData.name);
  fd.append("price", editData.price);
  fd.append("quantity", editData.quantity);
  if (editData.image instanceof File) {
    fd.append("image", editData.image); // new image agar select ki hai
  }

  await fetch(`http://localhost:5000/api/products/${editData.id}`, {
    method: "PUT",
    body: fd,
  });
    setEditModalOpen(false);
    fetchProducts();
  };
  const toggleStatus = async (id, currentStatus) => {
  const newStatus = currentStatus === "active" ? "inactive" : "active";

  await fetch(`http://localhost:5000/api/products/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: newStatus }),
  });

  fetchProducts(); // reload list
};

  return (
    <div>
      <NavigationBar />
    <div className='page-container'>
      <button className='back-btn' style={{marginTop:"30px"}}
         onClick={() => navigate('/dashboard')}
>
  <FaArrowLeft />
</button>

      <div className='card' >
        <h2>Create Product</h2>
        <form onSubmit={handleCreateProduct} className='form'>
          <input
           type="text"
           name="name" 
           placeholder="Product Name" 
           value={formData.name} 
           onChange={handleInputChange}
           required />
          <input 
          type="number" 
          name="price" 
          placeholder="Price" 
          value={formData.price} 
          onChange={handleInputChange}
          required />
          <input 
          type="number" 
          name="quantity" 
          placeholder="Quantity" 
          value={formData.quantity} 
          onChange={handleInputChange} 
          required />
          <input type="file" name="image" accept="image/*" onChange={handleImageChange} />
          <button className='primary-btn' type="submit">Add Product</button>
        </form>
      </div>


      <div className='card'
       >
        <h2>Product List</h2>
        <table className='product-table'>
          <thead>
            <tr>
              <th>ID</th>
              <th>Image</th>
              <th>Name</th>
              <th>Price (PKR)</th>
              <th>Quantity</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.image_url && (
                   <img 
                     src={`http://localhost:5000${p.image_url}`} 
                     alt={p.name} 
                     width="80" 
                     height="60"
                     style={{ objectFit: "cover", borderRadius: "5px" }}
                     />
                     )}
                </td>
                <td>{p.name}</td>
                <td>{p.price}</td>
                <td>{p.quantity}</td>
                <td>
                   <button
                  onClick={() => toggleStatus(p.id, p.status)}
                  className= {p.status === "active" ? "active-btn" : "inactive-btn" }
                  >
                  {p.status === "active" ? "Activated" : "Deactivated"}
                  </button>
                </td>
                <td>
                  <button onClick={() => openEditModal(p)} className='edit-btn'>Edit</button>{' '}
                  <button onClick={() => handleDelete(p.id)} className='delete-btn'>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {editModalOpen && (
        <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '10px', width: '300px' }}>
            <h3>Edit Product</h3>
            <form onSubmit={handleUpdateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input  className='input'
              type="text" 
              name="name" 
              value={editData.name} 
              onChange={handleEditChange} 
              required />
              <input className='input' 
              type="number" 
              name="price" 
              value={editData.price} 
              onChange={handleEditChange} 
              required />
              <input className='input'
              type="number" 
              name="quantity" 
              value={editData.quantity} 
              onChange={handleEditChange}  
              required />
              {editData.image instanceof File ? (
              <img
              src={URL.createObjectURL(editData.image)}
              alt="New Preview"
              width="80"
              height="60"
              style={{ objectFit: "cover", borderRadius: "5px" }}
              />
            ) : (
              editData.image_url && (
              <img
              src={`http://localhost:5000${editData.image_url}`}
              alt="Current"
              width="80"
              height="60"
              style={{ objectFit: "cover", borderRadius: "5px" }}
              />
              )
              )}
              <input 
              type="file"
              name="image"
              accept="image/*" 
              onChange={handleEditImageChange} 
              />
              <button type="submit" className='primary-btn'>Update</button>
              <button type="button" onClick={() => setEditModalOpen(false)} className='primary-btn'>Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
    <Footer />
    </div>
  );
};

export default ProductCard;
