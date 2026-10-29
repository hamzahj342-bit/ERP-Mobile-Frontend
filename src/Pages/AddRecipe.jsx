import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import api from "../../api";
import "../css/FP/Production/AddRecipe.css"; // CSS Link

const AddRecipe = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const user = JSON.parse(localStorage.getItem("user"));

  const [formData, setFormData] = useState({
    name: "",
    createdby: user ? user.username : "guest",
    details: [{ rm_id: null, rm_name: "", fp_id: null, fp_name: "", qty: "", percentage: 0, uom_id: null, uom_name: "" }],
  });

  const [availableItems, setAvailableItems] = useState([]);

  const fetchAllItems = async () => {
    try {
      const [rmRes, fpRes] = await Promise.all([api.get("/add-materials"), api.get("/production")]);
      const materials = rmRes.data.map(i => ({ ...i, type: "RM", uniqueKey: `RM-${i.rm_id}` }));
      const products = fpRes.data.map(i => ({ ...i, type: "FP", uniqueKey: `FP-${i.id}` }));
      setAvailableItems([...materials, ...products]);
    } catch (err) { toast.error("Failed to load items"); }
  };

  useEffect(() => { fetchAllItems(); }, []);

  useEffect(() => {
    if (id && availableItems.length > 0) {
      const fetchRecipeData = async () => {
        try {
          const res = await api.get(`/recipe/${id}`);
          setFormData({
            name: res.data.name,
            createdby: res.data.createdby,
            details: res.data.details.map(d => {
              const key = d.rm_id ? `RM-${d.rm_id}` : `FP-${d.fp_id}`;
              const match = availableItems.find(i => i.uniqueKey === key);
              return { ...d, uom_name: match?.uom?.name || d.uom_name || "" };
            })
          });
        } catch (err) { toast.error("Load failed"); }
      };
      fetchRecipeData();
    }
  }, [id, availableItems]);

  // Percentage Calculation
  useEffect(() => {
    const total = formData.details.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
    if (total > 0) {
      const updated = formData.details.map(item => ({
        ...item,
        percentage: ((parseFloat(item.qty) || 0) / total * 100).toFixed(2)
      }));
      if (JSON.stringify(updated) !== JSON.stringify(formData.details)) {
        setFormData(prev => ({ ...prev, details: updated }));
      }
    }
  }, [formData.details]);

  const handleItemSelection = (index, uniqueKey) => {
    const updated = [...formData.details];
    const item = availableItems.find(i => i.uniqueKey === uniqueKey);
    if (item) {
      const isRM = item.type === "RM";
      updated[index] = {
        ...updated[index],
        rm_id: isRM ? item.rm_id : null, rm_name: isRM ? item.name : "",
        fp_id: isRM ? null : item.id, fp_name: isRM ? "" : item.name,
        uom_id: item.uom_id, uom_name: item.uom?.name || ""
      };
    }
    setFormData({ ...formData, details: updated });
  };

  const handleQtyChange = (index, val) => {
    const updated = [...formData.details];
    updated[index].qty = val;
    setFormData({ ...formData, details: updated });
  };

  const addRow = () => {
    setFormData({ ...formData, details: [...formData.details, { rm_id: null, rm_name: "", fp_id: null, fp_name: "", qty: "", percentage: 0, uom_id: null, uom_name: "" }] });
  };

  const removeRow = (index) => {
    const updated = formData.details.filter((_, i) => i !== index);
    setFormData({ ...formData, details: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, updatedby: user?.username };
      id ? await api.put(`/recipe/${id}`, payload) : await api.post("/recipe", payload);
      toast.success("Recipe Saved!");
      navigate("/recipe");
    } catch (err) { toast.error("Save failed"); }
  };

  return (
    <div className="page-wrapper">
      <NavigationBar />
      <div className="recipe-form-wrapper">
        <div className="recipe-form-container">
          <div className="form-card">
            <div className="form-header">
              <button className="back-btn erp-back-btn" type="button" onClick={() => navigate("/recipe")}>
                <FaArrowLeft />
              </button>
              <h2>{id ? "Edit Recipe (New Version)" : "Create New Recipe"}</h2>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="recipe-name-section">
                <label>Recipe Title / Product Name</label>
                <input
                  className="recipe-input"
                  type="text"
                  name="name"
                  placeholder="e.g. Chemical Mixture A1"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="items-section">
                <label style={{ fontWeight: 600, color: "#475569", marginBottom: "15px", display: "block" }}>
                  Formulation Details
                </label>

                <div className="items-grid-header">
                  <div>Item Selection</div>
                  <div>Quantity</div>
                  <div>UOM</div>
                  <div>Ratio (%)</div>
                  <div>Action</div>
                </div>

                {formData.details.map((detail, index) => (
                  <div key={index} className="recipe-item-row">
                    <select
                      className="recipe-input"
                      value={detail.rm_id ? `RM-${detail.rm_id}` : detail.fp_id ? `FP-${detail.fp_id}` : ""}
                      onChange={(e) => handleItemSelection(index, e.target.value)}
                      required
                    >
                      <option value="">Select Material/Product</option>
                      <optgroup label="Raw Materials">
                        {availableItems.filter(i => i.type === "RM").map(rm => (
                          <option key={rm.uniqueKey} value={rm.uniqueKey}>{rm.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Finished Products">
                        {availableItems.filter(i => i.type === "FP").map(fp => (
                          <option key={fp.uniqueKey} value={fp.uniqueKey}>{fp.name}</option>
                        ))}
                      </optgroup>
                    </select>

                    <input
                      className="recipe-input"
                      type="number"
                      placeholder="Qty"
                      value={detail.qty}
                      onChange={(e) => handleQtyChange(index, e.target.value)}
                      required
                    />

                    <input className="recipe-input" type="text" value={detail.uom_name || ""} readOnly placeholder="UOM" />

                    <input className="recipe-input" type="text" value={detail.percentage + "%"} readOnly />

                    <div className="action-icon-btns">
                      <button type="button" className="btn-icon-add" onClick={addRow} title="Add Row"><FaPlus /></button>
                      {formData.details.length > 1 && (
                        <button type="button" className="btn-icon-del" onClick={() => removeRow(index)} title="Remove"><FaTrash /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="erp-form-actions">
                <button type="submit" className="save-btn">
                  {id ? "Update Formulation" : "Save Formulation"}
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

export default AddRecipe;