import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

/* iOS / Flutter Cupertino Spring Physics */
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const sheetVariants = {
  hidden: { y: "100%", opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 26,
      stiffness: 340,
      mass: 0.8,
    },
  },
  exit: {
    y: "100%",
    opacity: 0,
    transition: {
      type: "tween",
      ease: [0.32, 0.72, 0, 1],
      duration: 0.26,
    },
  },
};

const BottomSheet = ({ isOpen, onClose, title, subtitle, children, style = {} }) => {
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (isOpen && typeof window !== "undefined" && window.navigator?.vibrate) {
      try {
        window.navigator.vibrate(8);
      } catch (e) {
        // Safe fallback if permission denied
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          {/* iOS Blur Backdrop */}
          <motion.div
            className="bottom-sheet-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />

          {/* Flutter/iOS Drag Card Sheet */}
          <motion.div
            className="bottom-sheet-container"
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 400) {
                onClose();
              }
            }}
            style={{
              borderRadius: "28px 28px 0 0",
              boxShadow: "0 -12px 40px rgba(0, 0, 0, 0.18)",
              background: "var(--white)",
              ...style,
            }}
          >
            {/* iOS Pill Drag Handle */}
            <div
              className="bottom-sheet-handle"
              style={{
                width: 38,
                height: 5,
                borderRadius: 99,
                background: "var(--gray-300)",
                margin: "4px auto 14px",
                cursor: "grab",
              }}
            />

            {(title || subtitle) && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: 16,
                  paddingBottom: 10,
                  borderBottom: "1px solid var(--gray-100)",
                }}
              >
                <div>
                  {title && (
                    <h3
                      style={{
                        fontSize: "1.2rem",
                        fontWeight: 800,
                        color: "var(--blue-900)",
                        margin: 0,
                        fontFamily: "Outfit, sans-serif",
                        letterSpacing: "-0.3px",
                      }}
                    >
                      {title}
                    </h3>
                  )}
                  {subtitle && (
                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--gray-500)",
                        margin: "2px 0 0",
                        fontWeight: 500,
                      }}
                    >
                      {subtitle}
                    </p>
                  )}
                </div>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: "none",
                    background: "var(--gray-100)",
                    color: "var(--gray-600)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                  aria-label="Close"
                >
                  <X size={18} />
                </motion.button>
              </div>
            )}

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                overscrollBehavior: "contain",
                paddingBottom: "env(safe-area-inset-bottom, 24px)",
              }}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default BottomSheet;
