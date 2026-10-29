import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaSearch } from "react-icons/fa";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import Pagination from "../Components/Pagination";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import api from "../../api"; 
import '../css/FP/Production/RecipeList.css' // Nayi CSS file import ki gayi

const RecipeList = () => {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const res = await api.get("/recipe", {
        params: { page: page, limit: 50, search: debouncedSearch }
      });
      if (res.data && res.data.data) {
        setRecipes(Array.isArray(res.data.data) ? res.data.data : []);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      toast.error("Failed to load recipes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, [page, debouncedSearch]);

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This recipe will be permanently deleted!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/recipe/${id}`);
        toast.success("Recipe deleted successfully");
        fetchRecipes();
      } catch (err) {
        toast.error(err.response?.data?.message || "Something went wrong");
      }
    }
  };

  return (
    <div className="page-wrapper">
      <NavigationBar />
      
      <div className="recipe-wrapper">
        <div className="recipe-container">
          <div className="erp-page-card recipe-table-card">
            <div className="erp-page-header recipe-header">
              <div className="erp-page-header-left">
                <button className="back-btn erp-back-btn" type="button" onClick={() => navigate("/fp-production")}>
                  <FaArrowLeft />
                </button>
                <h2 className="erp-page-title">Recipe Management</h2>
              </div>
              <button className="add-sale-btn erp-btn-primary" type="button" onClick={() => navigate("/add-recipe")}>
                <FaPlus /> Add New Recipe
              </button>
            </div>

            <div className="recipe-actions-bar erp-search-bar">
              <div className="recipe-search-wrapper">
                <input
                  type="text"
                  placeholder="Search by recipe name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="recipe-search-input erp-search-input"
                />
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Loading recipe data...</div>
            ) : (
              <div className="erp-table-scroll">
              <table className="recipe-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Recipe Name</th>
                    <th>Created By</th>
                    <th>Current Stock</th>
                    <th>Stock Price</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recipes.length > 0 ? (
                    recipes.map((r) => {
                      const isDisabled = (parseFloat(r.current_stock) || 0) > 0;
                      return (
                        <tr key={r.recipe_id}>
                          <td data-label="ID">#{r.recipe_id}</td>
                          <td data-label="Recipe Name" style={{ fontWeight: "600", color: "#1e293b" }}>{r.name}</td>
                          <td data-label="Created By">{r.createdby || "—"}</td>
                          <td data-label="Current Stock">{parseFloat(r.current_stock || 0).toFixed(2)}</td>
                          <td data-label="Stock Price">{parseFloat(r.current_stock_price || 0).toLocaleString()}</td>
                          <td data-label="Actions" className="erp-actions-cell">
                            <div className="recipe-action-btns erp-actions-group">
                              <button type="button" className="btn-table-edit" onClick={() => navigate(`/add-recipe/${r.recipe_id}`)}>Edit</button>
                              <button 
                                type="button"
                                className="btn-table-delete" 
                                disabled={isDisabled}
                                onClick={() => handleDelete(r.recipe_id)}
                                title={isDisabled ? "Cannot delete recipe with existing stock" : "Delete Recipe"}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "30px" }}>No recipes found matching your search.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="erp-pagination-wrap">
                <Pagination page={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} />
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default RecipeList;