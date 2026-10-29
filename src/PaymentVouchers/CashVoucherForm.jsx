// import React, { useState, useEffect, useCallback } from "react";
// import NavigationBar from "../Components/NavigationBar";
// import Footer from "../Components/Footer";
// import Select from "react-select";
// import { FaArrowLeft, FaPlus, FaTrash } from "react-icons/fa";
// import { useNavigate, useSearchParams } from "react-router-dom";
// import { toast } from "react-toastify";
// import Swal from "sweetalert2";
// import api from "../../api";

// const CashVoucherForm = () => {
//     const navigate = useNavigate();
//     const [searchParams] = useSearchParams();
//     const editId = searchParams.get("editId");
//     const [voucherType, setVoucherType] = useState(
//         searchParams.get("prefix")?.toUpperCase() === "CRV" ? "CRV" : "CPV"
//     );
//     const isEditMode = Boolean(editId);

//     const [accounts, setAccounts] = useState([]);
//     const [cashAccounts, setCashAccounts] = useState([]); 
//     const [invoiceNo, setInvoiceNo] = useState("");
//     const [suppliers, setSuppliers] = useState([]);
//     const [customers, setCustomers] = useState([]);
//     const [employees, setEmployees] = useState([]);
//     const [isSubmitting, setIsSubmitting] = useState(false); 
//     const [isLoadingVoucher, setIsLoadingVoucher] = useState(false);

//     const [transactionDate, setTransactionDate] = useState("");
//     const [selectedCashAccount, setSelectedCashAccount] = useState("");

//     const [voucherRows, setVoucherRows] = useState([
//         { account_id: "", entity_id: "", amount: "", description: "" }
//     ]);

//     const fetchInvoiceNo = useCallback(async () => {
//         try {
//             const res = await api.get(`/payment-transactions/invoice-no?prefix=${voucherType}`);
//             setInvoiceNo(res.data.invoice_no);
//         } catch (err) {
//             setInvoiceNo(`${voucherType}-INV-ERROR`);
//         }
//     }, [voucherType]);

//     useEffect(() => {
//         const fetchInitialData = async () => {
//             // 1. Load Main Accounts List Safely
//             try {
//                 const accRes = await api.get("/accounts/list-with-balance");
//                 setAccounts(accRes.data || []);
//             } catch (err) {
//                 console.error("Error loading accounts list:", err);
//                 toast.error("Failed to load account heads.");
//             }

//             // 2. Load Entities/Subsidiaries Safely
//             try {
//                 const entityRes = await api.get("/entities/transactions");
//                 if (entityRes.data) {
//                     setCustomers(entityRes.data.filter(item => item.type === "customer"));
//                     setSuppliers(entityRes.data.filter(item => item.type === "supplier"));
//                     setEmployees(entityRes.data.filter(item => item.type === "employee"));
//                 }
//             } catch (err) {
//                 console.error("Error loading entities:", err);
//                 toast.error("Failed to load subsidiaries.");
//             }

//             // 3. Load Dynamic Asset Controls Safely (With Client-Side Fallback)
//             try {
//                 const cashAccRes = await api.get("/payment-transactions/asset-controls?type=cash");
//                 setCashAccounts(cashAccRes.data || []);
//             } catch (err) {
//                 console.error("Dynamic asset-controls API failed, applying local fallback:", err);
//                 setCashAccounts([]);
//             }
//         };

//         fetchInitialData();

//         if (isEditMode) {
//             fetchVoucherDetails(editId);
//         } else {
//             fetchInvoiceNo();
//         }
//     }, [fetchInvoiceNo, isEditMode, editId]);

//     // Helper function to return dynamic accounts or safely fallback to localized search
//     const renderCashAccounts = () => {
//         if (cashAccounts && cashAccounts.length > 0) {
//             return cashAccounts;
//         }
//         // Fallback fallback mechanism using the custom 'category_name' or 'category' field safely
//         return accounts.filter(acc => {
//             const isAsset = (acc.category_name?.toLowerCase() === "assets" || acc.category?.toLowerCase() === "assets");
//             const hasCash = acc.account_name?.toLowerCase().includes("cash");
//             return isAsset && hasCash;
//         });
//     };

