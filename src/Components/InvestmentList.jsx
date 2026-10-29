import React, { useState, useEffect } from "react";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "../RMForm.css";

const InvestmentList = () => {
  const [investments, setInvestments] = useState([]);
  const navigate = useNavigate();

  // Fetch Investment Transactions
  useEffect(() => {
    fetch("http://localhost:5000/api/payment-transactions/list?type=investment")
      .then((res) => res.json())
      .then((data) => {
        // Filter only investments if backend returns all types
        const investmentData = data.filter((item) => item.type === "investment");
        setInvestments(investmentData);
      })
      .catch(() => setInvestments([]));
  }, []);

  // View Details Handler
  const handleViewDetails = (invoiceNo) => {
    navigate(`/investment-invoice/${invoiceNo}`);
  };

  return (
    <>
      <NavigationBar />
      <div className="rm-page">
        <button
          className="back-btn"
          style={{ marginTop: "30px" }}
          onClick={() => navigate("/payment-transactions")}
        >
          <FaArrowLeft />
        </button>

        <div className="card">
          <button
            className="add-cust-sup"
            onClick={() => navigate("/investment")}
          >
            Add New
          </button>
          <h3>Investments</h3>

          <table className="product-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Invoice No</th>
                <th>Account Name</th>
                <th>Credit Amount</th>
                <th>Created At</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {investments.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.id}</td>
                  <td>{inv.invoice_no}</td>
                  <td>{inv.account_name}</td>
                  <td>{parseFloat(inv.amount).toFixed(2)}</td>
                  <td>
                    {inv.created_at
                      ? new Date(inv.created_at).toLocaleDateString()
                      : ""}
                  </td>
                  <td>
                    <button
                      className="primary-btn"
                      onClick={() => handleViewDetails(inv.invoice_no)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
              {investments.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center" }}>
                    No investments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default InvestmentList;
