import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X, ShieldCheck } from "lucide-react";
import api from "../api";
import { useToast } from "../context/ToastContext";

/* ─── Hold-to-confirm duration (ms) ─── */
const HOLD_DURATION = 1500;

const ConfirmDeliveryOverlay = ({ isOpen, errandId, errandTitle, errandFee, onClose, onSuccess }) => {
  const [processing, setProcessing] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [done, setDone] = useState(false);
  const { showToast } = useToast();

  const rafRef = useRef(null);
  const startTimeRef = useRef(null);
  const holdingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      setHoldProgress(0);
      setHolding(false);
      setDone(false);
      setProcessing(false);
      holdingRef.current = false;
      cancelAnimationFrame(rafRef.current);
    }
  }, [isOpen]);

  const triggerRelease = useCallback(async (id) => {
    setProcessing(true);
    try {
      const res = await api.patch(`/errands/${id}/complete`);
      const msg = res.data?.message || "✅ Payment released! Messenger has been paid.";
      showToast(msg);
      onSuccess?.(id);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Request failed.";
      showToast(`❌ ${msg}`, "error");
      setDone(false);
      setHoldProgress(0);
    } finally {
      setProcessing(false);
    }
  }, [errandId, showToast, onSuccess]);

  const startHold = useCallback((e) => {
    if (processing || done) return;
    e.preventDefault();
    holdingRef.current = true;
    setHolding(true);
    startTimeRef.current = performance.now();

    const tick = (now) => {
      if (!holdingRef.current) return;
      const elapsed = now - startTimeRef.current;
      const pct = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setHoldProgress(pct);
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        holdingRef.current = false;
        setHolding(false);
        setDone(true);
        triggerRelease(errandId);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [processing, done, errandId, triggerRelease]);

  const endHold = useCallback(() => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    setHolding(false);
    cancelAnimationFrame(rafRef.current);
    setHoldProgress(0);
  }, []);

  if (!isOpen) return null;

  const overlay = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !processing) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 16px",
        animation: "cdFadeIn 0.18s ease-out",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "#fff",
          borderRadius: 24,
          padding: "28px 24px 24px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
          animation: "cdSlideUp 0.22s cubic-bezier(0.34,1.4,0.64,1)",
          position: "relative",
        }}
      >
        {/* Close button */}
        {!processing && (
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "none",
              background: "#f1f5f9",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        )}

        {/* Icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #d1fae5, #a7f3d0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 18px",
            fontSize: "1.8rem",
          }}
        >
          {processing ? "⏳" : "💸"}
        </div>

        {/* Title */}
        <h2
          style={{
            textAlign: "center",
            fontSize: "1.2rem",
            fontWeight: 800,
            color: "#0f172a",
            margin: "0 0 4px",
            fontFamily: "Outfit, sans-serif",
          }}
        >
          {processing ? "Releasing Payment…" : "Confirm Delivery"}
        </h2>
        <p
          style={{
            textAlign: "center",
            fontSize: "0.82rem",
            color: "#64748b",
            margin: "0 0 20px",
            fontWeight: 500,
          }}
        >
          {processing
            ? "Please wait, this only takes a moment"
            : "Confirm you've received your item to pay the messenger"}
        </p>

        {/* Errand info card */}
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: "12px 16px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#1e293b", flexShrink: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {errandTitle || "Errand"}
          </div>
          <div
            style={{
              fontSize: "1.1rem",
              fontWeight: 900,
              color: "#16a34a",
              background: "#dcfce7",
              padding: "4px 12px",
              borderRadius: 99,
              flexShrink: 0,
            }}
          >
            ₦{(errandFee || 0).toLocaleString()}
          </div>
        </div>

        {/* Warning */}
        {!processing && (
          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: "0.79rem",
              color: "#92400e",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              marginBottom: 22,
            }}
          >
            <AlertTriangle size={17} style={{ flexShrink: 0, color: "#d97706", marginTop: 1 }} />
            <span>
              Once confirmed, <strong>₦{(errandFee || 0).toLocaleString()}</strong> is permanently
              released from escrow to the messenger. This cannot be reversed.
            </span>
          </div>
        )}

        {/* Processing spinner */}
        {processing && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              marginBottom: 22,
              padding: "8px 0",
            }}
          >
            <div style={{
              width: 36,
              height: 36,
              border: "3px solid rgba(22,163,74,0.2)",
              borderTopColor: "#16a34a",
              borderRadius: "50%",
              animation: "cdSpin 0.8s linear infinite",
            }} />
            <span style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 500 }}>
              Transferring funds to messenger…
            </span>
          </div>
        )}

        {/* ── Hold-to-confirm button ── */}
        {!processing && (
          <>
            <div
              onMouseDown={startHold}
              onMouseUp={endHold}
              onMouseLeave={endHold}
              onTouchStart={startHold}
              onTouchEnd={endHold}
              onTouchCancel={endHold}
              style={{
                position: "relative",
                width: "100%",
                height: 54,
                borderRadius: 16,
                background: "#16a34a",
                cursor: "pointer",
                overflow: "hidden",
                userSelect: "none",
                WebkitUserSelect: "none",
                marginBottom: 10,
                boxShadow: holding
                  ? "0 8px 28px rgba(22,163,74,0.45)"
                  : "0 4px 16px rgba(22,163,74,0.25)",
                transition: "box-shadow 0.15s",
              }}
            >
              {/* Progress fill */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  bottom: 0,
                  background: "rgba(255,255,255,0.22)",
                  width: `${holdProgress}%`,
                  transition: holding ? "none" : "width 0.25s ease-out",
                  borderRadius: 16,
                }}
              />
              {/* Label */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: "0.93rem",
                  fontFamily: "Outfit, sans-serif",
                  pointerEvents: "none",
                }}
              >
                <ShieldCheck size={19} />
                {holding
                  ? `Hold… ${Math.round(holdProgress)}%`
                  : "Hold to Confirm & Release"}
              </div>
            </div>

            <p
              style={{
                textAlign: "center",
                fontSize: "0.74rem",
                color: "#94a3b8",
                margin: "0 0 4px",
                fontWeight: 500,
              }}
            >
              Press and hold the button above to release payment
            </p>

            <button
              onClick={onClose}
              style={{
                display: "block",
                width: "100%",
                padding: "10px",
                marginTop: 6,
                background: "none",
                border: "none",
                color: "#94a3b8",
                fontSize: "0.84rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Not yet, cancel
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes cdFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes cdSlideUp {
          from { opacity: 0; transform: translateY(28px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes cdSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  return createPortal(overlay, document.body);
};

export default ConfirmDeliveryOverlay;
