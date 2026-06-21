import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock, Package, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import ReviewModal from "../components/ReviewModal";

const History = () => {
  const navigate = useNavigate();
  const userRole = localStorage.getItem("userRole") || "messenger";
  const filterType = userRole === "sender" ? "posted" : "accepted";
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;

  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedErrandId, setSelectedErrandId] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      const cacheKey = `history_${user.id}_${filterType}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setHistoryItems(JSON.parse(cached));
        setLoading(false);
      }

      try {
        const res = await api.get("/errands/history");
        const data = Array.isArray(res.data) ? res.data : [];
        const formatted = data.map((errand) => ({
          id: errand._id,
          title: errand.title,
          fee: errand.fee,
          location: errand.dropoffLocation,
          date: new Date(errand.createdAt).toLocaleDateString(),
          type: errand.posterId === user.id ? "posted" : "accepted",
          status: errand.status,
        }));
        setHistoryItems(formatted);
        localStorage.setItem(cacheKey, JSON.stringify(formatted));
      } catch (err) {
        console.error("Failed to fetch history", err);
        setHistoryItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [user?.id, filterType]);

  const handleCancelErrand = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to cancel this errand? You will be fully refunded.",
      )
    )
      return;
    setProcessing(true);
    try {
      await api.delete(`/errands/${id}`);
      window.location.reload();
    } catch (err) {
      alert("Failed to cancel. It might have been accepted already.");
    } finally {
      setProcessing(false);
    }
  };

  const handleCompleteTask = async (id) => {
    setProcessing(true);
    try {
      await api.patch(`/errands/${id}/complete`);
      window.location.reload();
    } catch (err) {
      alert("Failed to complete task.");
    } finally {
      setProcessing(false);
    }
  };

  const filteredItems = historyItems.filter((item) => item.type === filterType);

  const renderEscrowTracker = (status) => {
    if (status === "cancelled") {
      return (
        <div className="escrow-cancelled-banner">
          <span className="escrow-cancelled-dot" />
          <strong>Errand Cancelled:</strong> Funds have been refunded to your wallet.
        </div>
      );
    }

    const steps = [
      { label: "Posted", desc: "Funds in Escrow", active: ["open", "assigned", "completed"].includes(status) },
      { label: "Assigned", desc: "Task in Progress", active: ["assigned", "completed"].includes(status) },
      { label: "Completed", desc: "Task Finished", active: ["completed"].includes(status) },
      { label: "Disbursed", desc: "Released to Wallet", active: ["completed"].includes(status) },
    ];

    let progressWidth = "0%";
    if (status === "completed") progressWidth = "100%";
    else if (status === "assigned") progressWidth = "50%";

    return (
      <div className="escrow-tracker">
        <div className="escrow-steps-container">
          <div className="escrow-progress-line">
            <div 
              className="escrow-progress-fill" 
              style={{ width: progressWidth }} 
            />
          </div>

          {steps.map((step, idx) => {
            let stepClass = "escrow-step";
            if (step.active) {
              stepClass += idx === 3 ? " success" : " active";
            }
            return (
              <div key={idx} className={stepClass}>
                <div className="escrow-step-circle">
                  {step.active ? "✓" : idx + 1}
                </div>
                <div className="escrow-step-text-wrapper">
                  <span className="escrow-step-label">{step.label}</span>
                  <span className="escrow-step-desc">{step.desc}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-page">
      <div className="container" style={{ paddingTop: 20, paddingBottom: 100 }}>
        <AnimatePresence>
          {processing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(255,255,255,0.8)",
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 15,
              }}
            >
              <div className="loader" style={{ width: 40, height: 40 }} />
              <div
                style={{
                  fontWeight: 800,
                  color: "var(--blue-600)",
                  fontSize: "0.75rem",
                }}
              >
                UPDATING...
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="dashboard-header" style={{ marginBottom: 32 }}>
          <div className="dashboard-title">
            <h1>My Errands</h1>
            <p>
              History of your {filterType === "posted" ? "posted" : "accepted"}{" "}
              tasks.
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-card" style={{ height: 100 }}>
                <div
                  className="skeleton skeleton-line full"
                  style={{ height: 20 }}
                />
                <div
                  className="skeleton skeleton-line medium"
                  style={{ height: 16 }}
                />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 24px",
              background: "var(--white)",
              borderRadius: 24,
              border: "1px dashed var(--gray-300)",
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                background: "var(--gray-50)",
                color: "var(--gray-400)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
              }}
            >
              <Package size={32} />
            </div>
            <h3
              style={{
                fontSize: "1.25rem",
                fontWeight: 800,
                color: "var(--gray-900)",
                marginBottom: 8,
              }}
            >
              No activity yet
            </h3>
            <p style={{ color: "var(--gray-500)" }}>
              Start exploring the marketplace to get things done!
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="history-item-card"
              >
                <div className="history-item-content">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <h3
                        style={{
                          fontWeight: 800,
                          fontSize: "1.1rem",
                          color: "var(--gray-900)",
                          margin: 0,
                        }}
                      >
                        {item.title}
                      </h3>
                      <span
                        className={`badge ${
                          item.status === "completed"
                            ? "badge-green"
                            : item.status === "assigned"
                              ? "badge-blue"
                              : item.status === "cancelled"
                                ? "badge-red"
                                : "badge-orange"
                        }`}
                      >
                        {item.status.toUpperCase()}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        color: "var(--gray-500)",
                        fontSize: "0.85rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <MapPin size={14} /> {item.location}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Clock size={14} /> {item.date}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 900,
                        fontSize: "1.25rem",
                        color: "var(--blue-700)",
                      }}
                    >
                      ₦{item.fee.toLocaleString()}
                    </span>

                    {filterType === "posted" && item.status === "open" && (
                      <button
                        onClick={() => handleCancelErrand(item.id)}
                        className="btn btn-outline btn-sm"
                        style={{ borderColor: "var(--red-200)", color: "var(--red-600)" }}
                      >
                        Cancel
                      </button>
                    )}

                    {filterType === "accepted" && item.status === "assigned" && (
                      <button
                        onClick={() => handleCompleteTask(item.id)}
                        className="btn btn-primary btn-sm"
                      >
                        Mark Completed
                      </button>
                    )}

                    {item.status === "completed" && (
                      <button
                        className="btn btn-outline btn-sm"
                        style={{
                          borderColor: "var(--amber-200)",
                          color: "var(--amber-600)",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                        onClick={() => {
                          setSelectedErrandId(item.id);
                          setIsReviewModalOpen(true);
                        }}
                      >
                        <Star size={12} fill="currentColor" /> Rate
                      </button>
                    )}
                  </div>
                </div>

                {renderEscrowTracker(item.status)}
              </motion.div>
            ))}
          </div>
        )}

        {selectedErrandId && (
          <ReviewModal
            errandId={selectedErrandId}
            isOpen={isReviewModalOpen}
            onClose={() => setIsReviewModalOpen(false)}
            onSuccess={() => window.location.reload()}
          />
        )}
      </div>
    </div>
  );
};

export default History;
