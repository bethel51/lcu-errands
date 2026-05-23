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
        const formatted = res.data.map((errand) => ({
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

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 100 }}>
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
              className="card"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 24,
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: "1.15rem",
                    fontWeight: 800,
                    marginBottom: 8,
                  }}
                >
                  {item.title}
                </h3>
                <div
                  style={{
                    display: "flex",
                    gap: 15,
                    color: "var(--gray-500)",
                    fontSize: "0.85rem",
                  }}
                >
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <MapPin size={14} /> {item.location}
                  </span>
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <Clock size={14} /> {item.date}
                  </span>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 900,
                    marginBottom: 8,
                  }}
                >
                  ₦{item.fee}
                </div>
                <div
                  className={`badge ${item.status === "completed" ? "badge-blue" : "badge-gray"}`}
                  style={{ textTransform: "uppercase", fontSize: "0.7rem" }}
                >
                  {item.status}
                </div>

                <div style={{ marginTop: 12 }}>
                  {item.type === "posted" && item.status === "open" && (
                    <button
                      className="btn btn-sm"
                      style={{
                        background: "#FEE2E2",
                        color: "#B91C1C",
                        border: "none",
                      }}
                      onClick={() => handleCancelErrand(item.id)}
                    >
                      Cancel
                    </button>
                  )}
                  {item.type === "posted" && item.status === "assigned" && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleCompleteTask(item.id)}
                    >
                      Complete
                    </button>
                  )}
                  {item.status === "completed" && (
                    <button
                      className="btn btn-sm btn-outline"
                      style={{
                        color: "var(--amber-600)",
                        borderColor: "var(--amber-200)",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
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
  );
};

export default History;
