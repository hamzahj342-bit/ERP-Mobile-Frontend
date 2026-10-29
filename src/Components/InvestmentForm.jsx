import React, { useState, useEffect } from "react";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import api from '../../api'; // Import your axios instance

const InvestmentForm = () => {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [invoiceNo, setInvoiceNo] = useState("");

  const [formData, setFormData] = useState({
    account_id: "",
    amount: "",
    transaction_date: new Date().toISOString().split("T")[0],
    description: "",
  });

  const [accountBalance, setAccountBalance] = useState(0);

  // 1. Fetch Share Holder Accounts (Using api.js)
  useEffect(() => {
    api.get("/accounts/share-holders")
      .then((res) => setAccounts(res.data))
      .catch((err) => console.error("Error fetching employee accounts:", err));
  }, []);

  // 2. Fetch Invoice Number (Using api.js with query params)
  useEffect(() => {
    api.get("/payment-transactions/invoice-no", { params: { type: 'investment' } })
      .then((res) => setInvoiceNo(res.data.invoice_no))
      .catch((err) => console.error("Error fetching invoice:", err));
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === "account_id") {
      const acc = accounts.find((x) => x.id == value);
      let balance = Number(acc?.balance);
      if (isNaN(balance)) balance = 0;
      setAccountBalance(balance);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.account_id) {
      toast.error("Please select an account.");
      return;
    }

    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));

    const payload = {
      invoice_no: invoiceNo,
      account_id: formData.account_id,
      amount: parseFloat(formData.amount) || 0,
      transaction_date: formData.transaction_date,
      description: formData.description,
      created_by: user ? user.id : null,
      type: "investment"
    };

    try {
      // 3. POST request using api.js
      const res = await api.post("/payment-transactions/investment", payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Status 200/201 par Axios yahan ayega
      Swal.fire({
        title: "Investment Added!",
        text: "The investment transaction has been completed.",
        icon: "success",
        confirmButtonColor: "#3085d6",
        confirmButtonText: "OK",
      }).then(() => navigate("/investment-list"));

    } catch (err) {
      console.error("Error:", err);
      // Backend error message handle karein
      const errorMsg = err.response?.data?.error || "Transaction Failed!";
      toast.error(errorMsg);
    }
  };


  return (
    <>
      <NavigationBar />
      <div className="rm-page">
        <button
          className="back-btn"
          style={{ marginTop: "30px" }}
          onClick={() => navigate("/investment-list")}
        >
          <FaArrowLeft />
        </button>

        <div className="rm-card">
          <h2>Investment Form</h2>

          {/* Invoice No */}
          <div className="form-group mb-3">
            <b>Invoice No:</b>
            <input
              type="text"
              className="input"
              value={invoiceNo}
              readOnly
              style={{ background: "#f3f3f3", width: "auto", marginLeft: "8px" }}
            />
          </div>

          <form onSubmit={handleSubmit}>
            {/* ACCOUNT */}
            <div style={{ display: "flex", gap: "15px" }} className="form-group">
              <b>Account No:</b>
              <select
                className="input"
                value={formData.account_id}
                onChange={(e) => handleChange("account_id", e.target.value)}
              >
                <option value="">Select Account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_name} - {acc.account_code}
                  </option>
                ))}
              </select>

              <b>Current Balance:</b>
              <input
                type="text"
                value={accountBalance}
                readOnly
                className="input"
                style={{ background: "#f3f3f3", width: "150px" }}
              />
            </div>

            {/* AMOUNT & DATE */}
            <div style={{ display: "flex", gap: "15px" }}>
              <b>Credit Amount:</b>
              <input
                type="number"
                className="input"
                min="0.01"
                step="0.01"
                value={formData.amount}
                onChange={(e) => handleChange("amount", e.target.value.replace(/[^\d.]/g, ""))}

              />

              <b>Transaction Date:</b>
              <input
                type="date"
                className="input"
                value={formData.transaction_date}
                onChange={(e) => handleChange("transaction_date", e.target.value)}
              />
            </div>

            {/* DESCRIPTION */}
            <div style={{ marginBottom: "15px" }}>
              <b>Description:</b>
              <textarea
                className="input"
                rows={3}
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
              ></textarea>
            </div>

            <div className="form-actions">
              <button type="submit" className="save-btn">
                Submit Investment
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default InvestmentForm;
