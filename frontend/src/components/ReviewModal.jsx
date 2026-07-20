import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X, MessageSquare } from "lucide-react";
import api from "../api";

const ReviewModal = ({
  errandId,
  isOpen,
  onClose,
  onSuccess,
  onReviewComplete,
}) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.post("/reviews", { errandId, rating, comment });
      const callback = onSuccess || onReviewComplete;
      if (callback) callback();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="modal-overlay-responsive"
          onClick={onClose}
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bottom-sheet-responsive"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              width: "100%",
              maxWidth: 450,
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px 20px 32px",
              boxShadow: "0 -10px 40px rgba(0,0,0,0.1)",
              position: "relative",
            }}
          >
            {/* Mobile Drag Handle */}
            <div
              className="mobile-drag-handle"
              style={{
                width: 40,
                height: 5,
                background: "var(--gray-200)",
                borderRadius: 10,
                margin: "0 auto 20px",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    background: "var(--amber-50)",
                    color: "var(--amber-500)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Star size={24} fill="var(--amber-500)" />
                </div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>
                  Rate Experience
                </h2>
              </div>
              <button onClick={onClose} className="btn-icon">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {error && (
                <div
                  style={{
                    color: "var(--red-500)",
                    background: "var(--red-50)",
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 16,
                    fontSize: "0.9rem",
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <p
                  style={{
                    color: "var(--gray-500)",
                    marginBottom: 16,
                    fontWeight: 600,
                  }}
                >
                  How would you rate the service?
                </p>
                <div
                  style={{ display: "flex", justifyContent: "center", gap: 12 }}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        transition: "transform 0.2s",
                      }}
                    >
                      <Star
                        size={40}
                        fill={
                          (hoverRating || rating) >= star
                            ? "var(--amber-400)"
                            : "none"
                        }
                        color={
                          (hoverRating || rating) >= star
                            ? "var(--amber-400)"
                            : "var(--gray-300)"
                        }
                        strokeWidth={2}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label
                  className="form-label"
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <MessageSquare size={16} /> Share your feedback (Optional)
                </label>
                <textarea
                  className="input-field"
                  rows={4}
                  placeholder="Tell others about your experience..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  style={{ resize: "none" }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%", padding: 14 }}
                disabled={loading}
              >
                {loading ? "Submitting..." : "Submit Review"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ReviewModal;
