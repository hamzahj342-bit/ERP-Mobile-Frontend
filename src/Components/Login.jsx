// import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import '../index.css';
// import { saveAuthData } from '../auth';
// import bgImage from '../assets/Analytical.jpeg';
// import { FaBuilding, FaUser, FaLock, FaEnvelope, FaArrowLeft, FaEye, FaEyeSlash } from 'react-icons/fa';
// import api from '../../api';

// // Notifications
// import { toast } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';
// import Swal from 'sweetalert2';

// const Login = () => {
//     // --- States ---
//     const [view, setView] = useState('login'); // 'login', 'forgot', 'register'
//     const [loading, setLoading] = useState(false);
//     const navigate = useNavigate();

//     // Login States
//     const [username, setUsername] = useState('');
//     const [password, setPassword] = useState('');
//     const [companies, setCompanies] = useState([]);
//     const [selectedCompany, setSelectedCompany] = useState('');
//     const [showPassword, setShowPassword] = useState(false);

//     // Forgot Password States
//     const [step, setStep] = useState(1);
//     const [forgotEmail, setForgotEmail] = useState('');
//     const [otp, setOtp] = useState('');
//     const [newPassword, setNewPassword] = useState('');
//     const [confirmPassword, setConfirmPassword] = useState('');
//     const [showNewPass, setShowNewPass] = useState(false);

//     // Registration States
//     const [regData, setRegData] = useState({
//         username: '',
//         email: '',
//         password: '',
//         company_id: ''
//     });

//     // --- Fetch Companies ---
//     useEffect(() => {
//         const fetchCompanies = async () => {
//             try {
//                 const response = await api.get('/companies');
//                 setCompanies(response.data);
//             } catch (error) {
//                 console.error("Error fetching companies", error);
//                 toast.error("Failed to load companies");
//             }
//         };
//         fetchCompanies();
//     }, []);

//     // --- Handlers ---

//     // 1. Login Handler
//     const handleLogin = async (e) => {
//         e.preventDefault();
//         if (!selectedCompany) {
//             toast.warning("Please select a company!");
//             return;
//         }
//         try {
//             const response = await api.post('/login', { 
//                 username, 
//                 password, 
//                 company_id: selectedCompany 
//             });

//             if (response.status === 200) {
//                 saveAuthData(response.data.token);
//                 localStorage.setItem("user", JSON.stringify(response.data.user));
//                 navigate("/dashboard");
//             }
//         } catch (error) {
//             console.error("Login error:", error.response || error);
//             toast.error(error.response?.data?.message || "Invalid Credentials");
//         }
//     };

//     // 2. Registration Handler
//     const handleRegister = async (e) => {
//         e.preventDefault();
//         if (!regData.company_id) {
//             toast.warning("Please select a company to assign!");
//             return;
//         }
//         setLoading(true);
//         try {
//             const res = await api.post('/register', regData);
//             Swal.fire({
//                 title: 'Request Sent!',
//                 text: res.data.message,
//                 icon: 'success',
//                 confirmButtonColor: '#1a73e8'
//             }).then(() => {
//                 setView('login');
//                 setRegData({ username: '', email: '', password: '', company_id: '' });
//             });
//         } catch (error) {
//             toast.error(error.response?.data?.message || "Registration Failed");
//         } finally {
//             setLoading(false);
//         }
//     };

//     // 3. Forgot Password Handlers
//     const handleSendOTP = async (e) => {
//         e.preventDefault();
//         setLoading(true);
//         console.log("forget email: " + forgotEmail);
//         try {
            
//             await api.post('/send-otp', { email: forgotEmail });
//             toast.success("Code sent to your email!");
//             setStep(2);
//         } catch (error) {
//             console.error("Send OTP error:", error.response || error);
//             const message = error.response?.data?.message || "Email not found or Server Error";
//             toast.error(message);
//         } finally { setLoading(false); }
//     };

//     const handleVerifyOTP = async (e) => {
//         e.preventDefault();
//         setLoading(true);
//         try {
//             await api.post('/verify-otp', { email: forgotEmail, otp });
//             setStep(3);
//         } catch (error) {
//             toast.error("Invalid OTP Code");
//         } finally { setLoading(false); }
//     };

