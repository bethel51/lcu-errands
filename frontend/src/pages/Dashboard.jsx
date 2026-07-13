import { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api";
import ReviewModal from "../components/ReviewModal";
import { useSocket } from "../context/SocketContext";
import NotificationCenter from "../components/NotificationCenter";

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
  const [toast, setToast] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [acceptingErrand, setAcceptingErrand] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatImageUrl, setChatImageUrl] = useState("");
  const [chatImageUploading, setChatImageUploading] = useState(false);

  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawData, setWithdrawData] = useState({
    amount: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
  });

  const userRole = localStorage.getItem("userRole") || "messenger";
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

  const fetchWalletData = async () => {
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
  };

  const loadDashboard = async () => {
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
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    const isAnyModalOpen = isPostModalOpen || isWithdrawModalOpen || !!acceptingErrand || isReviewModalOpen;
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isPostModalOpen, isWithdrawModalOpen, acceptingErrand, isReviewModalOpen]);

  useEffect(() => {
    if (!socket) return;
    socket.on("new_errand", (newErrand) => {
      setErrands((prev) => [mapBackendToFrontend(newErrand), ...prev]);
    });
    socket.on("notification", (data) => {
      loadDashboard();
      showToast(
        data.message,
        data.type === "errand_requested" ? "info" : "success",
      );
    });
    return () => {
      socket.off("new_errand");
      socket.off("notification");
    };
  }, [socket, user]);

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

  const handlePostErrand = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await api.post("/errands", {
        title: formData.title,
        description: formData.description,
        fee: parseInt(formData.fee) || 0,
        category: formData.category,
        dropoffLocation: formData.location,
        pickupLocation: "Campus",
        erranderId: selectedMessenger?._id || undefined,
      });
      setIsPostModalOpen(false);
      setSelectedMessenger(null);
      setFormData({
        title: "",
        description: "",
        fee: "",
        location: "",
        category: "Meals",
      });
      fetchErrands();
      showToast("Errand posted successfully!");
    } catch (err) {
      showToast(err.response?.data?.message || "Check balance.", "info");
    } finally {
      setProcessing(false);
    }
  };

  const handleApplyForErrand = async (id) => {
    setProcessing(true);
    try {
      await api.patch(`/errands/${id}/apply`);
      showToast("✅ Request sent! The sender will be notified.");
      loadDashboard();
    } catch (err) {
      showToast(err.response?.data?.message || "Error sending request.", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleCompleteTask = async (id) => {
    setProcessing(true);
    try {
      await api.patch(`/errands/${id}/complete`);
      showToast("✅ Delivery confirmed! Payment released to messenger.");
      window.location.reload();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to confirm delivery.", "error");
    } finally {
      setProcessing(false);
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

      <div className="container">
        {/* ── Header ── */}
        <div className="dashboard-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
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
        </div>

        {/* ── Wallet & Payouts Card ── */}
        <div
          className="card"
          style={{
            background: "linear-gradient(135deg, #1e4db7 0%, #0f172a 100%)",
            color: "#ffffff",
            borderRadius: 24,
            padding: 24,
            marginBottom: 28,
            boxShadow: "0 10px 25px -5px rgba(30, 77, 183, 0.3)",
            display: "grid",
            gap: 20,
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          }}
        >
          {/* Left Column: Balance & Action */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 16 }}>
            <div>
              <span style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.8, fontWeight: 700 }}>
                LCU Errand Wallet
              </span>
              <div style={{ fontSize: "2.5rem", fontWeight: 900, marginTop: 4, display: "flex", alignItems: "center", gap: 10 }}>
                <Wallet size={32} /> ₦{user?.balance?.toLocaleString() || "0"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {userRole === "messenger" ? (
                <button
                  className="btn"
                  onClick={() => setIsWithdrawModalOpen(true)}
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
                  Withdraw Funds
                </button>
              ) : (
                <div style={{ fontSize: "0.85rem", opacity: 0.9, lineHeight: 1.4 }}>
                  💡 <strong>To Top Up:</strong> Go to the <strong>Profile</strong> tab to add funds to your wallet instantly using Paystack.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Explainer / Recent Request */}
          <div style={{ borderLeft: "1px solid rgba(255,255,255,0.15)", paddingLeft: 20, display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>
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
        </div>

        {/* ── Search ── */}
        <div className="search-bar">
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
        </div>

        {/* ── Category Filters ── */}
        <div className="filter-chips">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              id={`filter-${cat.toLowerCase()}`}
              onClick={() => setActiveCategory(cat)}
              className={`chip ${activeCategory === cat ? "active" : ""}`}
            >
              {CATEGORY_EMOJI[cat] && <span>{CATEGORY_EMOJI[cat]}</span>}
              {cat}
            </button>
          ))}
        </div>

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
            <div style={{ display: "grid", gap: 12 }}>
              {activeRequests.slice(0, 4).map((errand) => (
                <div
                  key={errand.id}
                  className="card"
                  style={{
                    padding: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                       style={{
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
                         {errand.status?.replace("_", " ")}
                       </span>
                       <span style={{ fontSize: "0.75rem", color: "var(--blue-600)", fontWeight: 800 }}>
                         ₦{errand.fee?.toLocaleString()}
                       </span>
                     </div>

                    {/* Render Candidates/Applicants list if status is open */}
                    {userRole === "sender" && errand.status === "open" && errand.candidates && errand.candidates.length > 0 && (
                      <div style={{ marginTop: 12, borderTop: "1px solid var(--gray-100)", paddingTop: 10 }}>
                        <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--gray-500)", textTransform: "uppercase", marginBottom: 8 }}>
                          Applicants ({errand.candidates.length})
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {errand.candidates.map((candidate) => (
                            <div key={candidate._id} style={{ display: "flex", alignItems: "center", justifyBetween: "space-between", gap: 10, background: "var(--gray-50)", padding: 8, borderRadius: 12 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <SenderAvatar picture={candidate.profilePicture} name={candidate.name} />
                                <div>
                                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--gray-900)" }}>{candidate.name}</div>
                                  <div style={{ fontSize: "0.72rem", color: "var(--gray-500)" }}>
                                    {candidate.department && <span>{candidate.department} · </span>}
                                    {candidate.rating > 0 && <span style={{ color: "var(--amber-500)" }}>★ {candidate.rating.toFixed(1)}</span>}
                                  </div>
                                </div>
                              </div>
                              <button
                                className="btn btn-primary btn-sm"
                                style={{ padding: "6px 12px", fontSize: "0.75rem", borderRadius: 8, marginLeft: "auto" }}
                                onClick={async () => {
                                  try {
                                    setProcessing(true);
                                    await api.post(`/errands/${errand.id}/select`, { messengerId: candidate._id });
                                    showToast("🎉 Messenger hired successfully!");
                                    loadDashboard();
                                  } catch (err) {
                                    showToast(err.response?.data?.message || "Could not hire messenger.", "error");
                                  } finally {
                                    setProcessing(false);
                                  }
                                }}
                              >
                                Hire
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                    {userRole === "sender" && errand.posterId?.toString() === cachedUserId && ["assigned", "in_progress", "pending_confirmation", "pending_sender_confirmation"].includes(errand.status) && (
                      <button
                        onClick={() => handleCompleteTask(errand.id)}
                        className="btn btn-primary btn-sm"
                        style={{
                          background: "var(--blue-600)",
                          borderColor: "var(--blue-600)",
                          color: "var(--white)",
                          fontWeight: 750,
                          boxShadow: "0 0 10px rgba(37, 99, 235, 0.2)",
                          animation: ["pending_confirmation", "pending_sender_confirmation"].includes(errand.status) ? "pulse 2s infinite" : "none"
                        }}
                      >
                        Confirm Delivery 🔔
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
                            return (
                              <button
                                id={`accept-errand-${errand.id}`}
                                onClick={() => !hasApplied && setAcceptingErrand(errand)}
                                className="btn btn-primary btn-sm"
                                style={{
                                  flexShrink: 0,
                                  opacity: hasApplied ? 0.7 : 1,
                                  pointerEvents: hasApplied ? "none" : "auto",
                                  background: hasApplied ? "var(--gray-300)" : "var(--blue-600)",
                                  color: hasApplied ? "var(--gray-600)" : "#ffffff"
                                }}
                              >
                                {hasApplied ? "Requested" : "Apply"} <ArrowRight size={13} />
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
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "90%",
                maxWidth: 480,
                background: "var(--white)",
                borderRadius: 24,
                boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                zIndex: 9993,
                overflow: "hidden",
                padding: "24px 20px",
                maxHeight: "90vh",
                display: "flex",
                flexDirection: "column"
              }}
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

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
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
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green-500)" }} />
                        <span><strong>Pick Up:</strong> {acceptingErrand.pickupLocation}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", color: "var(--gray-600)" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--blue-500)" }} />
                      <span><strong>Drop Off:</strong> {acceptingErrand.location || "Not specified"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 24, borderTop: "1px solid var(--gray-100)", paddingTop: 16 }}>
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
          </>
        )}
      </AnimatePresence>



      {/* ── Withdrawal Modal ── */}
      <AnimatePresence>
        {isWithdrawModalOpen && (
          <div
            className="modal-overlay"
            onClick={() => setIsWithdrawModalOpen(false)}
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="modal-container"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 440 }}
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
      <AnimatePresence>
        {isPostModalOpen && (
          <div
            className="modal-overlay"
            onClick={() => setIsPostModalOpen(false)}
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="modal-container"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 460 }}
            >
              {/* Modal header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 24,
                  paddingBottom: 20,
                  borderBottom: "1px solid var(--gray-100)",
                }}
              >
                <div>
                  <h2 style={{ fontWeight: 900, fontSize: "1.25rem", color: "var(--gray-900)" }}>
                    Post New Errand
                  </h2>
                  <p style={{ fontSize: "0.85rem", color: "var(--gray-400)", marginTop: 4 }}>
                    Describe your task and set a reward
                  </p>
                </div>
                <button
                  onClick={() => setIsPostModalOpen(false)}
                  className="btn-icon"
                  style={{ flexShrink: 0 }}
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={handlePostErrand}
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <div>
                  <label className="form-label">Title</label>
                  <input
                    className="input-field"
                    placeholder="e.g. Buy Lunch at J-One"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Drop-off Location</label>
                  <input
                    className="input-field"
                    placeholder="e.g. Block A, Room 202"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label className="form-label">Category</label>
                    <select
                      className="input-field"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {CATEGORIES.filter((c) => c !== "All").map((c) => (
                        <option key={c} value={c}>
                          {CATEGORY_EMOJI[c]} {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Reward (₦)</label>
                    <input
                      className="input-field"
                      type="number"
                      placeholder="500"
                      value={formData.fee}
                      onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Details</label>
                  <textarea
                    className="input-field"
                    style={{ minHeight: 96, resize: "vertical" }}
                    placeholder="Specify items, quantities, special notes…"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: "100%", padding: "14px", marginTop: 4, fontSize: "1rem" }}
                  disabled={processing}
                >
                  {processing ? "Publishing…" : "🚀 Publish Errand"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        errandId={selectedErrandId || ""}
        onReviewComplete={fetchErrands}
        role={userRole}
      />

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

export default Dashboard;
