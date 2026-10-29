import React, { useState } from "react";
import { toast } from "react-toastify";
import api from "../../api";
import CameraCaptureModal from "./CameraCaptureModal";
import { MAX_CONTACT_IMAGES, parseContactImages } from "../constants/mobileDeviceOptions";
import "./InvoiceContactBlock.css";

const IMAGE_BASE = import.meta.env.VITE_IMAGE_BASE_URL || "http://localhost:5000";

const toSrc = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${IMAGE_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
};

/**
 * Per-invoice contact / KYC block (once per form).
 * Up to MAX_CONTACT_IMAGES photos (camera + upload).
 * Fingerprint lookup for returning customers lives under Inventory → Fingerprint Lookup.
 */
const InvoiceContactBlock = ({ contact, setContact, disabled = false }) => {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const images = parseContactImages(contact?.contact_image);
  const atLimit = images.length >= MAX_CONTACT_IMAGES;

  const update = (field, value) => setContact((prev) => ({ ...prev, [field]: value }));

  const setImages = (next) => {
    update("contact_image", parseContactImages(next));
  };

  const uploadBlob = async (blob, filename = "contact.jpg") => {
    const formData = new FormData();
    formData.append("image", blob, filename);
    const res = await api.post("/biometric/contact-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.url;
  };

  const addUrls = async (getBlobs) => {
    if (atLimit) {
      toast.info(`Maximum ${MAX_CONTACT_IMAGES} photos allowed`);
      return;
    }
    setBusy(true);
    try {
      const blobs = await getBlobs();
      const room = MAX_CONTACT_IMAGES - images.length;
      const toUpload = blobs.slice(0, room);
      if (!toUpload.length) return;
      if (blobs.length > room) {
        toast.info(`Only ${room} more photo(s) allowed (max ${MAX_CONTACT_IMAGES})`);
      }
      const urls = [];
      for (const item of toUpload) {
        const url = await uploadBlob(item.blob, item.filename);
        urls.push(url);
      }
      setImages([...images, ...urls]);
      toast.success(urls.length === 1 ? "Image uploaded" : `${urls.length} images uploaded`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Image upload failed");
    } finally {
      setBusy(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    await addUrls(async () =>
      files.map((file) => ({ blob: file, filename: file.name || `upload-${Date.now()}.jpg` }))
    );
  };

  const handleCameraCapture = async (blob) => {
    await addUrls(async () => [{ blob, filename: `camera-${Date.now()}.jpg` }]);
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const captureTemplateFromDevice = async () => {
    if (typeof window !== "undefined" && window.BiometricBridge?.captureTemplate) {
      return window.BiometricBridge.captureTemplate();
    }
    throw new Error(
      "Biometric bridge not loaded. Refresh the page. Device + HID Authentication Device Client are required for live capture."
    );
  };

  const handleEnroll = async () => {
    if (!contact.contact_name && !contact.contact_phone) {
      return toast.error("Enter Name or Phone before enrolling a fingerprint");
    }
    setBusy(true);
    try {
      const template_data = await captureTemplateFromDevice();
      const res = await api.post("/biometric/enroll", {
        template_data,
        contact_name: contact.contact_name,
        contact_phone: contact.contact_phone,
        contact_cnic: contact.contact_cnic || null,
        device_vendor: window.BiometricBridge?.vendor || "digitalpersona",
      });
      update("biometric_id", res.data.biometric.id);
      update("biometric_verified_at", new Date().toISOString());
      toast.success("Fingerprint enrolled");
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Enroll failed. Connect the DigitalPersona device and try again."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="invoice-contact-block">
      <div className="invoice-contact-header">
        <h4>Contact Details</h4>
        <p>
          Optional CNIC, up to {MAX_CONTACT_IMAGES} photos (camera / upload), and fingerprint enroll.
          To verify a returning customer, use Inventory → Fingerprint Lookup.
        </p>
      </div>

      <div className="invoice-contact-grid">
        <div className="ic-field">
          <label>Name</label>
          <input
            type="text"
            className="rm-input-field"
            value={contact.contact_name || ""}
            onChange={(e) => update("contact_name", e.target.value)}
            disabled={disabled || busy}
            placeholder="Contact name"
          />
        </div>
        <div className="ic-field">
          <label>Phone No</label>
          <input
            type="text"
            className="rm-input-field"
            value={contact.contact_phone || ""}
            onChange={(e) => update("contact_phone", e.target.value)}
            disabled={disabled || busy}
            placeholder="03xx..."
          />
        </div>
        <div className="ic-field">
          <label>CNIC (optional)</label>
          <input
            type="text"
            className="rm-input-field"
            value={contact.contact_cnic || ""}
            onChange={(e) => update("contact_cnic", e.target.value)}
            disabled={disabled || busy}
            placeholder="xxxxx-xxxxxxx-x"
          />
        </div>
      </div>

      <div className="invoice-contact-actions">
        <button type="button" className="btn btn-secondary" onClick={handleEnroll} disabled={disabled || busy}>
          Enroll Fingerprint
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setCameraOpen(true)}
          disabled={disabled || busy || atLimit}
          title={atLimit ? `Max ${MAX_CONTACT_IMAGES} photos` : "Capture with camera"}
        >
          Capture Camera
        </button>
        <label
          className={`btn btn-secondary ic-upload-btn ${disabled || busy || atLimit ? "disabled" : ""}`}
          title={atLimit ? `Max ${MAX_CONTACT_IMAGES} photos` : "Upload images"}
        >
          Upload Image
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={handleFileUpload}
            disabled={disabled || busy || atLimit}
          />
        </label>
        <span className="ic-photo-count">
          Photos: {images.length}/{MAX_CONTACT_IMAGES}
        </span>
        {contact.biometric_id ? (
          <span className="ic-bio-badge">Fingerprint linked #{contact.biometric_id}</span>
        ) : null}
      </div>

      {images.length > 0 ? (
        <div className="ic-preview-grid">
          {images.map((url, index) => (
            <div className="ic-preview-item" key={`${url}-${index}`}>
              <img src={toSrc(url)} alt={`Contact ${index + 1}`} />
              <button
                type="button"
                className="btn btn-secondary ic-remove-btn"
                disabled={disabled || busy}
                onClick={() => removeImage(index)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <CameraCaptureModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCameraCapture}
      />
    </div>
  );
};

export default InvoiceContactBlock;
