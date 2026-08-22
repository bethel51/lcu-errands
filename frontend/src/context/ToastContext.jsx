import React, { createContext, useContext, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

const ToastContext = createContext(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

// Helper: cleans leading raw emojis from string if present (since icon badge handles type visual)
const cleanMessage = (msg) => {
  if (typeof msg !== "string") return msg;
  return msg.replace(/^[✅❌🚀📦💸⚠️ℹ️🎉⭐🔥⏳]+\s*/, "").trim();
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const hideToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = "success", duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    const cleanedMsg = cleanMessage(message);

    setToasts((prev) => {
      // Keep at most 3 active toasts stacked
      const updated = [...prev, { id, message: cleanedMsg || message, type, duration, createdAt: Date.now() }];
      if (updated.length > 3) return updated.slice(updated.length - 3);
      return updated;
    });

    setTimeout(() => {
      hideToast(id);
    }, duration);
  }, [hideToast]);

  const getBadge = (type) => {
    switch (type) {
      case "success":
        return {
          icon: <CheckCircle2 size={16} color="#fff" strokeWidth={2.5} />,
          gradient: "linear-gradient(135deg, #10b981, #059669)",
          boxShadow: "0 2px 10px rgba(16,185,129,0.35)",
        };
      case "error":
        return {
          icon: <AlertCircle size={16} color="#fff" strokeWidth={2.5} />,
          gradient: "linear-gradient(135deg, #ef4444, #dc2626)",
          boxShadow: "0 2px 10px rgba(239,68,68,0.35)",
        };
      case "warning":
        return {
          icon: <AlertTriangle size={16} color="#fff" strokeWidth={2.5} />,
          gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
          boxShadow: "0 2px 10px rgba(245,158,11,0.35)",
        };
      case "info":
      default:
        return {
          icon: <Info size={16} color="#fff" strokeWidth={2.5} />,
          gradient: "linear-gradient(135deg, #6366f1, #3b82f6)",
          boxShadow: "0 2px 10px rgba(99,102,241,0.35)",
        };
    }
  };

  const portalNode = typeof document !== "undefined" ? document.body : null;

  return (
    <ToastContext.Provider value={{ showToast, hideToast: () => setToasts([]) }}>
      {children}

      {portalNode && createPortal(
        <div
          style={{
            position: "fixed",
            top: "max(12px, env(safe-area-inset-top, 12px))",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 999999,
            width: "calc(100% - 24px)",
            maxWidth: 380,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            pointerEvents: "none",
          }}
        >
          {toasts.map((toast) => {
            const badge = getBadge(toast.type);
            return (
              <div
                key={toast.id}
                onClick={() => hideToast(toast.id)}
                style={{
                  pointerEvents: "auto",
                  position: "relative",
                  width: "100%",
                  background: "rgba(15, 23, 42, 0.92)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 18,
                  padding: "11px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  color: "#ffffff",
                  boxShadow: "0 16px 36px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.15)",
                  animation: "toastSlideDown 0.24s cubic-bezier(0.16, 1, 0.3, 1)",
                  overflow: "hidden",
                  cursor: "pointer",
                  boxSizing: "border-box",
                }}
              >
                {/* Icon Badge */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: badge.gradient,
                    boxShadow: badge.boxShadow,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {badge.icon}
                </div>

                {/* Message */}
                <div
                  style={{
                    flex: 1,
                    fontSize: "0.86rem",
                    fontWeight: 600,
                    lineHeight: 1.35,
                    color: "#f8fafc",
                    fontFamily: "Outfit, Inter, system-ui, sans-serif",
                    wordBreak: "break-word",
                  }}
                >
                  {toast.message}
                </div>

                {/* Dismiss Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    hideToast(toast.id);
                  }}
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "none",
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#94a3b8",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  <X size={13} />
                </button>

                {/* Timer Shrinking Line Indicator */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    height: 2.5,
                    background: badge.gradient,
                    width: "100%",
                    animation: `toastTimerProgress ${toast.duration}ms linear forwards`,
                    borderRadius: "0 0 18px 18px",
                  }}
                />
              </div>
            );
          })}

          <style>{`
            @keyframes toastSlideDown {
              from { opacity: 0; transform: translateY(-16px) scale(0.94); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes toastTimerProgress {
              from { width: 100%; }
              to { width: 0%; }
            }
          `}</style>
        </div>,
        portalNode
      )}
    </ToastContext.Provider>
  );
};

