import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Components/Login';
import Dashboard from './Components/Dashboard';
import ProtectedRoute from './Components/ProtectedRoute';
import ProductCard from './Components/ProductCard';
// import EntityForm from './Components/EntityForm';
import { ToastContainer} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Customers from './Pages/Customers';
import CustomerForm from './Components/CustomerForm';
import SupplierForm from './Components/SupplierForm';
import Suppliers from './Pages/Suppliers';
import PurchaseForm from './Components/PurchaseForm';
import SalesForm from './Components/SalesForm';
import TransactionHistory from './Pages/TransactionHistory';
import AddMaterial from './Pages/AddMaterial';
import RM_Purchase from './Pages/RM_Purchase';
import RM_PurchaseForm from './Pages/RM_PurchaseForm';
import RM_Sale from './Pages/RM_Sale';
import RM_SaleForm from './Pages/RM_SaleForm';
import RM_Return from './Pages/RM_Return';
import RM_ReturnForm from './Pages/RM_ReturnForm';
import Shops from './Pages/Shops';
import ShopForm from './Components/ShopForm';
import RM_SaleReturn from './Pages/RM_SaleReturn';
import RM_SaleReturnForm from './Pages/RM_SaleReturnForm';
import RMStockList from './Components/RMStockList';
import RM_InvoiceDetail from './Components/RM_InvoiceDetail';
import RM_Invoice from './Components/RM_Invoice';
import RecipeList from './Pages/RecipeList';
import AddRecipe from './Pages/AddRecipe';
import Profile from './Components/Profile';
import ProductionList from './Pages/ProductionList';
import ProductionForm from './Pages/ProductionForm';
import FP_SaleList from './Pages/FP_SaleList';
import FP_SaleForm from './Pages/FP_SaleForm';
import FP_SaleReturnList from './Pages/FP_SaleReturnList';
import FP_SaleReturnForm from './Pages/FP_SaleReturnForm';
import FP_InvoiceDetail from './Components/FP_InvoiceDetail';
import Employees from './Pages/Emloyees';
import EmployeesForm from './Components/EmployeesForm';
import CreateAccount from './Pages/CreateAccount';
import AccountList from './Pages/AccountList';
import GeneralVoucherForm from './PaymentVouchers/GeneralVoucherForm';
import GeneralVoucherList from './PaymentVouchers/GeneralVoucherList';
import PaymentTransactionInvoice from './Components/PaymentTransactionInvoice';
import InvestmentList from './Components/InvestmentList';
import InvestmentForm from './Components/InvestmentForm';
import AccountCategoryList from './Pages/AccountCategoryList';
import CreateAccountCategory from './Pages/CreateAccountCategory';
import RM_Transactions from './Layout/RM_Transactions';
import FP_Production from './Layout/FP_Production';
import FP_Transactions from './Layout/FP_Transactions';
import Accounts from './Layout/Accounts';
import Transactions from './Layout/Transactions';
import EntityLedgerReport from './Reports/EntitiesLedgerReport/EntityLedgerReport';
import SupplierLedgerReport from './Reports/EntitiesLedgerReport/SupplierLedgerReport';
import CustomerLedgerReport from './Reports/EntitiesLedgerReport/CustomerLedgerReport';
import EmployeeLedgerReport from './Reports/EntitiesLedgerReport/EmployeeLedgerReport';
import LinkedEntityLedgerReport from './Reports/EntitiesLedgerReport/LinkedEntityLedgerReport';
import EntityLedgerWithInvoiceReport from './Reports/EntitiesLedgerReport/EntityLedgerWithInvoiceReport';
import Reports from './Layout/Reports';
import ProfitLoss from './Components/ProfitLoss';
import AccountLedger from './Components/AccountsLedger';
import ProductBatchList from './Components/ProductBatchList';
import Finished_ProductList from './Pages/Finished_ProductList';
import MaterialsList from './Pages/MaterialsList';
import FingerprintLookup from './Pages/FingerprintLookup';
import RM_Adjustment from './Components/RM_Adjustment';
import FP_Adjustment from './Components/FP_Adjustment';
import InventoryAdjustment from './Layout/InventoryAdjustment';
import SalesReport from './Reports/SalesReport';
import ProductionReport from './Reports/ProductionReport';
import CustomerInvoices from './Pages/CustomerInvoices';
import SupplierInvoices from './Pages/SupplierInvoices';
import StockReport from './Reports/StockReport';
import EntityBalanceReport from './Reports/EntityBalanceReport';
import CapitalReport from './Reports/CapitalReport';
import TrialBalanceReport from './Reports/TrialBalanceReport';
import SegmentedProfitLossReport from './Reports/Product_ProfitLoss';
import Product_HistoryReport from './Reports/Product_HistoryReport';
import CashVoucherList from './PaymentVouchers/CashVoucherList';
import CashVoucherForm from './PaymentVouchers/CashVoucherForm';
import BankVoucherList from './PaymentVouchers/BankVoucherList';
import BankVoucherForm from './PaymentVouchers/BankVoucherForm';
import EntityLedgerMenu from './Layout/EntitiesLedgerMenu';
import RM_OpeningStockList from './Pages/RM_OpeningStockList';
import RM_OpeningStockForm from './Pages/RM_OpeningStockForm';
import './primary-btn.css'
import './downloads-btn.css' 
import './Payment-Status-btn.css'
import GRN_Form from './Transactions/GRN_Form';
import DC_Form from './Transactions/DC_Form';
import DC_FP_Form from './Transactions/DC_FP_Form';
import GRN_List from './Transactions/GRN_List';
import DC_List from './Transactions/DC_List';
import DC_FP_List from './Transactions/DC_FP_List';
import LoaderDocumentView from './Transactions/LoaderDocumentView';
import SalesRegister from './Reports/SalesRegister';
import PurchaseRegister from './Reports/PurchaseRegister';
import ReceivableRegister from './Reports/ReceivableRegister';
import CashReport from './Reports/CashReport';
import StockLedgerReport from './Reports/StockLedgerReport';
import InventoryAdjustmentReport from './Reports/InventoryAdjustmentReport';
import PayableReceivableReport from './Reports/PayableReceivableReport';
import BalanceSheetReport from './Reports/BalanceSheetReport';
import NavigationBar from './Components/NavigationBar';
import { FaArrowLeft } from 'react-icons/fa';
import PermissionRoute from './Components/PermissionRoute';
import { REPORT_PERMISSION_KEYS } from './permissions';
import UserList from './Pages/UserManagement/UserList';
import UserForm from './Pages/UserManagement/UserForm';
import RoleList from './Pages/UserManagement/RoleList';
import RoleForm from './Pages/UserManagement/RoleForm';
import CompanyList from './Pages/UserManagement/CompanyList';
import CompanyForm from './Pages/UserManagement/CompanyForm';
import PosProducts from './Pages/POS/PosProducts';
import PosSaleScreen from './Pages/POS/PosSaleScreen';
import PosReceipt from './Pages/POS/PosReceipt';
import PosStock from './Pages/POS/PosStock';
const App = () => {
  return (
    <Router>
      
      <Routes>
        <Route path="/" element={<Login />} />
        {/* Always-accessible landing (safe redirect target) */}
        <Route path="/profile" element={<ProtectedRoute> <Profile /> </ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute> <Dashboard /> </ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute><ProductCard /></ProtectedRoute>} />

        {/* Entities */}
        <Route path="/customers" element={<PermissionRoute permission="customers"> <Customers/> </PermissionRoute>} />
        <Route path="/add-customers" element={<PermissionRoute permission="customers"> <CustomerForm/> </PermissionRoute>} />
        <Route path="/customer-invoices/:id" element={<PermissionRoute permission="customers"> <CustomerInvoices/> </PermissionRoute>} />
        <Route path="/suppliers" element={<PermissionRoute permission="suppliers"> <Suppliers/> </PermissionRoute>} />
        <Route path="/add-suppliers" element={<PermissionRoute permission="suppliers"> <SupplierForm/> </PermissionRoute>} />
        <Route path="/supplier-invoices/:id" element={<PermissionRoute permission="suppliers"> <SupplierInvoices/> </PermissionRoute>} />
        <Route path="/employees" element={<PermissionRoute permission="employees"> <Employees /> </PermissionRoute>} />
        <Route path="/add-employees" element={<PermissionRoute permission="employees"> <EmployeesForm /> </PermissionRoute>} />
        <Route path="/shops" element={<ProtectedRoute> <Shops/> </ProtectedRoute>} />
        <Route path="/add-shops" element={<ProtectedRoute> <ShopForm/> </ProtectedRoute>} />

        <Route path="/purchase" element={<ProtectedRoute> <PurchaseForm/> </ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute> <SalesForm/> </ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute> <TransactionHistory/> </ProtectedRoute>} />     

        {/* Inventory */}
        <Route path="/add-materials" element={<PermissionRoute permission="rm.materials_list"> <AddMaterial/> </PermissionRoute>} />
        <Route path='/materials-list' element={<PermissionRoute permission="rm.materials_list"> <MaterialsList /> </PermissionRoute>} />
        <Route path='/fingerprint-lookup' element={<PermissionRoute permission="rm.materials_list"> <FingerprintLookup /> </PermissionRoute>} />
        <Route path='/rm-opening-stock-entry' element={<PermissionRoute permission="rm.transactions"> <RM_OpeningStockList /> </PermissionRoute>} />
        <Route path='/rm-opening-stock-form' element={<PermissionRoute permission="rm.transactions"> <RM_OpeningStockForm /> </PermissionRoute>} />
        <Route path='/grn-list' element={<PermissionRoute permission="rm.grn"> <GRN_List /> </PermissionRoute>} />
        <Route path='/grn-form' element={<PermissionRoute permission="rm.grn"> <GRN_Form /> </PermissionRoute>} />
        <Route path='/grn-view/:docNo' element={<PermissionRoute permission="rm.grn"> <LoaderDocumentView docType="GRN" /> </PermissionRoute>} />
        <Route path="/rm-purchase" element={<PermissionRoute permission="rm.transactions"> <RM_Purchase/> </PermissionRoute>} />
        <Route path="/rm-purchase-form" element={<PermissionRoute permission="rm.transactions"> <RM_PurchaseForm/> </PermissionRoute>} />
        <Route path='/dc-list' element={<PermissionRoute permission="rm.delivery_challan"> <DC_List /> </PermissionRoute>} />
        <Route path='/dc-form' element={<PermissionRoute permission="rm.delivery_challan"> <DC_Form /> </PermissionRoute>} />
        <Route path='/dc-view/:docNo' element={<PermissionRoute permission="rm.delivery_challan"> <LoaderDocumentView docType="DC" /> </PermissionRoute>} />
        <Route path='/dc-fp-list' element={<PermissionRoute permission="fp.delivery_challan"> <DC_FP_List /> </PermissionRoute>} />
        <Route path='/dc-fp-form' element={<PermissionRoute permission="fp.delivery_challan"> <DC_FP_Form /> </PermissionRoute>} />
        <Route path='/dc-fp-view/:docNo' element={<PermissionRoute permission="fp.delivery_challan"> <LoaderDocumentView docType="DC-FP" /> </PermissionRoute>} />
        <Route path="/rm-sale" element={<PermissionRoute permission="rm.transactions"> <RM_Sale/> </PermissionRoute>} />
        <Route path="/rm-sale-form" element={<PermissionRoute permission="rm.transactions"> <RM_SaleForm/> </PermissionRoute>} />
        <Route path="/rm-return" element={<PermissionRoute permission="rm.transactions"> <RM_Return/> </PermissionRoute>} />
        <Route path="/rm-return-form" element={<PermissionRoute permission="rm.transactions"> <RM_ReturnForm/> </PermissionRoute>} />
        <Route path="/rm-sale-return"element={<PermissionRoute permission="rm.transactions"> <RM_SaleReturn/> </PermissionRoute>} />
        <Route path="/rm-sale-return-form"element={<PermissionRoute permission="rm.transactions"> <RM_SaleReturnForm/> </PermissionRoute>} />
        <Route path="/rm-stock"element={<PermissionRoute permission="rm.stocks"> <RMStockList/> </PermissionRoute>} />

        {/* Retail / Wholesale channel tabs — same RM engine, channel-tagged */}
        <Route path="/retail/purchases" element={<PermissionRoute permission="retail.transactions"> <RM_Purchase channel="retail" /> </PermissionRoute>} />
        <Route path="/retail/purchase-form" element={<PermissionRoute permission="retail.transactions"> <RM_PurchaseForm channel="retail" /> </PermissionRoute>} />
        <Route path="/retail/purchase-returns" element={<PermissionRoute permission="retail.transactions"> <RM_Return channel="retail" /> </PermissionRoute>} />
        <Route path="/retail/purchase-return-form" element={<PermissionRoute permission="retail.transactions"> <RM_ReturnForm channel="retail" /> </PermissionRoute>} />
        <Route path="/retail/sales" element={<PermissionRoute permission="retail.transactions"> <RM_Sale channel="retail" /> </PermissionRoute>} />
        <Route path="/retail/sale-form" element={<PermissionRoute permission="retail.transactions"> <RM_SaleForm channel="retail" /> </PermissionRoute>} />
        <Route path="/retail/sale-returns" element={<PermissionRoute permission="retail.transactions"> <RM_SaleReturn channel="retail" /> </PermissionRoute>} />
        <Route path="/retail/sale-return-form" element={<PermissionRoute permission="retail.transactions"> <RM_SaleReturnForm channel="retail" /> </PermissionRoute>} />
        <Route path="/wholesale/purchases" element={<PermissionRoute permission="wholesale.transactions"> <RM_Purchase channel="wholesale" /> </PermissionRoute>} />
        <Route path="/wholesale/purchase-form" element={<PermissionRoute permission="wholesale.transactions"> <RM_PurchaseForm channel="wholesale" /> </PermissionRoute>} />
        <Route path="/wholesale/purchase-returns" element={<PermissionRoute permission="wholesale.transactions"> <RM_Return channel="wholesale" /> </PermissionRoute>} />
        <Route path="/wholesale/purchase-return-form" element={<PermissionRoute permission="wholesale.transactions"> <RM_ReturnForm channel="wholesale" /> </PermissionRoute>} />
        <Route path="/wholesale/sales" element={<PermissionRoute permission="wholesale.transactions"> <RM_Sale channel="wholesale" /> </PermissionRoute>} />
        <Route path="/wholesale/sale-form" element={<PermissionRoute permission="wholesale.transactions"> <RM_SaleForm channel="wholesale" /> </PermissionRoute>} />
        <Route path="/wholesale/sale-returns" element={<PermissionRoute permission="wholesale.transactions"> <RM_SaleReturn channel="wholesale" /> </PermissionRoute>} />
        <Route path="/wholesale/sale-return-form" element={<PermissionRoute permission="wholesale.transactions"> <RM_SaleReturnForm channel="wholesale" /> </PermissionRoute>} />

        {/* POS module — products with barcode, instant counter sale, channel-tagged purchases/returns */}
        <Route path="/pos/products" element={<PermissionRoute permission="pos.products"> <PosProducts /> </PermissionRoute>} />
        <Route path="/pos/stock" element={<PermissionRoute permission="pos.products"> <PosStock /> </PermissionRoute>} />
        <Route path="/pos/purchases" element={<PermissionRoute permission="pos.transactions"> <RM_Purchase channel="pos" /> </PermissionRoute>} />
        <Route path="/pos/purchase-form" element={<PermissionRoute permission="pos.transactions"> <RM_PurchaseForm channel="pos" /> </PermissionRoute>} />
        <Route path="/pos/purchase-returns" element={<PermissionRoute permission="pos.transactions"> <RM_Return channel="pos" /> </PermissionRoute>} />
        <Route path="/pos/purchase-return-form" element={<PermissionRoute permission="pos.transactions"> <RM_ReturnForm channel="pos" /> </PermissionRoute>} />
        <Route path="/pos/sale" element={<PermissionRoute permission="pos.transactions"> <PosSaleScreen /> </PermissionRoute>} />
        <Route path="/pos/sales" element={<PermissionRoute permission="pos.transactions"> <RM_Sale channel="pos" /> </PermissionRoute>} />
        <Route path="/pos/sale-returns" element={<PermissionRoute permission="pos.transactions"> <RM_SaleReturn channel="pos" /> </PermissionRoute>} />
        <Route path="/pos/sale-return-form" element={<PermissionRoute permission="pos.transactions"> <RM_SaleReturnForm channel="pos" /> </PermissionRoute>} />
        <Route path="/pos/receipt/:invoiceNo" element={<PermissionRoute permission="pos.transactions"> <PosReceipt /> </PermissionRoute>} />
        <Route path="/rm-invoice-detail" element={<PermissionRoute permission="invoice_details"> <RM_InvoiceDetail/> </PermissionRoute>} />
         <Route path="/rm-invoice/:invoiceNo" element={<PermissionRoute permission="invoice_details"> <RM_Invoice/> </PermissionRoute>} />
         <Route path='/rm-adjustment' element={<PermissionRoute permission="adjustments"> <RM_Adjustment /> </PermissionRoute>} />

        {/* Recipe / Production */}
        <Route path="/recipe"element={<PermissionRoute permission="fp.production"> <RecipeList/> </PermissionRoute>} />
        <Route path="/add-recipe"element={<PermissionRoute permission="fp.production"> <AddRecipe/> </PermissionRoute>} />
        <Route path="/add-recipe/:id" element={<PermissionRoute permission="fp.production"> <AddRecipe/> </PermissionRoute>} />
        <Route path="/production" element={<PermissionRoute permission="fp.production"> <ProductionList /> </PermissionRoute>} />
        <Route path="/production-form" element={<PermissionRoute permission="fp.production"> <ProductionForm /> </PermissionRoute>} />
        <Route path="/production-form/:batch_id" element={<PermissionRoute permission="fp.production"> <ProductionForm /> </PermissionRoute>} />

        {/* Finished Product */}
        <Route path="/fp-sale-list" element={<PermissionRoute permission="fp.transactions"> <FP_SaleList /> </PermissionRoute>} />
        <Route path="/fp-sale-form" element={<PermissionRoute permission="fp.transactions"> <FP_SaleForm /> </PermissionRoute>} />
        <Route path="/fp-salereturn-list" element={<PermissionRoute permission="fp.transactions"> <FP_SaleReturnList /> </PermissionRoute>} />
        <Route path="/fp-salereturn-form" element={<PermissionRoute permission="fp.transactions"> <FP_SaleReturnForm /> </PermissionRoute>} />
        <Route path="/fp-invoice-detail/:invoiceNo" element={<PermissionRoute permission="fp.transactions"> <FP_InvoiceDetail /> </PermissionRoute>} />
        <Route path="/product-batches" element={<PermissionRoute permission="fp.product_batches"> <ProductBatchList /> </PermissionRoute>} />
        <Route path="/finished-products" element={<PermissionRoute permission="fp.history"> <Finished_ProductList /> </PermissionRoute>} />
        <Route path="/fp-adjustment" element={<PermissionRoute permission="adjustments"> <FP_Adjustment /> </PermissionRoute>} />

        {/* Chart of Account */}
        <Route path="/account-categories" element={<PermissionRoute permission="accounts.create"> <AccountCategoryList/> </PermissionRoute>} />
        <Route path="/create-category" element={<PermissionRoute permission="accounts.create"> <CreateAccountCategory /> </PermissionRoute>} />
        <Route path="/accounts" element={<PermissionRoute permission="accounts.create"> <AccountList /> </PermissionRoute>} />
        <Route path="/create-account" element={<PermissionRoute permission="accounts.create"> <CreateAccount /> </PermissionRoute>} />
        <Route path="/payments" element={<PermissionRoute permission="accounts.transactions"> <GeneralVoucherForm /> </PermissionRoute>} />
        <Route path="/payments/:voucherId" element={<PermissionRoute permission="accounts.transactions"> <GeneralVoucherForm /> </PermissionRoute>} />
        <Route path="/payments-list" element={<PermissionRoute permission="accounts.transactions"> <GeneralVoucherList /> </PermissionRoute>} />
        <Route path="/cash-vouchers-list" element={<PermissionRoute permission="accounts.transactions"> <CashVoucherList /> </PermissionRoute>} />
        <Route path="/cash-voucher-form" element={<PermissionRoute permission="accounts.transactions"> <CashVoucherForm /> </PermissionRoute>} />
        <Route path="/bank-vouchers-list" element={<PermissionRoute permission="accounts.transactions"> <BankVoucherList /> </PermissionRoute>} />
        <Route path="/bank-voucher-form" element={<PermissionRoute permission="accounts.transactions"> <BankVoucherForm /> </PermissionRoute>} />
        <Route path="/payment-transaction/:invoiceNo" element={<PermissionRoute permission="accounts.transactions"> <PaymentTransactionInvoice /> </PermissionRoute>} />
        <Route path="/payment-transactions/:invoiceNo" element={<PermissionRoute permission="accounts.transactions"> <PaymentTransactionInvoice /> </PermissionRoute>} />
        <Route path="/investment-list" element={<PermissionRoute permission="accounts.transactions"> <InvestmentList /> </PermissionRoute>} />
        <Route path="/investment" element={<PermissionRoute permission="accounts.transactions"> <InvestmentForm /> </PermissionRoute>} />

        {/* Menu / hub screens */}
        <Route path='/rm-transactions' element={<PermissionRoute permission="rm.transactions"> <RM_Transactions /> </PermissionRoute>} />
        <Route path='/fp-production' element={<PermissionRoute permission="fp.production"> <FP_Production /> </PermissionRoute>} />
        <Route path='/fp-transactions' element={<PermissionRoute permission="fp.transactions"> <FP_Transactions /> </PermissionRoute>} />
        <Route path='/accounts-setting' element={<PermissionRoute permission="accounts.create"> <Accounts /> </PermissionRoute>} />
        <Route path='/payment-transactions' element={<PermissionRoute permission="accounts.transactions"> <Transactions /> </PermissionRoute>} />
        <Route path='/inventory-adjustment' element={<PermissionRoute permission="adjustments"> <InventoryAdjustment /> </PermissionRoute>} /> 

        {/* Reports (hub visible if any report permission) */}
        <Route path='/reports' element={<PermissionRoute anyPermission={REPORT_PERMISSION_KEYS}> <Reports /> </PermissionRoute>} />
        <Route path='/entities-menu' element={<PermissionRoute permission="reports.entity_ledger"> <EntityLedgerMenu /> </PermissionRoute>} />
        <Route path='/entity-ledger' element={<PermissionRoute permission="reports.entity_ledger"> <EntityLedgerReport /> </PermissionRoute>} />
        <Route path='/ledgers/suppliers' element={<PermissionRoute permission="reports.entity_ledger"> <SupplierLedgerReport /> </PermissionRoute>} />
        <Route path='/ledgers/customers' element={<PermissionRoute permission="reports.entity_ledger"> <CustomerLedgerReport /> </PermissionRoute>} />
        <Route path='/ledgers/employees' element={<PermissionRoute permission="reports.entity_ledger"> <EmployeeLedgerReport /> </PermissionRoute>} />
        <Route path='/ledgers/linked-entities' element={<PermissionRoute permission="reports.entity_ledger"> <LinkedEntityLedgerReport /> </PermissionRoute>} />
        <Route path='/ledgers/with-invoice' element={<PermissionRoute permission="reports.entity_ledger"> <EntityLedgerWithInvoiceReport /> </PermissionRoute>} />
        <Route path='/profit-loss' element={<PermissionRoute permission="reports.profit_loss"> <ProfitLoss /> </PermissionRoute>} />
        <Route path='/accounts-report' element={<PermissionRoute permission="reports.accounts"> <AccountLedger /> </PermissionRoute>} />
        <Route path='/ledger/:accountId' element={<PermissionRoute permission="reports.accounts"> <AccountLedger /> </PermissionRoute>} />
        <Route path='/sales-report' element={<PermissionRoute permission="reports.sales"> <SalesReport /> </PermissionRoute>} />
        <Route path='/production-report' element={<PermissionRoute permission="reports.production"> <ProductionReport /> </PermissionRoute>} />
        <Route path='/stock-report' element={<PermissionRoute permission="reports.stock"> <StockReport /> </PermissionRoute>} /> 
        <Route path='/product-history-report' element={<PermissionRoute permission="reports.history"> <Product_HistoryReport /> </PermissionRoute>} />
        <Route path='/entity-balance-report' element={<PermissionRoute permission="reports.balance_summary"> <EntityBalanceReport /> </PermissionRoute>} />
        <Route path='/capital-report' element={<PermissionRoute permission="reports.capital"> <CapitalReport /> </PermissionRoute>} />
        <Route path='/trial-balance' element={<PermissionRoute permission="reports.trial_balance"> <TrialBalanceReport /> </PermissionRoute>} />
        <Route path='/segmented-profit-loss' element={<PermissionRoute permission="reports.segmented_pl"> <SegmentedProfitLossReport /> </PermissionRoute>} />
        <Route path='/sales-register' element={<PermissionRoute permission="reports.sales_register"> <SalesRegister /> </PermissionRoute>} />
        <Route path='/purchase-register' element={<PermissionRoute permission="reports.purchase_register"> <PurchaseRegister /> </PermissionRoute>} />
        <Route path='/receivable-register' element={<PermissionRoute permission="reports.receivable_register"> <ReceivableRegister /> </PermissionRoute>} />
        <Route path='/cash-report' element={<PermissionRoute permission="reports.cash_report"> <CashReport /> </PermissionRoute>} />
        <Route path='/stock-ledger' element={<PermissionRoute permission="reports.stock_ledger"> <StockLedgerReport /> </PermissionRoute>} />
        <Route path='/inventory-adjustment-report' element={<PermissionRoute permission="reports.inventory_adjustment"> <InventoryAdjustmentReport /> </PermissionRoute>} />
        <Route path='/payable-receivable-report' element={<PermissionRoute permission="reports.payable_receivable"> <PayableReceivableReport /> </PermissionRoute>} />
        <Route path='/balance-sheet' element={<PermissionRoute permission="reports.balance_sheet"> <BalanceSheetReport /> </PermissionRoute>} />
        {/* Administration — roles.manage (Full Access) or users.manage (Super Admin) */}
        <Route path='/user-management' element={<PermissionRoute anyPermission={['roles.manage', 'users.manage']}> <UserList /> </PermissionRoute>} />
        <Route path='/user-management/new' element={<PermissionRoute permission="users.manage"> <UserForm /> </PermissionRoute>} />
        <Route path='/user-management/:id' element={<PermissionRoute anyPermission={['roles.manage', 'users.manage']}> <UserForm /> </PermissionRoute>} />
        <Route path='/roles' element={<PermissionRoute anyPermission={['roles.manage', 'users.manage']}> <RoleList /> </PermissionRoute>} />
        <Route path='/roles/new' element={<PermissionRoute anyPermission={['roles.manage', 'users.manage']}> <RoleForm /> </PermissionRoute>} />
        <Route path='/roles/:id' element={<PermissionRoute anyPermission={['roles.manage', 'users.manage']}> <RoleForm /> </PermissionRoute>} />
        <Route path='/companies-admin' element={<PermissionRoute permission="users.manage"> <CompanyList /> </PermissionRoute>} />
        <Route path='/companies-admin/new' element={<PermissionRoute permission="users.manage"> <CompanyForm /> </PermissionRoute>} />
        <Route path='/companies-admin/:id' element={<PermissionRoute permission="users.manage"> <CompanyForm /> </PermissionRoute>} />
      </Routes>  
       <ToastContainer position="top-right" autoClose={3000} style={{ zIndex: 99999 }}/>
    </Router>
  );
};

export default App;
