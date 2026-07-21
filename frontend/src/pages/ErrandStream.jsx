import { useState, useEffect, useCallback, useRef } from "react";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
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
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useSocket } from "../context/SocketContext";
import NotificationCenter from "../components/NotificationCenter";
import { useToast } from "../context/ToastContext";

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

const CATEGORIES = ["All", "Meals", "Shopping", "Academic", "Delivery", "Gates", "Other"];

const CATEGORY_EMOJI = {
  Meals: "🍽️",
  Shopping: "🛒",
  Academic: "📚",
  Delivery: "📦",
  Gates: "🚪",
  Other: "✨",
};

/* ─── Helpers ───────────────────────────────────────────────────────── */
const getUserId = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}").id || "";
  } catch {
    return "";
  }
};

/* ─── Component ────────────────────────────────────────────────────── */
const ErrandStream = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [errands, setErrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [applyingId, setApplyingId] = useState(null); // track per-card applying state
  const [pendingAcceptId, setPendingAcceptId] = useState(null);
  const pollingRef = useRef(null);

  // Keep userId fresh without causing re-renders
  const userIdRef = useRef(getUserId());
  const userRole = localStorage.getItem("userRole") || "messenger";

  const mapBackendToFrontend = useCallback((err) => {
    const uid = userIdRef.current;
    const posterIdStr = err.posterId?._id || err.posterId;
    return {
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
      posterName: posterIdStr === uid ? "You" : err.posterId?.name || "User",
      posterPicture: err.posterId?.profilePicture || null,
      posterDepartment: err.posterId?.department || null,
      posterLocation: err.posterId?.location || null,
      posterRating: err.posterId?.rating || 0,
      posterVerified: !!err.posterId?.isVerified,
      posterId: posterIdStr,
      createdAt: err.createdAt,
      candidates: err.candidates || [],
      hasApplied: Array.isArray(err.candidates)
        ? err.candidates.some((c) => (c._id || c) === uid)
        : false,
      isNew: false,
    };
  }, []);

  // Deduplicated merge: always keep local hasApplied if already true
  const mergeErrands = useCallback((incoming) => {
    setErrands((prev) => {
      const prevMap = new Map(prev.map((e) => [e.id, e]));
      const result = incoming.map((e) => {
        const existing = prevMap.get(e.id);
        return existing
          ? { ...e, hasApplied: existing.hasApplied || e.hasApplied, isNew: existing.isNew }
          : e;
      });
      return result;
    });
  }, []);

  const fetchErrands = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get("/errands");
      const data = Array.isArray(res.data) ? res.data : [];
      const open = data.filter((e) => e.status === "open");
      const mapped = open.map(mapBackendToFrontend);
      mergeErrands(mapped);
    } catch (err) {
      console.error("Failed to fetch errands for stream", err);
      if (!silent) setErrands([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mapBackendToFrontend, mergeErrands]);

  // Initial load
  useEffect(() => {
    fetchErrands();
  }, [fetchErrands]);

  // 60-second polling fallback (in case socket misses events)
  useEffect(() => {
    pollingRef.current = setInterval(() => {
      fetchErrands(true); // silent = no loading spinner
    }, 60_000);
    return () => clearInterval(pollingRef.current);
  }, [fetchErrands]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // New errand posted — add to top
    const handleNewErrand = (newErrand) => {
      const mapped = { ...mapBackendToFrontend(newErrand), isNew: true };
      if (mapped.status !== "open") return;

      setErrands((prev) => {
        // Deduplicate: don't add if already exists
        if (prev.some((e) => e.id === mapped.id)) return prev;
        return [mapped, ...prev];
      });
      showToast(`🆕 "${mapped.title}" just landed!`, "info");

      // Clear the "NEW" ribbon after 4s
      setTimeout(() => {
        setErrands((prev) =>
          prev.map((e) => (e.id === mapped.id ? { ...e, isNew: false } : e))
        );
      }, 4000);
    };

    // Errand taken/cancelled — remove from stream instantly
    const handleErrandRemoved = ({ errandId }) => {
      setErrands((prev) => prev.filter((e) => e.id !== errandId));
    };

    // A candidate applied — update candidate count on the card
    const handleErrandUpdated = (updatedErrand) => {
      if (!updatedErrand) return;
      const mapped = mapBackendToFrontend(updatedErrand);
      if (mapped.status !== "open") {
        // If no longer open, remove it
        setErrands((prev) => prev.filter((e) => e.id !== mapped.id));
        return;
      }
      setErrands((prev) =>
        prev.map((e) =>
          e.id === mapped.id
            ? { ...mapped, isNew: e.isNew, hasApplied: e.hasApplied || mapped.hasApplied }
            : e
        )
      );
    };

    socket.on("new_errand", handleNewErrand);
    socket.on("errand_removed", handleErrandRemoved);
    socket.on("errand_updated", handleErrandUpdated);

    return () => {
      socket.off("new_errand", handleNewErrand);
      socket.off("errand_removed", handleErrandRemoved);
      socket.off("errand_updated", handleErrandUpdated);
    };
  }, [socket, mapBackendToFrontend]);

  const handleApplyForErrand = async (id) => {
    if (applyingId) return; // prevent double-tap
    setApplyingId(id);
    // Optimistic update immediately — no full-screen block
    setErrands((prev) =>
      prev.map((e) => (e.id === id ? { ...e, hasApplied: true } : e))
    );
    try {
      await api.patch(`/errands/${id}/apply`);
      showToast("✅ Request sent! The sender will be notified and will select you if chosen.");
    } catch (err) {
      // Rollback on failure
      setErrands((prev) =>
        prev.map((e) => (e.id === id ? { ...e, hasApplied: false } : e))
      );
      showToast(err.response?.data?.message || "Could not send request.", "error");
    } finally {
      setApplyingId(null);
    }
  };

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchErrands();
  };

  const filteredErrands = errands.filter((e) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      e.title.toLowerCase().includes(q) ||
      (e.description || "").toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      (e.pickupLocation || "").toLowerCase().includes(q) ||
      (e.dropoffLocation || "").toLowerCase().includes(q) ||
      (e.location || "").toLowerCase().includes(q);

    const matchesCategory =
      activeCategory === "All" || e.category.toLowerCase() === activeCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="errand-stream-page">

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
                {loading ? "Loading…" : `${filteredErrands.length} open task${filteredErrands.length !== 1 ? "s" : ""} on campus right now`}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <NotificationCenter />
            <button
              onClick={handleManualRefresh}
              className="stream-refresh-btn"
              title="Refresh feed"
              style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <RefreshCw size={16} style={{ animation: refreshing ? "spin 0.8s linear infinite" : "none" }} />
            </button>
          </div>
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
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gray-400)", padding: 0, display: "flex" }}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          padding: "14px 0 4px",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}>
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 20,
                  border: isSelected ? "1px solid var(--blue-500)" : "1px solid var(--gray-200)",
                  background: isSelected ? "var(--blue-500)" : "var(--white)",
                  color: isSelected ? "#ffffff" : "var(--gray-700)",
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.2s ease",
                  boxShadow: isSelected ? "0 4px 12px rgba(37,99,235,0.2)" : "none",
                }}
              >
                {cat !== "All" && <span>{CATEGORY_EMOJI[cat]}</span>}
                {cat}
              </button>
            );
          })}
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
              {filteredErrands.map((errand, index) => {
                const catStyle = getCategoryStyle(errand.category);
                const isOwner = errand.posterId === userIdRef.current;
                return (
                  <motion.div
                    key={errand.id}
                    layout
                    initial={{ opacity: 0, y: 20, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ type: "spring", stiffness: 380, damping: 28, delay: index < 6 ? index * 0.06 : 0 }}
                    whileHover={{ y: -3, transition: { type: "spring", stiffness: 500, damping: 30 } }}
                    className={`stream-card${errand.isNew ? " stream-card--new" : ""}`}
                  >
                    {errand.isNew && (
                      <motion.div
                        className="stream-card-new-ribbon"
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", damping: 12, stiffness: 300 }}
                      >
                        NEW
                      </motion.div>
                    )}

                    {/* Sender info row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid var(--gray-100)" }}>
                      <SenderAvatar picture={errand.posterPicture} name={errand.posterName} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 800, fontSize: "0.9rem", color: "var(--gray-900)" }}>
                          {errand.posterName}
                          {errand.posterVerified && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "var(--blue-100)",
                                color: "var(--blue-600)",
                                borderRadius: "50%",
                                width: 14,
                                height: 14,
                                fontSize: "0.6rem",
                                fontWeight: 900
                              }}
                              title="Verified User"
                            >
                              ✓
                            </span>
                          )}
                        </div>
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
                          <motion.span
                            className="stream-cat-chip"
                            style={{ background: catStyle.bg, color: catStyle.color, border: `1px solid ${catStyle.border}` }}
                            whileHover={{ scale: 1.08 }}
                            transition={{ type: "spring", stiffness: 500 }}
                          >
                            {CATEGORY_EMOJI[errand.category] || ""} {errand.category}
                          </motion.span>
                          <span className="stream-meta-dot">·</span>
                          <span className="stream-meta-item">
                            <Clock size={11} />
                            {timeAgo(errand.createdAt)}
                          </span>
                          {Array.isArray(errand.candidates) && errand.candidates.length > 0 && (
                            <>
                              <span className="stream-meta-dot">·</span>
                              <motion.span
                                className="stream-meta-item"
                                style={{ color: "var(--amber-600)", fontWeight: 700 }}
                                animate={{ scale: [1, 1.12, 1] }}
                                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                              >
                                {errand.candidates.length} request{errand.candidates.length !== 1 ? "s" : ""}
                              </motion.span>
                            </>
                          )}
                        </div>
                      </div>
                      <motion.div
                        className="stream-fee-badge"
                        animate={errand.isNew ? { scale: [1, 1.08, 1] } : {}}
                        transition={{ duration: 0.6, delay: 0.3 }}
                      >
                        ₦{errand.fee.toLocaleString()}
                      </motion.div>
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

                      {userRole === "messenger" && !isOwner && (() => {
                        const isExpanded = pendingAcceptId === errand.id;
                        if (errand.hasApplied) {
                          return (
                            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--green-600)", background: "var(--green-50)", padding: "4px 10px", borderRadius: 20, border: "1px solid var(--green-200)", flexShrink: 0 }}>
                              ✓ Requested
                            </span>
                          );
                        }
                        if (isExpanded) {
                          return (
                            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                              <button
                                className="btn btn-outline btn-sm"
                                style={{ borderRadius: 10, padding: "5px 10px", fontSize: "0.78rem" }}
                                onClick={() => setPendingAcceptId(null)}
                              >
                                Cancel
                              </button>
                              <button
                                id={`confirm-accept-${errand.id}`}
                                className="btn btn-primary btn-sm"
                                style={{ background: "linear-gradient(135deg,#1d4ed8,#2563eb)", borderRadius: 10, padding: "5px 12px", fontSize: "0.78rem", fontWeight: 800 }}
                                onClick={() => { setPendingAcceptId(null); handleApplyForErrand(errand.id); }}
                              >
                                ✓ Confirm Accept
                              </button>
                            </div>
                          );
                        }
                        return (
                          <button
                            id={`accept-errand-${errand.id}`}
                            onClick={() => setPendingAcceptId(errand.id)}
                            className="btn btn-primary btn-sm"
                            style={{ flexShrink: 0 }}
                          >
                            Accept <ArrowRight size={13} />
                          </button>
                        );
                      })()}

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
    </div>
  );
};

export default ErrandStream;
