import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Building } from "lucide-react";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

const ApplicantsSheet = ({ isOpen, candidates, errandTitle, onHire, onClose, hiringId }) => {
  useBodyScrollLock(isOpen);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="applicants-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(15,23,42,0.6)",
              backdropFilter: "blur(4px)",
              zIndex: 9990,
            }}
          />
          {/* Sheet */}
          <motion.div
            key="applicants-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="applicants-sheet"
          >
            {/* Drag handle */}
            <div className="applicants-sheet-handle" />

            {/* Header */}
            <div className="applicants-sheet-header">
              <div>
                <h3 className="applicants-sheet-title">Applicants</h3>
                <p className="applicants-sheet-subtitle">for "{errandTitle}"</p>
              </div>
              <button onClick={onClose} className="applicants-sheet-close">
                <X size={18} />
              </button>
            </div>

            {/* List */}
            <div className="applicants-sheet-list">
              {(!candidates || candidates.length === 0) ? (
                <div className="applicants-sheet-empty">
                  No applicants yet. Check back soon!
                </div>
              ) : (
                candidates.map((c) => (
                  <div key={c._id} className="applicants-sheet-item">
                    <div className="applicants-sheet-avatar">
                      {c.profilePicture ? (
                        <img src={c.profilePicture} alt={c.name} />
                      ) : (
                        <div className="applicants-sheet-avatar-fallback">
                          {(c.name || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="applicants-sheet-info">
                      <div className="applicants-sheet-name">{c.name}</div>
                      <div className="applicants-sheet-meta">
                        {c.department && (
                          <span><Building size={11} /> {c.department}</span>
                        )}
                        {c.rating > 0 && (
                          <span className="applicants-sheet-rating">
                            <Star size={11} fill="#D97706" color="#D97706" /> {c.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      className="applicants-sheet-hire-btn"
                      onClick={() => onHire(c._id)}
                      disabled={hiringId === c._id}
                    >
                      {hiringId === c._id ? "Hiring..." : "Hire"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ApplicantsSheet;
