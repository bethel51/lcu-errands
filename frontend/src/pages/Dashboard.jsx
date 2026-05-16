import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Plus, X, Wallet, ArrowRight } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
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

  const userRole = localStorage.getItem("userRole") || "messenger";
  // Cache user id once to avoid repeated JSON.parse on every errand mapping
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
          setErrands(errandsRes.value.data.map(mapBackendToFrontend));
        }
        if (historyRes.status === "fulfilled") {
          const active = historyRes.value.data.filter(
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
          setMessengers(messengersRes.value.data);
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
      api.get(`/chat/${activeChat._id}`).then((res) => setMessages(res.data));
      socket?.emit("join_room", activeChat._id);
    }
  }, [activeChat, socket]);

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
      }
    });
    return () => {
      socket.off("new_errand");
      socket.off("notification");
      socket.off("receive_message");
    };
  }, [socket, activeChat, user]);

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

  const handleCompleteErrand = async (id) => {
    setProcessing(true);
    try {
      await api.patch(`/errands/${id}/complete`);
      showToast("Errand completed!");
      fetchErrands();
    } catch (err) {
      showToast(err.response?.data?.message || "Error.", "info");
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
    return messengers.filter((m) =>
      m.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [messengers, search]);

  return (
    <div
      style={{
        padding: "20px 0 100px",
        maxWidth: 1200,
        margin: "0 auto",
        minHeight: "100vh",
      }}
    >
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
                fontSize: "0.8rem",
              }}
            >
              PROCESSING...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container">
        <div className="dashboard-header" style={{ flexWrap: "wrap", gap: 20 }}>
          <div className="dashboard-title">
            <h1 style={{ fontSize: "1.75rem", fontWeight: 900 }}>
              Hello, {user?.name?.split(" ")[0] || "Student"}! 👋
            </h1>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginTop: 8,
              }}
            >
              <div
                style={{
                  background: "var(--blue-50)",
                  padding: "6px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--blue-100)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Wallet size={14} color="var(--blue-600)" />
                <span style={{ fontWeight: 800, color: "var(--blue-600)" }}>
                  ₦{user?.balance?.toLocaleString() || 0}
                </span>
              </div>
              <span
                className={`badge ${user?.isVerified ? "badge-green" : "badge-blue"}`}
              >
                {user?.isVerified ? "VERIFIED" : "UNVERIFIED"}
              </span>
            </div>
          </div>
          {userRole === "sender" && (
            <button
              className="btn btn-primary"
              onClick={() => setIsPostModalOpen(true)}
              style={{ boxShadow: "var(--shadow-lg)" }}
            >
              <Plus size={18} /> Post Errand
            </button>
          )}
        </div>

        <div className="search-bar" style={{ marginBottom: 30 }}>
          <div className="search-input-wrapper">
            <Search size={18} />
            <input
              placeholder="Search errands, food, etc..."
              className="input-field"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div
          className="filter-chips"
          style={{ overflowX: "auto", paddingBottom: 10 }}
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`chip ${activeCategory === cat ? "active" : ""}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ERRAND FEED */}
        {filteredErrands.length === 0 && !loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              background: "white",
              borderRadius: 24,
              border: "1px dashed var(--gray-300)",
              marginTop: 20,
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                background: "var(--gray-50)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                color: "var(--gray-400)",
              }}
            >
              <Search size={40} />
            </div>
            <h3
              style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: 8 }}
            >
              No Errands Found
            </h3>
            <p
              style={{
                color: "var(--gray-500)",
                maxWidth: 400,
                margin: "0 auto",
              }}
            >
              There are currently no open errands matching your criteria. Check
              back later!
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 20,
            }}
          >
            {filteredErrands.map((errand) => (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card"
                key={errand.id}
              >
                <div className="card-body">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 15,
                    }}
                  >
                    <span className="badge badge-blue">
                      {errand.category.toUpperCase()}
                    </span>
                    <span style={{ fontWeight: 900, fontSize: "1.1rem" }}>
                      ₦{errand.fee}
                    </span>
                  </div>
                  <h3 style={{ fontWeight: 800, marginBottom: 10 }}>
                    {errand.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--gray-500)",
                      marginBottom: 20,
                      lineBreak: "anywhere",
                    }}
                  >
                    {errand.description}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: "0.8rem",
                        color: "var(--gray-600)",
                      }}
                    >
                      <MapPin size={14} /> {errand.location}
                    </div>
                    {userRole === "messenger" && user?.isVerified && (
                      <button
                        onClick={() => handleAcceptErrand(errand.id)}
                        className="btn btn-primary btn-sm"
                      >
                        Accept <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* POST MODAL */}
      <AnimatePresence>
        {isPostModalOpen && (
          <div
            className="modal-overlay"
            onClick={() => setIsPostModalOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="modal-container"
              onClick={(e) => e.stopPropagation()}
              style={{ padding: 25, borderRadius: 24, maxWidth: 450 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 25,
                }}
              >
                <h2 style={{ fontWeight: 900 }}>Post New Errand</h2>
                <button onClick={() => setIsPostModalOpen(false)}>
                  <X />
                </button>
              </div>
              <form
                onSubmit={handlePostErrand}
                style={{ display: "flex", flexDirection: "column", gap: 15 }}
              >
                <div>
                  <label className="form-label">Title</label>
                  <input
                    className="input-field"
                    placeholder="e.g. Buy Lunch at J-One"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Drop-off Location</label>
                  <input
                    className="input-field"
                    placeholder="e.g. Block A, Room 202"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    required
                  />
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 15,
                  }}
                >
                  <div>
                    <label className="form-label">Category</label>
                    <select
                      className="input-field"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                    >
                      {CATEGORIES.filter((c) => c !== "All").map((c) => (
                        <option key={c} value={c}>
                          {c}
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
                      onChange={(e) =>
                        setFormData({ ...formData, fee: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">Details</label>
                  <textarea
                    className="input-field"
                    style={{ minHeight: 100 }}
                    placeholder="Specify items, notes, etc."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: "100%", padding: 15 }}
                >
                  Publish Task
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

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 100,
            left: "50%",
            transform: "translateX(-50%)",
            background:
              toast.type === "success" ? "var(--green-500)" : "var(--blue-500)",
            color: "white",
            padding: "12px 24px",
            borderRadius: 12,
            fontWeight: 700,
            zIndex: 10000,
            boxShadow: "var(--shadow-xl)",
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
