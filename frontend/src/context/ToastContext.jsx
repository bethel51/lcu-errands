import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

const ToastContext = createContext(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success", duration = 3000) => {
    setToast({ message, type, id: Date.now() });
    const timer = setTimeout(() => {
      setToast((prev) => (prev && prev.message === message ? null : prev));
    }, duration);
    return () => clearTimeout(timer);
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  // Icon mapping for different toast types
  const getIcon = (type) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" style={{ color: "#10b981" }} />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-rose-500" style={{ color: "#f43f5e" }} />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-amber-500" style={{ color: "#f59e0b" }} />;
      case "info":
      default:
        return <Info className="w-5 h-5 text-blue-500" style={{ color: "#3b82f6" }} />;
    }
  };

  // Border and accent color styling mapping
  const getStyles = (type) => {
    switch (type) {
      case "success":
        return {
          borderLeft: "4px solid #10b981",
          background: "rgba(255, 255, 255, 0.9)",
        };
      case "error":
        return {
          borderLeft: "4px solid #f43f5e",
          background: "rgba(255, 255, 255, 0.9)",
        };
      case "warning":
        return {
          borderLeft: "4px solid #f59e0b",
          background: "rgba(255, 255, 255, 0.9)",
        };
      case "info":
      default:
        return {
          borderLeft: "4px solid #3b82f6",
          background: "rgba(255, 255, 255, 0.9)",
        };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      
      {/* Toast Render Node */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.9, x: "-50%" }}
            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, y: 20, scale: 0.95, x: "-50%" }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            style={{
              position: "fixed",
              bottom: "95px",
              left: "50%",
              zIndex: 99999,
              width: "calc(100% - 32px)",
              maxWidth: "400px",
              padding: "14px 18px",
              borderRadius: "16px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              color: "#1e293b",
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: "0.9rem",
              fontWeight: 500,
              lineHeight: 1.4,
              boxSizing: "border-box",
              ...getStyles(toast.type),
            }}
          >
            {/* Left Status Icon */}
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
              {getIcon(toast.type)}
            </div>

            {/* Notification Message Text */}
            <div style={{ flexGrow: 1, wordBreak: "break-word" }}>
              {toast.message}
            </div>

            {/* Dismiss Button */}
            <button
              onClick={hideToast}
              style={{
                background: "none",
                border: "none",
                padding: "4px",
                cursor: "pointer",
                color: "#94a3b8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                transition: "background 0.2s, color 0.2s",
                marginLeft: "auto",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f1f5f9";
                e.currentTarget.style.color = "#475569";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
                e.currentTarget.style.color = "#94a3b8";
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
};
