import { useState, useEffect, useCallback, useRef } from "react";
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
  const [processing, setProcessing] = useState(false);
  const [acceptingErrand, setAcceptingErrand] = useState(null);
  const pollingRef = useRef(null);

  // Keep userId fresh without causing re-renders
  const userIdRef = useRef(getUserId());
  const userRole = localStorage.getItem("userRole") || "messenger";

  useEffect(() => {
    if (acceptingErrand) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [acceptingErrand]);

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
    setProcessing(true);
    try {
      await api.patch(`/errands/${id}/apply`);
      showToast("✅ Request sent! The sender will be notified and will select you if chosen.");
      // Optimistic update — mark as applied immediately without refetch
      setErrands((prev) =>
        prev.map((e) => (e.id === id ? { ...e, hasApplied: true } : e))
      );
    } catch (err) {
      showToast(err.response?.data?.message || "Could not send request.", "error");
    } finally {
      setProcessing(false);
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
              Sending Request...
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
              {filteredErrands.map((errand) => {
                const catStyle = getCategoryStyle(errand.category);
                const isOwner = errand.posterId === userIdRef.current;
                return (
                  <motion.div
                    key={errand.id}
                    layout
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, height: 0, marginBottom: 0 }}
                    transition={{ type: "spring", stiffness: 420, damping: 30 }}
                    className={`stream-card${errand.isNew ? " stream-card--new" : ""}`}
                  >
                    {errand.isNew && <div className="stream-card-new-ribbon">NEW</div>}

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
                          <span className="stream-cat-chip" style={{ background: catStyle.bg, color: catStyle.color, border: `1px solid ${catStyle.border}` }}>
                            {errand.category}
                          </span>
                          <span className="stream-meta-dot">·</span>
                          <span className="stream-meta-item">
                            <Clock size={11} />
                            {timeAgo(errand.createdAt)}
                          </span>
                          {Array.isArray(errand.candidates) && errand.candidates.length > 0 && (
                            <>
                              <span className="stream-meta-dot">·</span>
                              <span className="stream-meta-item" style={{ color: "var(--amber-600)", fontWeight: 700 }}>
                                {errand.candidates.length} request{errand.candidates.length !== 1 ? "s" : ""}
                              </span>
                            </>
                          )}
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
                        <button
                          onClick={() => !errand.hasApplied && setAcceptingErrand(errand)}
                          className={`stream-accept-btn ${errand.hasApplied ? "applied" : ""}`}
                          style={{
                            opacity: errand.hasApplied ? 0.7 : 1,
                            pointerEvents: errand.hasApplied ? "none" : "auto",
                            background: errand.hasApplied ? "var(--gray-300)" : "var(--blue-600)",
                            color: errand.hasApplied ? "var(--gray-600)" : "#ffffff"
                          }}
                        >
                          {errand.hasApplied ? "Requested ✓" : "Request to Do"}
                          {!errand.hasApplied && <ArrowRight size={14} />}
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

      {/* ── Acceptance Confirmation Modal ── */}
      <AnimatePresence>
        {acceptingErrand && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAcceptingErrand(null)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15,23,42,0.65)",
                backdropFilter: "blur(6px)",
                zIndex: 9992,
              }}
            />
            <div className="errand-accept-modal-wrapper">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="errand-accept-modal"
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid var(--gray-100)", paddingBottom: 12 }}>
                  <h3 style={{ fontWeight: 900, fontSize: "1.2rem", margin: 0, color: "var(--gray-900)" }}>Request to Do Errand</h3>
                  <button
                    onClick={() => setAcceptingErrand(null)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gray-400)" }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: "auto", paddingRight: 4, display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Sender Card */}
                  <div style={{ background: "var(--gray-50)", border: "1px solid var(--gray-200)", borderRadius: 16, padding: 14 }}>
                    <h4 style={{ margin: "0 0 10px 0", fontSize: "0.8rem", fontWeight: 800, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Sender Details</h4>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <SenderAvatar picture={acceptingErrand.posterPicture} name={acceptingErrand.posterName} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 800, fontSize: "0.95rem", color: "var(--gray-900)" }}>
                          {acceptingErrand.posterName}
                          {acceptingErrand.posterVerified && (
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
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                          {acceptingErrand.posterDepartment && (
                            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.75rem", color: "var(--blue-600)", fontWeight: 600 }}>
                              <Building size={11} /> {acceptingErrand.posterDepartment}
                            </span>
                          )}
                          {acceptingErrand.posterLocation && (
                            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.75rem", color: "var(--gray-500)", fontWeight: 600 }}>
                              <Home size={11} /> {acceptingErrand.posterLocation}
                            </span>
                          )}
                          {acceptingErrand.posterRating > 0 && (
                            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "0.75rem", color: "#D97706", fontWeight: 700 }}>
                              <Star size={10} fill="#D97706" color="#D97706" /> {acceptingErrand.posterRating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Errand Info */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <h4 style={{ margin: "0", fontSize: "0.8rem", fontWeight: 800, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Errand Details</h4>
                    <div>
                      <h3 style={{ margin: "0 0 6px 0", fontSize: "1.05rem", fontWeight: 800, color: "var(--gray-900)" }}>{acceptingErrand.title}</h3>
                      <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--gray-600)", lineHeight: 1.5 }}>{acceptingErrand.description}</p>
                    </div>

                    <div className="accept-modal-grid">
                      <div style={{ background: "var(--blue-50)", border: "1px solid var(--blue-100)", padding: 10, borderRadius: 12 }}>
                        <span style={{ display: "block", fontSize: "0.65rem", color: "var(--blue-500)", fontWeight: 800, textTransform: "uppercase", marginBottom: 2 }}>Category</span>
                        <span style={{ fontSize: "0.85rem", color: "var(--blue-900)", fontWeight: 700 }}>{acceptingErrand.category}</span>
                      </div>
                      <div style={{ background: "var(--green-50)", border: "1px solid var(--green-100)", padding: 10, borderRadius: 12 }}>
                        <span style={{ display: "block", fontSize: "0.65rem", color: "var(--green-500)", fontWeight: 800, textTransform: "uppercase", marginBottom: 2 }}>Payout Fee</span>
                        <span style={{ fontSize: "0.95rem", color: "var(--green-900)", fontWeight: 800 }}>₦{acceptingErrand.fee.toLocaleString()}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                      {acceptingErrand.pickupLocation && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", color: "var(--gray-600)" }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green-500)", flexShrink: 0 }} />
                          <span><strong>Pick Up:</strong> {acceptingErrand.pickupLocation}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", color: "var(--gray-600)" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--blue-500)", flexShrink: 0 }} />
                        <span><strong>Drop Off:</strong> {acceptingErrand.location || "Not specified"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="accept-modal-actions">
                  <button
                    onClick={() => setAcceptingErrand(null)}
                    className="btn btn-outline"
                    style={{ flex: 1, borderRadius: 12 }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      const id = acceptingErrand.id || acceptingErrand._id;
                      setAcceptingErrand(null);
                      await handleApplyForErrand(id);
                    }}
                    className="btn btn-primary"
                    style={{ flex: 1, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    Send Request <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ErrandStream;
