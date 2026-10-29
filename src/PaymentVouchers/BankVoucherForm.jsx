import React, { useState, useEffect, useCallback } from "react";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import Select from "react-select";
import { FaArrowLeft, FaPlus, FaTrash } from "react-icons/fa";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import api from "../../api";
import "../Transactions.css";
import "./PaymentVoucherForm.css";

const entitySelectProps = {
  classNamePrefix: "react-select",
  isClearable: true,
  menuPortalTarget: typeof document !== "undefined" ? document.body : null,
  menuPosition: "fixed",
  maxMenuHeight: 280,
  styles: {
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({ ...base, zIndex: 9999 }),
    menuList: (base) => ({
      ...base,
      maxHeight: 280,
      paddingTop: 4,
      paddingBottom: 4,
    }),
  },
  classNames: {
    menu: () => "voucher-select-menu",
    menuList: () => "voucher-select-menu-list",
  },
};

const BankVoucherForm = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get("editId");
    const [voucherType, setVoucherType] = useState(
        searchParams.get("prefix")?.toUpperCase() === "BRV" ? "BRV" : "BPV"
    );
    const isEditMode = Boolean(editId);

    const [accounts, setAccounts] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [invoiceNo, setInvoiceNo] = useState("");
    const [suppliers, setSuppliers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingVoucher, setIsLoadingVoucher] = useState(false);

    // Form Header States matching Original UI
    const [transactionDate, setTransactionDate] = useState("");
    const [selectedBankAccount, setSelectedBankAccount] = useState("");
    const [paymentMode, setPaymentMode] = useState("Cheque");
    const [chequeNumber, setChequeNumber] = useState("");
    const [chequeDate, setChequeDate] = useState("");
    const [depositSlipNumber, setDepositSlipNumber] = useState("");

    const [voucherRows, setVoucherRows] = useState([
        { account_id: "", entity_id: "", amount: "", description: "" }
    ]);

    const fetchInvoiceNo = useCallback(async () => {
        try {
            const res = await api.get(`/payment-transactions/invoice-no?prefix=${voucherType}`);
            setInvoiceNo(res.data.invoice_no);
        } catch (err) {
            setInvoiceNo(`${voucherType}-INV-ERROR`);
        }
    }, [voucherType]);

    useEffect(() => {
        const fetchInitialData = async () => {
            let bankList = [];
            // 1. Fetch Accounts
            try {
                const accRes = await api.get("/accounts/list-with-balance");
                setAccounts(accRes.data || []);
            } catch (err) {
                console.error("Error loading accounts list:", err);
                toast.error("Failed to load account heads.");
            }

            // 2. Fetch Subsidiaries
            try {
                const entityRes = await api.get("/entities/transactions");
                if (entityRes.data) {
                    setCustomers(entityRes.data.filter(item => item.type === "customer"));
                    setSuppliers(entityRes.data.filter(item => item.type === "supplier"));
                    setEmployees(entityRes.data.filter(item => item.type === "employee"));
                }
            } catch (err) {
                console.error("Error loading entities:", err);
                toast.error("Failed to load subsidiaries.");
            }

            // 3. Fetch Asset Bank Controls
            try {
                const bankAccRes = await api.get("/payment-transactions/asset-controls?type=bank");
                bankList = bankAccRes.data || [];
                setBankAccounts(bankList);
            } catch (err) {
                console.error("Dynamic asset-controls API failed:", err);
                setBankAccounts([]);
            }

            if (isEditMode) {
                fetchVoucherDetails(editId, bankList);
            } else {
                fetchInvoiceNo();
            }
        };

        fetchInitialData();
    }, [fetchInvoiceNo, isEditMode, editId]);

    // Fallback filter for Bank Accounts if asset-controls endpoint is empty
    const renderBankAccounts = () => {
        if (bankAccounts && bankAccounts.length > 0) {
            return bankAccounts;
        }
        return accounts.filter(acc => {
            const isAsset = (acc.category_name?.toLowerCase() === "assets" || acc.category?.toLowerCase() === "assets");
            const hasBank = acc.account_name?.toLowerCase().includes("bank");
            return isAsset && hasBank;
        });
    };

    const getControlAccType = (accountId) => {
        const acc = accounts.find(a => String(a.id) === String(accountId));
        if (!acc) return null;
        const name = acc.account_name.toLowerCase();
        if (name.includes('salary')) return 'Salary';
        if (name.includes('payable')) return 'Payable';
        if (name.includes('receivable')) return 'Receivable';
        return null;
    };

    const fetchVoucherDetails = async (id, currentBankAccounts = []) => {
        setIsLoadingVoucher(true);
        try {
            const res = await api.get(`/payment-transactions/voucher/${id}`);
            const voucher = res.data;
            const type = voucher.type === "BRV" ? "BRV" : "BPV";
            setVoucherType(type);
            setInvoiceNo(voucher.invoice_no);
            setTransactionDate(voucher.transaction_date ? voucher.transaction_date.split('T')[0] : "");
            
            // Setting optional header instrument details
            setPaymentMode(voucher.payment_mode || "Cheque");
            setChequeNumber(voucher.cheque_no || voucher.cheque_number || "");
            setChequeDate(voucher.cheque_date ? voucher.cheque_date.split('T')[0] : "");
            setDepositSlipNumber(voucher.deposit_slip_number || voucher.slip_no || "");

            const isBankPayment = type === "BPV";
            const availableBankList = currentBankAccounts.length > 0 ? currentBankAccounts : bankAccounts;
            const bankAccountIds = new Set(availableBankList.map(b => String(b.id)));

            // 1. Detect Top Header Bank Account
            let detectedHeaderBankId = "";
            const headerBankEntry = voucher.entries.find(entry => {
                const entryAccId = String(entry.account_id);
                const isHeaderSide = isBankPayment ? Number(entry.credit) > 0 : Number(entry.debit) > 0;
                const isBankName = entry.account_name?.toLowerCase().includes("bank");
                const isKnownBankId = bankAccountIds.has(entryAccId);
                
                return isHeaderSide && (isBankName || isKnownBankId);
            });

            if (headerBankEntry) {
                detectedHeaderBankId = String(headerBankEntry.account_id);
                setSelectedBankAccount(detectedHeaderBankId);
            }

            // 2. Filter Table Grid Rows
            const gridEntries = voucher.entries.filter(entry => {
                const entryAccId = String(entry.account_id);
                const isBankName = entry.account_name?.toLowerCase().includes("bank");
                const isKnownBankId = bankAccountIds.has(entryAccId);

                if (detectedHeaderBankId && entryAccId === detectedHeaderBankId) return false;
                if (isKnownBankId || isBankName) return false;

                if (isBankPayment && !(Number(entry.debit) > 0)) return false;
                if (!isBankPayment && !(Number(entry.credit) > 0)) return false;

                return true;
            });

            const mappedRows = gridEntries.map(entry => ({
                account_id: String(entry.account_id),
                entity_id: entry.entity_id ? String(entry.entity_id) : "",
                amount: Number(entry.debit || entry.credit || 0),
                description: entry.remarks || ""
            }));

            setVoucherRows(mappedRows.length ? mappedRows : [{ account_id: "", entity_id: "", amount: "", description: "" }]);
        } catch (err) {
            console.error("Error loading voucher details:", err);
            toast.error(err.response?.data?.error || "Unable to load voucher to edit.");
        } finally {
            setIsLoadingVoucher(false);
        }
    };

    const getEntityListAndLabel = (accountId) => {
        const type = getControlAccType(accountId);
        if (type === 'Salary') return { list: employees, label: "Employee" };
        if (type === 'Payable') return { list: suppliers, label: "Supplier" };
        if (type === 'Receivable') return { list: customers, label: "Customer" };
        return { list: [], label: "" };
    };

    const getEntityOptions = (list = []) => list.map(entity => ({ value: String(entity.id), label: entity.name }));

    const handleRowChange = (index, field, value) => {
        const updatedRows = [...voucherRows];
        updatedRows[index][field] = value;
        if (field === "account_id") updatedRows[index]["entity_id"] = "";
        setVoucherRows(updatedRows);
    };

    const handleEntitySelect = (index, selectedOption) => {
        handleRowChange(index, "entity_id", selectedOption?.value || "");
    };

    const addVoucherRow = () => {
        setVoucherRows([...voucherRows, { account_id: "", entity_id: "", amount: "", description: "" }]);
    };

    const removeVoucherRow = (index) => {
        if (voucherRows.length <= 1) return toast.warn("At least one line item is required.");
        setVoucherRows(voucherRows.filter((_, i) => i !== index));
    };

    const totalAmount = voucherRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        if (!transactionDate || !selectedBankAccount) {
            return toast.error("Please select Transaction Date and Corporate Bank Account.");
        }

        const finalItems = [];
        for (let i = 0; i < voucherRows.length; i++) {
            const row = voucherRows[i];
            if (!row.account_id || !row.amount || parseFloat(row.amount) <= 0) {
                return toast.error(`Invalid Account Head or Amount at Row ${i + 1}`);
            }
            const { list } = getEntityListAndLabel(row.account_id);
            if (list.length > 0 && !row.entity_id) {
                return toast.error(`Please select Subsidiary / Entity at Row ${i + 1}`);
            }

            finalItems.push({
                account_id: row.account_id,
                type: voucherType === "BPV" ? "debit" : "credit",
                amount: parseFloat(row.amount),
                entity_id: row.entity_id || null,
                remarks: row.description || null
            });
        }

        const payload = {
            transaction_date: transactionDate,
            description: `${voucherType} Entry - Bank Transaction`,
            voucher_prefix: voucherType,
            bank_account_id: selectedBankAccount,
            account_id: selectedBankAccount,
            payment_mode: paymentMode,
            cheque_no: chequeNumber || null,
            cheque_date: chequeDate || null,
            deposit_slip_number: depositSlipNumber || null,
            items: finalItems
        };

        setIsSubmitting(true);
        try {
            let res;
            if (isEditMode) {
                res = await api.put(`/payment-transactions/invoice/${invoiceNo}`, payload);
            } else {
                res = await api.post("/payment-transactions", payload);
            }

            setIsSubmitting(false);
            Swal.fire({
                title: isEditMode ? "Voucher updated successfully!" : "Success",
                text: `Voucher No: ${res.data.invoice_no}`,
                icon: "success"
            }).then(() => {
                if (!isEditMode) {
                    setTransactionDate("");
                    setSelectedBankAccount("");
                    setChequeNumber("");
                    setChequeDate("");
                    setDepositSlipNumber("");
                    setVoucherRows([{ account_id: "", entity_id: "", amount: "", description: "" }]);
                    fetchInvoiceNo();
                } else {
                    navigate('/bank-vouchers-list');
                }
            });
        } catch (err) {
            setIsSubmitting(false);
            toast.error(err.response?.data?.error || "Transaction Failed!");
        }
    };

    if (isEditMode && isLoadingVoucher) {
        return (
            <div className="rm-page-wrapper voucher-form-page">
                <NavigationBar />
                <div className="rm-content-container voucher-loading">
                    Loading voucher details...
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="rm-page-wrapper voucher-form-page">
            <NavigationBar />
            <div className="rm-content-container">
                <div className="rm-header-section">
                    <button 
                        className="back-btn erp-back-btn" 
                        type="button" 
                        onClick={() => navigate(-1)}
                    >
                        <FaArrowLeft />
                    </button>
                    <h2 className="form-title erp-page-title">
                        {voucherType === "BPV"
                            ? (isEditMode ? "Edit Bank Payment Voucher (BPV)" : "Bank Payment Voucher (BPV)")
                            : (isEditMode ? "Edit Bank Receipt Voucher (BRV)" : "Bank Receipt Voucher (BRV)")}
                    </h2>
                </div>

                <div className="rm-main-card">
                    <form onSubmit={handleSubmit}>
                        <div className="info-grid voucher-info-4">
                            <div className="info-item">
                                <label>Voucher No</label>
                                <input type="text" value={invoiceNo} readOnly className="rm-input-field readonly-input" />
                            </div>
                            <div className="info-item">
                                <label>Transaction Date</label>
                                <input type="date" className="rm-input-field" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} required />
                            </div>
                            <div className="info-item">
                                <label>Corporate Bank Account</label>
                                <select className="rm-input-field" value={selectedBankAccount} onChange={(e) => setSelectedBankAccount(e.target.value)} required>
                                    <option value="">Select Bank Account</option>
                                    {renderBankAccounts().map(acc => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.account_name} {acc.account_code ? `(${acc.account_code})` : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="info-item">
                                <label>Payment / Instrument Mode</label>
                                <select className="rm-input-field" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                                    <option value="Cheque">Cheque</option>
                                    <option value="Online / Pay Order">Online / Pay Order</option>
                                    <option value="Demand Draft">Demand Draft</option>
                                </select>
                            </div>
                        </div>

                        <div className="info-grid voucher-info-3">
                            <div className="info-item">
                                <label>Cheque Number</label>
                                <input type="text" className="rm-input-field" placeholder="e.g. CHQ-882910" value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} />
                            </div>
                            <div className="info-item">
                                <label>Cheque Date</label>
                                <input type="date" className="rm-input-field" value={chequeDate} onChange={(e) => setChequeDate(e.target.value)} />
                            </div>
                            <div className="info-item">
                                <label>Deposit Slip Number (if any)</label>
                                <input type="text" className="rm-input-field" placeholder="e.g. SLIP-1022" value={depositSlipNumber} onChange={(e) => setDepositSlipNumber(e.target.value)} />
                            </div>
                        </div>

                        <div className="voucher-table-wrapper">
                            <table className="erp-voucher-table">
                                <thead>
                                    <tr>
                                        <th>Account Head</th>
                                        <th>Subsidiary / Entity</th>
                                        <th style={{ width: "140px" }}>Amount</th>
                                        <th>Narration Description</th>
                                        <th style={{ width: "90px", textAlign: "center" }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {voucherRows.map((row, index) => {
                                        const { list: entityList, label: entityLabel } = getEntityListAndLabel(row.account_id);
                                        return (
                                            <tr key={index}>
                                                <td>
                                                    <select className="rm-input-field" value={row.account_id} onChange={(e) => handleRowChange(index, "account_id", e.target.value)} required>
                                                        <option value="">Select Account Head</option>
                                                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.account_name}</option>)}
                                                    </select>
                                                </td>
                                                <td>
                                                    {entityList.length > 0 ? (
                                                        <Select
                                                            {...entitySelectProps}
                                                            options={getEntityOptions(entityList)}
                                                            value={getEntityOptions(entityList).find(opt => String(opt.value) === String(row.entity_id)) || null}
                                                            onChange={(selected) => handleEntitySelect(index, selected)}
                                                            placeholder={`Select ${entityLabel}`}
                                                        />
                                                    ) : <input type="text" placeholder="N/A" readOnly className="rm-input-field readonly-input" />}
                                                </td>
                                                <td>
                                                    <input type="number" step="any" className="rm-input-field" value={row.amount} onChange={(e) => handleRowChange(index, "amount", e.target.value)} required placeholder="Amount" />
                                                </td>
                                                <td>
                                                    <input type="text" className="rm-input-field" value={row.description} onChange={(e) => handleRowChange(index, "description", e.target.value)} placeholder="Narration" />
                                                </td>
                                                <td>
                                                    <div className="voucher-actions-row">
                                                        <button type="button" onClick={addVoucherRow} className="voucher-icon-btn" title="Add row"><FaPlus /></button>
                                                        <button type="button" onClick={() => removeVoucherRow(index)} className="voucher-icon-btn is-danger" title="Remove row"><FaTrash /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="voucher-summary-total">
                            Total Net Balanced Amount: <span>{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>

                        <button 
                            type="submit" 
                            className="save-btn"
                            disabled={isSubmitting} 
                        >
                            {isSubmitting ? "Posting..." : (isEditMode ? `Update ${voucherType} Voucher` : `Save ${voucherType} Voucher`)}
                        </button>
                    </form>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default BankVoucherForm;