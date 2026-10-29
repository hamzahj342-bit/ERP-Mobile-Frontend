import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaFingerprint } from "react-icons/fa";
import { toast } from "react-toastify";
import NavigationBar from "../Components/NavigationBar";
import Footer from "../Components/Footer";
import api from "../../api";
import "../Transactions.css";

/**
 * Standalone customer fingerprint verify / lookup (not on invoice forms).
 * Requires shop biometric device bridge: window.BiometricBridge.captureTemplate()
 */
const FingerprintLookup = () => {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const captureTemplateFromDevice = async () => {
    if (typeof window !== "undefined" && window.BiometricBridge?.captureTemplate) {
      return window.BiometricBridge.captureTemplate();
    }
    throw new Error(
      "Biometric bridge not loaded. Refresh the page. Device + HID Authentication Device Client are required."
    );
  };

  const handleLookup = async () => {
    setBusy(true);
    setResult(null);
    try {
      const template_data = await captureTemplateFromDevice();
      const res = await api.post("/biometric/identify", { template_data });

      if (!res.data.matched) {
        toast.info(res.data.message || "No previous record found. Fingerprint did not match.");
        setResult({ matched: false, message: res.data.message });
        return;
      }

      setResult(res.data);
      toast.success(res.data.message || "Fingerprint matched");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || "Fingerprint lookup failed");
    } finally {
      setBusy(false);
    }
  };

  const bio = result?.biometric;

  return (
    <div className="page-wrapper">
      <NavigationBar />
      <main className="rm-main-container">
        <div className="rm-content-limit">
          <div className="erp-page-card">
            <div className="erp-page-header rm-header">
              <button className="back-btn erp-back-btn" type="button" onClick={() => navigate("/materials-list")}>
                <FaArrowLeft />
              </button>
              <div className="header-info">
                <h2 className="erp-page-title">Fingerprint Lookup</h2>
                <p className="erp-page-subtitle">
                  Verify a returning customer. Match fingerprint to show contact details and previous invoices.
                </p>
              </div>
            </div>

            <div style={{ padding: "8px 4px 20px" }}>
              <p style={{ color: "#64748b", fontSize: "0.9rem", maxWidth: 560 }}>
                Place the finger on the DigitalPersona USB reader, then click Lookup. Laptop fingerprint
                sensors cannot identify customers. Each shop PC needs the free HID Authentication Device
                Client installed.
                {typeof window !== "undefined" && window.BiometricBridge?.mockEnabled ? (
                  <span style={{ display: "block", marginTop: 6, color: "#b45309" }}>
                    Dev mock mode is on (VITE_BIOMETRIC_MOCK=1) — no physical device required for UI tests.
                  </span>
                ) : null}
              </p>

              <button
                type="button"
                className="save-btn"
                onClick={handleLookup}
                disabled={busy}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 12 }}
              >
                <FaFingerprint />
                {busy ? "Scanning…" : "Lookup by Fingerprint"}
              </button>

              {result && !result.matched ? (
                <div
                  style={{
                    marginTop: 20,
                    padding: 14,
                    borderRadius: 8,
                    background: "#fff7ed",
                    border: "1px solid #fed7aa",
                    color: "#9a3412",
                  }}
                >
                  <strong>No match</strong>
                  <p style={{ margin: "6px 0 0" }}>
                    {result.message || "No previous record found. Fingerprint did not match."}
                  </p>
                </div>
              ) : null}

              {result?.matched && bio ? (
                <div
                  style={{
                    marginTop: 20,
                    padding: 16,
                    borderRadius: 10,
                    border: "1px solid #bbf7d0",
                    background: "#f0fdf4",
                  }}
                >
                  <h3 style={{ margin: "0 0 10px", fontSize: "1rem" }}>Matched contact</h3>
                  <p style={{ margin: "4px 0" }}>
                    <strong>Name:</strong> {bio.contact_name || "—"}
                  </p>
                  <p style={{ margin: "4px 0" }}>
                    <strong>Phone:</strong> {bio.contact_phone || "—"}
                  </p>
                  <p style={{ margin: "4px 0" }}>
                    <strong>CNIC:</strong> {bio.contact_cnic || "—"}
                  </p>
                  <p style={{ margin: "4px 0" }}>
                    <strong>Biometric ID:</strong> #{bio.id}
                  </p>

                  <h4 style={{ margin: "16px 0 8px", fontSize: "0.95rem" }}>Previous invoices</h4>
                  {Array.isArray(result.invoices) && result.invoices.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {result.invoices.map((inv) => (
                        <li key={inv.master_id} style={{ marginBottom: 4 }}>
                          {inv.invoice_no} — {inv.type} — Rs.{" "}
                          {Number(inv.grand_total || 0).toLocaleString()} ({inv.status})
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ color: "#64748b", margin: 0 }}>No linked invoices found.</p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FingerprintLookup;
