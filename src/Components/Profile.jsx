import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaUserCircle, FaEnvelope, FaCalendarAlt, FaCamera, FaIdBadge, FaBuilding, FaArrowLeft, FaLock, FaTimes, FaShieldAlt } from "react-icons/fa";
import NavigationBar from "./NavigationBar";
import Footer from "./Footer";
import api from "../../api";
import Swal from 'sweetalert2';
import '../Profile.css';

const Profile = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    const [showModal, setShowModal] = useState(false);
    const [step, setStep] = useState(1);
    const [forgotEmail, setForgotEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [modalLoading, setModalLoading] = useState(false);

    const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || "http://localhost:5000";

    // ✅ Dynamic Logo URL Generator
const getProfileImageUrl = () => {
    if (!user?.profile_image) return null;
    console.log("Current Profile Image State:", user.profile_image);

    // Agar Cloudinary ka full URL hai (e.g. starts with http)
    if (user.profile_image.startsWith("http")) {
        return user.profile_image;
    }

    // Agar local upload hai toh path build karein
  // Taake agar database mein "uploads\file.png" hai toh sirf "file.png" bache
    const cleanFileName = user.profile_image.replace("uploads\\", "").replace("uploads/", "");

    // 3. Final URL build karein (Windows backslash ko forward slash se badlein)
    const finalUrl = `${IMAGE_BASE_URL}/uploads/${cleanFileName}`.replace(/\\/g, "/");

    console.log("Fixed URL:", finalUrl); 
    return finalUrl;
};

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        try {
            const res = await api.get("/profile");
            setUser(res.data);
            setForgotEmail(res.data.email);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            toast.error("Image size should be less than 2MB");
            return;
        }

        const formData = new FormData();
        formData.append("profileImage", file);
        setUploading(true);
        try {
            const res = await api.post("/upload-profile-pic", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            const updatedUser = { ...user, profile_image: res.data.imageUrl };
            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));
            window.dispatchEvent(new Event("storage"));
            toast.success("Profile picture updated!");
        } catch (err) {
            toast.error("Failed to upload image");
        } finally { setUploading(false); }
    };

    // --- Password Flow Handlers ---
    const handleSendOTP = async (e) => {
        e.preventDefault();
        setModalLoading(true);
        try {
            await api.post('/send-otp', { email: forgotEmail });
            toast.success("Code sent to your email!");
            setStep(2);
        } catch (error) {
            toast.error("Error sending code");
        } finally { setModalLoading(false); }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setModalLoading(true);
        try {
            await api.post('/verify-otp', { email: forgotEmail, otp });
            setStep(3);
        } catch (error) {
            toast.error("Invalid OTP Code");
        } finally { setModalLoading(false); }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.warning("Passwords do not match!");
            return;
        }
        setModalLoading(true);
        try {
            await api.post('/reset-password', { email: forgotEmail, newPassword });
            Swal.fire('Success!', 'Your password has been changed.', 'success');
            setShowModal(false);
            setStep(1);
            setOtp(''); setNewPassword(''); setConfirmPassword('');
        } catch (error) {
            toast.error("Failed to update password");
        } finally { setModalLoading(false); }
    };

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center vh-100" style={{ background: '#f8fafc' }}>
            <div className="spinner-border" style={{ color: '#0f172a' }} role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </div>
    );

    return (
        <div className="profile-page-wrapper">
            <NavigationBar />
            
            <div className="container" style={{ paddingTop: '24px' }}>
                {/* Back Button */}
                <button 
                    onClick={() => navigate('/dashboard')}
                    className="back-btn erp-back-btn"
                >
                    <FaArrowLeft className="me-2" />
                </button>

                {/* Main Profile Card */}
                <div className="profile-card-main">
                    
                    {/* Banner */}
                    <div className="profile-banner">
                        <div className="profile-avatar-area">
                            <div className="position-relative d-inline-block">
                                {user?.profile_image ? (
                                    <img 
                src={getProfileImageUrl()} 
                alt="Profile" 
                className="profile-avatar-img"
                crossOrigin="anonymous" 
            />
                                ) : (
                                    <FaUserCircle className="profile-avatar-placeholder" />
                                )}
                                <button 
                                    onClick={() => fileInputRef.current.click()}
                                    className="profile-camera-btn"
                                >
                                    <FaCamera size={12} />
                                </button>
                                <input type="file" ref={fileInputRef} hidden onChange={handleImageChange} accept="image/*" />
                                {uploading && (
                                    <div className="profile-upload-overlay">
                                        <div className="spinner-border spinner-border-sm text-white"></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="profile-body">
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                            <div>
                                <h2 className="profile-name">{user?.name}</h2>
                                <div className="d-flex align-items-center">
                                    <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle fw-bold">
                                        <span className="d-inline-block rounded-circle bg-success me-2" style={{ width: "8px", height: "8px" }}></span>
                                        ACTIVE SESSION
                                    </span>
                                </div>
                            </div>
                            <button className="profile-edit-btn">Edit Profile</button>
                        </div>

                        <hr className="opacity-10 mb-4" />

                        {/* Information Grid */}
                        <div className="row g-3">
                            <ProfileInfoItem label="Email Address" value={user?.email} icon={<FaEnvelope />} />
                            <ProfileInfoItem label="User Identification" value={`#USR-${user?.id}`} icon={<FaIdBadge />} />
                            <ProfileInfoItem label="Company Reference" value={`CID-${user?.company_id}`} icon={<FaBuilding />} />
                            <ProfileInfoItem label="Registration Date" value={user?.createdat ? new Date(user.createdat).toLocaleDateString("en-GB") : "N/A"} icon={<FaCalendarAlt />} />
                        </div>

                        {/* Security Section */}
                        <div className="profile-security-box">
                            <div className="profile-security-icon">
                                <FaShieldAlt />
                            </div>
                            <div className="profile-security-text">
                                <h6>Security Settings</h6>
                                <p>Manage your account security and password preferences.</p>
                            </div>
                            <button onClick={() => setShowModal(true)} className="profile-reset-btn">
                                Reset Password
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* PASSWORD MODAL (Bootstrap Logic) */}
            {showModal && (
                <div className="modal show d-block profile-modal" tabIndex="-1" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(5px)" }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow-2xl p-3">
                            <div className="modal-header border-0">
                                <button onClick={() => { setShowModal(false); setStep(1); }} className="btn-close shadow-none"></button>
                            </div>
                            <div className="modal-body text-center">
                                <div className="bg-light rounded-circle d-inline-flex p-3 mb-4">
                                    <FaLock className="modal-lock-icon fs-3" />
                                </div>
                                <h4 className="fw-bold mb-3" style={{ fontWeight: 800 }}>
                                    {step === 1 && "Identity Check"}
                                    {step === 2 && "Verification"}
                                    {step === 3 && "Update Password"}
                                </h4>

                                {step === 1 && (
                                    <form onSubmit={handleSendOTP}>
                                        <p className="text-muted small mb-4">Confirm your email to receive a 6-digit verification code.</p>
                                        <input type="email" className="form-control form-control-lg text-center fw-bold bg-light mb-4 border-0" value={forgotEmail} readOnly />
                                        <button className="btn btn-primary btn-lg w-100 rounded-3 fw-bold py-3" disabled={modalLoading}>
                                            {modalLoading ? "Sending Code..." : "Send OTP"}
                                        </button>
                                    </form>
                                )}

                                {step === 2 && (
                                    <form onSubmit={handleVerifyOTP}>
                                        <p className="text-muted small mb-4">Enter the code sent to <strong>{forgotEmail}</strong></p>
                                        <input type="text" className="form-control form-control-lg text-center fs-2 fw-bold mb-4 tracking-widest" placeholder="000000" maxLength="6" value={otp} onChange={(e)=>setOtp(e.target.value)} required />
                                        <button className="btn btn-primary btn-lg w-100 rounded-3 fw-bold py-3" disabled={modalLoading}>
                                            {modalLoading ? "Verifying..." : "Verify OTP"}
                                        </button>
                                    </form>
                                )}

                                {step === 3 && (
                                    <form onSubmit={handleResetPassword}>
                                        <input type="password" placeholder="New Password" className="form-control form-control-lg mb-3 rounded-3" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} required />
                                        <input type="password" placeholder="Confirm Password" className="form-control form-control-lg mb-4 rounded-3" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} required />
                                        <button className="btn btn-success btn-lg w-100 rounded-3 fw-bold py-3" disabled={modalLoading}>
                                            {modalLoading ? "Saving..." : "Change Password"}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
};

// Reusable Sub-component
const ProfileInfoItem = ({ label, value, icon }) => (
    <div className="col-md-6">
        <div className="profile-info-item">
            <div className="profile-info-label">{label}</div>
            <div className="profile-info-value">
                {icon}
                <span>{value || 'N/A'}</span>
            </div>
        </div>
    </div>
);

export default Profile;