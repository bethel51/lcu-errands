import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Building, Loader2 } from "lucide-react";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

const ApplicantsSheet = ({
  isOpen,
  candidates,
  errandTitle,
  onHire,
  onClose,
  hiringId,
  loading = false,
}) => {
  useBodyScrollLock(isOpen);

  const sheet = (
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
            style={{ zIndex: 9991 }}
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
              {loading ? (
                <div
                  className="applicants-sheet-empty"
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}
                >
                  <Loader2
                    size={28}
                    style={{ animation: "spin 1s linear infinite", color: "var(--blue-500)" }}
                  />
                  <span>Loading applicants…</span>
                </div>
              ) : !candidates || candidates.length === 0 ? (
                <div className="applicants-sheet-empty">
                  No applicants yet. Check back soon!
                </div>
              ) : (
                candidates.map((c, idx) => {
                  // Safely handle both populated objects and raw string IDs
                  const isPopulated = c && typeof c === "object" && (c._id || c.id);
                  const candidateId = isPopulated
                    ? (c._id || c.id)
                    : typeof c === "string"
                    ? c
                    : null;
                  const candidateName = isPopulated ? c.name || "Messenger" : "Messenger";
                  const candidatePic = isPopulated ? c.profilePicture : null;
                  const candidateDept = isPopulated ? c.department : null;
                  const candidateRating = isPopulated ? c.rating : null;

                  if (!candidateId) return null;

                  return (
                    <div key={candidateId || idx} className="applicants-sheet-item">
                      <div className="applicants-sheet-avatar">
                        {candidatePic ? (
                          <img src={candidatePic} alt={candidateName} />
                        ) : (
                          <div className="applicants-sheet-avatar-fallback">
                            {candidateName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="applicants-sheet-info">
                        <div className="applicants-sheet-name">{candidateName}</div>
                        <div className="applicants-sheet-meta">
                          {candidateDept && (
                            <span>
                              <Building size={11} /> {candidateDept}
                            </span>
                          )}
                          {candidateRating > 0 && (
                            <span className="applicants-sheet-rating">
                              <Star size={11} fill="#D97706" color="#D97706" />{" "}
                              {candidateRating.toFixed(1)}
                            </span>
                          )}
                          {!isPopulated && (
                            <span style={{ color: "var(--gray-400)", fontSize: "0.7rem" }}>
                              Profile loading…
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        className="applicants-sheet-hire-btn"
                        onClick={() => onHire(candidateId)}
                        disabled={hiringId === candidateId}
                      >
                        {hiringId === candidateId ? "Hiring..." : "Hire"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(sheet, document.body);
};

export default ApplicantsSheet;
