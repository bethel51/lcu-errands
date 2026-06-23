import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  Clock,
  ArrowRight,
  Radio,
  Zap,
  Package,
  RefreshCw,
  Building,
  Home,
  Star,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useSocket } from "../context/SocketContext";

/* ─── Category colour map ──────────────────────────────────────────── */
const CATEGORY_COLORS = {
  food: { bg: "#FEF3C7", color: "#92400E", border: "#FDE68A" },
  delivery: { bg: "#DBEAFE", color: "#1E40AF", border: "#BFDBFE" },
  shopping: { bg: "#F3E8FF", color: "#6B21A8", border: "#E9D5FF" },
  laundry: { bg: "#ECFDF5", color: "#065F46", border: "#A7F3D0" },
  printing: { bg: "#FFF7ED", color: "#9A3412", border: "#FED7AA" },
  meals: { bg: "#FEF3C7", color: "#92400E", border: "#FDE68A" },
  academic: { bg: "#DBEAFE", color: "#1E40AF", border: "#BFDBFE" },
  gates: { bg: "#F3F4F6", color: "#374151", border: "#E5E7EB" },
  default: { bg: "#F3F4F6", color: "#374151", border: "#E5E7EB" },
};

const getCategoryStyle = (cat = "") => {
  const key = cat.toLowerCase();
  return CATEGORY_COLORS[key] || CATEGORY_COLORS.default;
};

/* ─── Time formatter ───────────────────────────────────────────────── */
const timeAgo = (dateStr) => {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString();
};

/* ─── Sender Avatar ────────────────────────────────────────────────── */
const SenderAvatar = ({ picture, name }) => {
  const initials = (name || "U").charAt(0).toUpperCase();
  return picture ? (
    <img
      src={picture}
      alt={name}
      style={{ width: 40, height: 40, borderRadius: 12, objectFit: "cover", flexShrink: 0 }}
    />
  ) : (
    <div style={{
      width: 40, height: 40, borderRadius: 12, background: "var(--blue-100)",
      color: "var(--blue-600)", display: "flex", alignItems: "center",
      justifyContent: "center", fontWeight: 800, fontSize: "1rem", flexShrink: 0,
    }}>
      {initials}
    </div>
  );
};

