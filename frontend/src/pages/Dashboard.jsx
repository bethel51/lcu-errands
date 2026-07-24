import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  Plus,
  X,
  Wallet,
  ArrowRight,
  Star,
  Building,
  Home,
  MessageSquare,
  Send,
  ImagePlus,
  CheckCheck,
  Users,
  CheckCircle,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api";
import ReviewModal from "../components/ReviewModal";
import PostErrandModal from "../components/PostErrandModal";
import { useSocket } from "../context/SocketContext";
import NotificationCenter from "../components/NotificationCenter";
import { useToast } from "../context/ToastContext";
import ConfirmDeliveryOverlay from "../components/ConfirmDeliveryOverlay";


const CATEGORIES = [
  "All",
  "Meals",
  "Shopping",
  "Academic",
  "Delivery",
  "Gates",
  "Other",
];

const CATEGORY_EMOJI = {
  Meals: "🍽️",
  Shopping: "🛒",
  Academic: "📚",
  Delivery: "📦",
  Gates: "🚪",
  Other: "✨",
};

const CATEGORY_STYLES = {
  Meals: { backgroundColor: "var(--amber-50)", color: "var(--amber-600)", border: "1px solid var(--amber-100)" },
  Shopping: { backgroundColor: "var(--pink-50)", color: "var(--pink-600)", border: "1px solid var(--pink-100)" },
  Academic: { backgroundColor: "var(--blue-50)", color: "var(--blue-600)", border: "1px solid var(--blue-100)" },
  Delivery: { backgroundColor: "var(--green-50)", color: "var(--green-600)", border: "1px solid var(--green-100)" },
  Gates: { backgroundColor: "var(--gray-50)", color: "var(--gray-700)", border: "1px solid var(--gray-200)" },
  Other: { backgroundColor: "var(--gray-50)", color: "var(--gray-600)", border: "1px solid var(--gray-200)" },
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

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

const Dashboard = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { socket } = useSocket();
  const [errands, setErrands] = useState([]);
  const [activeRequests, setActiveRequests] = useState([]);
  const [messengers, setMessengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [selectedMessenger, setSelectedMessenger] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    fee: "",
    location: "",
    category: "Meals",
  });
  const [user, setUser] = useState(null);
  const [processing, setProcessing] = useState(false);
  // New: inline accept state — which errand card is expanded for confirmation
  const [pendingAcceptId, setPendingAcceptId] = useState(null);
  // Inline hire: track which errand is showing candidate picker & which is being hired
  const [hirePicker, setHirePicker] = useState(null); // errandId showing inline picker
  const [hiringId, setHiringId] = useState(null); // candidateId being hired
  // New: confirm delivery overlay
  const [confirmOverlay, setConfirmOverlay] = useState(null); // { errandId, errandTitle, errandFee }

  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawData, setWithdrawData] = useState({
    amount: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
  });
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("1000");

  const userRole = localStorage.getItem("userRole") || "messenger";
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
  const modalAnimation = isMobile ? {
    initial: { y: "100%" },
    animate: { y: 0 },
    exit: { y: "100%" },
    transition: { type: "spring", damping: 30, stiffness: 300 }
  } : {
    initial: { opacity: 0, scale: 0.95, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 10 },
    transition: { type: "spring", stiffness: 400, damping: 28 }
  };
  const cachedUserId = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}").id || "";
    } catch {
      return "";
    }
  })();

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedErrandId, setSelectedErrandId] = useState(null);

  const mapBackendToFrontend = (err) => {
    return {
      id: err._id,
      title: err.title,
      description: err.description,
      category: err.category,
      location: err.dropoffLocation,
      fee: err.fee,
      status: err.status,
      posterName:
        err.posterId?._id === cachedUserId
          ? "You"
          : err.posterId?.name || "User",
      posterPicture: err.posterId?.profilePicture || "",
      posterDepartment: err.posterId?.department || "",
      posterLocation: err.posterId?.location || "",
      posterRating: err.posterId?.rating || 0,
      posterId: err.posterId?._id || err.posterId,
      erranderId: err.erranderId?._id || err.erranderId,
      candidates: err.candidates || [],
      createdAt: err.createdAt,
      isReviewedByPoster: err.isReviewedByPoster || false,
      isReviewedByErrander: err.isReviewedByErrander || false,
      completionProof: err.completionProof,
    };
  };

  const fetchErrands = async () => {
    try {
      const res = await api.get("/errands");
      setErrands(res.data.map(mapBackendToFrontend));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWalletData = useCallback(async () => {
    try {
      const [profileRes, txsRes, withdrawalsRes] = await Promise.all([
        api.get("/users/profile"),
        api.get("/users/transactions"),
        api.get("/withdrawals/my"),
      ]);
      setUser(profileRes.data);
      localStorage.setItem("user", JSON.stringify(profileRes.data));
      setTransactions(Array.isArray(txsRes.data) ? txsRes.data.slice(0, 5) : []);
      setWithdrawals(Array.isArray(withdrawalsRes.data) ? withdrawalsRes.data : []);
    } catch (err) {
      console.error("Failed to refresh wallet data", err);
    }
  }, []);

  // Targeted refresh: only re-fetch active errands — does NOT reload the whole dashboard
  const fetchActiveRequestsOnly = useCallback(async () => {
    try {
      const res = await api.get("/errands/history");
      const data = Array.isArray(res.data) ? res.data : [];
      const active = data.filter(
        (e) => !["completed", "confirmed_completed", "cancelled"].includes(e.status),
      );
      setActiveRequests(active.map(mapBackendToFrontend));
    } catch (err) {
      console.error("fetchActiveRequestsOnly failed", err);
    }
  }, []);

  // ── Module-level cache (survives tab switches, cleared after 60s) ──────────
  // This prevents the blank loading screen every time a user navigates back to
  // the dashboard within a session. Data is shown instantly, then refreshed
  // silently in the background.
  const loadDashboard = async (silent = false) => {
    try {
      const [errandsRes, historyRes, profileRes, messengersRes, txsRes, withdrawalsRes] =
        await Promise.allSettled([
          api.get("/errands"),
          api.get("/errands/history"),
          api.get("/users/profile"),
          api.get("/users/messengers"),
          api.get("/users/transactions"),
          api.get("/withdrawals/my"),
        ]);

      if (errandsRes.status === "fulfilled") {
        const data = Array.isArray(errandsRes.value.data) ? errandsRes.value.data : [];
        setErrands(data.map(mapBackendToFrontend));
      }
      if (historyRes.status === "fulfilled") {
        const data = Array.isArray(historyRes.value.data) ? historyRes.value.data : [];
        const active = data.filter(
          (e) => !["completed", "confirmed_completed", "cancelled"].includes(e.status),
        );
        setActiveRequests(active.map(mapBackendToFrontend));
      }
      if (profileRes.status === "fulfilled") {
        const u = profileRes.value.data;
        setUser(u);
        localStorage.setItem("user", JSON.stringify(u));
      }
      if (messengersRes.status === "fulfilled") {
        const data = Array.isArray(messengersRes.value.data) ? messengersRes.value.data : [];
        setMessengers(data);
      }
      if (txsRes.status === "fulfilled") {
        setTransactions(Array.isArray(txsRes.value.data) ? txsRes.value.data.slice(0, 5) : []);
      }
      if (withdrawalsRes.status === "fulfilled") {
        setWithdrawals(Array.isArray(withdrawalsRes.value.data) ? withdrawalsRes.value.data : []);
      }
    } catch (err) {
      console.error("Dashboard load failed", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    // Show cached user profile instantly while fresh data loads in background
    const cachedUser = (() => {
      try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
    })();
    if (cachedUser) {
      setUser(cachedUser);
      setLoading(false); // suppress spinner — content renders immediately
      loadDashboard(true); // silent background revalidation
    } else {
      loadDashboard();
    }
  }, []);

  const isAnyModalOpen = isPostModalOpen || isWithdrawModalOpen || isTopUpModalOpen || isReviewModalOpen || !!confirmOverlay;
  useBodyScrollLock(isAnyModalOpen);

  useEffect(() => {
    if (!socket) return;
    const handleNewErrand = (newErrand) => {
      setErrands((prev) => [mapBackendToFrontend(newErrand), ...prev]);
    };

    const handleErrandRemoved = ({ errandId }) => {
      setErrands((prev) => prev.filter((e) => e.id !== errandId));
    };

    const handleNotification = (data) => {
      const type = data.type || "";
      // Surgical targeted refresh — only reload the slice that changed
      if (["wallet_credited", "payment_released", "errand_payment"].includes(type)) {
        fetchWalletData();
      } else if (["errand_requested", "errand_accepted", "errand_delivered", "errand_started"].includes(type)) {
        fetchActiveRequestsOnly();
      }
      // Toast logic is now handled globally in NotificationCenter.jsx
    };

    socket.on("new_errand", handleNewErrand);
    socket.on("errand_removed", handleErrandRemoved);
    socket.on("notification", handleNotification);

    return () => {
      socket.off("new_errand", handleNewErrand);
      socket.off("errand_removed", handleErrandRemoved);
      socket.off("notification", handleNotification);
    };
  }, [socket, fetchWalletData, fetchActiveRequestsOnly]);

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!withdrawData.accountNumber || !withdrawData.bankName || !withdrawData.accountName) {
      showToast("Please fill in all bank details", "error");
      return;
    }
    const amt = Number(withdrawData.amount);
    if (!amt || amt <= 0) {
      showToast("Please enter a valid amount", "error");
      return;
    }
    if (amt > (user?.balance || 0)) {
      showToast("Insufficient balance", "error");
      return;
    }
    if (amt < 1000) {
      showToast("Minimum withdrawal is ₦1,000", "error");
      return;
    }
    setProcessing(true);
    try {
      await api.post("/withdrawals/request", withdrawData);
      setIsWithdrawModalOpen(false);
      setWithdrawData({
        amount: "",
        bankName: "",
        accountNumber: "",
        accountName: "",
      });
      await fetchWalletData();
      showToast("Withdrawal request submitted successfully!");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to post errand", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleTopUp = async () => {
    setProcessing(true);
    try {
      const res = await api.post("/users/top-up", {
        amount: topUpAmount,
        email: user?.email,
      });
      if (res.data.checkout_url) {
        window.location.href = res.data.checkout_url;
        return;
      }
      await fetchWalletData();
      setIsTopUpModalOpen(false);
      showToast(`✅ ₦${Number(topUpAmount).toLocaleString()} added to your wallet!`);
    } catch (err) {
      showToast(err.response?.data?.message || "Payment failed. Please try again.", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handlePostErrand = async (submittedData) => {
    setProcessing(true);
    try {
      await api.post("/errands", {
        title: submittedData.title,
        description: submittedData.description,
        fee: parseInt(submittedData.fee) || 0,
        category: submittedData.category,
        dropoffLocation: submittedData.location,
        pickupLocation: "Campus",
        erranderId: selectedMessenger?._id || undefined,
      });
      setIsPostModalOpen(false);
      setSelectedMessenger(null);
      fetchErrands();
      showToast("Errand posted successfully!");
      navigate("/history");
    } catch (err) {
      showToast(err.response?.data?.message || "Check balance.", "info");
    } finally {
      setProcessing(false);
    }
  };

  const handleApplyForErrand = async (id) => {
    // Optimistic: instantly show "Requested" state — no blocking overlay
    setErrands((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, candidates: [...(e.candidates || []), { _id: cachedUserId }] }
          : e,
      ),
    );
    try {
      await api.patch(`/errands/${id}/apply`);
      showToast("✅ Request sent! The sender will be notified.");
    } catch (err) {
      // Rollback optimistic update on failure
      setErrands((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, candidates: (e.candidates || []).filter((c) => (c._id || c) !== cachedUserId) }
            : e,
        ),
      );
      showToast(err.response?.data?.message || "Error sending request.", "error");
    }
  };

  // Opens the full-screen delivery confirmation overlay
  const handleCompleteTask = (id, errandTitle, errandFee) => {
    setConfirmOverlay({ errandId: id, errandTitle: errandTitle || "this errand", errandFee: errandFee || 0 });
  };

  // Called when ConfirmDeliveryOverlay successfully releases funds
  const handleDeliveryConfirmed = (id) => {
    setConfirmOverlay(null);
    // Optimistic update
    setActiveRequests((prev) =>
      prev.map((e) => e.id === id ? { ...e, status: "confirmed_completed" } : e),
    );
    fetchWalletData();
    // Open review modal
    setSelectedErrandId(id);
    setIsReviewModalOpen(true);
  };

  const handleStartErrand = async (id) => {
    // Optimistic update
    setActiveRequests((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "in_progress" } : e))
    );
    try {
      await api.patch(`/errands/${id}/start`);
      showToast("🚀 Errand started successfully!");
    } catch (err) {
      fetchActiveRequestsOnly();
      showToast(err.response?.data?.message || "Could not start errand.", "error");
    }
  };

  const handleRequestCompletion = async (id) => {
    // Optimistic update
    setActiveRequests((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "pending_sender_confirmation" } : e))
    );
    try {
      await api.patch(`/errands/${id}/request-completion`);
      showToast("✅ Completion requested. Waiting for sender confirmation.");
    } catch (err) {
      fetchActiveRequestsOnly();
      showToast(err.response?.data?.message || "Could not request completion.", "error");
    }
  };

  // Directly hire a messenger — no sheet, no modal
  const handleDirectHire = async (errandId, messengerId) => {
    if (hiringId) return;
    setHiringId(messengerId);
    setHirePicker(null);
    // Optimistic update
    setActiveRequests((prev) =>
      prev.map((e) =>
        e.id === errandId
          ? { ...e, status: "assigned", erranderId: messengerId, candidates: [] }
          : e,
      ),
    );
    try {
      await api.post(`/errands/${errandId}/select`, { messengerId });
      showToast("🎉 Messenger hired successfully!");
    } catch (err) {
      fetchActiveRequestsOnly();
      showToast(err.response?.data?.message || "Could not hire messenger.", "error");
    } finally {
      setHiringId(null);
    }
  };

  const handleCancelErrand = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this errand? The fee will be refunded to your wallet.")) return;
    
    // Optimistic update
    setActiveRequests((prev) => prev.filter((e) => e.id !== id));
    
    try {
      await api.delete(`/errands/${id}`);
      fetchWalletData(); // Refresh wallet to show refund
      showToast("Errand cancelled successfully.", "success");
    } catch (err) {
      fetchActiveRequestsOnly();
      showToast(err.response?.data?.message || "Failed to cancel errand.", "error");
    }
  };


  const filteredErrands = useMemo(() => {
    return errands.filter((e) => {
      const matchesSearch =
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.description.toLowerCase().includes(search.toLowerCase());
      const matchesCat =
        activeCategory === "All" || e.category === activeCategory;
      return matchesSearch && matchesCat && e.status === "open";
    });
  }, [errands, search, activeCategory]);

  const filteredMessengers = useMemo(() => {
    return messengers.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        (m.location || "").toLowerCase().includes(search.toLowerCase()) ||
        (m.bio || "").toLowerCase().includes(search.toLowerCase());
      return matchesSearch;
    });
  }, [messengers, search]);

  return (
    <div className="dashboard-page">
      {/* Full-screen processing overlay */}
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
              backdropFilter: "blur(6px)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div className="loader" style={{ width: 44, height: 44 }} />
            <div
              style={{
                fontWeight: 800,
                color: "var(--blue-600)",
                fontSize: "0.75rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              Processing…
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div className="container" variants={containerVariants} initial="hidden" animate="show">
        {/* ── Header ── */}
        <motion.div className="dashboard-header" variants={itemVariants}>
          <div className="dashboard-title" style={{ flex: 1 }}>
            <h1>
              Hello, {user?.name?.split(" ")[0] || "Student"}! 👋
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
              <div className="dashboard-balance-chip">
                <Wallet size={14} />
                ₦{user?.balance?.toLocaleString() || "0"}
              </div>
              <span className={`badge ${user?.isVerified ? "badge-green" : "badge-blue"}`}>
                {user?.isVerified ? "✓ Verified" : "Unverified"}
              </span>
              {user?.rating > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.8rem", color: "var(--gray-500)", fontWeight: 600 }}>
                  <Star size={13} fill="var(--amber-500)" color="var(--amber-500)" />
                  {user.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0, marginTop: 4 }}>
            <NotificationCenter />
            {userRole === "sender" && (
              <button
                className="btn btn-primary"
                onClick={() => setIsPostModalOpen(true)}
                style={{ borderRadius: 12 }}
              >
                <Plus size={18} /> Post Errand
              </button>
            )}
          </div>
        </motion.div>

        {/* ── Wallet & Payouts Card ── */}
        <motion.div
          className="card dash-wallet-card"
          variants={itemVariants}
        >
          {/* Left Column: Balance & Action */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 16 }}>
            <div>
              <span style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.8, fontWeight: 700 }}>
                LCU Errand Wallet
              </span>
              <div className="dash-wallet-balance">
                <Wallet size={32} /> ₦{user?.balance?.toLocaleString() || "0"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                className="btn"
                onClick={() => setIsTopUpModalOpen(true)}
                style={{
                  background: "#ffffff",
                  color: "#1e4db7",
                  fontWeight: 800,
                  borderRadius: 12,
                  padding: "10px 18px",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(255,255,255,0.15)",
                }}
              >
                Top Up Funds
              </button>
              <button
                className="btn"
                onClick={() => setIsWithdrawModalOpen(true)}
                style={{
                  background: "rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                  fontWeight: 800,
                  borderRadius: 12,
                  padding: "10px 18px",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
                }}
              >
                Withdraw Funds
              </button>
            </div>
          </div>

          {/* Right Column: Explainer / Recent Request */}
          <div className="dash-wallet-right">
            <h4 style={{ fontSize: "0.85rem", fontWeight: 800, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em", color: "#60a5fa" }}>
              Secure Payment System
            </h4>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.82rem", opacity: 0.9, display: "flex", flexDirection: "column", gap: 6 }}>
              <li><strong>Escrow Protection:</strong> Senders pay in advance. Funds are held securely in escrow.</li>
              <li><strong>Delivery Release:</strong> When the sender confirms delivery, funds release instantly to the messenger's LCU Wallet.</li>
              <li><strong>Direct Cash Out:</strong> Withdraw from your wallet balance to your bank account anytime.</li>
            </ul>

            {/* Pending withdrawal notice */}
            {withdrawals.filter(w => w.status === "pending").length > 0 && (
              <div style={{ background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: 12, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
                <span style={{ fontSize: "0.78rem", color: "#fef3c7", fontWeight: 700 }}>
                  Pending payout: ₦{withdrawals.find(w => w.status === "pending")?.amount?.toLocaleString()} (Processing)
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Search ── */}
        <motion.div className="search-bar" variants={itemVariants}>
          <div className="search-input-wrapper">
            <Search size={18} />
            <input
              id="errand-search"
              placeholder="Search errands, meals, etc…"
              className="input-field"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </motion.div>

        {/* ── Category Filters ── */}
        <motion.div className="filter-chips" variants={itemVariants}>
          {CATEGORIES.map((cat) => (
            <motion.button
              key={cat}
              id={`filter-${cat.toLowerCase()}`}
              onClick={() => setActiveCategory(cat)}
              className={`chip ${activeCategory === cat ? "active" : ""}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {CATEGORY_EMOJI[cat] && <span>{CATEGORY_EMOJI[cat]}</span>}
              {cat}
            </motion.button>
          ))}
        </motion.div>

        {/* ── Action Required Banner (sender pending confirmation) ── */}
        {userRole === "sender" && activeRequests.some(e => ["pending_confirmation", "pending_sender_confirmation"].includes(e.status)) && (
          <div className="action-required-banner">
            <div className="action-required-banner-left">
              <div className="action-required-bell">🔔</div>
              <div>
                <div className="action-required-title">Action Required</div>
                <div className="action-required-sub">
                  {activeRequests.filter(e => ["pending_confirmation", "pending_sender_confirmation"].includes(e.status)).length} errand{activeRequests.filter(e => ["pending_confirmation", "pending_sender_confirmation"].includes(e.status)).length > 1 ? "s" : ""} waiting for your confirmation
                </div>
              </div>
            </div>
            <div className="action-required-errands">
              {activeRequests.filter(e => ["pending_confirmation", "pending_sender_confirmation"].includes(e.status)).map(errand => (
                <button
                  key={errand.id}
                  className="action-required-confirm-btn"
                  onClick={() => handleCompleteTask(errand.id, errand.title, errand.fee)}
                >
                  <CheckCircle size={15} />
                  Confirm "{errand.title.length > 20 ? errand.title.slice(0, 20) + "…" : errand.title}" · ₦{errand.fee?.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeRequests.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <h2 style={{ fontSize: "1rem", fontWeight: 900, color: "var(--gray-900)" }}>
                Active Errands
              </h2>
              <span style={{ fontSize: "0.75rem", color: "var(--gray-400)", fontWeight: 700 }}>
                {activeRequests.length} active errand{activeRequests.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="dash-active-list">
              {activeRequests.slice(0, 6).map((errand) => (
                <div
                  key={errand.id}
                  className="card dash-active-card"
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "0.88rem",
                        fontWeight: 800,
                        color: "var(--gray-900)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {errand.title}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 5 }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--gray-500)", fontWeight: 700 }}>
                        {errand.status?.replace(/_/g, " ")}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--blue-600)", fontWeight: 800 }}>
                        ₦{errand.fee?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, flexDirection: "column" }}>
                    {/* Direct Hire button */}
                    {userRole === "sender" && errand.status === "open" && errand.candidates && errand.candidates.length > 0 && (
                      errand.candidates.length === 1 ? (
                        // 1 candidate — hire immediately
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}
                          disabled={hiringId === (errand.candidates[0]?._id || errand.candidates[0])}
                          onClick={() => {
                            const cId = errand.candidates[0]?._id || errand.candidates[0];
                            handleDirectHire(errand.id, cId);
                          }}
                        >
                          {hiringId === (errand.candidates[0]?._id || errand.candidates[0])
                            ? "Hiring…"
                            : <><Users size={13} /> Hire</>}
                        </button>
                      ) : (
                        // Multiple candidates — inline picker
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}
                            onClick={() => setHirePicker(hirePicker === errand.id ? null : errand.id)}
                          >
                            <Users size={13} /> Hire ({errand.candidates.length})
                          </button>
                          {hirePicker === errand.id && (
                            <div style={{
                              background: "var(--white)",
                              border: "1px solid var(--gray-200)",
                              borderRadius: 12,
                              padding: "8px 0",
                              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                              minWidth: 160,
                              zIndex: 100,
                            }}>
                              {errand.candidates.map((c, i) => {
                                const cId = c?._id || c?.id || (typeof c === "string" ? c : null);
                                const cName = c?.name || `Messenger ${i + 1}`;
                                if (!cId) return null;
                                return (
                                  <button
                                    key={cId}
                                    disabled={hiringId === cId}
                                    onClick={() => handleDirectHire(errand.id, cId)}
                                    style={{
                                      display: "block", width: "100%", textAlign: "left",
                                      padding: "8px 14px", border: "none", background: "transparent",
                                      fontSize: "0.82rem", fontWeight: 700, cursor: "pointer",
                                      color: "var(--gray-800)",
                                    }}
                                  >
                                    {hiringId === cId ? "Hiring…" : `Hire ${cName}`}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )
                    )}
                    {/* Cancel Errand button */}
                    {userRole === "sender" && errand.status === "open" && (
                      <button
                        onClick={() => handleCancelErrand(errand.id)}
                        className="btn btn-sm"
                        style={{
                          background: "var(--red-50)",
                          color: "var(--red-600)",
                          border: "1px solid var(--red-200)",
                          fontWeight: 700,
                          padding: "6px 12px",
                        }}
                      >
                        Cancel
                      </button>
                    )}
                    {/* Confirm Delivery button */}
                    {userRole === "sender" && ["pending_confirmation", "pending_sender_confirmation"].includes(errand.status) && (
                      <button
                        onClick={() => handleCompleteTask(errand.id, errand.title, errand.fee)}
                        className="btn btn-primary btn-sm"
                        style={{
                          background: "linear-gradient(135deg,#16a34a,#22c55e)",
                          borderColor: "transparent",
                          color: "#fff",
                          fontWeight: 800,
                          display: "flex", alignItems: "center", gap: 5,
                          animation: "pulse 2s infinite"
                        }}
                      >
                        <CheckCircle size={13} /> Confirm
                      </button>
                    )}
                    {/* Start Errand button (Messenger) */}
                    {userRole === "messenger" && errand.status === "assigned" && (
                      <button
                        onClick={() => handleStartErrand(errand.id)}
                        className="btn btn-primary btn-sm"
                        style={{
                          background: "var(--blue-600)",
                          color: "#fff",
                          fontWeight: 800,
                          display: "flex", alignItems: "center", gap: 5,
                        }}
                      >
                        🚀 Start
                      </button>
                    )}
                    {/* Complete Errand button (Messenger) */}
                    {userRole === "messenger" && errand.status === "in_progress" && (
                      <button
                        onClick={() => handleRequestCompletion(errand.id)}
                        className="btn btn-primary btn-sm"
                        style={{
                          background: "linear-gradient(135deg,#16a34a,#22c55e)",
                          borderColor: "transparent",
                          color: "#fff",
                          fontWeight: 800,
                          display: "flex", alignItems: "center", gap: 5,
                        }}
                      >
                        <CheckCircle size={13} /> Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Errand Feed (Only for Messengers) ── */}
        {userRole === "messenger" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, marginTop: 12 }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--gray-900)" }}>
                Open Errands
              </h2>
              <span style={{ fontSize: "0.75rem", color: "var(--gray-400)", fontWeight: 700 }}>
                {filteredErrands.length} open errand{filteredErrands.length === 1 ? "" : "s"}
              </span>
            </div>

            {loading ? (
              <div className="errand-grid">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton-card">
                    <div className="skeleton skeleton-line short" />
                    <div className="skeleton skeleton-line medium" style={{ height: 22 }} />
                    <div className="skeleton skeleton-line full" />
                    <div className="skeleton skeleton-line medium" />
                  </div>
                ))}
              </div>
            ) : filteredErrands.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <Search size={36} />
                </div>
                <h3>No Errands Found</h3>
                <p>
                  {search || activeCategory !== "All"
                    ? "Try adjusting your search or filters."
                    : "No open errands right now. Check back soon!"}
                </p>
              </div>
            ) : (
              <div className="errand-grid">
                {filteredErrands.map((errand) => {
                  const catStyle = CATEGORY_STYLES[errand.category] || {
                    backgroundColor: "var(--gray-50)",
                    color: "var(--gray-600)",
                    border: "1px solid var(--gray-200)",
                  };
                  return (
                    <motion.div
                      key={errand.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className="card errand-card"
                    >
                      <div className="card-body" style={{ padding: 18 }}>
                        {/* Card top */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: 14,
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 800,
                              padding: "4px 10px",
                              borderRadius: "var(--radius-full)",
                              textTransform: "uppercase",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              ...catStyle
                            }}
                          >
                            {CATEGORY_EMOJI[errand.category] || "✨"} {errand.category}
                          </span>
                          <span
                            style={{
                              fontWeight: 900,
                              fontSize: "1.15rem",
                              color: "var(--blue-700)",
                              letterSpacing: "-0.5px",
                            }}
                          >
                            ₦{errand.fee?.toLocaleString()}
                          </span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 12,
                            minWidth: 0,
                          }}
                        >
                          {errand.posterPicture ? (
                            <img
                              src={errand.posterPicture}
                              alt={errand.posterName}
                              style={{ width: 38, height: 38, borderRadius: 12, objectFit: "cover", flexShrink: 0 }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 12,
                                background: "var(--blue-50)",
                                color: "var(--blue-600)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 900,
                                flexShrink: 0,
                              }}
                            >
                              {(errand.posterName || "U").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: "0.86rem", fontWeight: 900, color: "var(--gray-900)" }}>
                              {errand.posterName}
                            </div>
                            <div
                              style={{
                                fontSize: "0.72rem",
                                color: "var(--gray-500)",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {[errand.posterDepartment, errand.posterLocation].filter(Boolean).join(" • ") || "Student"}
                            </div>
                          </div>
                          <span style={{ fontSize: "0.68rem", color: "var(--gray-400)", fontWeight: 700, flexShrink: 0 }}>
                            {new Date(errand.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Title */}
                        <h3
                          style={{
                            fontWeight: 800,
                            fontSize: "1rem",
                            color: "var(--gray-900)",
                            marginBottom: 8,
                            lineHeight: 1.35,
                          }}
                        >
                          {errand.title}
                        </h3>

                        {/* Description */}
                        <p
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--gray-500)",
                            marginBottom: 18,
                            lineHeight: 1.55,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {errand.description}
                        </p>

                        {/* Footer */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            paddingTop: 14,
                            borderTop: "1px solid var(--gray-100)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              fontSize: "0.8rem",
                              color: "var(--gray-500)",
                              fontWeight: 500,
                              minWidth: 0,
                              overflow: "hidden",
                            }}
                          >
                            <MapPin size={13} style={{ flexShrink: 0 }} />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {errand.location || "Not specified"}
                            </span>
                          </div>

                          {userRole === "messenger" && user?.isVerified && errand.posterId !== cachedUserId && (() => {
                            const hasApplied = errand.candidates && errand.candidates.some(c => (c._id || c) === cachedUserId);
                            
                            if (hasApplied) {
                              return (
                                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--green-600)", background: "var(--green-50)", padding: "4px 10px", borderRadius: 20, border: "1px solid var(--green-200)", flexShrink: 0 }}>
                                  ✓ Requested
                                </span>
                              );
                            }
                            const isExpanded = pendingAcceptId === errand.id;
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

                          {errand.posterId === cachedUserId && (
                            <span
                              style={{
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                color: "var(--blue-500)",
                                background: "var(--blue-50)",
                                padding: "3px 10px",
                                borderRadius: "var(--radius-full)",
                              }}
                            >
                              Your Post
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* ── Confirm Delivery Overlay ── */}
      <ConfirmDeliveryOverlay
        isOpen={!!confirmOverlay}
        errandId={confirmOverlay?.errandId}
        errandTitle={confirmOverlay?.errandTitle}
        errandFee={confirmOverlay?.errandFee}
        onClose={() => setConfirmOverlay(null)}
        onSuccess={handleDeliveryConfirmed}
      />



      {/* ── Withdrawal Modal ── */}
      <AnimatePresence>
        {isWithdrawModalOpen && (
          <div
            className="modal-overlay"
            onClick={() => setIsWithdrawModalOpen(false)}
          >
            <motion.div
              {...modalAnimation}
              className="modal-container"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: 440,
                width: "100%"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                  paddingBottom: 16,
                  borderBottom: "1px solid var(--gray-100)",
                }}
              >
                <h3 style={{ fontWeight: 900, fontSize: "1.2rem", margin: 0, color: "var(--gray-900)" }}>
                  Withdraw Funds
                </h3>
                <button
                  className="btn-icon"
                  onClick={() => setIsWithdrawModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleWithdraw}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--gray-700)" }}>
                      Amount to Withdraw (₦)
                    </label>
                    <input
                      type="number"
                      required
                      min="1000"
                      className="input-field"
                      placeholder="Minimum ₦1,000"
                      value={withdrawData.amount}
                      onChange={(e) => setWithdrawData({ ...withdrawData, amount: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--gray-700)" }}>
                      Bank Name
                    </label>
                    <input
                      type="text"
                      required
                      className="input-field"
                      placeholder="e.g. GTBank, Access Bank"
                      value={withdrawData.bankName}
                      onChange={(e) => setWithdrawData({ ...withdrawData, bankName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--gray-700)" }}>
                      Account Number
                    </label>
                    <input
                      type="text"
                      required
                      maxLength="10"
                      className="input-field"
                      placeholder="10-digit Account Number"
                      value={withdrawData.accountNumber}
                      onChange={(e) => setWithdrawData({ ...withdrawData, accountNumber: e.target.value.replace(/\D/g, "") })}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--gray-700)" }}>
                      Account Name
                    </label>
                    <input
                      type="text"
                      required
                      className="input-field"
                      placeholder="Official Bank Account Name"
                      value={withdrawData.accountName}
                      onChange={(e) => setWithdrawData({ ...withdrawData, accountName: e.target.value })}
                    />
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--gray-500)", lineHeight: 1.4, background: "var(--gray-50)", padding: 12, borderRadius: 12 }}>
                    <strong>Note:</strong> Withdrawals are processed manually by administrators within 24 hours. Please ensure your account details are correct.
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                  <button
                    type="button"
                    onClick={() => setIsWithdrawModalOpen(false)}
                    className="btn btn-outline"
                    style={{ flex: 1, borderRadius: 12 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 1, borderRadius: 12 }}
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Post Errand Modal ── */}
      <PostErrandModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        onSubmit={handlePostErrand}
        isProcessing={processing}
      />

      {/* ── Top Up Modal ── */}
      <AnimatePresence>
        {isTopUpModalOpen && (
          <div
            className="modal-overlay"
            onClick={() => setIsTopUpModalOpen(false)}
          >
            <motion.div
              {...modalAnimation}
              className="modal-container"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: 420,
                width: "100%"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                  paddingBottom: 16,
                  borderBottom: "1px solid var(--gray-100)",
                }}
              >
                <h3 style={{ fontWeight: 900, fontSize: "1.2rem", margin: 0, color: "var(--gray-900)" }}>
                  Top Up Wallet
                </h3>
                <button
                  className="btn-icon"
                  onClick={() => setIsTopUpModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--gray-700)" }}>
                    Enter Amount (₦)
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    placeholder="e.g. 2000"
                    style={{ fontSize: "1.25rem", fontWeight: 700, height: 56 }}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  {["500", "1000", "2000", "5000", "10000", "20000"].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setTopUpAmount(amt)}
                      style={{
                        padding: "10px 8px",
                        borderRadius: 12,
                        border: `2px solid ${topUpAmount === amt ? "var(--blue-600)" : "var(--gray-200)"}`,
                        background: topUpAmount === amt ? "var(--blue-50)" : "white",
                        color: topUpAmount === amt ? "var(--blue-700)" : "var(--gray-600)",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        transition: "all 0.2s",
                      }}
                    >
                      ₦{Number(amt).toLocaleString()}
                    </button>
                  ))}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    padding: "10px 14px",
                    background: "var(--gray-50)",
                    borderRadius: 12,
                    fontSize: "0.78rem",
                    color: "var(--gray-500)",
                  }}
                >
                  <CheckCheck size={16} color="var(--green-500)" />
                  <span>Secured by Paystack · Card · Transfer · USSD</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => setIsTopUpModalOpen(false)}
                  className="btn btn-outline"
                  style={{ flex: 1, borderRadius: 12 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTopUp}
                  className="btn btn-primary"
                  disabled={processing || !topUpAmount || Number(topUpAmount) < 100}
                  style={{ flex: 1, borderRadius: 12 }}
                >
                  {processing ? "Redirecting..." : `Deposit ₦${Number(topUpAmount || 0).toLocaleString()}`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          navigate("/history");
        }}
        errandId={selectedErrandId || ""}
        onReviewComplete={() => {
          fetchErrands();
          navigate("/history");
        }}
        role={userRole}
      />

    </div>
  );
};

export default Dashboard;
