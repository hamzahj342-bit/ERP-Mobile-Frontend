import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FaListAlt,
    FaUserPlus,
    FaArrowRight, 
    FaArrowLeft,   
} from 'react-icons/fa';
import '../RM_CardLayout.css';
import Footer from '../Components/Footer';
import NavigationBar from '../Components/NavigationBar';

const AccountSetupCard = ({ title, description, icon, path, color, navigate }) => {
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

const Accounts = () => {
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
                                <h2 className="erp-page-title" style={{ color: '#0f172a' }}>Accounts Setup</h2>
                                <p className="erp-page-subtitle">Manage account categories and ledgers for organized financial reporting</p>
                            </div>
                        </div>

                        <div className="tr-grid-row">
                            <AccountSetupCard 
                                title="Account Categories"
                                description="Define major ledger groups (e.g., Assets, Liabilities, Revenue, Expense) for organized reporting."
                                icon={<FaListAlt />}
                                path="/account-categories"
                                color="#FFD700"
                                navigate={navigate}
                            />

                            <AccountSetupCard 
                                title="Create Account Ledger"
                                description="Set up individual ledgers (e.g., Bank Account, Cash Account, specific Customer/Supplier Ledger)."
                                icon={<FaUserPlus />}
                                path="/accounts"
                                color="#4682B4"
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

export default Accounts;
