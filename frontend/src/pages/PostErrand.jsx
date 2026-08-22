import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { X, MapPin, Banknote, Wallet, AlertCircle } from "lucide-react";
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
  Gates: { bg: "#f8fafc", border: "#cbd5e1", text: "#334155", active: "#475569" },
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
  // Hydrate user instantly from localStorage — no blank balance
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  });

  const titleRef = useRef(null);

  useEffect(() => {
    // Background revalidate to get fresh balance
    api.get("/users/profile")
      .then((res) => {
        setUser(res.data);
        localStorage.setItem("user", JSON.stringify(res.data));
      })
      .catch(console.error);
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

      // Invalidate errand stream cache so it reloads with the new errand
      localStorage.removeItem("errand_stream_cache");

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
        background: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        height: "100dvh",
        width: "100vw",
        overflow: "hidden",
      }}
    >
      {/* ── Ultra Bright Solid White Top Bar ── */}
      <div
        style={{
          height: 64,
          padding: "0 16px",
          background: "#FFFFFF",
          borderBottom: "1.5px solid #E2E8F0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04)",
        }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "1.5px solid #CBD5E1",
            background: "#F8FAFC",
            color: "#0F172A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          aria-label="Close"
        >
          <X size={20} color="#0F172A" />
        </button>

        <h1
          style={{
            fontSize: "1.15rem",
            fontWeight: 900,
            color: "#0F172A",
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
            gap: 6,
            padding: "6px 14px",
            borderRadius: 20,
            background: "#EFF6FF",
            border: "1.5px solid #BFDBFE",
            color: "#1D4ED8",
            fontWeight: 800,
            fontSize: "0.82rem",
          }}
        >
          <Wallet size={15} color="#1D4ED8" />
          ₦{userBalance.toLocaleString()}
        </div>
      </div>

      {/* ── Scrollable Form Area with Vibrant Crisp Contrast ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          padding: "20px 16px 130px",
          background: "#F8FAFC",
        }}
      >
        <div style={{ maxWidth: 540, margin: "0 auto" }}>
          {/* Vibrant Gradient Banner */}
          <div
            style={{
              background: "linear-gradient(135deg, #1E4DB7, #2563EB)",
              borderRadius: 20,
              padding: "20px 22px",
              color: "#FFFFFF",
              marginBottom: 20,
              boxShadow: "0 10px 28px rgba(37,99,235,0.28)",
            }}
          >
            <h2 style={{ fontSize: "1.2rem", fontWeight: 900, margin: 0, letterSpacing: "-0.2px", color: "#FFFFFF" }}>
              Request a Messenger
            </h2>
            <p style={{ fontSize: "0.82rem", margin: "4px 0 0", color: "#DBEAFE", fontWeight: 600 }}>
              Dispatch an errand to available Lead City student messengers
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Card 1: Task Title & Category */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 20,
                padding: 20,
                border: "1.5px solid #E2E8F0",
                boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
              }}
            >
              <div style={{ marginBottom: 18 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    color: "#475569",
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
                  style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    background: "#FFFFFF",
                    border: "1.5px solid #CBD5E1",
                    color: "#0F172A",
                  }}
                />
              </div>

              {/* Category Grid */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    color: "#475569",
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
                          padding: "14px 8px",
                          borderRadius: 16,
                          border: `2px solid ${isActive ? c.active : c.border}`,
                          background: isActive ? c.bg : "#FFFFFF",
                          color: isActive ? c.active : "#334155",
                          fontWeight: 800,
                          fontSize: "0.82rem",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 6,
                          boxShadow: isActive ? "0 4px 14px rgba(0,0,0,0.06)" : "none",
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

            {/* Card 2: Drop-off Location & Reward */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 20,
                padding: 20,
                border: "1.5px solid #E2E8F0",
                boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
                display: "flex",
                flexDirection: "column",
                gap: 18,
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
                    color: "#475569",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  <MapPin size={15} color="#2563EB" /> Drop-off Location *
                </label>
                <input
                  className="input-field"
                  placeholder="e.g. Block A, Room 202 / Senate Building"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                  style={{
                    fontSize: "0.98rem",
                    fontWeight: 700,
                    background: "#FFFFFF",
                    border: "1.5px solid #CBD5E1",
                    color: "#0F172A",
                  }}
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
                    color: "#475569",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  <Banknote size={15} color="#16A34A" /> Reward Amount (₦) *
                </label>
                <input
                  className="input-field"
                  type="number"
                  placeholder="Min. ₦100"
                  value={formData.fee}
                  onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                  required
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 900,
                    background: "#FFFFFF",
                    border: "1.5px solid #CBD5E1",
                    color: "#0F172A",
                  }}
                />

                {/* Preset Chips */}
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  {["200", "500", "1000", "2000", "5000"].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setFormData({ ...formData, fee: amt })}
                      style={{
                        padding: "7px 14px",
                        borderRadius: 20,
                        border: `1.5px solid ${formData.fee === amt ? "#2563EB" : "#CBD5E1"}`,
                        background: formData.fee === amt ? "#EFF6FF" : "#FFFFFF",
                        color: formData.fee === amt ? "#1D4ED8" : "#334155",
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
              </div>
            </div>

            {/* Card 3: Instructions */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 20,
                padding: 20,
                border: "1.5px solid #E2E8F0",
                boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
              }}
            >
              <label
                style={{
                  display: "block",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  color: "#475569",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Special Instructions (Optional)
              </label>
              <textarea
                className="input-field"
                style={{
                  minHeight: 90,
                  resize: "none",
                  fontSize: "0.95rem",
                  lineHeight: 1.6,
                  background: "#FFFFFF",
                  border: "1.5px solid #CBD5E1",
                  color: "#0F172A",
                }}
                placeholder="Specific items, quantities, or instructions…"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </form>
        </div>
      </div>

      {/* ── Solid White Bottom Sticky Action Bar ── */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#FFFFFF",
          borderTop: "1.5px solid #E2E8F0",
          padding: "14px 16px calc(14px + env(safe-area-inset-bottom, 14px))",
          boxShadow: "0 -10px 30px rgba(0,0,0,0.06)",
          zIndex: 100000,
        }}
      >
        <div style={{ maxWidth: 540, margin: "0 auto" }}>
          {insufficientBalance && (
            <div
              style={{
                marginBottom: 12,
                padding: "10px 14px",
                borderRadius: 14,
                background: "#FEF2F2",
                border: "1.5px solid #FECACA",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                color: "#991B1B",
                fontSize: "0.82rem",
                fontWeight: 800,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <AlertCircle size={16} color="#DC2626" />
                <span>Insufficient balance (₦{userBalance.toLocaleString()})</span>
              </div>
              <button
                type="button"
                onClick={() => navigate("/top-up")}
                style={{
                  background: "#DC2626",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 10,
                  padding: "5px 12px",
                  fontSize: "0.78rem",
                  fontWeight: 900,
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
              height: 54,
              borderRadius: 16,
              border: "none",
              background: isFormValid ? "linear-gradient(135deg, #1E4DB7, #2563EB)" : "#E2E8F0",
              color: isFormValid ? "#FFFFFF" : "#94A3B8",
              fontWeight: 900,
              fontSize: "1.02rem",
              cursor: isFormValid ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: isFormValid ? "0 8px 24px rgba(37,99,235,0.35)" : "none",
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
