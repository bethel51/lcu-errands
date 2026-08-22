import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Banknote, CheckCircle, Wallet, AlertCircle } from "lucide-react";
import PageContainer from "../components/PageContainer";
import api from "../api";
import { useToast } from "../context/ToastContext";

const CATEGORIES = ["Meals", "Shopping", "Academic", "Delivery", "Gates", "Other"];
const CATEGORY_EMOJI = {
  Meals: "🍽️",
  Shopping: "🛒",
  Academic: "📚",
  Delivery: "📦",
  Gates: "🚪",
  Other: "✨",
};
const CATEGORY_COLORS = {
  Meals: { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c", active: "#ea580c" },
  Shopping: { bg: "#fdf2f8", border: "#f9a8d4", text: "#be185d", active: "#db2777" },
  Academic: { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", active: "#2563eb" },
  Delivery: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d", active: "#16a34a" },
  Gates: { bg: "#f8fafc", border: "#e2e8f0", text: "#475569", active: "#64748b" },
  Other: { bg: "#f5f3ff", border: "#ddd6fe", text: "#7c3aed", active: "#8b5cf6" },
};

const PostErrand = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    fee: "",
    location: "",
    category: "Meals",
  });
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {}
    }
  }, []);

  const feeNum = Number(formData.fee) || 0;
  const userBalance = user?.balance || 0;
  const insufficientBalance = feeNum > 0 && userBalance < feeNum;

  const isFormValid =
    formData.title.trim().length > 0 &&
    formData.location.trim().length > 0 &&
    feeNum >= 100 &&
    !insufficientBalance;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid || submitting) return;

    setSubmitting(true);
    try {
      await api.post("/errands", {
        title: formData.title.trim(),
        description: formData.description.trim(),
        fee: feeNum,
        category: formData.category,
        dropoffLocation: formData.location.trim(),
        pickupLocation: "Campus",
      });

      showToast("🚀 Errand posted successfully!");
      navigate("/history");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to post errand. Check your balance.";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer
      title="Post New Errand"
      showHeader={true}
      showBack={true}
      onBack={() => navigate("/dashboard")}
      showNotification={false}
      showLive={false}
    >
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        style={{ maxWidth: 560, margin: "0 auto", paddingBottom: 40 }}
      >
        {/* Header Hero Banner */}
        <div
          style={{
            background: "linear-gradient(135deg, var(--blue-900), var(--blue-600))",
            borderRadius: 20,
            padding: "20px 24px",
            color: "var(--white)",
            marginBottom: 20,
            boxShadow: "0 10px 25px rgba(30,77,183,0.25)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 900, margin: 0, letterSpacing: "-0.3px" }}>
              Request a Messenger
            </h2>
            <p style={{ fontSize: "0.82rem", margin: "4px 0 0", opacity: 0.88, fontWeight: 500 }}>
              Connect with reliable Lead City messengers instantly
            </p>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(10px)",
              padding: "8px 14px",
              borderRadius: 14,
              textAlign: "right",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <span style={{ fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 800, opacity: 0.8, display: "block" }}>
              Wallet
            </span>
            <span style={{ fontSize: "1.05rem", fontWeight: 900 }}>
              ₦{userBalance.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Card 1: Errand Details */}
          <div
            style={{
              background: "var(--white)",
              borderRadius: 20,
              padding: 20,
              border: "1px solid var(--gray-200)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  color: "var(--gray-700)",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Task Title *
              </label>
              <input
                className="input-field"
                placeholder="e.g. Buy Lunch at J-One / Print Assignment"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                style={{ fontSize: "0.98rem", fontWeight: 700 }}
              />
            </div>

            {/* Category Selector */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  color: "var(--gray-700)",
                  marginBottom: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Select Category *
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {CATEGORIES.map((cat) => {
                  const c = CATEGORY_COLORS[cat];
                  const isActive = formData.category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat })}
                      style={{
                        padding: "12px 8px",
                        borderRadius: 16,
                        border: `2px solid ${isActive ? c.active : c.border}`,
                        background: isActive ? c.bg : "var(--gray-50)",
                        color: isActive ? c.active : "var(--gray-700)",
                        fontWeight: 800,
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        transition: "all 0.18s ease",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span style={{ fontSize: "1.4rem" }}>{CATEGORY_EMOJI[cat]}</span>
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card 2: Location & Reward */}
          <div
            style={{
              background: "var(--white)",
              borderRadius: 20,
              padding: 20,
              border: "1px solid var(--gray-200)",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  color: "var(--gray-700)",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                <MapPin size={14} color="var(--blue-600)" /> Drop-off Location *
              </label>
              <input
                className="input-field"
                placeholder="e.g. Block A, Room 202 / Senate Building"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
                style={{ fontSize: "0.95rem", fontWeight: 700 }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  color: "var(--gray-700)",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                <Banknote size={14} color="var(--green-600)" /> Messenger Reward (₦) *
              </label>
              <input
                className="input-field"
                type="number"
                placeholder="Min. ₦100"
                value={formData.fee}
                onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                required
                style={{ fontSize: "1.2rem", fontWeight: 900 }}
              />

              {/* Preset Chips */}
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                {["200", "500", "1000", "2000", "5000"].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setFormData({ ...formData, fee: amt })}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 20,
                      border: `1.5px solid ${formData.fee === amt ? "var(--blue-600)" : "var(--gray-200)"}`,
                      background: formData.fee === amt ? "var(--blue-50)" : "var(--gray-50)",
                      color: formData.fee === amt ? "var(--blue-700)" : "var(--gray-700)",
                      fontWeight: 800,
                      fontSize: "0.82rem",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    ₦{Number(amt).toLocaleString()}
                  </button>
                ))}
              </div>

              {/* Insufficient balance alert */}
              {insufficientBalance && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "10px 14px",
                    borderRadius: 14,
                    background: "var(--red-50)",
                    border: "1px solid var(--red-200)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "var(--red-700)",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                  }}
                >
                  <AlertCircle size={16} flexShrink={0} />
                  <span>
                    Insufficient balance (₦{userBalance.toLocaleString()}).{" "}
                    <button
                      type="button"
                      onClick={() => navigate("/top-up")}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--blue-700)",
                        fontWeight: 900,
                        textDecoration: "underline",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      Top Up Wallet
                    </button>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Notes */}
          <div
            style={{
              background: "var(--white)",
              borderRadius: 20,
              padding: 20,
              border: "1px solid var(--gray-200)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <label
              style={{
                display: "block",
                fontSize: "0.78rem",
                fontWeight: 800,
                color: "var(--gray-700)",
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Special Notes / Instructions (Optional)
            </label>
            <textarea
              className="input-field"
              style={{ minHeight: 90, resize: "none", fontSize: "0.92rem", lineHeight: 1.6 }}
              placeholder="e.g. Extra pepper on food, call when at gate..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={!isFormValid || submitting}
            style={{
              height: 54,
              borderRadius: 16,
              border: "none",
              background: isFormValid ? "var(--gradient-brand)" : "var(--gray-200)",
              color: isFormValid ? "var(--white)" : "var(--gray-400)",
              fontWeight: 900,
              fontSize: "1rem",
              cursor: isFormValid ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              boxShadow: isFormValid ? "0 6px 20px rgba(30,77,183,0.32)" : "none",
              transition: "all 0.2s ease",
              marginTop: 6,
            }}
          >
            {submitting ? (
              <>
                <div className="loader" style={{ width: 22, height: 22, borderTopColor: "#fff" }} />
                <span>Publishing Errand…</span>
              </>
            ) : (
              <>
                <span>🚀 Publish Errand</span>
              </>
            )}
          </button>
        </form>
      </motion.div>
    </PageContainer>
  );
};

export default PostErrand;
