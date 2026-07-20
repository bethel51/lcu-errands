import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";
import api from "../api";
import { useToast } from "../context/ToastContext";

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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="confirm-delivery-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="confirm-delivery-fullscreen"
        >
          {/* Top bar */}
          <div className="confirm-delivery-topbar">
            <button
              onClick={() => !processing && onClose()}
              className="confirm-delivery-back"
              disabled={processing}
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
          </div>

          {/* Content */}
          <div className="confirm-delivery-body">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", damping: 20 }}
              className="confirm-delivery-icon"
            >
              💸
            </motion.div>

            <h1 className="confirm-delivery-title">Release Payment?</h1>

            <div className="confirm-delivery-errand-info">
              <div className="confirm-delivery-errand-name">{errandTitle || "Errand"}</div>
              <div className="confirm-delivery-errand-fee">₦{(errandFee || 0).toLocaleString()}</div>
            </div>

            <div className="confirm-delivery-warning">
              <AlertTriangle size={18} />
              <span>Once confirmed, payment is <strong>immediately released</strong> to the messenger and <strong>cannot be reversed</strong>.</span>
            </div>

            <button
              onClick={handleRelease}
              disabled={processing}
              className="confirm-delivery-release-btn"
            >
              {processing ? (
                <span className="confirm-delivery-spinner-row">
                  <span className="confirm-delivery-spinner" />
                  Releasing...
                </span>
              ) : (
                <span className="confirm-delivery-spinner-row">
                  <CheckCircle size={20} />
                  Release ₦{(errandFee || 0).toLocaleString()} to Messenger
                </span>
              )}
            </button>

            <button
              onClick={() => !processing && onClose()}
              disabled={processing}
              className="confirm-delivery-cancel-link"
            >
              Not yet, go back
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
};

export default ConfirmDeliveryOverlay;
