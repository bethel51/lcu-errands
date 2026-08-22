import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { CheckCircle, AlertTriangle, Wallet } from "lucide-react";
import api from "../api";
import { useToast } from "../context/ToastContext";
import BottomSheet from "./BottomSheet";

const ConfirmDeliveryOverlay = ({ isOpen, errandId, errandTitle, errandFee, onClose, onSuccess }) => {
  const [processing, setProcessing] = useState(false);
  const { showToast } = useToast();

  const handleRelease = async () => {
    if (processing) return;
    setProcessing(true);
    try {
      const res = await api.patch(`/errands/${errandId}/complete`);
      const msg = res.data?.message || "✅ Payment released! Messenger has been paid.";
      showToast(msg);
      onSuccess?.(errandId);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Request failed.";
      showToast(`❌ ${msg}`, "error");
    } finally {
      setProcessing(false);
    }
  };

  const overlay = (
    <BottomSheet
      isOpen={isOpen}
      onClose={() => !processing && onClose()}
      title="Release Payment?"
      subtitle="Confirm errand completion to pay messenger"
    >
      <div style={{ textAlign: "center", padding: "10px 0 20px" }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 18, stiffness: 300 }}
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "var(--green-50)",
            color: "var(--green-600)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            fontSize: "2rem",
            boxShadow: "0 8px 20px rgba(16, 185, 129, 0.15)",
          }}
        >
          💸
        </motion.div>

        <div
          style={{
            background: "var(--gray-50)",
            borderRadius: "var(--radius-xl)",
            padding: 16,
            marginBottom: 20,
            border: "1px solid var(--gray-200)",
          }}
        >
          <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--blue-900)", marginBottom: 4 }}>
            {errandTitle || "Errand"}
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--green-600)" }}>
            ₦{(errandFee || 0).toLocaleString()}
          </div>
        </div>

        <div
          style={{
            background: "#FFFBEB",
            border: "1px solid #FDE68A",
            borderRadius: "var(--radius-lg)",
            padding: "12px 14px",
            fontSize: "0.83rem",
            color: "#92400E",
            display: "flex",
            alignItems: "center",
            gap: 10,
            textAlign: "left",
            marginBottom: 24,
          }}
        >
          <AlertTriangle size={20} style={{ flexShrink: 0, color: "#D97706" }} />
          <span>
            Once confirmed, <strong>₦{(errandFee || 0).toLocaleString()}</strong> is immediately released from escrow to the messenger and cannot be reversed.
          </span>
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleRelease}
          disabled={processing}
          style={{
            width: "100%",
            height: 50,
            borderRadius: "var(--radius-lg)",
            background: "var(--gradient-success)",
            color: "var(--white)",
            border: "none",
            fontWeight: 800,
            fontSize: "0.95rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            cursor: processing ? "not-allowed" : "pointer",
            boxShadow: "0 4px 16px rgba(16, 185, 129, 0.3)",
            marginBottom: 12,
          }}
        >
          {processing ? (
            <>
              <div className="loader" style={{ width: 20, height: 20, borderWidth: 2, borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />
              Releasing Payment...
            </>
          ) : (
            <>
              <CheckCircle size={20} />
              Confirm & Release ₦{(errandFee || 0).toLocaleString()}
            </>
          )}
        </motion.button>

        <button
          onClick={() => !processing && onClose()}
          disabled={processing}
          style={{
            background: "none",
            border: "none",
            color: "var(--gray-500)",
            fontSize: "0.88rem",
            fontWeight: 600,
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Not yet, cancel
        </button>
      </div>
    </BottomSheet>
  );

  return createPortal(overlay, document.body);
};

export default ConfirmDeliveryOverlay;
