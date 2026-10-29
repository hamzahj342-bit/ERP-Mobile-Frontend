import React, { useRef, useState } from "react";
import { FaBarcode } from "react-icons/fa";
import { toast } from "react-toastify";
import {
  RAM_OPTIONS,
  ROM_OPTIONS,
  CONDITION_OPTIONS,
} from "../constants/mobileDeviceOptions";
import "./DeviceLineFields.css";

/**
 * Per-phone fields under each transaction line.
 * fieldsLocked: when phone unit picked from stock — IMEI/specs autofilled read-only.
 *
 * USB barcode / IMEI scanners act as a keyboard: click Scan → focus field → scan.
 * Scanner usually ends with Enter; we capture that so the form does not submit.
 */
const DeviceLineFields = ({ row, index, onChange, disabled = false, fieldsLocked = false }) => {
  const set = (field, value) => onChange(index, field, value);
  const lock = disabled || fieldsLocked;
  const imei1Ref = useRef(null);
  const imei2Ref = useRef(null);
  const [scanTarget, setScanTarget] = useState(null);

  const startScan = (field) => {
    if (lock) return;
    setScanTarget(field);
    set(field, "");
    const ref = field === "imei1" ? imei1Ref : imei2Ref;
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.select?.();
    });
    toast.info(field === "imei1" ? "Scan IMEI 1 now…" : "Scan IMEI 2 now…", {
      autoClose: 2500,
    });
  };

  const finishScan = (field, rawValue) => {
    const val = String(rawValue || "").trim();
    set(field, val);
    setScanTarget(null);
    if (field === "imei1" && val && !lock) {
      imei2Ref.current?.focus();
    }
  };

  const handleImeiKeyDown = (e, field) => {
    // Hardware scanners send digits then Enter
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      finishScan(field, e.target.value);
    }
  };

  const handleImeiChange = (e, field) => {
    // Strip accidental whitespace mid-scan; keep digits/letters as scanned
    set(field, e.target.value.replace(/\s+/g, ""));
  };

  const handleImeiBlur = () => {
    // Leave scan highlight shortly after leaving field
    setTimeout(() => setScanTarget(null), 150);
  };

  return (
    <div className="device-line-fields">
      {fieldsLocked ? (
        <p className="device-line-hint">
          Device specs filled from selected stock unit (IMEI). Enter sale price above.
        </p>
      ) : (
        <p className="device-line-hint">
          Type IMEI or click <strong>Scan</strong> and use a USB barcode / IMEI scanner.
        </p>
      )}
      <div className="device-line-grid">
        <div className="device-field">
          <label>
            IMEI 1 <span className="req">*</span>
          </label>
          <div className={`imei-scan-wrap ${scanTarget === "imei1" ? "scanning" : ""}`}>
            <input
              ref={imei1Ref}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              className="rm-input-field imei-scan-input"
              placeholder={scanTarget === "imei1" ? "Ready — scan now…" : "IMEI 1 or scan"}
              value={row.imei1 || ""}
              onChange={(e) => handleImeiChange(e, "imei1")}
              onKeyDown={(e) => handleImeiKeyDown(e, "imei1")}
              onBlur={handleImeiBlur}
              disabled={lock}
              required
            />
            {!lock ? (
              <button
                type="button"
                className="imei-scan-btn"
                title="Scan with barcode / IMEI scanner"
                onClick={() => startScan("imei1")}
              >
                <FaBarcode />
                <span>Scan</span>
              </button>
            ) : null}
          </div>
        </div>
        <div className="device-field">
          <label>IMEI 2</label>
          <div className={`imei-scan-wrap ${scanTarget === "imei2" ? "scanning" : ""}`}>
            <input
              ref={imei2Ref}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              className="rm-input-field imei-scan-input"
              placeholder={scanTarget === "imei2" ? "Ready — scan now…" : "Optional / scan"}
              value={row.imei2 || ""}
              onChange={(e) => handleImeiChange(e, "imei2")}
              onKeyDown={(e) => handleImeiKeyDown(e, "imei2")}
              onBlur={handleImeiBlur}
              disabled={lock}
            />
            {!lock ? (
              <button
                type="button"
                className="imei-scan-btn"
                title="Scan with barcode / IMEI scanner"
                onClick={() => startScan("imei2")}
              >
                <FaBarcode />
                <span>Scan</span>
              </button>
            ) : null}
          </div>
        </div>
        <div className="device-field">
          <label>RAM</label>
          <select
            className="rm-input-field"
            value={row.ram || ""}
            onChange={(e) => set("ram", e.target.value)}
            disabled={lock}
          >
            <option value="">Select RAM</option>
            {RAM_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div className="device-field">
          <label>ROM</label>
          <select
            className="rm-input-field"
            value={row.rom || ""}
            onChange={(e) => set("rom", e.target.value)}
            disabled={lock}
          >
            <option value="">Select ROM</option>
            {ROM_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div className="device-field">
          <label>Color</label>
          <input
            type="text"
            className="rm-input-field"
            placeholder="e.g. Black"
            value={row.color || ""}
            onChange={(e) => set("color", e.target.value)}
            disabled={lock}
          />
        </div>
        <div className="device-field">
          <label>Condition</label>
          <select
            className="rm-input-field"
            value={row.condition || ""}
            onChange={(e) => set("condition", e.target.value)}
            disabled={lock}
          >
            <option value="">Select Condition</option>
            {CONDITION_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default DeviceLineFields;
