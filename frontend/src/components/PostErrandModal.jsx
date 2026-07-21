import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, MapPin, Banknote, CheckCircle } from "lucide-react";

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

const STEPS = ["Task", "Where & Pay", "Details"];

const PostErrandModal = ({ isOpen, onClose, onSubmit, isProcessing }) => {
  const [step, setStep] = useState(0); // 0, 1, 2
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    fee: "",
    location: "",
    category: "Meals",
  });

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setSubmitted(false);
      setFormData({ title: "", description: "", fee: "", location: "", category: "Meals" });
    }
  }, [isOpen]);

  // Auto-submit when isProcessing goes from true to false after step 2
  useEffect(() => {
    if (submitted && !isProcessing) {
      // Show success for 1.5s then close
      const t = setTimeout(() => {
        onClose();
        setSubmitted(false);
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [submitted, isProcessing, onClose]);

  const handleNext = () => {
    if (step === 0 && !formData.title.trim()) return;
    if (step === 1 && (!formData.location.trim() || !formData.fee)) return;
    if (step === 2) {
      // AUTO SUBMIT
      setSubmitted(true);
      onSubmit(formData);
      return;
    }
    setStep((s) => s + 1);
  };

  const step0Valid = formData.title.trim().length > 0;
  const step1Valid = formData.location.trim().length > 0 && Number(formData.fee) >= 100;
  const step2Valid = true; // description is optional

  const canProceed = step === 0 ? step0Valid : step === 1 ? step1Valid : step2Valid;

  const overlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="post-errand-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={overlayClick}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10,10,30,0.55)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px 16px",
          }}
        >
          <motion.div
            key="post-errand-card"
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 22, stiffness: 320 }}
            style={{
              background: "#ffffff",
              borderRadius: 28,
              width: "100%",
              maxWidth: 460,
              overflow: "hidden",
              boxShadow: "0 32px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.06)",
              position: "relative",
            }}
          >
            {/* ── Success overlay ── */}
            <AnimatePresence>
              {submitted && !isProcessing && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 10,
                    borderRadius: 28,
                    gap: 12,
                  }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 12, stiffness: 260, delay: 0.1 }}
                  >
                    <CheckCircle size={64} color="#2563eb" strokeWidth={1.5} />
                  </motion.div>
                  <p style={{ fontWeight: 900, fontSize: "1.3rem", color: "#1d4ed8", margin: 0 }}>Errand Posted!</p>
                  <p style={{ fontSize: "0.88rem", color: "#60a5fa", margin: 0, fontWeight: 600 }}>Messengers will see it shortly</p>
                </motion.div>
              )}
              {submitted && isProcessing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(255,255,255,0.92)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 10,
                    borderRadius: 28,
                    gap: 16,
                  }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                    style={{
                      width: 44,
                      height: 44,
                      border: "3px solid #e2e8f0",
                      borderTopColor: "#2563eb",
                      borderRadius: "50%",
                    }}
                  />
                  <p style={{ fontWeight: 700, color: "#64748b", fontSize: "0.9rem", margin: 0 }}>Publishing your errand…</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Header ── */}
            <div style={{
              padding: "24px 24px 0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}>
              <div>
                <p style={{ fontSize: "0.72rem", fontWeight: 800, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 4px" }}>
                  Step {step + 1} of {STEPS.length}
                </p>
                <h2 style={{ fontWeight: 900, fontSize: "1.35rem", color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
                  {step === 0 && "What's the task?"}
                  {step === 1 && "Where & how much?"}
                  {step === 2 && "Any extra details?"}
                </h2>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: "50%",
                  width: 34,
                  height: 34,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#64748b",
                  flexShrink: 0,
                }}
              >
                <X size={17} />
              </button>
            </div>

            {/* ── Progress bar ── */}
            <div style={{ padding: "16px 24px 0" }}>
              <div style={{ height: 4, background: "#f1f5f9", borderRadius: 10, overflow: "hidden" }}>
                <motion.div
                  animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                  transition={{ type: "spring", damping: 20, stiffness: 200 }}
                  style={{ height: "100%", background: "linear-gradient(90deg, #2563eb, #7c3aed)", borderRadius: 10 }}
                />
              </div>
            </div>

            {/* ── Steps ── */}
            <div style={{ padding: "24px 24px 28px", minHeight: 300 }}>
              <AnimatePresence mode="wait">
                {/* STEP 0 — Title + Category */}
                {step === 0 && (
                  <motion.div
                    key="step0"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Task Title
                      </label>
                      <input
                        autoFocus
                        className="input-field"
                        placeholder="e.g. Buy Lunch at J-One"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        onKeyDown={(e) => e.key === "Enter" && step0Valid && handleNext()}
                        style={{ fontSize: "1rem", fontWeight: 600 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Category
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
                                padding: "12px 8px",
                                borderRadius: 14,
                                border: `2px solid ${isActive ? c.active : c.border}`,
                                background: isActive ? c.bg : "#fafafa",
                                color: isActive ? c.active : "#64748b",
                                fontWeight: 700,
                                fontSize: "0.82rem",
                                cursor: "pointer",
                                transition: "all 0.15s",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <span style={{ fontSize: "1.4rem" }}>{CATEGORY_EMOJI[cat]}</span>
                              {cat}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 1 — Location + Fee */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.2 }}
                    style={{ display: "flex", flexDirection: "column", gap: 18 }}
                  >
                    <div>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        <MapPin size={13} /> Drop-off Location
                      </label>
                      <input
                        autoFocus
                        className="input-field"
                        placeholder="e.g. Block A, Room 202"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        style={{ fontSize: "1rem", fontWeight: 600 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        <Banknote size={13} /> Reward (₦)
                      </label>
                      <input
                        className="input-field"
                        type="number"
                        placeholder="Min. ₦100"
                        value={formData.fee}
                        onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                        style={{ fontSize: "1.2rem", fontWeight: 800, letterSpacing: "-0.01em" }}
                      />
                      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                        {["200", "500", "1000", "2000", "5000"].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setFormData({ ...formData, fee: amt })}
                            style={{
                              padding: "7px 12px",
                              borderRadius: 20,
                              border: `1.5px solid ${formData.fee === amt ? "#2563eb" : "#e2e8f0"}`,
                              background: formData.fee === amt ? "#eff6ff" : "#f8fafc",
                              color: formData.fee === amt ? "#2563eb" : "#64748b",
                              fontWeight: 700,
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
                  </motion.div>
                )}

                {/* STEP 2 — Details (auto-submits) */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Quick summary card */}
                    <div style={{
                      background: "#f8fafc",
                      border: "1.5px solid #e2e8f0",
                      borderRadius: 16,
                      padding: "14px 16px",
                      marginBottom: 18,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.95rem" }}>{formData.title}</span>
                        <span style={{ fontWeight: 900, color: "#2563eb", fontSize: "1.05rem" }}>₦{Number(formData.fee || 0).toLocaleString()}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.75rem", background: "#f1f5f9", color: "#64748b", padding: "3px 10px", borderRadius: 20, fontWeight: 600 }}>
                          {CATEGORY_EMOJI[formData.category]} {formData.category}
                        </span>
                        <span style={{ fontSize: "0.75rem", background: "#f1f5f9", color: "#64748b", padding: "3px 10px", borderRadius: 20, fontWeight: 600 }}>
                          📍 {formData.location}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Special Notes (Optional)
                      </label>
                      <textarea
                        autoFocus
                        className="input-field"
                        style={{ minHeight: 110, resize: "none", fontSize: "0.95rem", lineHeight: 1.6 }}
                        placeholder="Specific items, sizes, quantities, or anything the messenger should know…"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Footer ── */}
            <div style={{
              padding: "0 24px 24px",
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}>
              {step > 0 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  style={{
                    padding: "14px 18px",
                    borderRadius: 16,
                    border: "1.5px solid #e2e8f0",
                    background: "#f8fafc",
                    color: "#64748b",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  Back
                </button>
              )}
              <motion.button
                onClick={handleNext}
                disabled={!canProceed || submitted}
                whileTap={{ scale: 0.97 }}
                style={{
                  flex: 1,
                  padding: "15px",
                  borderRadius: 16,
                  border: "none",
                  background: canProceed
                    ? "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)"
                    : "#e2e8f0",
                  color: canProceed ? "#fff" : "#94a3b8",
                  fontWeight: 800,
                  fontSize: "1rem",
                  cursor: canProceed ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "background 0.2s",
                  boxShadow: canProceed ? "0 4px 14px rgba(37,99,235,0.3)" : "none",
                }}
              >
                {step === 2 ? "🚀 Post Errand" : "Continue"}
                {step < 2 && <ArrowRight size={17} />}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PostErrandModal;