//     const handleResetPassword = async (e) => {
//         e.preventDefault();
//         if (newPassword !== confirmPassword) {
//             toast.warning("Passwords do not match!");
//             return;
//         }
//         setLoading(true);
//         try {
//             await api.post('/reset-password', { email: forgotEmail, newPassword });
//             Swal.fire('Success!', 'Password updated. You can now login.', 'success').then(() => {
//                 setView('login');
//                 setStep(1);
//                 setForgotEmail('');
//             });
//         } catch (error) {
//             toast.error("Failed to update password");
//         } finally { setLoading(false); }
//     };

//     return (
//         <div className="login-wrapper">
//             {/* <ToastContainer position="top-right" theme="colored" /> */}
            
//             <div className="image-section" style={{ backgroundImage: `url(${bgImage})` }}></div>

//             <div className='login-container'>
//                 <div className="login-box">
                    
//                     <div className="login-header">
//                         <h1 className='company-name'>Chemical And Detergents</h1>
//                     </div>

//                     {/* --- LOGIN VIEW --- */}
//                     {view === 'login' && (
//                         <div className="form-content animate-slide-right">
//                             <h2 className="login-title">User Login</h2>
//                             <form onSubmit={handleLogin}>
//                                 <div className="input-box">
//                                     <input type="text" placeholder="Username" value={username} onChange={(e)=>setUsername(e.target.value)} required />
//                                     <FaUser className="icon" />
//                                 </div>
//                                 <div className="input-box">
//                                     <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
//                                     <div className="password-toggle-icon" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '45px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#888' }}>
//                                         {showPassword ? <FaEyeSlash /> : <FaEye />}
//                                     </div>
//                                     <FaLock className="icon" />
//                                 </div>
//                                 <div className="input-box">
//                                     <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} required className="company-select-field">
//                                         <option value="" disabled>Select Company</option>
//                                         {companies.map((comp) => <option key={comp.id} value={comp.id}>{comp.name}</option>)}
//                                     </select>
//                                     <FaBuilding className="icon" />
//                                 </div>
//                                 <div className="options">
//                                     <span className="forgot-link" onClick={() => setView('forgot')}>Forgot Password?</span>
//                                     <span className="forgot-link" onClick={() => setView('register')}>Create Account</span>
//                                 </div>
//                                 <button type="submit" className="login-btn">Login</button>
//                             </form>
//                         </div>
//                     )}

//                     {/* --- REGISTER VIEW --- */}
//                     {view === 'register' && (
//                         <div className="form-content animate-slide-left">
//                             <div className="back-arrow" onClick={() => setView('login')}>
//                                 <FaArrowLeft /> <span>Back to Login</span>
//                             </div>
//                             <h2 className="login-title">User Registration</h2>
//                             <form onSubmit={handleRegister}>
//                                 <div className="input-box">
//                                     <input type="text" placeholder="Full Name" value={regData.username} onChange={(e)=>setRegData({...regData, username: e.target.value})} required />
//                                     <FaUser className="icon" />
//                                 </div>
//                                 <div className="input-box">
//                                     <input type="email" placeholder="Email Address" value={regData.email} onChange={(e)=>setRegData({...regData, email: e.target.value})} required />
//                                     <FaEnvelope className="icon" />
//                                 </div>
//                                 <div className="input-box">
//                                     <input type="password" placeholder="Password" value={regData.password} onChange={(e)=>setRegData({...regData, password: e.target.value})} required />
//                                     <FaLock className="icon" />
//                                 </div>
//                                 <div className="input-box">
//                                     <select value={regData.company_id} onChange={(e) => setRegData({...regData, company_id: e.target.value})} required className="company-select-field">
//                                         <option value="" disabled>Select Company</option>
//                                         {companies.map((comp) => <option key={comp.id} value={comp.id}>{comp.name}</option>)}
//                                     </select>
//                                     <FaBuilding className="icon" />
//                                 </div>
//                                 <button type="submit" className="login-btn" disabled={loading}>{loading ? "Sending Request..." : "Register Now"}</button>
//                             </form>
//                         </div>
//                     )}

//                     {/* --- FORGOT PASSWORD VIEW --- */}
//                     {view === 'forgot' && (
//                         <div className="form-content animate-slide-left">
//                             <div className="back-arrow" onClick={() => { setView('login'); setStep(1); }}>
//                                 <FaArrowLeft /> <span>Back to Login</span>
//                             </div>
                            
//                             <h2 className="login-title">
//                                 {step === 1 && "Reset Password"}
//                                 {step === 2 && "Verification"}
//                                 {step === 3 && "New Password"}
//                             </h2>

