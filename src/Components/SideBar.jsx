import React from "react";
import { FaHome, FaBoxOpen, FaUsers, FaTruck, FaShoppingCart, FaCashRegister, FaUserPlus, FaHistory, FaCog, FaChartBar, FaSignOutAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const Sidebar = ({ onLogout }) => {
  const navigate = useNavigate();

  return (
    <div className="sidebar-fixed">
      <h2 className="menu-title">Menu</h2>

      <ul>
        <li onClick={() => navigate('/dashboard')}><FaHome /> Dashboard</li>
        <li onClick={() => navigate('/products')}><FaBoxOpen /> Products</li>
        <li onClick={() => navigate('/customers')}><FaUsers /> Customers</li>
        <li onClick={() => navigate('/suppliers')}><FaTruck /> Suppliers</li>
        <li onClick={() => navigate('/purchase')}><FaShoppingCart /> Purchase</li>
        <li onClick={() => navigate('/sales')}><FaCashRegister /> Sales</li>
        <li onClick={() => navigate('/entities')}><FaUserPlus /> Add Entity</li>
        <li onClick={() => navigate('/transactions')}><FaHistory /> Transactions</li>
        <li onClick={() => navigate('/settings')}><FaCog /> Settings</li>
        <li onClick={() => navigate('/reports')}><FaChartBar /> Reports</li>
        <li onClick={onLogout}><FaSignOutAlt /> Logout</li>
      </ul>
    </div>
  );
};

export default Sidebar;
