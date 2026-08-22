import { useState } from "react";
import { Star, MessageSquare } from "lucide-react";
import api from "../api";
import BottomSheet from "./BottomSheet";

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
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Rate Experience"
      subtitle="How was your campus errand experience?"
    >
      <form onSubmit={handleSubmit} style={{ padding: "10px 0 20px" }}>
        {error && (
          <div
            style={{
              color: "var(--red-500)",
              background: "var(--red-50)",
              padding: 12,
              borderRadius: "var(--radius-md)",
              marginBottom: 16,
              fontSize: "0.88rem",
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: "var(--amber-50)",
              color: "var(--amber-500)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Star size={28} fill="var(--amber-500)" />
          </div>

          <p style={{ color: "var(--gray-600)", marginBottom: 14, fontWeight: 700, fontSize: "0.95rem" }}>
            Tap stars to rate
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
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
                  padding: 2,
                  transition: "transform 0.15s ease",
                  transform: (hoverRating || rating) >= star ? "scale(1.15)" : "scale(1)",
                }}
              >
                <Star
                  size={36}
                  fill={(hoverRating || rating) >= star ? "var(--amber-400)" : "none"}
                  color={(hoverRating || rating) >= star ? "var(--amber-400)" : "var(--gray-300)"}
                  strokeWidth={2}
                />
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.85rem",
              fontWeight: 700,
              color: "var(--gray-700)",
              marginBottom: 8,
            }}
          >
            <MessageSquare size={16} /> Feedback (Optional)
          </label>
          <textarea
            rows={3}
            placeholder="Tell others how it went..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{
              width: "100%",
              borderRadius: "var(--radius-lg)",
              border: "1.5px solid var(--gray-300)",
              padding: 12,
              fontSize: "0.95rem",
              outline: "none",
              resize: "none",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            height: 48,
            borderRadius: "var(--radius-lg)",
            background: "var(--gradient-brand)",
            color: "var(--white)",
            border: "none",
            fontWeight: 800,
            fontSize: "0.95rem",
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: "0 4px 14px rgba(30,77,183,0.3)",
          }}
        >
          {loading ? "Submitting..." : "Submit Review"}
        </button>
      </form>
    </BottomSheet>
  );
};

export default ReviewModal;