//     const getControlAccType = (accountId) => {
//         const acc = accounts.find(a => a.id == accountId);
//         if (!acc) return null;
//         const name = acc.account_name.toLowerCase();
//         if (name.includes('salary')) return 'Salary';
//         if (name.includes('payable')) return 'Payable'; 
//         if (name.includes('receivable')) return 'Receivable'; 
         
//         return null;
//     };

//     const fetchVoucherDetails = async (id) => {
//         setIsLoadingVoucher(true);
//         try {
//             const res = await api.get(`/payment-transactions/voucher/${id}`);
//             const voucher = res.data;
//             const type = voucher.type === "CRV" ? "CRV" : "CPV";
//             setVoucherType(type);
//             setInvoiceNo(voucher.invoice_no);
//             setTransactionDate(voucher.transaction_date || "");

//             const isCashPayment = type === "CPV";
//             let cashRow = voucher.entries.find(entry => {
//                 const matchesCashName = entry.account_name?.toLowerCase().includes('cash');
//                 const isAutoBalance = isCashPayment ? entry.credit > 0 : entry.debit > 0;
//                 return isAutoBalance && matchesCashName;
//             });
//             if (!cashRow) {
//                 cashRow = voucher.entries.find(entry => isCashPayment ? entry.credit > 0 : entry.debit > 0);
//             }

//             if (cashRow) {
//                 setSelectedCashAccount(cashRow.account_id);
//             }

//             const nonCashEntries = voucher.entries.filter(entry => entry.id !== cashRow?.id);
//             const mappedRows = nonCashEntries.map(entry => ({
//                 account_id: entry.account_id,
//                 entity_id: entry.entity_id || "",
//                 amount: Number(entry.debit || entry.credit || 0),
//                 description: entry.remarks || ""
//             }));

//             setVoucherRows(mappedRows.length ? mappedRows : [{ account_id: "", entity_id: "", amount: "", description: "" }]);
//         } catch (err) {
//             console.error("Error loading voucher details:", err);
//             toast.error(err.response?.data?.error || "Unable to load cash voucher to edit.");
//         } finally {
//             setIsLoadingVoucher(false);
//         }
//     };

//     const getEntityListAndLabel = (accountId) => {
//         const type = getControlAccType(accountId);
//         if (type === 'Salary') return { list: employees, label: "Employee" };
//         if (type === 'Payable') return { list: suppliers, label: "Supplier" };
//         if (type === 'Receivable') return { list: customers, label: "Customer" };
        
//         return { list: [], label: "" };
//     };

//     const getEntityOptions = (list = []) => list.map(entity => ({ value: entity.id, label: entity.name }));

//     const handleRowChange = (index, field, value) => {
//         const updatedRows = [...voucherRows];
//         updatedRows[index][field] = value;
//         if (field === "account_id") updatedRows[index]["entity_id"] = ""; 
//         setVoucherRows(updatedRows);
//     };

//     const handleEntitySelect = (index, selectedOption) => {
//         handleRowChange(index, "entity_id", selectedOption?.value || "");
//     };

//     const addVoucherRow = () => {
//         setVoucherRows([...voucherRows, { account_id: "", entity_id: "", amount: "", description: "" }]);
//     };

//     const removeVoucherRow = (index) => {
//         if (voucherRows.length <= 1) return toast.warn("At least one row is required.");
//         setVoucherRows(voucherRows.filter((_, i) => i !== index));
//     };

//     const totalAmount = voucherRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

//    const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (isSubmitting) return;
    
//     if (!transactionDate || !selectedCashAccount) {
//         return toast.error("Please fill required header fields.");
//     }

//     const finalItems = [];
//     for (let i = 0; i < voucherRows.length; i++) {
//         const row = voucherRows[i];
//         if (!row.account_id || !row.amount || parseFloat(row.amount) <= 0) {
//             return toast.error(`Invalid data at Row ${i + 1}`);
//         }
//         const { list } = getEntityListAndLabel(row.account_id);
//         if (list.length > 0 && !row.entity_id) {
//             return toast.error(`Please select Subsidiary at Row ${i + 1}`);
//         }

