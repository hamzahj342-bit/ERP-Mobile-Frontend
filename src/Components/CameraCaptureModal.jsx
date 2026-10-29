import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

/**
 * Capture a still from the laptop / attached webcam via getUserMedia.
 */
const CameraCaptureModal = ({ open, onClose, onCapture }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch (err) {
        console.error(err);
        toast.error("Camera not available. Allow permission or attach a webcam.");
        onClose();
      }
    };
    start();

    return () => {
      cancelled = true;
      setReady(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [open, onClose]);

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error("Failed to capture image");
          return;
        }
        onCapture(blob);
        onClose();
      },
      "image/jpeg",
      0.9
    );
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.55)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 16,
          width: "min(520px, 96vw)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
        }}
      >
        <h3 style={{ margin: "0 0 12px", fontSize: "1.05rem" }}>Camera Capture</h3>
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            width: "100%",
            borderRadius: 8,
            background: "#0f172a",
            minHeight: 240,
            objectFit: "cover",
          }}
        />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="save-btn" onClick={takePhoto} disabled={!ready}>
            Capture Photo
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameraCaptureModal;
