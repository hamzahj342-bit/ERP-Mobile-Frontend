import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FaUserTie,
    FaUsers,
    FaIdCard,
    FaLink,
    FaFileInvoice,
    FaArrowLeft, 
    FaArrowRight 
} from 'react-icons/fa';
import '../RM_CardLayout.css';
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';

const MenuCard = ({ title, description, icon, path, color, navigate }) => {
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

const EntityLedgerMenu = () => {
    const navigate = useNavigate();

    return (
        <div className="page-wrapper">
            <NavigationBar />
            <main className="rm-main-container">
                <div className="rm-content-limit">
                    <div className="erp-page-card">
                        <div className="erp-page-header rm-header">
                            <button className="back-btn erp-back-btn" type="button" onClick={() => navigate('/reports')}>
                                <FaArrowLeft />
                            </button>
                            <div className="header-info">
                                <h2 className="erp-page-title" style={{ color: '#0f172a' }}>Entity Ledger Reports</h2>
                                <p className="erp-page-subtitle">Select a ledger category to analyze transactional histories and running balances</p>
                            </div>
                        </div>

                        <div className="tr-grid-row">
                            <MenuCard 
                                title="Suppliers Ledger"
                                description="Track purchase invoices, procurement entries, payments made, and current outstanding balances for your suppliers (A/P)."
                                icon={<FaUserTie />}
                                path="/ledgers/suppliers"
                                color="#1a73e8"
                                navigate={navigate}
                            />
                            <MenuCard 
                                title="Customers Ledger"
                                description="Monitor sales invoices, dispatched orders, payment receipts, and overall accounts receivable balances for your buyers (A/R)."
                                icon={<FaUsers />}
                                path="/ledgers/customers"
                                color="#00A86B"
                                navigate={navigate}
                            />
                            <MenuCard 
                                title="Employees Ledger"
                                description="Manage staff ledger records, payroll disbursements, advance payments, salary deductions, and outstanding salary liabilities."
                                icon={<FaIdCard />}
                                path="/ledgers/employees"
                                color="#e05e00"
                                navigate={navigate}
                            />
                            <MenuCard 
                                title="Linked Entity Ledger"
                                description="Exclusively view and balance consolidated statements for unique business entities that act as both active Customers and Suppliers."
                                icon={<FaLink />}
                                path="/ledgers/linked-entities"
                                color="#6f42c1"
                                navigate={navigate}
                            />
                            <MenuCard 
                                title="Entity Ledger With Invoice"
                                description="Same party ledger with invoice line details — item name, qty, rate and amount under each purchase/sale document."
                                icon={<FaFileInvoice />}
                                path="/ledgers/with-invoice"
                                color="#0f766e"
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

export default EntityLedgerMenu;