//         finalItems.push({
//             account_id: row.account_id,
//             type: voucherType === "CPV" ? "debit" : "credit",
//             amount: parseFloat(row.amount),
//             entity_id: row.entity_id || null,
//             remarks: row.description || null
//         });
//     }

//     // Prepare Payload with top-level cash_account_id & account_id
//     const payload = {
//         transaction_date: transactionDate,
//         description: `${voucherType} Entry - Cash Transaction`,
//         voucher_prefix: voucherType,
//         cash_account_id: selectedCashAccount, // Top-level cash account ID
//         account_id: selectedCashAccount,      // Fallback top-level key
//         items: finalItems                     // Grid items ONLY (no manual auto-balance row)
//     };

//     setIsSubmitting(true);
//     try {
//         let res;
//         if (isEditMode) {
//             res = await api.put(`/payment-transactions/invoice/${invoiceNo}`, payload);
//         } else {
//             res = await api.post("/payment-transactions", payload);
//         }
        
//         setIsSubmitting(false);
//         Swal.fire({ 
//             title: isEditMode ? "Voucher updated successfully!" : "Success", 
//             text: `Voucher No: ${res.data.invoice_no}`, 
//             icon: "success" 
//         }).then(() => {
//             if (!isEditMode) {
//                 setTransactionDate(""); 
//                 setSelectedCashAccount("");
//                 setVoucherRows([{ account_id: "", entity_id: "", amount: "", description: "" }]);
//                 fetchInvoiceNo();
//             } else {
//                 navigate('/cash-vouchers-list');
//             }
//         });
//     } catch (err) {
//         setIsSubmitting(false);
//         toast.error(err.response?.data?.error || "Transaction Failed!");
//     }
// };

//     if (isEditMode && isLoadingVoucher) {
//         return (
//             <div className="rm-page-wrapper">
//                 <NavigationBar />
//                 <div className="rm-content-container" style={{ padding: '60px', textAlign: 'center' }}>
//                     <h2>Loading voucher details...</h2>
//                 </div>
//                 <Footer />
//             </div>
//         );
//     }

//     return (
//         <div className="rm-page-wrapper">
//             <NavigationBar />
//             <div className="rm-content-container">
//                 <div className="rm-header-section">
//                     <button className="back-btn" onClick={() => navigate(-1)}><FaArrowLeft /></button>
//                     <h2 className="form-title">{voucherType === "CPV" ? (isEditMode ? "Edit Cash Payment Voucher (CPV)" : "Cash Payment Voucher (CPV)") : (isEditMode ? "Edit Cash Receipt Voucher (CRV)" : "Cash Receipt Voucher (CRV)")}</h2>
//                 </div>
//                 <div className="rm-main-card">
//                     <form onSubmit={handleSubmit}>
//                         <div className="info-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
//                             <div className="info-item">
//                                 <label>Voucher No</label>
//                                 <input type="text" value={invoiceNo} readOnly className="rm-input-field readonly-input" />
//                             </div>
//                             <div className="info-item">
//                                 <label>Transaction Date</label>
//                                 <input type="date" className="rm-input-field" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} required />
//                             </div>
//                             <div className="info-item">
//                                 <label>Select Cash Account (Assets Head)</label>
//                                 <select className="rm-input-field" value={selectedCashAccount} onChange={(e) => setSelectedCashAccount(e.target.value)} required>
//                                     <option value="">-- Choose Cash Ledger --</option>
//                                     {renderCashAccounts().map(acc => (
//                                         <option key={acc.id} value={acc.id}>
//                                             {acc.account_name}-{acc.account_code ? `(${acc.account_code})` : ""}
//                                         </option>
//                                     ))}
//                                 </select>
//                             </div>
//                         </div>