/* ─── Component ────────────────────────────────────────────────────── */
const ErrandStream = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [errands, setErrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState(null);

  const userRole = localStorage.getItem("userRole") || "messenger";
  const cachedUserId = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}").id || "";
    } catch {
      return "";
    }
  })();

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const mapBackendToFrontend = useCallback((err) => ({
    id: err._id,
    title: err.title,
    description: err.description,
    category: err.category,
    pickupLocation: err.pickupLocation,
    dropoffLocation: err.dropoffLocation,
    location: err.dropoffLocation,
    fee: err.fee,
    status: err.status,
    trackingId: err.trackingId,
    posterName: err.posterId?._id === cachedUserId ? "You" : err.posterId?.name || "User",
    posterPicture: err.posterId?.profilePicture || null,
    posterDepartment: err.posterId?.department || null,
    posterLocation: err.posterId?.location || null,
    posterRating: err.posterId?.rating || 0,
    posterId: err.posterId?._id || err.posterId,
    createdAt: err.createdAt,
    isNew: false,
  }), [cachedUserId]);

  const fetchErrands = useCallback(async () => {
    try {
      const res = await api.get("/errands");
      const data = Array.isArray(res.data) ? res.data : [];
      const open = data.filter((e) => e.status === "open");
      setErrands(open.map(mapBackendToFrontend));
    } catch (err) {
      console.error("Failed to fetch errands for stream", err);
      setErrands([]);
    } finally {
      setLoading(false);
    }
  }, [mapBackendToFrontend]);

  useEffect(() => {
    fetchErrands();
  }, [fetchErrands]);

  useEffect(() => {
    if (!socket) return;

    socket.on("new_errand", (newErrand) => {
      const mapped = { ...mapBackendToFrontend(newErrand), isNew: true };
      if (mapped.status === "open") {
        setErrands((prev) => [mapped, ...prev]);
        showToast(`🆕 "${mapped.title}" just landed!`, "info");
        setTimeout(() => {
          setErrands((prev) =>
            prev.map((e) => (e.id === mapped.id ? { ...e, isNew: false } : e))
          );
        }, 4000);
      }
    });

    socket.on("notification", () => {
      fetchErrands();
    });

    return () => {
      socket.off("new_errand");
      socket.off("notification");
    };
  }, [socket, fetchErrands, mapBackendToFrontend]);

  const handleAcceptErrand = async (id) => {
    setProcessing(true);
    try {
      await api.patch(`/errands/${id}/accept`);
      showToast("✅ Errand accepted! Check your active tasks.");
      navigate("/history");
    } catch (err) {
      showToast(err.response?.data?.message || "Could not accept errand.", "error");
    } finally {
      setProcessing(false);
    }
  };

  const filteredErrands = errands.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase()) ||
      (e.location || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="errand-stream-page">
      {/* ── Full-screen processing overlay ── */}
      <AnimatePresence>
        {processing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, background: "rgba(255,255,255,0.88)",
              backdropFilter: "blur(6px)", zIndex: 9999, display: "flex",
              alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16,
            }}
          >
            <div className="loader" style={{ width: 44, height: 44 }} />
            <div style={{ fontWeight: 700, color: "#111827", fontSize: "0.8rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              Accepting Task...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hero header ── */}
      <div className="stream-hero">
        <div className="stream-hero-inner">
          <div className="stream-hero-left">
            <div className="stream-live-badge">
              <span className="stream-live-dot" />
              LIVE
            </div>
            <div>
              <h1 className="stream-hero-title">Errand Stream</h1>
              <p className="stream-hero-sub">
                {filteredErrands.length} open task
                {filteredErrands.length !== 1 ? "s" : ""} on campus right now
              </p>
            </div>
          </div>
          <button
            onClick={() => { setLoading(true); fetchErrands(); }}
            className="stream-refresh-btn"
            title="Refresh feed"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Search bar inside hero */}
        <div className="stream-search-wrap">
          <Search size={16} className="stream-search-icon" />
          <input
            type="search"
            placeholder="Search by title, location, category…"
            className="stream-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Feed ── */}
      <div className="stream-body">
        {loading ? (
          <div className="stream-loading-state">
            <div className="loader" style={{ margin: "0 auto 16px" }} />
            <p>Connecting to live stream…</p>
          </div>
        ) : filteredErrands.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="stream-empty-state">
            <Package size={40} strokeWidth={1.5} />
            <h3>No Active Errands</h3>
            <p>{search ? "No tasks match your search. Try a different keyword." : "The campus is quiet right now. New errands will appear here live."}</p>
          </motion.div>
        ) : (
          <div className="stream-feed-list">
            <AnimatePresence initial={false}>
              {filteredErrands.map((errand) => {
                const catStyle = getCategoryStyle(errand.category);
                const isOwner = errand.posterId === cachedUserId;
                return (
                  <motion.div
                    key={errand.id}
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 460, damping: 28 }}
                    className={`stream-card${errand.isNew ? " stream-card--new" : ""}`}
                  >
                    {errand.isNew && <div className="stream-card-new-ribbon">NEW</div>}

                    {/* Sender info row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid var(--gray-100)" }}>
                      <SenderAvatar picture={errand.posterPicture} name={errand.posterName} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--gray-900)" }}>{errand.posterName}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 3 }}>
                          {errand.posterDepartment && (
                            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.72rem", color: "var(--blue-600)", fontWeight: 600 }}>
                              <Building size={11} /> {errand.posterDepartment}
                            </span>
                          )}
                          {errand.posterLocation && (
                            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.72rem", color: "var(--gray-500)", fontWeight: 600 }}>
                              <Home size={11} /> {errand.posterLocation}
                            </span>
                          )}
                          {errand.posterRating > 0 && (
                            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "0.72rem", color: "#D97706", fontWeight: 700 }}>
                              <Star size={10} fill="#D97706" color="#D97706" /> {errand.posterRating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                      {errand.trackingId && (
                        <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "var(--gray-400)", background: "var(--gray-50)", padding: "3px 8px", borderRadius: 6, letterSpacing: "0.05em" }}>
                          {errand.trackingId}
                        </span>
                      )}
                    </div>

                    {/* Card top row */}
                    <div className="stream-card-top">
                      <div className="stream-card-info">
                        <h3 className="stream-card-title">{errand.title}</h3>
                        <div className="stream-card-meta">
                          <span className="stream-cat-chip" style={{ background: catStyle.bg, color: catStyle.color, border: `1px solid ${catStyle.border}` }}>
                            {errand.category}
                          </span>
                          <span className="stream-meta-dot">·</span>
                          <span className="stream-meta-item">
                            <Clock size={11} />
                            {timeAgo(errand.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="stream-fee-badge">₦{errand.fee.toLocaleString()}</div>
                    </div>

                    {/* Description */}
                    <p className="stream-card-desc">{errand.description}</p>

                    {/* Locations row */}
                    {errand.pickupLocation && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "var(--gray-500)", marginBottom: 8 }}>
                        <Radio size={11} style={{ color: "var(--green-500)", flexShrink: 0 }} />
                        <span>Pick up: {errand.pickupLocation}</span>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="stream-card-footer">
                      <div className="stream-card-loc">
                        <MapPin size={13} />
                        <span>Drop off: {errand.location || "Not specified"}</span>
                      </div>

                      {userRole === "messenger" && !isOwner && (
                        <button onClick={() => handleAcceptErrand(errand.id)} className="stream-accept-btn">
                          Accept Task
                          <ArrowRight size={14} />
                        </button>
                      )}

                      {isOwner && (
                        <span className="stream-owner-tag">
                          <Zap size={12} /> Your errand
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            className={`toast toast-${toast.type}`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ErrandStream;
