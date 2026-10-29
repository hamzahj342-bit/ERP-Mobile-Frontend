import React from 'react';
import { FaUndo, FaCashRegister, FaArrowRight, FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../RM_CardLayout.css'; 
import NavigationBar from '../Components/NavigationBar';
import Footer from '../Components/Footer';

const TransactionCard = ({ title, icon, path, color, navigate, description }) => {
  return (
    <div className="tr-card" onClick={() => navigate(path)}>
      <div className="tr-card-inner">
        <div className="tr-icon-wrapper" style={{ backgroundColor: `${color}15`, color: color }}>
          {icon}
        </div>
        <div className="tr-content">
          <h4 className="tr-title">{title}</h4>
          <p className="tr-description">{description}</p>
        </div>
        <div className="tr-footer-link">
           <span style={{color: color}}>View Records <FaArrowRight /></span>
        </div>
      </div>
      <div className="tr-accent-bar" style={{ backgroundColor: color }}></div>
    </div>
  );
};

const FP_Transactions = () => {
  const navigate = useNavigate();

  const transactionData = [
    {
      id: 1,
      title: "Finished Product Sale",
      description: "Manage outward sales, customer invoices and revenue.",
      icon: <FaCashRegister />, 
      path: "/fp-sale-list",
      color: "#10b981" // Emerald Green
    },
    {
      id: 2,
      title: "FP Sale Return",
      description: "Track and manage products returned by customers.",
      icon: <FaUndo />, 
      path: "/fp-salereturn-list",
      color: "#ef4444" // Professional Red
    },
  ];

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
                <h2 className="erp-page-title">Finished Product Transactions</h2>
                <p className="erp-page-subtitle">Monitor your sales performance and return activities</p>
              </div>
            </div>

            {/* Cards Grid - Since there are only 2 cards, they will take space accordingly */}
            <div className="tr-grid-row">
              {transactionData.map(transaction => (
                <TransactionCard 
                  key={transaction.id}
                  title={transaction.title}
                  description={transaction.description}
                  icon={transaction.icon}
                  path={transaction.path}
                  color={transaction.color}
                  navigate={navigate}
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FP_Transactions;