//                         {/* Matrix Grid */}
//                         <div className="voucher-table-wrapper" style={{ marginTop: "30px" }}>
//                             <table className="rm-transaction-table" style={{ width: "100%", borderCollapse: "collapse" }}>
//                                 <thead>
//                                     <tr style={{ background: "#f1f3f5" }}>
//                                         <th style={{ padding: "12px" }}>Account Head</th>
//                                         <th style={{ padding: "12px" }}>Subsidiary / Entity</th>
//                                         <th style={{ padding: "12px", width: "180px" }}>Amount</th>
//                                         <th style={{ padding: "12px" }}>Narration</th>
//                                         <th style={{ padding: "12px", width: "95px", textAlign: "center" }}>Actions</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {voucherRows.map((row, index) => {
//                                         const { list: entityList, label: entityLabel } = getEntityListAndLabel(row.account_id);
//                                         return (
//                                             <tr key={index} style={{ borderBottom: "1px solid #dee2e6" }}>
//                                                 <td style={{ padding: "8px" }}>
//                                                     <select className="rm-input-field" value={row.account_id} onChange={(e) => handleRowChange(index, "account_id", e.target.value)} required>
//                                                         <option value="">Select Account Head</option>
//                                                         {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.account_name}</option>)}
//                                                     </select>
//                                                 </td>
//                                                 <td style={{ padding: "8px" }}>
//                                                     {entityList.length > 0 ? (
//                                                         <Select
//                                                             classNamePrefix="react-select"
//                                                             options={getEntityOptions(entityList)}
//                                                             value={getEntityOptions(entityList).find(opt => opt.value === row.entity_id) || null}
//                                                             onChange={(selected) => handleEntitySelect(index, selected)}
//                                                             placeholder={`Select ${entityLabel}`}
//                                                             isClearable
//                                                         />
//                                                     ) : <input type="text" placeholder="N/A" readOnly className="rm-input-field readonly-input" />}
//                                                 </td>
//                                                 <td style={{ padding: "8px" }}><input type="number" step="any" className="rm-input-field" value={row.amount} onChange={(e) => handleRowChange(index, "amount", e.target.value)} required  placeholder="Enter amount"/></td>
//                                                 <td style={{ padding: "8px" }}><input type="text" className="rm-input-field" value={row.description} onChange={(e) => handleRowChange(index, "description", e.target.value)} placeholder="Enter description"/></td>
//                                                 <td style={{ padding: "8px", textAlign: "center" }}>
//                                                     <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
//                                                         <button type="button" onClick={addVoucherRow} style={{ background: "#edf2f9", color: "#0d6efd", border: "1px solid #d2e3f7", width: "38px", height: "38px", borderRadius: "6px" }}><FaPlus /></button>
//                                                         <button type="button" onClick={() => removeVoucherRow(index)} style={{ background: "#fdebee", color: "#dc3545", border: "1px solid #fbcacf", width: "38px", height: "38px", borderRadius: "6px" }}><FaTrash /></button>
//                                                     </div>
//                                                 </td>
//                                             </tr>
//                                         );
//                                     })}
//                                 </tbody>
//                             </table>
//                         </div>
//                         <div style={{ marginTop: "20px", background: "#f8f9fa", padding: "15px", borderRadius: "6px", textAlign: "right" }}>
//                             <strong>Total Net Amount: <span style={{ color: "#0d6efd" }}>{totalAmount.toFixed(2)}</span></strong>
//                         </div>
//                         <button type="submit" className="save-btn" disabled={isSubmitting} style={{ marginTop: "20px" }}>
//                             {isSubmitting ? "Posting..." : `Save ${voucherType} Voucher`}
//                         </button>
//                     </form>
//                 </div>
//             </div>
//             <Footer />
//         </div>
//     );
// };

// export default CashVoucherForm;




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

