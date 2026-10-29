import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FaFileInvoiceDollar,
    FaChartLine,
    FaArrowRight, 
    FaArrowLeft,
    FaBalanceScale,
    FaBookOpen,
    FaChartBar,
    FaHistory,
    FaMoneyBillWave,
    FaWarehouse
} from 'react-icons/fa';
import { MdPrecisionManufacturing, MdInventory } from 'react-icons/md';
import '../RM_CardLayout.css';
import Footer from '../Components/Footer';
import NavigationBar from '../Components/NavigationBar';
import { hasPermission } from '../permissions';

const ReportCard = ({ title, description, icon, path, color, perm, navigate }) => {
    if (!hasPermission(perm)) return null;

    return (
        <div className="tr-card" onClick={() => navigate(path)}>
            <div className="tr-card-inner">
                <div className="tr-icon-wrapper" style={{ backgroundColor: `${color}15`, color }}>
                    {icon}
                </div>
                <div className="tr-content">
                    <h4 className="tr-title">{title}</h4>
                    <p className="tr-description">{description}</p>
                </div>
                <div className="tr-footer-link">
                    <span style={{ color }}>Open <FaArrowRight /></span>
                </div>
            </div>
            <div className="tr-accent-bar" style={{ backgroundColor: color }}></div>
        </div>
    );
};

