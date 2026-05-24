import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Clock, ArrowRight, Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useSocket } from "../context/SocketContext";

const ErrandStream = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  
  const [errands, setErrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const userRole = localStorage.getItem("userRole") || "messenger";
  
  // Cache user ID for checking poster ownership
  const cachedUserId = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}").id || "";
    } catch {
      return "";
    }
  })();

  const mapBackendToFrontend = (err) => {
    return {
      id: err._id,
      title: err.title,
      description: err.description,
      category: err.category,
      location: err.dropoffLocation,
      fee: err.fee,
      status: err.status,
      posterName: err.posterId?._id === cachedUserId ? "You" : err.posterId?.name || "User",
      posterId: err.posterId?._id || err.posterId,
      createdAt: err.createdAt,
    };
  };

  const fetchErrands = async () => {
    try {
      const res = await api.get("/errands");
      const openErrands = res.data.filter((e) => e.status === "open");
      setErrands(openErrands.map(mapBackendToFrontend));
    } catch (err) {
      console.error("Failed to fetch errands for stream", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErrands();
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Listen for new errands posted on the platform in real-time
    socket.on("new_errand", (newErrand) => {
      const mapped = mapBackendToFrontend(newErrand);
      if (mapped.status === "open") {
        setErrands((prev) => [mapped, ...prev]);
        showToast(`New errand: "${mapped.title}" posted!`, "info");
      }
    });

    // Refresh feed when notifications/status changes occur
    socket.on("notification", () => {
      fetchErrands();
    });

    return () => {
      socket.off("new_errand");
      socket.off("notification");
    };
  }, [socket]);

  const handleAcceptErrand = async (id) => {
    setProcessing(true);
    try {
      await api.patch(`/errands/${id}/accept`);
      showToast("Errand accepted successfully!");
      navigate("/history");
    } catch (err) {
      showToast(err.response?.data?.message || "Error accepting errand.", "info");
    } finally {
      setProcessing(false);
    }
  };

  const filteredErrands = errands.filter((e) => {
    return (
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase()) ||
      e.location.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="stream-container">
      <AnimatePresence>
        {processing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(4px)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 15,
            }}
          >
            <div className="loader" style={{ width: 40, height: 40 }} />
            <div style={{ fontWeight: 800, color: "#111827", fontSize: "0.85rem", letterSpacing: "0.1em" }}>
              ACCEPTING TASK...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="stream-header">
        <div className="stream-title">
          <Radio size={28} style={{ color: "#10b981" }} />
          <h1>Live Errand Stream</h1>
        </div>
        <div className="stream-status-badge">
          <span className="stream-status-dot" />
          <span>LIVE UPDATING</span>
        </div>
      </div>

      <div className="search-bar" style={{ marginBottom: 24 }}>
        <div className="search-input-wrapper">
          <Search size={18} />
          <input
            placeholder="Filter live stream by title, location, category..."
            className="input-field"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div className="loader" style={{ margin: "0 auto 16px" }} />
          <p style={{ color: "#6b7280" }}>Connecting to stream...</p>
        </div>
      ) : filteredErrands.length === 0 ? (
        <div className="stream-empty-state">
          <Search size={36} style={{ margin: "0 auto 12px", display: "block" }} />
          <h3 style={{ fontWeight: 700, margin: "0 0 4px 0", color: "#111827" }}>No Active Errands</h3>
          <p style={{ margin: 0, fontSize: "0.9rem" }}>
            {search ? "No active errands match your filter." : "There are currently no open tasks on campus. Hang tight!"}
          </p>
        </div>
      ) : (
        <div className="stream-feed-list">
          <AnimatePresence initial={false}>
            {filteredErrands.map((errand) => (
              <motion.div
                key={errand.id}
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="stream-errand-card"
              >
                <div className="stream-errand-header">
                  <div className="stream-errand-info">
                    <h3 className="stream-errand-title">{errand.title}</h3>
                    <div className="stream-errand-meta">
                      <span className="stream-category-tag">{errand.category}</span>
                      <span>•</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={12} /> {new Date(errand.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>•</span>
                      <span>Posted by: {errand.posterName}</span>
                    </div>
                  </div>
                  <div className="stream-errand-fee">₦{errand.fee.toLocaleString()}</div>
                </div>

                <p className="stream-errand-desc">{errand.description}</p>

                <div className="stream-errand-footer">
                  <div className="stream-errand-loc">
                    <MapPin size={14} color="#6b7280" />
                    <span>Dropoff: {errand.location}</span>
                  </div>
                  {userRole === "messenger" && errand.posterId !== cachedUserId && (
                    <button
                      onClick={() => handleAcceptErrand(errand.id)}
                      className="btn btn-primary btn-sm"
                      style={{ padding: "8px 16px", borderRadius: 8 }}
                    >
                      Accept Task <ArrowRight size={14} style={{ marginLeft: 6 }} />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 100,
            left: "50%",
            transform: "translateX(-50%)",
            background: toast.type === "success" ? "#10b981" : "#3b82f6",
            color: "white",
            padding: "12px 24px",
            borderRadius: 12,
            fontWeight: 700,
            zIndex: 10000,
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default ErrandStream;
