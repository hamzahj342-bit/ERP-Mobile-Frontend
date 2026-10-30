import React, { useRef, useState } from "react";
import { FaBarcode } from "react-icons/fa";
import { toast } from "react-toastify";
import "./ModelImeiScanBtn.css";

/**
 * Scan button beside model select — USB wedge scanners type into a focused field + Enter.
 * onScanned(imeiString) is called when a scan completes.
 */
const ModelImeiScanBtn = ({ onScanned, disabled = false, title = "Scan IMEI to select phone" }) => {
  const inputRef = useRef(null);
  const [scanning, setScanning] = useState(false);

  const start = () => {
    if (disabled) return;
    setScanning(true);
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.value = "";
        inputRef.current.focus();
        inputRef.current.select?.();
      }
    });
    toast.info("Scan phone IMEI…", { autoClose: 2500 });
  };

  const finish = (raw) => {
    const imei = String(raw || "").replace(/\s+/g, "").trim();
    setScanning(false);
    if (inputRef.current) inputRef.current.value = "";
    if (!imei) return;
    onScanned?.(imei);
  };

  return (
    <div className={`model-imei-scan${scanning ? " is-scanning" : ""}`}>
      <button
        type="button"
        className="model-imei-scan-btn"
        title={title}
        disabled={disabled}
        onClick={start}
      >
        <FaBarcode />
      </button>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className="model-imei-scan-input"
        aria-label="IMEI scan"
        tabIndex={scanning ? 0 : -1}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            finish(e.target.value);
          }
        }}
        onBlur={() => {
          setTimeout(() => setScanning(false), 150);
        }}
        onChange={(e) => {
          e.target.value = e.target.value.replace(/\s+/g, "");
        }}
      />
    </div>
  );
};

export default ModelImeiScanBtn;
