import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FaBoxOpen,
    FaCheckDouble,
    FaArrowRight, 
    FaArrowLeft,
} from 'react-icons/fa';
import '../FP_Production.css'; 
import Footer from '../Components/Footer';
import NavigationBar from '../Components/NavigationBar';

const AdjustmentCard = ({ title, description, icon, path, color }) => {
    const navigate = useNavigate();
    
    return (
        <div className="production-card" style={{ borderLeft: `5px solid ${color}` }}>
            <div className="card-header-prod">
                <span className="card-icon-prod" style={{ color: color }}>
                    {icon}
                </span>
                <h3 className="card-title-prod">{title}</h3>
            </div>
            
            <div className="card-body-prod">
                <p>{description}</p>
            </div>
            
            <div className="card-footer-prod">
                <button 
                    type="button"
                    className="action-btn" 
                    style={{ backgroundColor: color }}
                    onClick={() => navigate(path)}
                >
                    Open Adjustment <FaArrowRight />
                </button>
            </div>
        </div>
    );
};

const InventoryAdjustment = () => {
    const navigate = useNavigate();
    
    return (
        <>
        <NavigationBar/>
        <div className="rm-page fp-hub-page">
            <div className="fp-production-container">
                <div className="fp-hub-card">
                    <div className="fp-hub-header">
                        <button
                            className="back-btn erp-back-btn"
                            type="button"
                            onClick={() => navigate('/dashboard')}
                        >
                            <FaArrowLeft/>
                        </button>
                        <h2>Inventory Adjustment & Wastage</h2>
                    </div>

                    <div className="production-cards-grid">
                        <AdjustmentCard 
                            title="Stock Adjustment"
                            description="Adjust product stock for wastage, damage, or manual inventory corrections."
                            icon={<FaBoxOpen size={20} />}
                            path="/rm-adjustment"
                            color="#2c3e50"
                        />

                        <AdjustmentCard 
                            title="Finished Product Adjustment"
                            description="Modify stock for Finished Goods. Record damages, samples, or production count corrections for FP batches."
                            icon={<FaCheckDouble size={20} />}
                            path="/fp-adjustment"
                            color="#8e44ad"
                        />
                    </div>
                </div>
            </div>
        </div>
        <Footer />
        </>
    );
};

export default InventoryAdjustment;
