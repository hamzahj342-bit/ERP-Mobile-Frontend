import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaBars, FaTimes, FaUserCircle, FaSignOutAlt, FaHome, FaTruck, FaUserTie,
  FaFileAlt, FaSeedling, FaCubes, FaMoneyBillAlt, FaTools, FaHistory,
  FaExchangeAlt, FaBoxes, FaLayerGroup, FaSlidersH, FaHandshake, FaChartBar, FaUserPlus, FaFileInvoice, FaBuilding,
  FaStore, FaWarehouse, FaCashRegister, FaUndo, FaShoppingCart, FaBarcode, FaFingerprint
} from "react-icons/fa";
import { MdScience } from "react-icons/md";
import { hasPermission, hasAnyPermission, REPORT_PERMISSION_KEYS } from "../permissions";
import "../Bar.css";

const DESKTOP_BREAKPOINT = 769;

const NavigationBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || "http://localhost:5000";

  const isDashboard = location.pathname === "/dashboard";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= DESKTOP_BREAKPOINT
  );
  const isDashboardPinned = isDashboard && isDesktop;
  const sidebarRef = useRef(null);

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const getProfileImage = () => {
    if (!user?.profile_image) return null;

    if (user.profile_image.startsWith("http")) {
      return user.profile_image;
    }

    const cleanFileName = user.profile_image.replace("uploads\\", "").replace("uploads/", "");
    return `${IMAGE_BASE_URL}/uploads/${cleanFileName}`.replace(/\\/g, "/");
  };

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    document.body.classList.add("erp-has-nav");
    return () => {
      document.body.classList.remove("erp-has-nav");
      document.body.classList.remove("sidebar-open");
      document.body.classList.remove("erp-dashboard-pinned");
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("erp-dashboard-pinned", isDashboardPinned);
  }, [isDashboardPinned]);

  useEffect(() => {
    document.body.classList.toggle("sidebar-open", sidebarOpen && !isDashboardPinned);
  }, [sidebarOpen, isDashboardPinned]);

  useEffect(() => {
    const updateUserData = () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    };

    window.addEventListener("storage", updateUserData);
    const interval = setInterval(updateUserData, 2000);

    return () => {
      window.removeEventListener("storage", updateUserData);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= DESKTOP_BREAKPOINT;
      setIsDesktop(desktop);
      if (desktop && location.pathname !== "/dashboard") {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [location.pathname]);

  useEffect(() => {
    if (!isDashboardPinned) {
      closeSidebar();
    }
  }, [location.pathname, isDashboardPinned, closeSidebar]);

  useEffect(() => {
    if (!sidebarOpen || isDashboardPinned) return;

    const handler = (e) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        closeSidebar();
      }
    };

    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [sidebarOpen, isDashboardPinned, closeSidebar]);

  const logOut = () => {
    localStorage.clear();
    navigate("/");
  };

  const menuSections = [
    { type: "link", icon: <FaHome />, label: "Dashboard", path: "/dashboard", perm: "dashboard" },
    { type: "link", icon: <FaHandshake />, label: "Customers", path: "/customers", perm: "customers" },
    { type: "link", icon: <FaTruck />, label: "Suppliers", path: "/suppliers", perm: "suppliers" },
    { type: "link", icon: <FaUserTie />, label: "Employees", path: "/employees", perm: "employees" },
    { type: "link", icon: <FaSlidersH />, label: "Adjustments", path: "/inventory-adjustment", perm: "adjustments" },
    { type: "link", icon: <FaFileAlt />, label: "Invoice Details", path: "/rm-invoice-detail", perm: "invoice_details" },
    {
      type: "heading", label: "INVENTORY", icon: <FaSeedling />,
      children: [
        { icon: <MdScience />, label: "Products", path: "/materials-list", perm: "rm.materials_list" },
        { icon: <FaFingerprint />, label: "Fingerprint Lookup", path: "/fingerprint-lookup", perm: "rm.materials_list" },
        { icon: <FaBoxes />, label: "Stock", path: "/rm-stock", perm: "rm.stocks" },
        // { icon: <FaFileInvoice />, label: "Goods Received Note", path: "/grn-list", perm: "rm.grn" },
        // { icon: <FaFileInvoice />, label: "Delivery Challan", path: "/dc-list", perm: "rm.delivery_challan" },
        { icon: <FaExchangeAlt />, label: "Transactions", path: "/rm-transactions", perm: "rm.transactions" },
      ],
    },
    {
      type: "heading", label: "RETAIL", icon: <FaStore />,
      children: [
        { icon: <FaShoppingCart />, label: "Retail Purchase", path: "/retail/purchases", perm: "retail.transactions" },
        { icon: <FaUndo />, label: "Retail Purchase Return", path: "/retail/purchase-returns", perm: "retail.transactions" },
        { icon: <FaCashRegister />, label: "Retail Sales", path: "/retail/sales", perm: "retail.transactions" },
        { icon: <FaUndo />, label: "Retail Sale Returns", path: "/retail/sale-returns", perm: "retail.transactions" },
      ],
    },
    {
      type: "heading", label: "WHOLESALE", icon: <FaWarehouse />,
      children: [
        { icon: <FaShoppingCart />, label: "Wholesale Purchase", path: "/wholesale/purchases", perm: "wholesale.transactions" },
        { icon: <FaUndo />, label: "Wholesale Purchase Return", path: "/wholesale/purchase-returns", perm: "wholesale.transactions" },
        { icon: <FaCashRegister />, label: "Wholesale Sales", path: "/wholesale/sales", perm: "wholesale.transactions" },
        { icon: <FaUndo />, label: "Wholesale Sale Returns", path: "/wholesale/sale-returns", perm: "wholesale.transactions" },
      ],
    },
    {
      type: "heading", label: "POS", icon: <FaCashRegister />,
      children: [
        { icon: <FaBarcode />, label: "POS Products", path: "/pos/products", perm: "pos.products" },
        { icon: <FaShoppingCart />, label: "POS Purchase", path: "/pos/purchases", perm: "pos.transactions" },
        { icon: <FaUndo />, label: "POS Purchase Return", path: "/pos/purchase-returns", perm: "pos.transactions" },
        { icon: <FaCashRegister />, label: "POS Sale (Counter)", path: "/pos/sale", perm: "pos.transactions" },
        { icon: <FaExchangeAlt />, label: "POS Sales List", path: "/pos/sales", perm: "pos.transactions" },
        { icon: <FaUndo />, label: "POS Sale Returns", path: "/pos/sale-returns", perm: "pos.transactions" },
        { icon: <FaBoxes />, label: "POS Stock", path: "/pos/stock", perm: "pos.products" },
      ],
    },
    {
      type: "heading", label: "FINISHED PRODUCT", icon: <FaCubes />,
      children: [
        { icon: <FaTools />, label: "FP Production", path: "/fp-production", perm: "fp.production" },
        { icon: <FaExchangeAlt />, label: "FP Transactions", path: "/fp-transactions", perm: "fp.transactions" },
        { icon: <FaFileInvoice />, label: "FP Delivery Challan", path: "/dc-fp-list", perm: "fp.delivery_challan" },
        { icon: <FaLayerGroup />, label: "Product Batches", path: "/product-batches", perm: "fp.product_batches" },
        { icon: <FaHistory />, label: "FP History", path: "/finished-products", perm: "fp.history" },
      ],
    },
    {
      type: "heading", label: "CHART OF ACCOUNT", icon: <FaMoneyBillAlt />,
      children: [
        { icon: <FaUserPlus />, label: "Create Account", path: "/accounts-setting", perm: "accounts.create" },
        { icon: <FaExchangeAlt />, label: "Transactions", path: "/payment-transactions", perm: "accounts.transactions" },
        { icon: <FaChartBar />, label: "Reports", path: "/reports", anyPerm: REPORT_PERMISSION_KEYS },
      ],
    },
    {
      type: "heading", label: "ADMINISTRATION", icon: <FaUserTie />,
      children: [
        { icon: <FaUserPlus />, label: "User Management", path: "/user-management", anyPerm: ["roles.manage", "users.manage"] },
        { icon: <FaBuilding />, label: "Companies", path: "/companies-admin", perm: "users.manage" },
      ],
    },
  ];

  const canSee = (item) => {
    if (item.anyPerm) return hasAnyPermission(item.anyPerm);
    return hasPermission(item.perm);
  };

  const renderMenuItem = (item) => {
    if (item.type === "link") {
      if (!canSee(item)) return null;
      return (
        <li
          key={item.label}
          onClick={() => { navigate(item.path); closeSidebar(); }}
          className={location.pathname === item.path ? "active" : ""}
        >
          <span className="icon">{item.icon}</span>
          <span className="label">{item.label}</span>
        </li>
      );
    }
    if (item.type === "heading") {
      const visibleChildren = item.children.filter(canSee);
      if (visibleChildren.length === 0) return null;
      return (
        <React.Fragment key={item.label}>
          <li className="sidebar-heading"><span><b>{item.label}</b></span></li>
          {visibleChildren.map((child) => (
            <li
              key={child.label}
              onClick={() => { navigate(child.path); closeSidebar(); }}
              className={`nested-link ${location.pathname === child.path ? "active" : ""}`}
            >
              <span className="icon">{child.icon}</span>
              <span className="label">{child.label}</span>
            </li>
          ))}
        </React.Fragment>
      );
    }
    return null;
  };

  const handleUserMenuChange = (e) => {
    if (e.target.value === "logout") logOut();
    if (e.target.value === "profile") navigate("/profile");
  };

  return (
    <>
      <div className="topbar">
        <div className="left-section">
          <button
            type="button"
            className="hamburger"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label="Toggle menu"
          >
            <FaBars size={15} />
          </button>
          <span className="topbar-brand">ERP Menu</span>
        </div>

        <div className="user-info">
          <div className="avatar-wrapper" onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}>
            {user?.profile_image ? (
              <img
                src={getProfileImage()}
                alt="Profile"
                className="user-avatar"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://via.placeholder.com/32?text=U";
                }}
              />
            ) : (
              <FaUserCircle size={22} className="user-icon" style={{ color: "white" }} />
            )}
          </div>

          <select
            className="select-arrow"
            value=""
            onChange={handleUserMenuChange}
            aria-label="User menu"
          >
            <option value="" disabled hidden>
              {user?.username || user?.name || "User"}
            </option>
            <option value="profile">My Profile</option>
            <option value="logout">Logout</option>
          </select>
        </div>
      </div>

      <div
        ref={sidebarRef}
        className={`sidebar ${isDashboardPinned ? "sidebar-static" : ""} ${sidebarOpen ? "open" : ""}`}
        aria-hidden={!isDashboardPinned && !sidebarOpen}
      >
        <div className="sidebar-header">
          <h2>ERP Menu</h2>
          <button
            type="button"
            className="sidebar-close"
            onClick={closeSidebar}
            aria-label="Close menu"
          >
            <FaTimes />
          </button>
        </div>
        <ul className="sidebar-menu">
          {menuSections.map(renderMenuItem)}
          <li className="sidebar-logout" onClick={logOut}>
            <span className="icon"><FaSignOutAlt /></span>
            <span className="label">Logout</span>
          </li>
        </ul>
      </div>

      {sidebarOpen && !isDashboardPinned && (
        <div className="overlay" onClick={closeSidebar} aria-hidden="true" />
      )}
    </>
  );
};

export default NavigationBar;
