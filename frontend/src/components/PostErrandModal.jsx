import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, MapPin, Banknote, CheckCircle } from "lucide-react";
import BottomSheet from "./BottomSheet";

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

  const titleRef = useRef(null);
  const locationRef = useRef(null);
  const feeRef = useRef(null);
  const descRef = useRef(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setSubmitted(false);
      setFormData({ title: "", description: "", fee: "", location: "", category: "Meals" });
    }
  }, [isOpen]);

  // Auto-focus inputs on step transition
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => {
      if (step === 0 && titleRef.current) {
        titleRef.current.focus();
      } else if (step === 1 && locationRef.current) {
        locationRef.current.focus();
      } else if (step === 2 && descRef.current) {
        descRef.current.focus();
      }
    }, 150);
    return () => clearTimeout(t);
  }, [step, isOpen]);

  // Auto-close after success overlay
  useEffect(() => {
    if (submitted && !isProcessing) {
      const t = setTimeout(() => {
        onClose();
        setSubmitted(false);
      }, 1600);
      return () => clearTimeout(t);
    }
  }, [submitted, isProcessing, onClose]);

  const handleNext = async (e) => {
    if (e) e.preventDefault();
    if (step === 0 && !formData.title.trim()) return;
    if (step === 1 && (!formData.location.trim() || !formData.fee)) return;
    if (step === 2) {
      try {
        setSubmitted(true);
        await onSubmit(formData);
      } catch (err) {
        setSubmitted(false);
      }
      return;
    }
    setStep((s) => s + 1);
  };

  const step0Valid = formData.title.trim().length > 0;
  const step1Valid = formData.location.trim().length > 0 && Number(formData.fee) >= 100;
  const step2Valid = true;

  const canProceed = step === 0 ? step0Valid : step === 1 ? step1Valid : step2Valid;

  const getStepTitle = () => {
    if (step === 0) return "What's the task?";
    if (step === 1) return "Where & reward?";
    return "Any extra details?";
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={getStepTitle()}
      subtitle={`Step ${step + 1} of ${STEPS.length}`}
    >
      <div style={{ position: "relative", minHeight: 320, paddingBottom: 10 }}>
        {/* Success / Loading Overlay */}
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
                zIndex: 20,
                borderRadius: 20,
                gap: 12,
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12, stiffness: 260, delay: 0.1 }}
              >
                <CheckCircle size={60} color="#2563eb" strokeWidth={1.5} />
              </motion.div>
              <p style={{ fontWeight: 900, fontSize: "1.25rem", color: "#1d4ed8", margin: 0 }}>Errand Posted!</p>
              <p style={{ fontSize: "0.85rem", color: "#60a5fa", margin: 0, fontWeight: 600 }}>Messengers will see it shortly</p>
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
                zIndex: 20,
                borderRadius: 20,
                gap: 14,
              }}
            >
              <div className="loader" />
              <p style={{ fontWeight: 700, color: "var(--gray-600)", fontSize: "0.9rem", margin: 0 }}>Publishing your errand…</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step Progress Bar */}
        <div style={{ height: 4, background: "var(--gray-200)", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
          <motion.div
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ type: "spring", damping: 20, stiffness: 200 }}
            style={{ height: "100%", background: "var(--gradient-brand)", borderRadius: 10 }}
          />
        </div>

        {/* Step Form Content */}
        <AnimatePresence mode="wait">
          {/* STEP 0 */}
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
            >
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "var(--gray-600)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Task Title
                </label>
                <input
                  ref={titleRef}
                  className="input-field"
                  placeholder="e.g. Buy Lunch at J-One"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && step0Valid && handleNext()}
                  style={{ fontSize: "1rem", fontWeight: 700 }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "var(--gray-600)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
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
                          background: isActive ? c.bg : "var(--gray-50)",
                          color: isActive ? c.active : "var(--gray-600)",
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

          {/* STEP 1 */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
              style={{ display: "flex", flexDirection: "column", gap: 18 }}
            >
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", fontWeight: 800, color: "var(--gray-600)", marginBottom: 8, textTransform: "uppercase" }}>
                  <MapPin size={14} /> Drop-off Location
                </label>
                <input
                  ref={locationRef}
                  className="input-field"
                  placeholder="e.g. Block A, Room 202"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && formData.location.trim()) {
                      feeRef.current?.focus();
                    }
                  }}
                  style={{ fontSize: "1rem", fontWeight: 700 }}
                />
              </div>
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", fontWeight: 800, color: "var(--gray-600)", marginBottom: 8, textTransform: "uppercase" }}>
                  <Banknote size={14} /> Reward (₦)
                </label>
                <input
                  ref={feeRef}
                  className="input-field"
                  type="number"
                  placeholder="Min. ₦100"
                  value={formData.fee}
                  onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && step1Valid && handleNext()}
                  style={{ fontSize: "1.2rem", fontWeight: 800 }}
                />
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  {["200", "500", "1000", "2000", "5000"].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, fee: amt });
                        setTimeout(() => feeRef.current?.focus(), 50);
                      }}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 20,
                        border: `1.5px solid ${formData.fee === amt ? "var(--blue-600)" : "var(--gray-200)"}`,
                        background: formData.fee === amt ? "var(--blue-50)" : "var(--gray-50)",
                        color: formData.fee === amt ? "var(--blue-700)" : "var(--gray-600)",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      ₦{Number(amt).toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
            >
              <div style={{
                background: "var(--gray-50)",
                border: "1.5px solid var(--gray-200)",
                borderRadius: 16,
                padding: "14px 16px",
                marginBottom: 18,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 800, color: "var(--gray-900)", fontSize: "0.95rem" }}>{formData.title}</span>
                  <span style={{ fontWeight: 900, color: "var(--blue-600)", fontSize: "1.05rem" }}>₦{Number(formData.fee || 0).toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.75rem", background: "var(--white)", color: "var(--gray-700)", padding: "3px 10px", borderRadius: 20, fontWeight: 700, border: "1px solid var(--gray-200)" }}>
                    {CATEGORY_EMOJI[formData.category]} {formData.category}
                  </span>
                  <span style={{ fontSize: "0.75rem", background: "var(--white)", color: "var(--gray-700)", padding: "3px 10px", borderRadius: 20, fontWeight: 700, border: "1px solid var(--gray-200)" }}>
                    📍 {formData.location}
                  </span>
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "var(--gray-600)", marginBottom: 8, textTransform: "uppercase" }}>
                  Special Notes (Optional)
                </label>
                <textarea
                  ref={descRef}
                  className="input-field"
                  style={{ minHeight: 100, resize: "none", fontSize: "0.95rem", lineHeight: 1.6 }}
                  placeholder="Specific items, quantities, or instructions…"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      handleNext();
                    }
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Actions */}
        <div style={{ marginTop: 24, display: "flex", gap: 10, alignItems: "center" }}>
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              style={{
                padding: "14px 18px",
                borderRadius: 14,
                border: "1.5px solid var(--gray-200)",
                background: "var(--gray-50)",
                color: "var(--gray-700)",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed || submitted}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 14,
              border: "none",
              background: canProceed ? "var(--gradient-brand)" : "var(--gray-200)",
              color: canProceed ? "var(--white)" : "var(--gray-400)",
              fontWeight: 800,
              fontSize: "0.95rem",
              cursor: canProceed ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: canProceed ? "0 4px 14px rgba(30,77,183,0.3)" : "none",
            }}
          >
            {step === 2 ? "🚀 Post Errand" : "Continue"}
            {step < 2 && <ArrowRight size={17} />}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};

export default PostErrandModal;
