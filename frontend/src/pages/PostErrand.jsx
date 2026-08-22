import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Banknote, CheckCircle, Wallet, AlertCircle, ArrowLeft } from "lucide-react";
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

  const titleRef = useRef(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {}
    }
    // Auto-focus title input on entry
    const t = setTimeout(() => titleRef.current?.focus(), 300);
    return () => clearTimeout(t);
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

      showToast("🚀 Errand published successfully!");
      navigate("/history");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to publish errand. Check your balance.";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 320, mass: 0.8 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "var(--gray-50)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        height: "100dvh",
        width: "100vw",
        overflow: "hidden",
      }}
    >
      {/* ── Cupertino Native Top Bar ── */}
      <div
        style={{
          height: 64,
          padding: "0 16px",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--gray-200)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            border: "1px solid var(--gray-200)",
            background: "var(--gray-50)",
            color: "var(--gray-700)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <h1
          style={{
            fontSize: "1.1rem",
            fontWeight: 900,
            color: "var(--gray-900)",
            margin: 0,
            fontFamily: "Outfit, sans-serif",
            letterSpacing: "-0.3px",
          }}
        >
          New Errand
        </h1>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 12px",
            borderRadius: 20,
            background: "var(--blue-50)",
            border: "1px solid var(--blue-100)",
            color: "var(--blue-700)",
            fontWeight: 800,
            fontSize: "0.8rem",
          }}
        >
          <Wallet size={14} />
          ₦{userBalance.toLocaleString()}
        </div>
      </div>

      {/* ── Scrollable Form Area ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          padding: "20px 16px 120px",
        }}
      >
        <div style={{ maxWidth: 540, margin: "0 auto" }}>
          {/* Header Banner */}
          <div
            style={{
              background: "linear-gradient(135deg, var(--blue-900), var(--blue-600))",
              borderRadius: 20,
              padding: "18px 20px",
              color: "var(--white)",
              marginBottom: 18,
              boxShadow: "0 10px 24px rgba(30,77,183,0.22)",
            }}
          >
            <h2 style={{ fontSize: "1.15rem", fontWeight: 900, margin: 0, letterSpacing: "-0.2px" }}>
              Request a Messenger
            </h2>
            <p style={{ fontSize: "0.8rem", margin: "4px 0 0", opacity: 0.88, fontWeight: 500 }}>
              Dispatch an errand to available Lead City student messengers
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Card 1: Task Title & Category */}
            <div
              style={{
                background: "var(--white)",
                borderRadius: 20,
                padding: 18,
                border: "1px solid var(--gray-200)",
                boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
              }}
            >
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.76rem",
                    fontWeight: 800,
                    color: "var(--gray-600)",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Task Title *
                </label>
                <input
                  ref={titleRef}
                  className="input-field"
                  placeholder="e.g. Buy Lunch at J-One / Print Assignment"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  style={{ fontSize: "0.98rem", fontWeight: 700 }}
                />
              </div>

              {/* Category Grid */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.76rem",
                    fontWeight: 800,
                    color: "var(--gray-600)",
                    marginBottom: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Category *
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {CATEGORIES.map((cat) => {
                    const c = CATEGORY_COLORS[cat];
                    const isActive = formData.category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat })}
                        style={{
                          padding: "12px 6px",
                          borderRadius: 16,
                          border: `2px solid ${isActive ? c.active : c.border}`,
                          background: isActive ? c.bg : "var(--gray-50)",
                          color: isActive ? c.active : "var(--gray-700)",
                          fontWeight: 800,
                          fontSize: "0.8rem",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <span style={{ fontSize: "1.35rem" }}>{CATEGORY_EMOJI[cat]}</span>
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Card 2: Drop-off Location & Reward */}
            <div
              style={{
                background: "var(--white)",
                borderRadius: 20,
                padding: 18,
                border: "1px solid var(--gray-200)",
                boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
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
                    fontSize: "0.76rem",
                    fontWeight: 800,
                    color: "var(--gray-600)",
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
                    fontSize: "0.76rem",
                    fontWeight: 800,
                    color: "var(--gray-600)",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  <Banknote size={14} color="var(--green-600)" /> Reward Amount (₦) *
                </label>
                <input
                  className="input-field"
                  type="number"
                  placeholder="Min. ₦100"
                  value={formData.fee}
                  onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                  required
                  style={{ fontSize: "1.18rem", fontWeight: 900 }}
                />

                {/* Preset Chips */}
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  {["200", "500", "1000", "2000", "5000"].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setFormData({ ...formData, fee: amt })}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 20,
                        border: `1.5px solid ${formData.fee === amt ? "var(--blue-600)" : "var(--gray-200)"}`,
                        background: formData.fee === amt ? "var(--blue-50)" : "var(--gray-50)",
                        color: formData.fee === amt ? "var(--blue-700)" : "var(--gray-700)",
                        fontWeight: 800,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      ₦{Number(amt).toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 3: Instructions */}
            <div
              style={{
                background: "var(--white)",
                borderRadius: 20,
                padding: 18,
                border: "1px solid var(--gray-200)",
                boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
              }}
            >
              <label
                style={{
                  display: "block",
                  fontSize: "0.76rem",
                  fontWeight: 800,
                  color: "var(--gray-600)",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Special Instructions (Optional)
              </label>
              <textarea
                className="input-field"
                style={{ minHeight: 90, resize: "none", fontSize: "0.92rem", lineHeight: 1.6 }}
                placeholder="Specific items, quantities, or instructions…"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </form>
        </div>
      </div>

      {/* ── Fixed Bottom Sticky Action Bar ── */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "rgba(255, 255, 255, 0.96)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderTop: "1px solid var(--gray-200)",
          padding: "12px 16px calc(12px + env(safe-area-inset-bottom, 12px))",
          boxShadow: "0 -8px 24px rgba(0,0,0,0.08)",
          zIndex: 100000,
        }}
      >
        <div style={{ maxWidth: 540, margin: "0 auto" }}>
          {insufficientBalance && (
            <div
              style={{
                marginBottom: 10,
                padding: "8px 12px",
                borderRadius: 12,
                background: "var(--red-50)",
                border: "1px solid var(--red-200)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                color: "var(--red-700)",
                fontSize: "0.8rem",
                fontWeight: 700,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <AlertCircle size={15} />
                <span>Insufficient balance (₦{userBalance.toLocaleString()})</span>
              </div>
              <button
                type="button"
                onClick={() => navigate("/top-up")}
                style={{
                  background: "var(--red-600)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "4px 10px",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Top Up
              </button>
            </div>
          )}

          <motion.button
            whileTap={isFormValid ? { scale: 0.98 } : {}}
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid || submitting}
            style={{
              width: "100%",
              height: 52,
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
              gap: 8,
              boxShadow: isFormValid ? "0 6px 20px rgba(30,77,183,0.32)" : "none",
              transition: "all 0.18s ease",
            }}
          >
            {submitting ? (
              <>
                <div className="loader" style={{ width: 22, height: 22, borderTopColor: "#fff" }} />
                <span>Publishing Errand…</span>
              </>
            ) : (
              <span>🚀 Publish Errand</span>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default PostErrand;