const Reports = () => {
    const navigate = useNavigate();
    return (
        <div className="page-wrapper">
            <NavigationBar />
            <main className="rm-main-container">
                <div className="rm-content-limit">
                    <div className="erp-page-card">
                        <div className="erp-page-header rm-header">
                            <button className="back-btn erp-back-btn" type="button" onClick={() => navigate('/dashboard')}>
                                <FaArrowLeft />
                            </button>
                            <div className="header-info">
                                <h2 className="erp-page-title" style={{ color: '#0f172a' }}>Financial Reports</h2>
                                <p className="erp-page-subtitle">Access ledgers, statements, registers, and analytical reports</p>
                            </div>
                        </div>

                        <div className="tr-grid-row">
                            <ReportCard 
                                title="Entity Ledger Report"
                                description="View detailed transactional history and running balances for a specific Customer (A/R) or Supplier (A/P)."
                                icon={<FaFileInvoiceDollar />}
                                path="/entities-menu"
                                color="#00A86B"
                                perm="reports.entity_ledger"
                                navigate={navigate}
                            />

                            <ReportCard 
                                title="Profit & Loss Report"
                                description="Calculate your financial performance over a period by comparing Revenues against Expenses (Income Statement)."
                                icon={<FaChartLine />}
                                path="/profit-loss"
                                color="#CC5500"
                                perm="reports.profit_loss"
                                navigate={navigate}
                            />

                            <ReportCard 
                                title="Accounts Report"
                                description="Calculate your financial performance over a period by comparing Revenues against Expenses (Income Statement)."
                                icon={<FaChartLine />}
                                path="/accounts-report"
                                color="#00a3ccff"
                                perm="reports.accounts"
                                navigate={navigate}
                            />

                            <ReportCard 
                                title="Phone Sales Report"
                                description="Customer-wise and model-wise phone sales. Approved invoices only; returns are netted."
                                icon={<FaFileInvoiceDollar />}
                                path="/sales-report"
                                color="#4caf50"
                                perm="reports.sales"
                                navigate={navigate}
                            />
                            
                            <ReportCard 
                                title="Production Analytics Report"
                                description="Monitor manufacturing output and material consumption per production batch."
                                icon={<MdPrecisionManufacturing />}
                                path="/production-report" 
                                color="#3f51b5"
                                perm="reports.production"
                                navigate={navigate}
                            />

                            <ReportCard 
                                title="Inventory & Stock Report"
                                description="Real-time phone stock by model/supplier. Click a row for IMEI, cost, condition and specs."
                                icon={<MdInventory />}
                                path="/stock-report" 
                                color="#10b981"
                                perm="reports.stock"
                                navigate={navigate}
                            />

                            <ReportCard 
                                title="Stock Ledger Report"
                                description="Model-wise opening / in / out / closing. Select a model for IMEI-level movement ledger."
                                icon={<FaWarehouse />}
                                path="/stock-ledger" 
                                color="#0f172a"
                                perm="reports.stock_ledger"
                                navigate={navigate}
                            />

                            <ReportCard 
                                title="Balance Summary"
                                description="View real-time closing balances for Customers, Suppliers, and Employees. Track Receivables and Payables at a glance."
                                icon={<FaFileInvoiceDollar />} 
                                path="/entity-balance-report" 
                                color="#3f51b5" 
                                perm="reports.balance_summary"
                                navigate={navigate}
                            />

                            <ReportCard 
                                title="Payable & Receivable Report"
                                description="Current outstanding Accounts Receivable and Accounts Payable as of a date. Party-wise balances with totals."
                                icon={<FaBalanceScale />} 
                                path="/payable-receivable-report" 
                                color="#b45309" 
                                perm="reports.payable_receivable"
                                navigate={navigate}
                            />

                            <ReportCard 
                                title="Balance Sheet"
                                description="Statement of financial position as of a date. Assets, Liabilities and Equity, with accumulated profit so the sheet balances."
                                icon={<FaBalanceScale />} 
                                path="/balance-sheet" 
                                color="#0f766e" 
                                perm="reports.balance_sheet"
                                navigate={navigate}
                            />

                            <ReportCard 
                                title="Capital & Net Worth Report"
                                description="Comprehensive statement of owner's equity using the structural balance equation (Assets - Liabilities). Monitor real-time enterprise net worth and capital reserves."
                                icon={<FaBalanceScale />}
                                path="/capital-report" 
                                color="#0d47a1"
                                perm="reports.capital"
                                navigate={navigate}
                            />

                            <ReportCard 
                                title="Detailed Trial Balance"
                                description="Comprehensive ledger audit statement displaying Opening Balances, Period Debit/Credit Transactions, and Final Closing Balances across all chart of accounts."
                                icon={<FaBookOpen />}
                                path="/trial-balance" 
                                color="#495057"
                                perm="reports.trial_balance"
                                navigate={navigate}
                            />

                            <ReportCard 
                                title="Segmented Profit & Loss Report"
                                description="Analyze profitability by different segments Identify top-performing areas and optimize resource allocation."
                                icon={<FaChartBar />}
                                path="/segmented-profit-loss" 
                                color="#ff9800" 
                                perm="reports.segmented_pl"
                                navigate={navigate}
                            />

                            <ReportCard 
                                title="Phone History & Profit Report"
                                description="Purchase and sale history by phone model with IMEI, unit cost, and profit summary."
                                icon={<FaHistory />}
                                path="/product-history-report" 
                                color="#4caf50" 
                                perm="reports.history"
                                navigate={navigate}
                            />

                            <ReportCard 
                                title="Sales Register Report"
                                description="Detailed record of all sales transactions, including invoices, returns, and adjustments. Monitor sales trends and customer activity over time."
                                icon={<FaFileInvoiceDollar />}
                                path="/sales-register" 
                                color="#2196f3" 
                                perm="reports.sales_register"
                                navigate={navigate}
                            />

                            <ReportCard 
                                title="Purchase Register Report"
                                description="Comprehensive record of all purchase transactions, including invoices, returns, and adjustments. Monitor supplier activity and procurement trends over time."
                                icon={<FaFileInvoiceDollar />}
                                path="/purchase-register" 
                                color="#9c27b0" 
                                perm="reports.purchase_register"
                                navigate={navigate}
                            />

                            <ReportCard 
                                title="Receivable Register Report"
                                description="Detailed record of all receivable transactions, including invoices, payments, and adjustments. Monitor customer credit and collection activities over time."
                                icon={<FaFileInvoiceDollar />}
                                path="/receivable-register" 
                                color="#ff5722" 
                                perm="reports.receivable_register"
                                navigate={navigate}
                            />

                            <ReportCard 
                                title="Cash / Voucher Report"
                                description="View all payment vouchers (JV, CPV, CRV, BPV, BRV) by date range. Filter by cash, bank, or individual voucher type."
                                icon={<FaMoneyBillWave />}
                                path="/cash-report" 
                                color="#0f172a" 
                                perm="reports.cash_report"
                                navigate={navigate}
                            />

                            <ReportCard 
                                title="Inventory Adjustment Report"
                                description="Add and deduct stock adjustments for inventory products, with qty, cost, reason and user."
                                icon={<FaBalanceScale />}
                                path="/inventory-adjustment-report" 
                                color="#7c3aed" 
                                perm="reports.inventory_adjustment"
                                navigate={navigate}
                            />
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Reports;