//                             {step === 1 && (
//                                 <form onSubmit={handleSendOTP}>
//                                     <p className="step-info">Enter your email to get a 6-digit code.</p>
//                                     <div className="input-box">
//                                         <input type="email" placeholder="Email Address" value={forgotEmail} onChange={(e)=>setForgotEmail(e.target.value)} required />
//                                         <FaEnvelope className="icon" />
//                                     </div>
//                                     <button type="submit" className="login-btn" disabled={loading}>{loading ? "Sending..." : "Send OTP"}</button>
//                                 </form>
//                             )}

//                             {step === 2 && (
//                                 <form onSubmit={handleVerifyOTP}>
//                                     <p className="step-info">Code sent to <b>{forgotEmail}</b></p>
//                                     <div className="input-box">
//                                         <input type="text" placeholder="000000" className="otp-center" maxLength="6" value={otp} onChange={(e)=>setOtp(e.target.value)} required />
//                                     </div>
//                                     <button type="submit" className="login-btn" disabled={loading}>{loading ? "Verifying..." : "Verify Code"}</button>
//                                 </form>
//                             )}

//                             {step === 3 && (
//                                 <form onSubmit={handleResetPassword}>
//                                     <div className="input-box">
//                                         <input type={showNewPass ? "text" : "password"} placeholder="New Password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} required />
//                                         <div className="password-toggle-icon" onClick={() => setShowNewPass(!showNewPass)} style={{ position: 'absolute', right: '45px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#888' }}>
//                                             {showNewPass ? <FaEyeSlash /> : <FaEye />}
//                                         </div>
//                                         <FaLock className="icon" />
//                                     </div>
//                                     <div className="input-box">
//                                         <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} required />
//                                         <FaLock className="icon" />
//                                     </div>
//                                     <button type="submit" className="login-btn" disabled={loading}>{loading ? "Updating..." : "Update Password"}</button>
//                                 </form>
//                             )}
//                         </div>
//                     )}
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default Login;





import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../index.css';
import { saveAuthData } from '../auth';
import logo from '../assets/ERP favicon-bg.png';
import { FaBuilding, FaUser, FaLock, FaEnvelope, FaArrowLeft, FaEye, FaEyeSlash, FaMobileAlt } from 'react-icons/fa';
import api from '../../api';

// Notifications
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';

