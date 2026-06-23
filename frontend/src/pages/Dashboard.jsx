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
  MessageSquare,
  Send,
  ImagePlus,
  CheckCheck,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api";
import ReviewModal from "../components/ReviewModal";
import { useSocket } from "../context/SocketContext";

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

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatImageUrl, setChatImageUrl] = useState("");
  const [chatImageUploading, setChatImageUploading] = useState(false);

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

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [errandsRes, historyRes, profileRes, messengersRes] =
          await Promise.allSettled([
            api.get("/errands"),
            api.get("/errands/history"),
            api.get("/users/profile"),
            api.get("/users/messengers"),
          ]);

        if (errandsRes.status === "fulfilled") {
          const data = Array.isArray(errandsRes.value.data) ? errandsRes.value.data : [];
          setErrands(data.map(mapBackendToFrontend));
        }
        if (historyRes.status === "fulfilled") {
          const data = Array.isArray(historyRes.value.data) ? historyRes.value.data : [];
          const active = data.filter(
            (e) => e.status !== "completed" && e.status !== "cancelled",
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
      } catch (err) {
        console.error("Dashboard load failed", err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  useEffect(() => {
    if (activeChat) {
      api.get(`/chat/${activeChat._id}`).then((res) => {
        setMessages(res.data);
        socket?.emit("read_receipt", { errandId: activeChat._id });
      });
      socket?.emit("join_room", activeChat._id);
    }
  }, [activeChat, socket]);

  useEffect(() => {
    const openChatId = location.state?.openChatId;
    if (!openChatId || activeChat) return;

    const match = activeRequests.find((errand) => {
      const errandId = errand._id || errand.id;
      return errandId === openChatId;
    });

    if (match) {
      setActiveChat({ ...match, _id: match._id || match.id });
      window.history.replaceState({}, document.title);
    }
  }, [location.state, activeRequests, activeChat]);

  useEffect(() => {
    if (!socket) return;
    socket.on("new_errand", (newErrand) => {
      setErrands((prev) => [mapBackendToFrontend(newErrand), ...prev]);
    });
    socket.on("notification", (data) => {
      fetchErrands();
      showToast(
        data.message,
        data.type === "errand_requested" ? "info" : "success",
      );
    });
    socket.on("receive_message", (data) => {
      if (activeChat?._id === data.room || activeChat?._id === data.errandId) {
        setMessages((prev) =>
          data.senderId === (user?._id || user?.id) ? prev : [...prev, data],
        );
        socket.emit("read_receipt", { errandId: data.errandId || data.room });
      }
    });
    socket.on("messages_read", ({ readBy }) => {
      if (readBy === (user?._id || user?.id)) return;
      setMessages((prev) =>
        prev.map((message) =>
          message.senderId === (user?._id || user?.id)
            ? { ...message, isRead: true }
            : message,
        ),
      );
    });
    return () => {
      socket.off("new_errand");
      socket.off("notification");
      socket.off("receive_message");
      socket.off("messages_read");
    };
  }, [socket, activeChat, user]);

  const handleOpenChat = (errand) => {
    setActiveChat({ ...errand, _id: errand._id || errand.id });
    setNewMessage("");
    setChatImageUrl("");
  };

  const handleUploadChatImage = async (file) => {
    if (!file) return;
    setChatImageUploading(true);
    try {
      const data = new FormData();
      data.append("image", file);
      const res = await api.post("/users/upload", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setChatImageUrl(res.data.url);
    } catch (err) {
      showToast(err.response?.data?.message || "Image upload failed.", "error");
    } finally {
      setChatImageUploading(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!socket || !activeChat) return;

    const text = newMessage.trim();
    if (!text && !chatImageUrl) return;

    const payload = {
      room: activeChat._id,
      text,
      imageUrl: chatImageUrl || undefined,
    };

    socket.emit("send_message", payload);
    setMessages((prev) => [
      ...prev,
      {
        _id: `local-${Date.now()}`,
        errandId: activeChat._id,
        senderId: user?._id || user?.id,
        text,
        imageUrl: chatImageUrl,
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    ]);
    setNewMessage("");
    setChatImageUrl("");
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

  const handleAcceptErrand = async (id) => {
    setProcessing(true);
    try {
      await api.patch(`/errands/${id}/accept`);
      showToast("Errand accepted!");
      navigate("/history");
    } catch (err) {
      showToast(err.response?.data?.message || "Error accepting.", "info");
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
        <div className="dashboard-header">
          <div className="dashboard-title">
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

          {userRole === "sender" && (
            <button
              className="btn btn-primary"
              onClick={() => setIsPostModalOpen(true)}
              style={{ flexShrink: 0 }}
            >
              <Plus size={18} /> Post Errand
            </button>
          )}
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
                {activeRequests.length} open conversation{activeRequests.length === 1 ? "" : "s"}
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
                  <div style={{ minWidth: 0 }}>
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
                  </div>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ flexShrink: 0 }}
                    onClick={() => handleOpenChat(errand)}
                  >
                    <MessageSquare size={14} /> Chat
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Errand Feed ── */}
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
            {userRole === "sender" && (
              <button
                className="btn btn-primary"
                style={{ marginTop: 24 }}
                onClick={() => setIsPostModalOpen(true)}
              >
                <Plus size={16} /> Post the First Errand
              </button>
            )}
          </div>
        ) : (
          <div className="errand-grid">
            {filteredErrands.map((errand) => (
              <motion.div
                key={errand.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="card errand-card"
              >
                <div className="card-body">
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
                        ...(CATEGORY_STYLES[errand.category] || {
                          backgroundColor: "var(--gray-50)",
                          color: "var(--gray-600)",
                          border: "1px solid var(--gray-200)",
                        })
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

                    {userRole === "messenger" && user?.isVerified && errand.posterId !== cachedUserId && (
                      <button
                        id={`accept-errand-${errand.id}`}
                        onClick={() => handleAcceptErrand(errand.id)}
                        className="btn btn-primary btn-sm"
                        style={{ flexShrink: 0 }}
                      >
                        Accept <ArrowRight size={13} />
                      </button>
                    )}

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
            ))}
          </div>
        )}
      </div>

      {/* ── Chat Modal ── */}
      <AnimatePresence>
        {activeChat && (
          <div
            className="modal-overlay"
            onClick={() => setActiveChat(null)}
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="modal-container"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 520, height: "min(720px, 86vh)", display: "flex", flexDirection: "column" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: 16,
                  borderBottom: "1px solid var(--gray-100)",
                  marginBottom: 16,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <h2
                    style={{
                      fontWeight: 900,
                      fontSize: "1.05rem",
                      color: "var(--gray-900)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {activeChat.title}
                  </h2>
                  <p style={{ fontSize: "0.78rem", color: "var(--gray-400)", marginTop: 4 }}>
                    Linked to errand ID {activeChat._id}
                  </p>
                </div>
                <button className="btn-icon" onClick={() => setActiveChat(null)}>
                  <X size={18} />
                </button>
              </div>

              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  paddingRight: 4,
                }}
              >
                {messages.length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--gray-400)", padding: "48px 16px" }}>
                    <MessageSquare size={36} style={{ opacity: 0.35, marginBottom: 10 }} />
                    <p style={{ fontWeight: 700 }}>No messages yet</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const senderId =
                      typeof message.senderId === "object"
                        ? message.senderId?._id
                        : message.senderId;
                    const isMine = senderId === (user?._id || user?.id);
                    return (
                      <div
                        key={message._id}
                        style={{
                          alignSelf: isMine ? "flex-end" : "flex-start",
                          maxWidth: "82%",
                          background: isMine ? "var(--blue-600)" : "var(--gray-50)",
                          color: isMine ? "white" : "var(--gray-800)",
                          borderRadius: 14,
                          padding: "10px 12px",
                        }}
                      >
                        {message.text && (
                          <div style={{ fontSize: "0.9rem", lineHeight: 1.45 }}>{message.text}</div>
                        )}
                        {message.imageUrl && (
                          <img
                            src={message.imageUrl}
                            alt="Chat attachment"
                            style={{
                              marginTop: message.text ? 8 : 0,
                              maxWidth: "100%",
                              maxHeight: 220,
                              borderRadius: 10,
                              objectFit: "cover",
                              display: "block",
                            }}
                            onClick={() => window.open(message.imageUrl, "_blank")}
                          />
                        )}
                        <div
                          style={{
                            marginTop: 6,
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 5,
                            alignItems: "center",
                            fontSize: "0.66rem",
                            opacity: 0.75,
                          }}
                        >
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {isMine && <CheckCheck size={12} color={message.isRead ? "#A7F3D0" : "currentColor"} />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {chatImageUrl && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 8,
                    border: "1px solid var(--gray-100)",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <img src={chatImageUrl} alt="Pending attachment" style={{ width: 54, height: 54, borderRadius: 10, objectFit: "cover" }} />
                  <span style={{ flex: 1, fontSize: "0.78rem", color: "var(--gray-500)", fontWeight: 700 }}>
                    Image ready to send
                  </span>
                  <button className="btn-icon" onClick={() => setChatImageUrl("")}>
                    <X size={15} />
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <label className="btn btn-outline btn-sm" style={{ cursor: chatImageUploading ? "wait" : "pointer", flexShrink: 0 }}>
                  <ImagePlus size={16} />
                  <input
                    type="file"
                    accept="image/*"
                    disabled={chatImageUploading}
                    onChange={(e) => handleUploadChatImage(e.target.files?.[0])}
                    style={{ display: "none" }}
                  />
                </label>
                <input
                  className="input-field"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={chatImageUploading ? "Uploading image..." : "Type a message"}
                  disabled={chatImageUploading}
                  style={{ minWidth: 0 }}
                />
                <button
                  className="btn btn-primary btn-sm"
                  type="submit"
                  disabled={chatImageUploading || (!newMessage.trim() && !chatImageUrl)}
                  style={{ flexShrink: 0 }}
                >
                  <Send size={15} />
                </button>
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
