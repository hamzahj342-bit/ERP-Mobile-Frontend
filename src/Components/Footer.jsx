import React from 'react';
import { useLocation } from 'react-router-dom';
import '../Footer.css';

const Footer = () => {
  const location = useLocation();

  // Check if current path is dashboard
  const isDashboard = location.pathname === '/dashboard';

  return (
    <footer className={`footer ${isDashboard ? 'footer-dashboard' : ''}`}>
      <div className="footer-content">
        <p>&copy; 2025 - {new Date().getFullYear()} CodeBase Solutions. All Rights Reserved.</p>
        {/* Powered by section */}
        <p className="powered-by">
        NEXT-GEN — Powered by <span className="brand-name"><a href="https://www.codebasesln.com" target="_blank" rel="noopener noreferrer">CODEBASE SOLUTIONS</a></span>
        </p>

        <div className="footer-links">
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;