import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, MapPin, Tag, Banknote, List } from "lucide-react";
import { CATEGORIES, CATEGORY_EMOJI } from "../utils/categories";

const PostErrandModal = ({ isOpen, onClose, onSubmit, isProcessing }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    fee: "",
    location: "",
    category: "Meals",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Close modal when clicking on the overlay background
  const handleOverlayClick = (e) => {
    if (e.target.classList.contains("modal-overlay-responsive")) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="post-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-overlay-responsive"
          onClick={handleOverlayClick}
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
            key="post-modal-content"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bottom-sheet-responsive"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Handle */}
            <div className="mobile-drag-handle" />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <div>
                <h2 style={{ fontWeight: 900, fontSize: "1.3rem", color: "var(--gray-900)", letterSpacing: "-0.02em" }}>
                  Post an Errand
                </h2>
                <p style={{ fontSize: "0.85rem", color: "var(--gray-500)", marginTop: 4, fontWeight: 500 }}>
                  Describe your task and set a reward
                </p>
              </div>
              <button
                onClick={onClose}
                className="btn-icon"
                style={{
                  background: "var(--gray-100)",
                  border: "none",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--gray-600)",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <div className="input-group">
                <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Search size={14} /> Title
                </label>
                <input
                  className="input-field"
                  placeholder="e.g. Buy Lunch at J-One"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="input-group">
                <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <MapPin size={14} /> Drop-off Location
                </label>
                <input
                  className="input-field"
                  placeholder="e.g. Block A, Room 202"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="input-group">
                  <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Tag size={14} /> Category
                  </label>
                  <select
                    className="input-field"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {CATEGORIES.filter((c) => c !== "All").map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_EMOJI[c]} {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Banknote size={14} /> Reward (₦)
                  </label>
                  <input
                    className="input-field"
                    type="number"
                    placeholder="500"
                    value={formData.fee}
                    onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <List size={14} /> Details
                </label>
                <textarea
                  className="input-field"
                  style={{ minHeight: 100, resize: "vertical", padding: "12px 16px" }}
                  placeholder="Specify items, quantities, special notes..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isProcessing}
                style={{
                  marginTop: 10,
                  width: "100%",
                  padding: "16px",
                  fontSize: "1rem",
                  fontWeight: 800,
                  borderRadius: 16,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  background: "linear-gradient(135deg, var(--blue-600), var(--blue-700))",
                  boxShadow: "0 4px 12px rgba(30, 77, 183, 0.25)",
                  border: "none",
                  color: "#fff",
                }}
              >
                {isProcessing ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    style={{ width: 20, height: 20, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%" }}
                  />
                ) : (
                  "Post Errand Now"
                )}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PostErrandModal;
