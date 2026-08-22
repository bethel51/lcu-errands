import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Star, X, MessageSquare, Send } from "lucide-react";
import api from "../api";

const STAR_LABELS = ["", "Terrible 😞", "Poor 😕", "Okay 😐", "Good 😊", "Excellent 🌟"];

const ReviewModal = ({ errandId, isOpen, onClose, onSuccess, onReviewComplete }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setRating(0);
      setHoverRating(0);
      setComment("");
      setError("");
      setLoading(false);
      setSubmitted(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    const callback = onSuccess || onReviewComplete;
    if (callback) callback();
    onClose();
  };

  const handleSubmit = async () => {
    if (rating === 0) { setError("Please select a star rating first."); return; }
    setLoading(true);
    setError("");
    try {
      await api.post("/reviews", { errandId, rating, comment: comment.trim() });
      setSubmitted(true);
      setTimeout(() => {
        handleClose();
      }, 1600);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit review. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const activeRating = hoverRating || rating;

  const modal = (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !loading) handleClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(5px)",
        WebkitBackdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 16px",
        animation: "rmFadeIn 0.16s ease-out",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "#fff",
          borderRadius: 24,
          padding: "28px 24px 24px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.22)",
          animation: "rmSlideUp 0.2s cubic-bezier(0.34,1.4,0.64,1)",
          position: "relative",
        }}
      >
        {/* Close button */}
        {!loading && !submitted && (
          <button
            onClick={handleClose}
            style={{
              position: "absolute", top: 16, right: 16,
              width: 32, height: 32, borderRadius: "50%",
              border: "none", background: "#f1f5f9", color: "#64748b",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        )}

        {submitted ? (
          /* ── Success state ── */
          <div style={{ textAlign: "center", padding: "10px 0 6px" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: 12 }}>🎉</div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", margin: "0 0 8px", fontFamily: "Outfit, sans-serif" }}>
              Thanks for the feedback!
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500, margin: 0 }}>
              Your review helps improve the community.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 22 }}>
              <div style={{
                width: 58, height: 58, borderRadius: "50%",
                background: "linear-gradient(135deg, #fef3c7, #fde68a)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 14px", fontSize: "1.6rem",
              }}>
                ⭐
              </div>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: "0 0 4px", fontFamily: "Outfit, sans-serif" }}>
                Rate your Messenger
              </h2>
              <p style={{ fontSize: "0.81rem", color: "#64748b", fontWeight: 500, margin: 0 }}>
                How was your campus errand experience?
              </p>
            </div>

            {/* Stars */}
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 8 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => { setRating(star); setError(""); }}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    padding: 4, borderRadius: 8,
                    transition: "transform 0.12s ease",
                    transform: activeRating >= star ? "scale(1.2)" : "scale(1)",
                  }}
                >
                  <Star
                    size={38}
                    fill={activeRating >= star ? "#f59e0b" : "none"}
                    color={activeRating >= star ? "#f59e0b" : "#cbd5e1"}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </div>

            {/* Star label */}
            <div style={{
              textAlign: "center", height: 22, marginBottom: 18,
              fontSize: "0.85rem", fontWeight: 700,
              color: activeRating > 0 ? "#f59e0b" : "#94a3b8",
              transition: "color 0.15s",
            }}>
              {STAR_LABELS[activeRating] || "Tap a star to rate"}
            </div>

            {/* Comment */}
            <div style={{ marginBottom: 18 }}>
              <label style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: "0.82rem", fontWeight: 700, color: "#475569", marginBottom: 8,
              }}>
                <MessageSquare size={14} /> Leave a comment <span style={{ color: "#94a3b8", fontWeight: 500 }}>(optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="Tell others how it went..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                style={{
                  width: "100%", borderRadius: 12,
                  border: "1.5px solid #e2e8f0", padding: "10px 12px",
                  fontSize: "0.9rem", outline: "none", resize: "none",
                  boxSizing: "border-box", fontFamily: "inherit",
                  color: "#1e293b", background: "#f8fafc",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#6366f1"; e.target.style.background = "#fff"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc"; }}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10,
                padding: "10px 14px", fontSize: "0.8rem", color: "#dc2626",
                fontWeight: 600, marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: "100%", height: 50, borderRadius: 14,
                background: rating > 0
                  ? "linear-gradient(135deg, #6366f1, #818cf8)"
                  : "#e2e8f0",
                color: rating > 0 ? "#fff" : "#94a3b8",
                border: "none", fontWeight: 800, fontSize: "0.95rem",
                cursor: loading || rating === 0 ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: rating > 0 ? "0 4px 16px rgba(99,102,241,0.3)" : "none",
                transition: "background 0.2s, box-shadow 0.2s",
                marginBottom: 12,
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff", borderRadius: "50%",
                    animation: "rmSpin 0.7s linear infinite",
                  }} />
                  Submitting…
                </>
              ) : (
                <>
                  <Send size={17} />
                  Submit Review
                </>
              )}
            </button>

            {/* Skip */}
            <button
              onClick={handleClose}
              disabled={loading}
              style={{
                display: "block", width: "100%", padding: "8px",
                background: "none", border: "none",
                color: "#94a3b8", fontSize: "0.82rem", fontWeight: 600,
                cursor: "pointer", textAlign: "center",
              }}
            >
              Skip for now
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes rmFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes rmSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes rmSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  return createPortal(modal, document.body);
};

export default ReviewModal;

