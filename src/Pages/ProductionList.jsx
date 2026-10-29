import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaBoxOpen } from "react-icons/fa";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import api from "../../api";
import "../css/FP/Production/ProductionList.css"; // CSS Import

const ProductionList = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get("/production");
      setProducts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Server connection error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="page-wrapper">
      <NavigationBar />
      
      <div className="prod-list-wrapper">
        <div className="prod-container">
          
          <div className="erp-page-card prod-card">
          <div className="erp-page-header prod-header">
            <div className="erp-page-header-left">
              <button className="back-btn erp-back-btn" type="button" onClick={() => navigate("/fp-production")}>
                <FaArrowLeft />
              </button>
              <h2 className="erp-page-title">Product Master List</h2>
            </div>
            <button className="add-sale-btn erp-btn-primary" type="button" onClick={() => navigate("/production-form")}>
              <FaPlus /> Add New Product
            </button>
          </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div className="loader"></div> {/* Add your loader CSS if any */}
                <p>Loading products...</p>
              </div>
            ) : error ? (
              <p style={{ color: '#ef4444', textAlign: 'center', padding: '20px' }}>{error}</p>
            ) : (
              <div className="erp-table-scroll prod-table-container">
                <table className="prod-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Product Name</th>
                      <th>UOM</th>
                      <th>Cost/Unit</th>
                      <th>Stock Qty</th>
                      <th>Valuation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length > 0 ? (
                      products.map((p) => (
                        <tr key={p.id}>
                          <td data-label="ID">#{p.id}</td>
                          <td data-label="Product Name" style={{ fontWeight: '600', color: '#1e293b' }}>
                             {p.name}
                          </td>
                          <td data-label="UOM">{p.uom ? p.uom.name : 'N/A'}</td>  
                          <td data-label="Cost/Unit">{parseFloat(p.unit_price || 0).toFixed(2)}</td>
                          <td data-label="Stock Qty">
                             <span className={`stock-badge ${(parseFloat(p.current_stock) || 0) > 0 ? 'stock-high' : 'stock-low'}`}>
                                {parseFloat(p.current_stock || 0)}
                             </span>
                          </td>
                          <td data-label="Valuation" style={{ fontWeight: 'bold' }}>
                            {parseFloat(p.current_stock_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", padding: '30px', color: '#64748b' }}>
                          No products found in the database.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default ProductionList;