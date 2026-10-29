import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom'; 
import { FaArrowLeft, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';
import { calculateDynamicFIFOCost } from "../utilities/FIFO_Production";
import api from "../../api"; 
import "../css/FP/Production/ProductionForm.css"; 

const ProductionForm = () => {
  const navigate = useNavigate();
  const { batch_id } = useParams(); 
  const isEditMode = !!batch_id; 

  const user = JSON.parse(localStorage.getItem("user"));

  const [formData, setFormData] = useState({
    product_name: "",
    recipe_master_id: "",
    production_quantity: "",
    uom_id: "",
  });

  const [recipes, setRecipes] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [uoms, setUoms] = useState([]);
  const [minAllowedQty, setMinAllowedQty] = useState(0);

  // 1) Recipes aur UOMs load karna
  const fetchRecipes = async () => {
    try {
      const res = await api.get("/recipe/for-production");
      setRecipes(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchUOMs = async () => {
    try {
      const res = await api.get("/uoms"); 
      setUoms(res.data);
    } catch (err) { console.error(err); }
  };

  // 2) Normal Recipe Selection (Create Mode)
  const fetchRecipeDetails = async (recipeId) => {
    try {
      const res = await api.get(`/production/${recipeId}/materials`);
      const data = res.data;
      const filled = data.map((item) => ({
        ...item,
        display_name: item.name,
        unit_price: item.unit_price || 0,
        recipe_qty: parseFloat(item.qty) || 0,
        required_qty: 0,
        total_price: 0,
        type: item.type,
        total_available_stock: parseFloat(item.total_available_stock || 0)
      }));
      setMaterials(filled);
      if (formData.production_quantity) {
          calculateRequirements(filled, formData.production_quantity);
      }
    } catch (err) { toast.error("Failed to fetch recipe details"); }
  };

  // 3) Edit Mode: Load dynamic aggregated details from backend
  const fetchProductionDataForEdit = async () => {
    try {
      const res = await api.get(`/production/${batch_id}`);
      if (res.data && res.data.success) {
        const prodData = res.data.data;

        setFormData({
          product_name: prodData.product_name,
          recipe_master_id: prodData.recipe_master_id, 
          production_quantity: prodData.original_production_quantity,
          uom_id: prodData.uom_id,
        });

        setMinAllowedQty(prodData.min_allowed_quantity);

        const formattedDetails = prodData.details.map(item => ({
          ...item,
          total_available_stock: parseFloat(item.total_available_stock || 0), 
        }));

        setMaterials(formattedDetails);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load production data for editing.");
      navigate("/finished-products");
    }
  };

  // 4) Dynamic Calculation Logic
  const calculateRequirements = (itemsList, prodQty) => {
    const pQty = parseFloat(prodQty) || 0;
    const updated = itemsList.map(mat => {
      const neededQty = mat.recipe_qty * pQty;
      let dynamicFIFOCost = mat.unit_price;
      
      if (typeof calculateDynamicFIFOCost === 'function' && mat.fifo_batches?.length > 0) {
        dynamicFIFOCost = calculateDynamicFIFOCost(mat.fifo_batches, neededQty);
      }
      
      return {
        ...mat,
        required_qty: neededQty,
        unit_price: dynamicFIFOCost,
        total_price: (dynamicFIFOCost * neededQty)
      };
    });
    setMaterials(updated);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRecipeSelect = (e) => {
    const recipeId = e.target.value;
    setFormData({ ...formData, recipe_master_id: recipeId });
    if (recipeId) fetchRecipeDetails(recipeId);
    else setMaterials([]);
  };

  const handleProductionQuantityChange = (e) => {
    const newQty = e.target.value;
    
    if (isEditMode && parseFloat(newQty) < minAllowedQty) {
      toast.warning(`Production Quantity cannot be less than ${minAllowedQty}, as that much Product has already been sold/consumed.`);
      return;
    }

    setFormData({ ...formData, production_quantity: newQty });
    calculateRequirements(materials, newQty);
  };

  useEffect(() => {
    const total = materials.reduce((sum, mat) => sum + parseFloat(mat.total_price || 0), 0);
    setGrandTotal(total);
  }, [materials]);

  // Initial loading logic hook
  useEffect(() => { 
    const initForm = async () => {
      await fetchRecipes(); 
      await fetchUOMs(); 
      if (isEditMode) {
        await fetchProductionDataForEdit();
      }
    };
    initForm();
  }, [batch_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.product_name.trim() || !formData.recipe_master_id || !formData.uom_id) {
      return toast.error("Please fill all product header fields");
    }

    if (isEditMode && parseFloat(formData.production_quantity) < minAllowedQty) {
      return toast.error(`Production Quantity cannot be less than ${minAllowedQty}`);
    }

    const outOfStock = materials.filter(mat => mat.required_qty > mat.total_available_stock);
    if (!isEditMode && outOfStock.length > 0) { 
      return toast.error(`Insufficient stock! Check highlighted items.`);
    }

    const payload = {
      product_name: formData.product_name,
      recipe_master_id: formData.recipe_master_id,
      grand_total: grandTotal,
      details: materials.map(m => ({...m, quantity: m.required_qty})),
      createdby: user?.username || "guest",
      production_quantity: parseFloat(formData.production_quantity),
      uom_id: formData.uom_id,
    };

    try {
      if (isEditMode) {
        await api.put(`/production/${batch_id}`, payload);
        toast.success("✅ Production updated successfully!");
      } else {
        await api.post("/production", payload);
        toast.success("Production completed successfully!");
      }
      navigate("/finished-products");
    } catch (err) { 
      toast.error(err.response?.data?.message || "Action failed"); 
    }
  };

  return (
    <div className="page-wrapper">
      <NavigationBar />
      <div className="prod-form-wrapper">
        <div className="prod-form-container">
          <div className="prod-form-card">
            <div className="form-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button type="button" className="back-btn erp-back-btn" onClick={() => navigate("/finished-products")}>
                <FaArrowLeft />
              </button>
              <h2 className="erp-page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaCheckCircle style={{ color: isEditMode ? '#eab308' : '#3b82f6' }} /> 
                {isEditMode ? `Edit Production Order (Batch #${batch_id})` : "Production Order"}
              </h2>
            </div>
            <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 12px' }}>
              {isEditMode ? "Modify parameters. System will safely reverse and adjust balances automatically." : "Fill finished product details and verify BOM consumption."}
            </p>

            <form onSubmit={handleSubmit}>
              <div className="prod-header-grid">
                <div className="input-group">
                  <label>Finished Product Name</label>
                  <input className="recipe-input" type="text" name="product_name" placeholder="Enter Product Name" value={formData.product_name} onChange={handleInputChange} required />
                </div>

                <div className="input-group">
                  <label>Select Recipe / BOM</label>
                  <select className="recipe-input" name="recipe_master_id" value={formData.recipe_master_id} onChange={handleRecipeSelect} disabled={isEditMode} required>
                    <option value="">-- Choose Recipe --</option>
                    {recipes.map((r) => <option key={r.recipe_id} value={r.recipe_id}>{r.name}</option>)}
                  </select>
                </div>

                <div className="input-group">
                  <label>UOM (Unit of Measure)</label>
                  <select className="recipe-input" name="uom_id" value={formData.uom_id} onChange={handleInputChange} disabled={isEditMode} required>
                    <option value="">-- Select UOM --</option>
                    {uoms.map((u) => (
                      <option key={u.uom_id || u.id} value={u.uom_id || u.id}>{u.uom_name || u.name}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label>Batch Size / Production Qty {isEditMode && <span style={{color: '#ef4444', fontSize:'0.8rem'}}>(Min: {minAllowedQty})</span>}</label>
                  <input 
                    className="recipe-input" 
                    type="number" 
                    name="production_quantity" 
                    placeholder="Quantity to Produce" 
                    value={formData.production_quantity} 
                    onChange={handleProductionQuantityChange} 
                    min={isEditMode ? minAllowedQty : "1"}
                    required
                    step="any"
                    
                  />
                </div>
              </div>

              <h3 style={{ fontSize: '1.1rem', color: '#1e293b', marginBottom: '15px' }}>Material Consumption Details</h3>
              
              <div className="consumption-table-wrapper">
                <div className="consumption-header">
                  <span>Item Name</span>
                  <span>In Stock</span>
                  <span>UOM</span>
                  <span>BOM Qty</span>
                  <span>Unit Cost</span>
                  <span>Required</span>
                  <span>Total Cost</span>
                </div>

                {materials.map((mat, index) => {
                  const isShort = mat.required_qty > mat.total_available_stock;
                  return (
                    <div key={index} className={`consumption-row ${!isEditMode && isShort ? 'row-short-stock' : ''}`}>
                      <span style={{ fontWeight: '600' }}>
                        {!isEditMode && isShort && <FaExclamationTriangle style={{ color: 'red', marginRight: '5px' }} />}
                        {mat.display_name}
                      </span>
                      
                
                      <span>
                        {mat.total_available_stock !== undefined && mat.total_available_stock !== null
                          ? parseFloat(mat.total_available_stock).toFixed(2)
                          : "0.00"}
                      </span>

                      <span>{mat.uom_name || "Units"}</span>
                      <span style={{ color: '#64748b' }}>{mat.recipe_qty ? mat.recipe_qty.toFixed(3) : "0.000"}</span>
                      <span>{mat.unit_price ? mat.unit_price.toFixed(2) : "0.00"}</span>
                      <span className={!isEditMode && isShort ? "text-danger" : "text-success"}>
                        {mat.required_qty ? mat.required_qty.toFixed(3) : "0.000"}
                      </span>
                      <span style={{ fontWeight: '700' }}>{mat.total_price ? mat.total_price.toFixed(2) : "0.00"}</span>
                    </div>
                  );
                })}
              </div>

              <div className="prod-summary-bar">
                <div className="total-cost-label">
                  Total Production Cost: <span style={{ color: isEditMode ? '#eab308' : '#3b82f6' }}>{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="erp-form-actions">
                <button type="submit" className="save-btn" style={{ padding: '12px 40px', fontSize: '1rem', background: isEditMode ? '#eab308' : '#3b82f6' }}>
                  {isEditMode ? "Update Production" : "Complete Production"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ProductionForm;