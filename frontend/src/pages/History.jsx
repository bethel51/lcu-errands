import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock, Package, Star, Shield, CheckCircle, Upload, Activity, X, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import ReviewModal from "../components/ReviewModal";
import { useSocket } from "../context/SocketContext";
import NotificationCenter from "../components/NotificationCenter";

const History = () => {
  const navigate = useNavigate();
  const userRole = localStorage.getItem("userRole") || "messenger";
  const filterType = userRole === "sender" ? "posted" : "accepted";
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;

  const { socket } = useSocket();
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedErrandId, setSelectedErrandId] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Status Filter Tabs & Modal Confirmation States
  const [activeStatusTab, setActiveStatusTab] = useState("All");
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmErrandId, setConfirmErrandId] = useState(null);

  // Digital Footprint Timeline States
  const [intelFootprint, setIntelFootprint] = useState(null);
  const [intelModalOpen, setIntelModalOpen] = useState(false);
  const [loadingIntel, setLoadingIntel] = useState(false);

  // Proof Upload States
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [proofText, setProofText] = useState("");
  const [proofImage, setProofImage] = useState("");
  const [uploadingProof, setUploadingProof] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchHistory = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const userId = user.id || user._id || "";
    const cacheKey = `history_${userId}_${filterType}`;
    // Show cached immediately while fresh data loads
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      setHistoryItems(JSON.parse(cached));
      setLoading(false);
    }

    try {
      const res = await api.get("/errands/history");
      const data = Array.isArray(res.data) ? res.data : [];
      const formatted = data.map((errand) => {
        const posterIdStr = errand.posterId?._id ? errand.posterId._id.toString() : errand.posterId?.toString();
        const isPosted = posterIdStr === userId;
        return {
          id: errand._id,
          title: errand.title,
          description: errand.description,
          category: errand.category,
          pickupLocation: errand.pickupLocation,
          dropoffLocation: errand.dropoffLocation,
          fee: errand.fee,
          date: new Date(errand.createdAt).toLocaleDateString(),
          type: isPosted ? "posted" : "accepted",
          status: errand.status,
          completionRequested: !!errand.completionRequested,
          poster: errand.posterId,
          errander: errand.erranderId,
          // Track whether this user has already submitted a review
          hasReviewed: isPosted
            ? !!errand.isReviewedByPoster
            : !!errand.isReviewedByErrander,
        };
      });
      setHistoryItems(formatted);
      // Always overwrite cache with fresh data
      localStorage.setItem(cacheKey, JSON.stringify(formatted));
    } catch (err) {
      console.error("Failed to fetch history", err);
      if (!cached) setHistoryItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user?.id, user?._id, filterType]);

  useEffect(() => {
    const isAnyModalOpen = confirmModalOpen || intelModalOpen || proofModalOpen || isReviewModalOpen;
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [confirmModalOpen, intelModalOpen, proofModalOpen, isReviewModalOpen]);

  useEffect(() => {
    if (!socket) return;
    const handleNotification = (data) => {
      fetchHistory();
    };
    socket.on("notification", handleNotification);
    return () => {
      socket.off("notification", handleNotification);
    };
  }, [socket, user]);

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
      showToast("Errand cancelled. Funds refunded to your wallet.");
      window.location.reload();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to cancel. It might have been accepted already.", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteFromHistory = async (id) => {
    if (!window.confirm("Remove this errand from your history permanently?")) return;
    setProcessing(true);
    try {
      const res = await api.delete(`/errands/${id}/history`);
      showToast(res.data?.message || "Removed from history.");
      // Remove from local state immediately for snappy UX
      setHistoryItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      showToast(err.response?.data?.message || "Could not remove from history.", "error");
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

  const handleRequestCompletion = async (id) => {
    setProcessing(true);
    try {
      await api.patch(`/errands/${id}/request-completion`);
      showToast("Completion requested! Waiting for sender to confirm.");
      window.location.reload();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to request completion.", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleStartErrand = async (id) => {
    setProcessing(true);
    try {
      await api.patch(`/errands/${id}/start`);
      showToast("🚀 Errand started! Go ahead and complete the task.");
      window.location.reload();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to start errand.", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleProofImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingProof(true);
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await api.post("/users/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setProofImage(res.data.url);
      showToast("Image uploaded successfully!");
    } catch (err) {
      showToast("Failed to upload image.", "error");
    } finally {
      setUploadingProof(false);
    }
  };

  const handleSubmitProof = async () => {
    if (!proofText.trim() && !proofImage) {
      showToast("Please provide details or upload an image proof.", "error");
      return;
    }
    setProcessing(true);
    try {
      await api.patch(`/errands/${selectedErrandId}/upload-proof`, {
        imageUrl: proofImage,
        text: proofText
      });
      showToast("📸 Proof uploaded successfully!");
      setProofModalOpen(false);
      setProofText("");
      setProofImage("");
      window.location.reload();
    } catch (err) {
      showToast("Failed to upload proof.", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenIntel = async (id) => {
    setSelectedErrandId(id);
    setIntelModalOpen(true);
    setLoadingIntel(true);
    try {
      const res = await api.get(`/errands/${id}/footprint`);
      setIntelFootprint(res.data);
    } catch (err) {
      console.error("Failed to load digital footprint", err);
    } finally {
      setLoadingIntel(false);
    }
  };

  // Real-time listener for timeline update
  useEffect(() => {
    if (!socket) return;
    socket.on("footprint_updated", (updatedFootprint) => {
      if (selectedErrandId && updatedFootprint.errandId === selectedErrandId) {
        setIntelFootprint(updatedFootprint);
      }
    });
    return () => {
      socket.off("footprint_updated");
    };
  }, [socket, selectedErrandId]);

  const filteredItems = historyItems
    .filter((item) => item.type === filterType)
    .filter((item) => {
      if (activeStatusTab === "All") return true;
      if (activeStatusTab === "Open") return item.status === "open";
      if (activeStatusTab === "Accepted") return ["assigned", "accepted", "in_progress"].includes(item.status);
      if (activeStatusTab === "Pending Confirmation") return ["pending_confirmation", "pending_sender_confirmation"].includes(item.status);
      if (activeStatusTab === "Completed") return ["completed", "confirmed_completed"].includes(item.status);
      return true;
    });

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
      { label: "Posted", desc: "Funds in Escrow", active: ["open", "assigned", "accepted", "in_progress", "pending_confirmation", "pending_sender_confirmation", "completed", "confirmed_completed"].includes(status) },
      { label: "Assigned", desc: "Task in Progress", active: ["assigned", "accepted", "in_progress", "pending_confirmation", "pending_sender_confirmation", "completed", "confirmed_completed"].includes(status) },
      { label: "Pending", desc: "Awaiting Confirmation", active: ["pending_confirmation", "pending_sender_confirmation", "completed", "confirmed_completed"].includes(status) },
      { label: "Disbursed", desc: "Released to Wallet", active: ["completed", "confirmed_completed"].includes(status) },
    ];

    let progressWidth = "0%";
    if (["completed", "confirmed_completed"].includes(status)) progressWidth = "100%";
    else if (["pending_confirmation", "pending_sender_confirmation"].includes(status)) progressWidth = "75%";
    else if (["assigned", "accepted", "in_progress"].includes(status)) progressWidth = "45%";

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

        <div className="dashboard-header" style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
          <div className="dashboard-title" style={{ flex: 1 }}>
            <h1>My Errands</h1>
            <p>
              History of your {filterType === "posted" ? "posted" : "accepted"}{" "}
              tasks.
            </p>
          </div>
          <div style={{ flexShrink: 0, marginTop: 4 }}>
            <NotificationCenter />
          </div>
        </div>

        {/* ── Status Tabs ── */}
        <div style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 8,
          marginBottom: 24,
          scrollbarWidth: "none",
          msOverflowStyle: "none"
        }}>
          {["All", ...(filterType === "posted" ? ["Open"] : []), "Accepted", "Pending Confirmation", "Completed"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveStatusTab(tab)}
              className={`chip ${activeStatusTab === tab ? "active" : ""}`}
              style={{
                fontSize: "0.82rem",
                fontWeight: 800,
                padding: "8px 16px",
                whiteSpace: "nowrap",
                borderRadius: "var(--radius-full)"
              }}
            >
              {tab}
            </button>
          ))}
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
                          ["completed", "confirmed_completed"].includes(item.status)
                            ? "badge-green"
                            : ["assigned", "accepted"].includes(item.status)
                              ? "badge-blue"
                              : item.status === "cancelled"
                                ? "badge-red"
                                : item.status === "in_progress"
                                  ? "badge-orange"
                                  : "badge-blue"
                        }`}
                      >
                        {item.status.replace(/_/g, " ").toUpperCase()}
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
                        marginBottom: 10
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <MapPin size={14} /> {item.dropoffLocation || item.location}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Clock size={14} /> {item.date}
                      </span>
                    </div>

                    <p style={{ fontSize: "0.88rem", color: "var(--gray-600)", margin: "8px 0 12px 0", lineHeight: 1.5 }}>
                      {item.description}
                    </p>

                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 8,
                      fontSize: "0.8rem",
                      color: "var(--gray-600)",
                      background: "var(--gray-50)",
                      padding: "10px 14px",
                      borderRadius: 12,
                      marginTop: 10,
                      marginBottom: 10,
                      border: "1px solid var(--gray-100)"
                    }}>
                      <div>
                        <strong>📍 Pickup:</strong> {item.pickupLocation || "Campus"}
                      </div>
                      <div>
                        <strong>🏁 Dropoff:</strong> {item.dropoffLocation}
                      </div>
                    </div>
                  </div>

                  <div className="history-card-actions">
                    <span className="history-fee-badge">
                      ₦{item.fee.toLocaleString()}
                    </span>

                    <button
                      onClick={() => handleOpenIntel(item.id)}
                      className="btn btn-outline btn-sm"
                      style={{
                        borderColor: "var(--blue-200)",
                        color: "var(--blue-600)",
                        display: "flex",
                        alignItems: "center",
                        gap: 6
                      }}
                    >
                      <Activity size={12} /> Intel
                    </button>

                    {filterType === "posted" && ["open", "assigned", "in_progress", "pending_sender_confirmation", "pending_confirmation"].includes(item.status) && (
                      <button
                        onClick={() => handleDeleteFromHistory(item.id)}
                        className="btn btn-outline btn-sm"
                        style={{ borderColor: "var(--red-200)", color: "var(--red-600)" }}
                      >
                        Delete Errand
                      </button>
                    )}



                    {filterType === "accepted" && item.status === "assigned" && (
                      <button
                        onClick={() => handleStartErrand(item.id)}
                        className="btn btn-primary btn-sm"
                        style={{ background: "var(--green-600)", borderColor: "var(--green-600)", color: "var(--white)" }}
                      >
                        Start Errand 🚀
                      </button>
                    )}

                    {filterType === "accepted" && item.status === "in_progress" && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => {
                            setSelectedErrandId(item.id);
                            setProofModalOpen(true);
                          }}
                          className="btn btn-outline btn-sm"
                          style={{ borderColor: "var(--blue-300)", color: "var(--blue-600)", display: "flex", alignItems: "center", gap: 4 }}
                        >
                          <Camera size={12} /> Upload Proof
                        </button>
                        <button
                          onClick={() => handleRequestCompletion(item.id)}
                          className="btn btn-primary btn-sm"
                        >
                          Mark Completed
                        </button>
                      </div>
                    )}

                    {filterType === "accepted" && ["pending_confirmation", "pending_sender_confirmation"].includes(item.status) && (
                      <button
                        className="btn btn-outline btn-sm"
                        disabled
                        style={{ borderColor: "var(--gray-300)", color: "var(--gray-400)", cursor: "not-allowed" }}
                      >
                        Awaiting Sender Confirmation
                      </button>
                    )}

                    {["completed", "confirmed_completed"].includes(item.status) && (
                      item.hasReviewed ? (
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            color: "var(--amber-500)",
                            padding: "5px 10px",
                            background: "var(--amber-50)",
                            borderRadius: 8,
                          }}
                        >
                          <Star size={12} fill="currentColor" /> Reviewed
                        </span>
                      ) : (
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
                      )
                    )}

                    {/* Delete from history button — available for completed or cancelled errands */}
                    {["completed", "confirmed_completed", "cancelled"].includes(item.status) && (
                      <button
                        className="btn btn-outline btn-sm"
                        style={{
                          borderColor: "var(--red-200)",
                          color: "var(--red-500)",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "5px 10px",
                        }}
                        title="Remove from history"
                        onClick={() => handleDeleteFromHistory(item.id)}
                      >
                        <X size={12} /> Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Contact Profiles ── */}
                {filterType === "posted" && item.errander && (
                  <div style={{
                    background: "var(--gray-50)",
                    border: "1px solid var(--gray-100)",
                    borderRadius: 16,
                    padding: 12,
                    marginTop: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 12
                  }}>
                    {item.errander.profilePicture ? (
                      <img
                        src={item.errander.profilePicture}
                        alt={item.errander.name}
                        style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, background: "var(--blue-100)",
                        color: "var(--blue-600)", display: "flex", alignItems: "center",
                        justifyContent: "center", fontWeight: 800, fontSize: "0.85rem"
                      }}>
                        {item.errander.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: "0.82rem", color: "var(--gray-800)" }}>
                        {item.errander.name} (Assigned Messenger)
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginTop: 1 }}>
                        📞 {item.errander.phoneNumber || "No contact info listed"}
                      </div>
                    </div>
                    {item.errander.phoneNumber && (
                      <a
                        href={`tel:${item.errander.phoneNumber}`}
                        className="btn btn-outline btn-sm"
                        style={{ borderRadius: 8, padding: "5px 10px", textDecoration: "none", fontSize: "0.72rem" }}
                      >
                        Call
                      </a>
                    )}
                  </div>
                )}

                {filterType === "accepted" && item.poster && (
                  <div style={{
                    background: "var(--gray-50)",
                    border: "1px solid var(--gray-100)",
                    borderRadius: 16,
                    padding: 12,
                    marginTop: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 12
                  }}>
                    {item.poster.profilePicture ? (
                      <img
                        src={item.poster.profilePicture}
                        alt={item.poster.name}
                        style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, background: "var(--blue-100)",
                        color: "var(--blue-600)", display: "flex", alignItems: "center",
                        justifyContent: "center", fontWeight: 800, fontSize: "0.85rem"
                      }}>
                        {item.poster.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: "0.82rem", color: "var(--gray-800)" }}>
                        {item.poster.name} (Sender Details)
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--gray-500)", marginTop: 1 }}>
                        📞 {item.poster.phoneNumber || "No contact info listed"}
                      </div>
                    </div>
                    {item.poster.phoneNumber && (
                      <a
                        href={`tel:${item.poster.phoneNumber}`}
                        className="btn btn-outline btn-sm"
                        style={{ borderRadius: 8, padding: "5px 10px", textDecoration: "none", fontSize: "0.72rem" }}
                      >
                        Call
                      </a>
                    )}
                  </div>
                )}

                {/* ── Pending Confirmation Alert banner ── */}
                {filterType === "posted" && ["pending_confirmation", "pending_sender_confirmation"].includes(item.status) && (
                  <div className="history-pending-banner">
                    <span>⚠️ Messenger marked this errand as completed. Please confirm.</span>
                    <button
                      onClick={() => {
                        setConfirmErrandId(item.id);
                        setConfirmModalOpen(true);
                      }}
                      className="btn btn-primary btn-sm"
                      style={{
                        background: "var(--blue-600)",
                        borderColor: "var(--blue-600)",
                        color: "var(--white)",
                        animation: "pulse 2s infinite",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Confirm Errand Completed
                    </button>
                  </div>
                )}

                {renderEscrowTracker(item.status)}
              </motion.div>
            ))}
          </div>
        )}

        {/* ── Confirm Completion Modal ── */}
        <AnimatePresence>
          {confirmModalOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setConfirmModalOpen(false);
                  setConfirmErrandId(null);
                }}
                style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", zIndex: 9994 }}
              />
              <div className="modal-flex-wrapper">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ type: "spring", damping: 25, stiffness: 220 }}
                  className="confirm-completion-modal"
                >
                  <h3>Confirm completion?</h3>
                  <p>
                    Confirm that the messenger successfully completed this errand. Once confirmed, the errand payment will be released to the messenger wallet.
                  </p>
                  <div className="btn-group">
                    <button
                      onClick={() => {
                        setConfirmModalOpen(false);
                        setConfirmErrandId(null);
                      }}
                      className="btn btn-outline"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        const id = confirmErrandId;
                        setConfirmModalOpen(false);
                        setConfirmErrandId(null);
                        await handleCompleteTask(id);
                      }}
                      className="btn btn-primary"
                      style={{ background: "var(--blue-600)", borderColor: "var(--blue-600)" }}
                    >
                      Confirm & Release
                    </button>
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>

        {selectedErrandId && (
          <ReviewModal
            errandId={selectedErrandId}
            isOpen={isReviewModalOpen}
            onClose={() => setIsReviewModalOpen(false)}
            onSuccess={() => window.location.reload()}
          />
        )}

        {/* Proof Upload Modal */}
        <AnimatePresence>
          {proofModalOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setProofModalOpen(false)}
                style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", zIndex: 9992 }}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                style={{
                  position: "fixed", bottom: 0, left: 0, right: 0,
                  background: "var(--white)", borderTopLeftRadius: 28, borderTopRightRadius: 28,
                  padding: "24px 20px 40px", zIndex: 9993, maxOpacity: "80vh", boxShadow: "0 -8px 24px rgba(0,0,0,0.12)"
                }}
              >
                <div style={{ width: 44, height: 5, background: "var(--gray-200)", borderRadius: 10, margin: "0 auto 16px" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h3 style={{ fontWeight: 900, fontSize: "1.2rem", margin: 0 }}>Upload Delivery Proof 📸</h3>
                  <button onClick={() => setProofModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gray-500)" }}>
                    <X size={20} />
                  </button>
                </div>
                
                <div style={{ display: "grid", gap: 16 }}>
                  <div>
                    <label style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--gray-700)", display: "block", marginBottom: 6 }}>
                      Proof Details / Notes
                    </label>
                    <textarea
                      placeholder="Explain what was delivered and where..."
                      value={proofText}
                      onChange={(e) => setProofText(e.target.value)}
                      style={{ width: "100%", height: 80, border: "1px solid var(--gray-200)", borderRadius: 12, padding: 12, fontSize: "0.88rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--gray-700)", display: "block", marginBottom: 6 }}>
                      Photo Proof (Optional)
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <label style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
                        border: "1px dashed var(--blue-300)", borderRadius: 12, cursor: "pointer",
                        fontSize: "0.84rem", fontWeight: 700, color: "var(--blue-600)", background: "var(--blue-50)"
                      }}>
                        <Upload size={16} /> Choose File
                        <input type="file" accept="image/*" onChange={handleProofImageUpload} style={{ display: "none" }} />
                      </label>
                      {uploadingProof && <span style={{ fontSize: "0.76rem", color: "var(--gray-500)" }}>Uploading...</span>}
                      {proofImage && <span style={{ fontSize: "0.76rem", color: "var(--green-600)", fontWeight: 700 }}>✓ File ready</span>}
                    </div>
                    {proofImage && (
                      <img src={proofImage} alt="Proof" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 10, marginTop: 10 }} />
                    )}
                  </div>

                  <button
                    onClick={handleSubmitProof}
                    disabled={uploadingProof}
                    className="btn btn-primary"
                    style={{ width: "100%", marginTop: 8 }}
                  >
                    Submit Proof
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Digital Footprint / Communication Intel Timeline Bottom Sheet */}
        <AnimatePresence>
          {intelModalOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIntelModalOpen(false)}
                style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.65)", backdropFilter: "blur(4px)", zIndex: 9990 }}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                style={{
                  position: "fixed", bottom: 0, left: 0, right: 0,
                  background: "var(--white)", borderTopLeftRadius: 28, borderTopRightRadius: 28,
                  padding: "24px 20px 40px", zIndex: 9991, maxHeight: "88vh", overflowY: "auto",
                  boxShadow: "0 -10px 25px rgba(0,0,0,0.15)", overscrollBehavior: "contain"
                }}
              >
                <div style={{ width: 44, height: 5, background: "var(--gray-300)", borderRadius: 10, margin: "0 auto 16px" }} />
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <h3 style={{ fontWeight: 900, fontSize: "1.25rem", margin: 0, color: "var(--gray-900)" }}>
                        Communication Intel
                      </h3>
                      {intelFootprint && (
                        <span style={{
                          background: intelFootprint.status === "released" ? "var(--green-50)" : "var(--blue-50)",
                          color: intelFootprint.status === "released" ? "var(--green-700)" : "var(--blue-600)",
                          border: `1px solid ${intelFootprint.status === "released" ? "var(--green-200)" : "var(--blue-100)"}`,
                          padding: "3px 8px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 900, textTransform: "uppercase"
                        }}>
                          {intelFootprint.status}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: "0.78rem", color: "var(--gray-500)", margin: 0 }}>
                      Secure cryptographic audit trail logs.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => handleOpenIntel(selectedErrandId)}
                      style={{
                        background: "none", border: "1px solid var(--gray-200)", borderRadius: 10,
                        padding: "6px 12px", fontSize: "0.78rem", fontWeight: 800, cursor: "pointer"
                      }}
                    >
                      Refresh
                    </button>
                    <button onClick={() => setIntelModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gray-500)" }}>
                      <X size={22} />
                    </button>
                  </div>
                </div>

                {loadingIntel ? (
                  <div style={{ padding: "40px 0", textAlign: "center" }}>
                    <div className="loader" style={{ margin: "0 auto 12px" }} />
                    <span style={{ fontSize: "0.85rem", color: "var(--gray-500)" }}>Synchronizing digital blueprint...</span>
                  </div>
                ) : !intelFootprint || !intelFootprint.auditTrail || intelFootprint.auditTrail.length === 0 ? (
                  <div style={{ padding: "40px 20px", textAlign: "center", border: "1px dashed var(--gray-200)", borderRadius: 16 }}>
                    <p style={{ color: "var(--gray-500)", fontWeight: 700, margin: 0 }}>
                      No activity recorded yet. Activity logs will appear here automatically.
                    </p>
                  </div>
                ) : (
                  <div>
                    {/* Activity Count Badge */}
                    <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--gray-500)", fontWeight: 800 }}>
                        Audit trail contains <strong style={{ color: "var(--blue-600)" }}>{intelFootprint.auditTrail.length}</strong> event records
                      </span>
                    </div>

                    {/* Timeline Container */}
                    <div style={{ position: "relative", paddingLeft: 24 }}>
                      {/* Vertical line connector */}
                      <div style={{
                        position: "absolute", left: 6, top: 12, bottom: 12, width: 2,
                        background: "var(--gray-200)"
                      }} />

                      {intelFootprint.auditTrail.map((entry, index) => {
                        const isLast = index === intelFootprint.auditTrail.length - 1;
                        let roleColor = "var(--gray-600)";
                        let roleBg = "var(--gray-50)";
                        if (entry.actorRole === "sender") {
                          roleColor = "var(--blue-700)";
                          roleBg = "var(--blue-50)";
                        } else if (entry.actorRole === "messenger") {
                          roleColor = "var(--green-700)";
                          roleBg = "var(--green-50)";
                        } else if (entry.actorRole === "admin") {
                          roleColor = "var(--red-700)";
                          roleBg = "var(--red-50)";
                        }

                        return (
                          <div key={index} style={{ position: "relative", marginBottom: 24 }}>
                            {/* Dot indicator */}
                            <div style={{
                              position: "absolute", left: -24, top: 4, width: 14, height: 14,
                              borderRadius: "50%", background: isLast ? "var(--blue-500)" : "var(--gray-300)",
                              border: "3px solid var(--white)", boxShadow: isLast ? "0 0 0 3px rgba(37,99,235,0.2)" : "none"
                            }} />

                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                              <div>
                                <h4 style={{ fontWeight: 800, fontSize: "0.95rem", margin: "0 0 3px", color: "var(--gray-900)" }}>
                                  {entry.actionTitle || entry.action}
                                </h4>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                                  <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--gray-800)" }}>
                                    {entry.actorName}
                                  </span>
                                  <span style={{
                                    fontSize: "0.65rem", padding: "1px 6px", borderRadius: 4,
                                    fontWeight: 900, textTransform: "uppercase", background: roleBg, color: roleColor
                                  }}>
                                    {entry.actorRole}
                                  </span>
                                </div>
                                <p style={{ fontSize: "0.86rem", color: "var(--gray-600)", margin: "0 0 6px" }}>
                                  {entry.actionDescription || entry.details}
                                </p>

                                {/* Metadata if any (e.g. proof image) */}
                                {entry.metadata && entry.metadata.imageUrl && (
                                  <div style={{ marginTop: 8 }}>
                                    <span style={{ fontSize: "0.72rem", color: "var(--gray-500)", fontWeight: 800, display: "block", marginBottom: 4 }}>
                                      Attached Proof File:
                                    </span>
                                    <img
                                      src={entry.metadata.imageUrl}
                                      alt="Proof attachment"
                                      onClick={() => window.open(entry.metadata.imageUrl, "_blank")}
                                      style={{ width: "100%", maxWidth: 220, maxHeight: 130, objectFit: "cover", borderRadius: 12, border: "1px solid var(--gray-200)", cursor: "zoom-in" }}
                                    />
                                  </div>
                                )}
                              </div>
                              
                              <span style={{ fontSize: "0.74rem", color: "var(--gray-400)", fontWeight: 700, whiteSpace: "nowrap" }}>
                                {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Metadata summary (Devices, IPs, etc.) */}
                    <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--gray-100)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
                      <div style={{ background: "var(--gray-50)", padding: 12, borderRadius: 12 }}>
                        <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "var(--gray-500)", display: "block", marginBottom: 4 }}>Device Log (Last)</span>
                        <span style={{ fontSize: "0.78rem", color: "var(--gray-800)", fontWeight: 700 }}>
                          {intelFootprint.auditTrail[intelFootprint.auditTrail.length - 1]?.deviceInfo || "Unknown Device"}
                        </span>
                      </div>
                      <div style={{ background: "var(--gray-50)", padding: 12, borderRadius: 12 }}>
                        <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "var(--gray-500)", display: "block", marginBottom: 4 }}>IP Address</span>
                        <span style={{ fontSize: "0.78rem", color: "var(--gray-800)", fontWeight: 700 }}>
                          {intelFootprint.auditTrail[intelFootprint.auditTrail.length - 1]?.ipAddress || "127.0.0.1"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Toast notifications */}
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
    </div>
  );
};

export default History;
