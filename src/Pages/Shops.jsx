import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import '../CustomersAndSuppliers.css';
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';
import Swal from 'sweetalert2';   // 👈 import SweetAlert2
import api from "../../api"; 

const Shops = () => {
  const [shops, setShops] = useState([]);
  const [onUpdate, setOnUpdate] = useState(null);
  const [shopData, setShopData] = useState({ name: "" });
  
  const navigate = useNavigate();

  // ✅ Fetch shops using standardized api.js
  const fetchShops = async () => {
    try {
      const res = await api.get("/shops");
      setShops(res.data);
    } catch (err) {
      console.error("Error fetching shops:", err);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  // ✅ Update API using standardized api.js
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/shops/${onUpdate.id}`, { name: shopData.name });
      
      if (res.status === 200 || res.status === 204) {
        setOnUpdate(null);
        setShopData({ name: "" }); // Reset input
        fetchShops();
        Swal.fire("Updated!", "Shop updated successfully.", "success");
      }
    } catch (err) {
      console.error("Error updating:", err);
      Swal.fire("Error", "Failed to update shop", "error");
    }
  };

  const handleEditClick = (shop) => {
    setOnUpdate(shop);
    setShopData({ name: shop.name });
  };

  const handleChange = (e) => {
    setShopData({ name: e.target.value });
  };

  // ✅ Delete API using standardized api.js
  const handleDelete = (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "You won’t be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/shops/${id}`);
          fetchShops();
          Swal.fire("Deleted!", "Shop has been deleted.", "success");
        } catch (err) {
          console.error("Error deleting:", err);
          Swal.fire("Error", "Failed to delete shop", "error");
        }
      }
    });
  };

  return (
    <>
    <NavigationBar />
    <div className="table-container">
      <button className='back-btn' style={{marginTop:"30px"}}
              onClick={() => navigate('/dashboard')}>
        <FaArrowLeft />
      </button>
      <div className="table-wrapper">
        <button className='add-cust-sup' onClick={() => navigate('/add-shops')}>Add Shop</button>
        <h2>Shops List</h2>

        {/* Edit Form */}
        {onUpdate && (
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
              <h3>Edit Shop</h3>
              <form onSubmit={handleUpdate} style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                <input className="input"
                  name="name"
                  value={shopData.name}
                  onChange={handleChange}
                  placeholder="Shop Name"
                  required
                />
                <button type="submit" className="primary-btn">Update</button>
                <button type="button" className="primary-btn" onClick={() => setOnUpdate(null)}>Cancel</button>
              </form>
            </div>
          </div>
        )}

        <table className="entity-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {shops.map((shop) => (
              <tr key={shop.id}>
                <td>{shop.id}</td>
                <td>{shop.name}</td>
                <td>
                  <button className="edit-btn" onClick={() => handleEditClick(shop)}>Edit</button>
                  <button className="delete-btn" onClick={() => handleDelete(shop.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    <Footer />
    </>
  );
};

export default Shops;