const CashVoucherForm = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get("editId");
    const [voucherType, setVoucherType] = useState(
        searchParams.get("prefix")?.toUpperCase() === "CRV" ? "CRV" : "CPV"
    );
    const isEditMode = Boolean(editId);

    const [accounts, setAccounts] = useState([]);
    const [cashAccounts, setCashAccounts] = useState([]); 
    const [invoiceNo, setInvoiceNo] = useState("");
    const [suppliers, setSuppliers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false); 
    const [isLoadingVoucher, setIsLoadingVoucher] = useState(false);

    const [transactionDate, setTransactionDate] = useState("");
    const [selectedCashAccount, setSelectedCashAccount] = useState("");

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
            let cashList = [];
            // 1. Load Main Accounts List
            try {
                const accRes = await api.get("/accounts/list-with-balance");
                setAccounts(accRes.data || []);
            } catch (err) {
                console.error("Error loading accounts list:", err);
                toast.error("Failed to load account heads.");
            }

            // 2. Load Entities/Subsidiaries
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

            // 3. Load Dynamic Cash Control Accounts
            try {
                const cashAccRes = await api.get("/payment-transactions/asset-controls?type=cash");
                cashList = cashAccRes.data || [];
                setCashAccounts(cashList);
            } catch (err) {
                console.error("Dynamic asset-controls API failed:", err);
                setCashAccounts([]);
            }

            if (isEditMode) {
                fetchVoucherDetails(editId, cashList);
            } else {
                fetchInvoiceNo();
            }
        };

        fetchInitialData();
    }, [fetchInvoiceNo, isEditMode, editId]);

    // Render Dynamic Cash Accounts with local fallback filter
    const renderCashAccounts = () => {
        if (cashAccounts && cashAccounts.length > 0) {
            return cashAccounts;
        }
        return accounts.filter(acc => {
            const isAsset = (acc.category_name?.toLowerCase() === "assets" || acc.category?.toLowerCase() === "assets");
            const hasCash = acc.account_name?.toLowerCase().includes("cash");
            return isAsset || hasCash;
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

   const fetchVoucherDetails = async (id, currentCashAccounts = []) => {
    setIsLoadingVoucher(true);
    try {
        const res = await api.get(`/payment-transactions/voucher/${id}`);
        const voucher = res.data;
        const type = voucher.type === "CRV" ? "CRV" : "CPV";
        setVoucherType(type);
        setInvoiceNo(voucher.invoice_no);
        setTransactionDate(voucher.transaction_date ? voucher.transaction_date.split('T')[0] : "");

        const isCashPayment = type === "CPV"; // CPV = Payment, CRV = Receipt
        const availableCashList = currentCashAccounts.length > 0 ? currentCashAccounts : cashAccounts;
        
        // Build a Set of Cash Account IDs for faster matching
        const cashAccountIds = new Set(availableCashList.map(c => String(c.id)));

        // 1. Identify Top Header Cash Account ID
        let detectedHeaderCashId = "";
        
        const headerCashEntry = voucher.entries.find(entry => {
            const entryAccId = String(entry.account_id);
            const isHeaderSide = isCashPayment ? Number(entry.credit) > 0 : Number(entry.debit) > 0;
            const isCashName = entry.account_name?.toLowerCase().includes("cash");
            const isKnownCashId = cashAccountIds.has(entryAccId);
            
            return isHeaderSide && (isCashName || isKnownCashId);
        });

        if (headerCashEntry) {
            detectedHeaderCashId = String(headerCashEntry.account_id);
            setSelectedCashAccount(detectedHeaderCashId);
        }

        // 2. Filter Matrix Grid Rows strictly (Exclude all Header Cash entries)
        const gridEntries = voucher.entries.filter(entry => {
            const entryAccId = String(entry.account_id);
            const isCashName = entry.account_name?.toLowerCase().includes("cash");
            const isKnownCashId = cashAccountIds.has(entryAccId);

            // Condition A: Exclude matched Header Cash Account ID from table grid
            if (detectedHeaderCashId && entryAccId === detectedHeaderCashId) {
                return false;
            }

            // Condition B: Exclude any entry matching cash accounts or cash names
            if (isKnownCashId || isCashName) {
                return false;
            }

            // Condition C: Strict directional validation rules
            // CPV grid rows must be DEBIT (>0)
            if (isCashPayment && !(Number(entry.debit) > 0)) {
                return false;
            }

            // CRV grid rows must be CREDIT (>0)
            if (!isCashPayment && !(Number(entry.credit) > 0)) {
                return false;
            }

            return true;
        });

        // 3. Map filtered entries to form grid state
        const mappedRows = gridEntries.map(entry => ({
            account_id: String(entry.account_id),
            entity_id: entry.entity_id ? String(entry.entity_id) : "",
            amount: Number(entry.debit || entry.credit || 0),
            description: entry.remarks || ""
        }));

        setVoucherRows(mappedRows.length ? mappedRows : [{ account_id: "", entity_id: "", amount: "", description: "" }]);
    } catch (err) {
        console.error("Error loading voucher details:", err);
        toast.error(err.response?.data?.error || "Unable to load cash voucher to edit.");
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
        if (voucherRows.length <= 1) return toast.warn("At least one detail row is required.");
        setVoucherRows(voucherRows.filter((_, i) => i !== index));
    };

    const totalAmount = voucherRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        
        if (!transactionDate || !selectedCashAccount) {
            return toast.error("Please select Transaction Date and Cash Account.");
        }

        const finalItems = [];
        for (let i = 0; i < voucherRows.length; i++) {
            const row = voucherRows[i];
            if (!row.account_id || !row.amount || parseFloat(row.amount) <= 0) {
                return toast.error(`Invalid Account or Amount at Row ${i + 1}`);
            }
            const { list } = getEntityListAndLabel(row.account_id);
            if (list.length > 0 && !row.entity_id) {
                return toast.error(`Please select Subsidiary at Row ${i + 1}`);
            }

            finalItems.push({
                account_id: row.account_id,
                type: voucherType === "CPV" ? "debit" : "credit",
                amount: parseFloat(row.amount),
                entity_id: row.entity_id || null,
                remarks: row.description || null
            });
        }

        const payload = {
            transaction_date: transactionDate,
            description: `${voucherType} Entry - Cash Transaction`,
            voucher_prefix: voucherType,
            cash_account_id: selectedCashAccount, 
            account_id: selectedCashAccount,      
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
                    setSelectedCashAccount("");
                    setVoucherRows([{ account_id: "", entity_id: "", amount: "", description: "" }]);
                    fetchInvoiceNo();
                } else {
                    navigate('/cash-vouchers-list');
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
                    <button className="back-btn erp-back-btn" type="button" onClick={() => navigate(-1)}><FaArrowLeft /></button>
                    <h2 className="form-title erp-page-title">
                        {voucherType === "CPV" 
                            ? (isEditMode ? "Edit Cash Payment Voucher (CPV)" : "Cash Payment Voucher (CPV)") 
                            : (isEditMode ? "Edit Cash Receipt Voucher (CRV)" : "Cash Receipt Voucher (CRV)")}
                    </h2>
                </div>
                <div className="rm-main-card">
                    <form onSubmit={handleSubmit}>
                        <div className="info-grid voucher-info-3">
                            <div className="info-item">
                                <label>Voucher No</label>
                                <input type="text" value={invoiceNo} readOnly className="rm-input-field readonly-input" />
                            </div>
                            <div className="info-item">
                                <label>Transaction Date</label>
                                <input type="date" className="rm-input-field" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} required />
                            </div>
                            <div className="info-item">
                                <label>Select Cash Account (Assets Head)</label>
                                <select className="rm-input-field" value={selectedCashAccount} onChange={(e) => setSelectedCashAccount(e.target.value)} required>
                                    <option value="">-- Choose Cash Ledger --</option>
                                    {renderCashAccounts().map(acc => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.account_name} {acc.account_code ? `(${acc.account_code})` : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="voucher-table-wrapper">
                            <table className="erp-voucher-table">
                                <thead>
                                    <tr>
                                        <th>Account Head</th>
                                        <th>Subsidiary / Entity</th>
                                        <th style={{ width: "160px" }}>Amount</th>
                                        <th>Narration</th>
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
                                                    <input type="number" step="any" className="rm-input-field" value={row.amount} onChange={(e) => handleRowChange(index, "amount", e.target.value)} required placeholder="Enter amount"/>
                                                </td>
                                                <td>
                                                    <input type="text" className="rm-input-field" value={row.description} onChange={(e) => handleRowChange(index, "description", e.target.value)} placeholder="Enter description"/>
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
                            Total Net Amount: <span>{totalAmount.toFixed(2)}</span>
                        </div>
                        <button type="submit" className="save-btn" disabled={isSubmitting}>
                            {isSubmitting ? "Posting..." : (isEditMode ? `Update ${voucherType} Voucher` : `Save ${voucherType} Voucher`)}
                        </button>
                    </form>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default CashVoucherForm;