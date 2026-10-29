import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FaArrowRight,
    FaArrowLeft,
    FaMoneyBillWave,
    FaWallet,
    FaUniversity,
} from 'react-icons/fa';
import '../RM_CardLayout.css';
import Footer from '../Components/Footer';
import NavigationBar from '../Components/NavigationBar';

const TransactionTypeCard = ({ title, description, icon, path, color, navigate }) => {
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

const Transactions = () => {
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
                                <h2 className="erp-page-title" style={{ color: '#0f172a' }}>Financial Transactions</h2>
                                <p className="erp-page-subtitle">Manage cash, bank, and journal voucher entries</p>
                            </div>
                        </div>

                        <div className="tr-grid-row">
                            <TransactionTypeCard 
                                title="Cash Vouchers"
                                description="Manage Cash Payment Vouchers (CPV) and Cash Receipt Vouchers (CRV) for standard daily cash transactions."
                                icon={<FaWallet />}
                                path="/cash-vouchers-list"
                                color="#198754"
                                navigate={navigate}
                            />

                            <TransactionTypeCard 
                                title="Bank Vouchers"
                                description="Manage Bank Payment Vouchers (BPV) and Bank Receipt Vouchers (BRV) for cheque, online transfer, and bank ledger records."
                                icon={<FaUniversity />}
                                path="/bank-vouchers-list"
                                color="#0d6efd"
                                navigate={navigate}
                            />

                            <TransactionTypeCard 
                                title="Journal Voucher (JV)"
                                description="Record general operational journal entries, non-cash adjustments, and multi-ledger reconciliation entries."
                                icon={<FaMoneyBillWave />}
                                path="/payments-list"
                                color="#DC3545"
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

export default Transactions;