const Login = () => {
    // --- States ---
    const [view, setView] = useState('login'); 
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Login States
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [companies, setCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Forgot Password States
    const [step, setStep] = useState(1);
    const [forgotEmail, setForgotEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPass, setShowNewPass] = useState(false);

    // Change Password States (login page)
    const [cpUsername, setCpUsername] = useState('');
    const [cpCompany, setCpCompany] = useState('');
    const [cpOldPassword, setCpOldPassword] = useState('');
    const [cpNewPassword, setCpNewPassword] = useState('');
    const [cpConfirmPassword, setCpConfirmPassword] = useState('');
    const [showCpOld, setShowCpOld] = useState(false);
    const [showCpNew, setShowCpNew] = useState(false);

    useEffect(() => {
        document.body.classList.remove("erp-has-nav", "sidebar-open", "erp-dashboard-pinned");
    }, []);

    // --- Fetch Companies ---
    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const response = await api.get('/companies');
                setCompanies(response.data);
            } catch (error) {
                console.error("Error fetching companies", error);
                toast.error("Failed to load companies");
            }
        };
        fetchCompanies();
    }, []);

    // --- Handlers ---
    const handleLogin = async (e) => {
        e.preventDefault();
        if (!selectedCompany) {
            toast.warning("Please select a company!");
            return;
        }
        try {
            // Clear any previous session so a leftover company_id/token cannot
            // interfere with the login request (see api.js skip list).
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('token_expiry');

            const response = await api.post('/login', { 
                username, 
                password, 
                company_id: selectedCompany 
            });

            if (response.status === 200) {
                saveAuthData(response.data.token);
                localStorage.setItem("user", JSON.stringify(response.data.user));
                navigate("/dashboard");
            }
        } catch (error) {
            console.error("Login error:", error.response || error);
            toast.error(error.response?.data?.message || "Invalid Credentials");
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!regData.company_id) {
            toast.warning("Please select a company to assign!");
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/register', regData);
            Swal.fire({
                title: 'Request Sent!',
                text: res.data.message,
                icon: 'success',
                confirmButtonColor: '#0f172a'
            }).then(() => {
                setView('login');
                setRegData({ username: '', email: '', password: '', company_id: '' });
            });
        } catch (error) {
            toast.error(error.response?.data?.message || "Registration Failed");
        } finally {
            setLoading(false);
        }
    };

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/send-otp', { email: forgotEmail });
            toast.success("Code sent to your email!");
            setStep(2);
        } catch (error) {
            console.error("Send OTP error:", error.response || error);
            toast.error(error.response?.data?.message || "Email not found or Server Error");
        } finally { setLoading(false); }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/verify-otp', { email: forgotEmail, otp });
            setStep(3);
        } catch (error) {
            toast.error("Invalid OTP Code");
        } finally { setLoading(false); }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.warning("Passwords do not match!");
            return;
        }
        setLoading(true);
        try {
            await api.post('/reset-password', { email: forgotEmail, newPassword });
            Swal.fire('Success!', 'Password updated. You can now login.', 'success').then(() => {
                setView('login');
                setStep(1);
                setForgotEmail('');
            });
        } catch (error) {
            toast.error("Failed to update password");
        } finally { setLoading(false); }
    };

    const isStrongPassword = (pwd) =>
        pwd.length >= 8 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd);

    const openChangePassword = () => {
        setCpUsername(username || '');
        setCpCompany(selectedCompany || '');
        setCpOldPassword('');
        setCpNewPassword('');
        setCpConfirmPassword('');
        setView('changePassword');
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (!cpCompany) {
            toast.warning("Please select a company!");
            return;
        }
        if (cpNewPassword !== cpConfirmPassword) {
            toast.error("New password and confirm password do not match!");
            return;
        }
        if (!isStrongPassword(cpNewPassword)) {
            toast.error("Password must be at least 8 characters with 1 capital letter and 1 number");
            return;
        }
        if (cpOldPassword === cpNewPassword) {
            toast.error("New password must be different from the old password");
            return;
        }

        setLoading(true);
        try {
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            const res = await api.post('/change-password', {
                username: cpUsername,
                company_id: cpCompany,
                oldPassword: cpOldPassword,
                newPassword: cpNewPassword,
            });
            toast.success(res.data?.message || "Password changed successfully!");
            setUsername(cpUsername);
            setSelectedCompany(cpCompany);
            setPassword('');
            setView('login');
            setCpOldPassword('');
            setCpNewPassword('');
            setCpConfirmPassword('');
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to change password");
        } finally {
            setLoading(false);
        }
    };

    const selectedShopName =
        companies.find((c) => String(c.id) === String(selectedCompany))?.name || '';

    return (
        <div className="login-wrapper premium-layout mobile-shop-login">
            
            {/* Left: Mobile shop brand panel */}
            <div className="image-section d-none d-md-flex align-items-center justify-content-center position-relative overflow-hidden premium-erp-panel">
                <div className="erp-mesh-grid-premium"></div>
                <div className="glowing-orb-1"></div>
                <div className="glowing-orb-2"></div>

                <div className="container position-relative z-index-2 text-center px-5">
                    <div className="erp-brand-content animate-fade-in">
                        <div className="login-brand-mark" aria-hidden="true">
                            <FaMobileAlt />
                        </div>
                        <img src={logo} alt="CodeBase Next-Gen" className="company-logo-premium" />
                        <div className="d-flex justify-content-center gap-2 mb-4">
                            <span className="login-pill-badge">
                                <FaMobileAlt className="me-2" /> Mobile Inventory &amp; Sales
                            </span>
                        </div>
                        
                        <h2 className="display-5 fw-bold mb-3 login-hero-title">
                            CodeBase Next-Gen
                        </h2>
                        <p className="lead text-muted-premium fs-6 mx-auto mb-5 max-w-450">
                            Buy, sell, and track every phone by IMEI — stock, customers, and profit in one place.
                        </p>
                        
                        <div className="login-feature-row">
                            <span>IMEI stock</span>
                            <span>Purchase &amp; sale</span>
                            <span>Live reports</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: Sign-in form */}
            <div className='login-container premium-form-container'>
                <div className="login-box premium-box shadow-lg">
                    
                    <div className="login-header text-center mb-4">
                        <h1 className='company-name-premium'>CodeBase Next-Gen</h1>
                        <p className="form-subtitle-premium">
                            {selectedShopName
                                ? `Sign in to ${selectedShopName}`
                                : 'Sign in to your shop'}
                        </p>
                    </div>

                    {/* --- LOGIN VIEW --- */}
                    {view === 'login' && (
                        <div className="form-content animate-slide-right">
                            <div className="view-header-badge mb-4">Shop Login</div>
                            <form onSubmit={handleLogin}>
                                <div className="input-box premium-input">
                                    <input type="text" placeholder="Username" value={username} onChange={(e)=>setUsername(e.target.value)} required />
                                    <FaUser className="icon-premium" />
                                </div>
                                <div className="input-box premium-input">
                                    <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
                                    <div className="password-toggle-premium" onClick={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                                    </div>
                                    <FaLock className="icon-premium" />
                                </div>
                                <div className="input-box premium-input">
                                    <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} required className="company-select-field">
                                        <option value="" disabled>Select shop / company</option>
                                        {companies.map((comp) => <option key={comp.id} value={comp.id}>{comp.name}</option>)}
                                    </select>
                                    <FaBuilding className="icon-premium" />
                                </div>
                                <div className="options premium-options my-3">
                                    <span className="forgot-link-premium" onClick={() => setView('forgot')}>Forgot Password?</span>
                                    <span className="forgot-link-premium" onClick={openChangePassword}>Change Password</span>
                                </div>
                                <button type="submit" className="login-btn premium-btn w-100 py-3 tracking-wider fw-bold">Sign In</button>
                            </form>
                        </div>
                    )}

                    {/* --- REGISTER VIEW --- */}
                    {view === 'register' && (
                        <div className="form-content animate-slide-left">
                            <div className="back-arrow-premium mb-3" onClick={() => setView('login')}>
                                <FaArrowLeft /> <span>Back to login</span>
                            </div>
                            <div className="view-header-badge mb-4">Create Account</div>
                            <form onSubmit={handleRegister}>
                                <div className="input-box premium-input">
                                    <input type="text" placeholder="Full Legal Name" value={regData.username} onChange={(e)=>setRegData({...regData, username: e.target.value})} required />
                                    <FaUser className="icon-premium" />
                                </div>
                                <div className="input-box premium-input">
                                    <input type="email" placeholder="Corporate Email Address" value={regData.email} onChange={(e)=>setRegData({...regData, email: e.target.value})} required />
                                    <FaEnvelope className="icon-premium" />
                                </div>
                                <div className="input-box premium-input">
                                    <input type="password" placeholder="Access Password" value={regData.password} onChange={(e)=>setRegData({...regData, password: e.target.value})} required />
                                    <FaLock className="icon-premium" />
                                </div>
                                <div className="input-box premium-input">
                                    <select value={regData.company_id} onChange={(e) => setRegData({...regData, company_id: e.target.value})} required className="company-select-field">
                                        <option value="" disabled>Select Corporate Node</option>
                                        {companies.map((comp) => <option key={comp.id} value={comp.id}>{comp.name}</option>)}
                                    </select>
                                    <FaBuilding className="icon-premium" />
                                </div>
                                <button type="submit" className="login-btn premium-btn w-100 py-3 text-uppercase tracking-wider fw-bold" disabled={loading}>
                                    {loading ? "Processing Encryption..." : "Submit Registration Tier"}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* --- FORGOT PASSWORD VIEW --- */}
                    {view === 'forgot' && (
                        <div className="form-content animate-slide-left">
                            <div className="back-arrow-premium mb-3" onClick={() => { setView('login'); setStep(1); }}>
                                <FaArrowLeft /> <span>Back to login</span>
                            </div>
                            
                            <div className="view-header-badge mb-4">
                                {step === 1 && "Reset Password"}
                                {step === 2 && "Enter OTP"}
                                {step === 3 && "Set New Password"}
                            </div>

                            {step === 1 && (
                                <form onSubmit={handleSendOTP}>
                                    <p className="step-info-premium text-center text-muted mb-4">Enter your registered email to receive a reset code.</p>
                                    <div className="input-box premium-input">
                                        <input type="email" placeholder="Email address" value={forgotEmail} onChange={(e)=>setForgotEmail(e.target.value)} required />
                                        <FaEnvelope className="icon-premium" />
                                    </div>
                                    <button type="submit" className="login-btn premium-btn w-100 py-3 tracking-wider fw-bold" disabled={loading}>
                                        {loading ? "Sending..." : "Send OTP"}
                                    </button>
                                </form>
                            )}

                            {step === 2 && (
                                <form onSubmit={handleVerifyOTP}>
                                    <p className="step-info-premium text-center mb-4">Code sent to <strong className="text-dark">{forgotEmail}</strong></p>
                                    <div className="input-box premium-input">
                                        <input type="text" placeholder="######" className="otp-center-premium tracking-widest text-center" maxLength="6" value={otp} onChange={(e)=>setOtp(e.target.value)} required />
                                    </div>
                                    <button type="submit" className="login-btn premium-btn w-100 py-3 tracking-wider fw-bold" disabled={loading}>
                                        {loading ? "Verifying..." : "Verify OTP"}
                                    </button>
                                </form>
                            )}

                            {step === 3 && (
                                <form onSubmit={handleResetPassword}>
                                    <div className="input-box premium-input">
                                        <input type={showNewPass ? "text" : "password"} placeholder="New password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} required />
                                        <div className="password-toggle-premium" onClick={() => setShowNewPass(!showNewPass)}>
                                            {showNewPass ? <FaEyeSlash /> : <FaEye />}
                                        </div>
                                        <FaLock className="icon-premium" />
                                    </div>
                                    <div className="input-box premium-input">
                                        <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} required />
                                        <FaLock className="icon-premium" />
                                    </div>
                                    <button type="submit" className="login-btn premium-btn w-100 py-3 tracking-wider fw-bold" disabled={loading}>
                                        {loading ? "Updating..." : "Update Password"}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}

                    {/* --- CHANGE PASSWORD VIEW --- */}
                    {view === 'changePassword' && (
                        <div className="form-content animate-slide-left">
                            <div className="back-arrow-premium mb-3" onClick={() => setView('login')}>
                                <FaArrowLeft /> <span>Back to login</span>
                            </div>
                            <div className="view-header-badge mb-4">Change Password</div>
                            <p className="step-info-premium text-center text-muted mb-3" style={{ fontSize: '0.85rem' }}>
                                New password: min 8 characters, 1 capital letter, 1 number
                            </p>
                            <form onSubmit={handleChangePassword}>
                                <div className="input-box premium-input">
                                    <input
                                        type="text"
                                        placeholder="Username"
                                        value={cpUsername}
                                        onChange={(e) => setCpUsername(e.target.value)}
                                        required
                                    />
                                    <FaUser className="icon-premium" />
                                </div>
                                <div className="input-box premium-input">
                                    <select
                                        value={cpCompany}
                                        onChange={(e) => setCpCompany(e.target.value)}
                                        required
                                        className="company-select-field"
                                    >
                                        <option value="" disabled>Select shop / company</option>
                                        {companies.map((comp) => (
                                            <option key={comp.id} value={comp.id}>{comp.name}</option>
                                        ))}
                                    </select>
                                    <FaBuilding className="icon-premium" />
                                </div>
                                <div className="input-box premium-input">
                                    <input
                                        type={showCpOld ? "text" : "password"}
                                        placeholder="Old Password"
                                        value={cpOldPassword}
                                        onChange={(e) => setCpOldPassword(e.target.value)}
                                        required
                                    />
                                    <div className="password-toggle-premium" onClick={() => setShowCpOld(!showCpOld)}>
                                        {showCpOld ? <FaEyeSlash /> : <FaEye />}
                                    </div>
                                    <FaLock className="icon-premium" />
                                </div>
                                <div className="input-box premium-input">
                                    <input
                                        type={showCpNew ? "text" : "password"}
                                        placeholder="New Password"
                                        value={cpNewPassword}
                                        onChange={(e) => setCpNewPassword(e.target.value)}
                                        required
                                    />
                                    <div className="password-toggle-premium" onClick={() => setShowCpNew(!showCpNew)}>
                                        {showCpNew ? <FaEyeSlash /> : <FaEye />}
                                    </div>
                                    <FaLock className="icon-premium" />
                                </div>
                                <div className="input-box premium-input">
                                    <input
                                        type="password"
                                        placeholder="Confirm New Password"
                                        value={cpConfirmPassword}
                                        onChange={(e) => setCpConfirmPassword(e.target.value)}
                                        required
                                    />
                                    <FaLock className="icon-premium" />
                                </div>
                                <button
                                    type="submit"
                                    className="login-btn premium-btn w-100 py-3 text-uppercase tracking-wider fw-bold"
                                    disabled={loading}
                                >
                                    {loading ? "Updating..." : "Update Password"}
                                </button>
                            </form>
                        </div>
                    )}

                    <div className="codebase-branding mt-5 pt-3 border-top text-center">
                        <p className="m-0 tracking-widest uppercase-text text-muted-premium dynamic-footer-text">
                           System Powered by <span className="fw-bold text-gradient-codebase">Codebase Solutions</span>
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Login;