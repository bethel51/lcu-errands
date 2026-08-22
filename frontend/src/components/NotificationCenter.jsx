import { useState, useEffect, useRef } from "react";
import { Bell, X, CheckCheck, Trash2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api";
import { useSocket } from "../context/SocketContext";
import { useToast } from "../context/ToastContext";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

// Module-level cache: shared across all mounts, survives re-renders
let notifCache = [];
let lastFetchedAt = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

const NotificationCenter = ({
  isOpen: propIsOpen,
  onClose,
  renderTrigger = false,
}) => {
  const { socket } = useSocket();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState(notifCache);
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const panelRef = useRef(null);

  // Controlled or uncontrolled open state (default to true if propIsOpen is explicit, else internal state)
  const isOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const fetchNotifications = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFetchedAt < CACHE_TTL_MS && notifCache.length > 0) {
      setNotifications(notifCache);
      return;
    }
    try {
      const res = await api.get("/notifications");
      const data = Array.isArray(res.data) ? res.data : [];
      notifCache = data;
      lastFetchedAt = Date.now();
      setNotifications(data);
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (data) => {
      const type = data.type || "";
      setNotifications((prev) => {
        const updated = [data, ...prev];
        notifCache = updated;
        return updated;
      });

      showToast(
        data.message || data.title || "New update",
        type === "errand_requested" ? "info" : "success"
      );
    };

    socket.on("notification", handleNewNotification);
    return () => {
      socket.off("notification", handleNewNotification);
    };
  }, [socket]);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        !e.target.closest(".notif-bell-btn") &&
        !e.target.closest(".header-icon-btn")
      ) {
        handleClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => {
        const updated = prev.map((n) => (n._id === id ? { ...n, isRead: true } : n));
        notifCache = updated;
        return updated;
      });
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => {
        const updated = prev.map((n) => ({ ...n, isRead: true }));
        notifCache = updated;
        return updated;
      });
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  return (
    <>
      {/* Optional Trigger Button (Only rendered if renderTrigger is true) */}
      {renderTrigger && (
        <button
          onClick={() => setInternalIsOpen(!internalIsOpen)}
          className="notif-bell-btn"
          style={{
            position: "relative",
            background: "var(--white)",
            border: "1px solid var(--gray-200)",
            borderRadius: 14,
            width: 44,
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--gray-700)",
            boxShadow: "var(--shadow-sm)",
            transition: "all 0.2s ease",
          }}
          title="Notifications"
        >
          <Bell size={20} className={unreadCount > 0 ? "pulse-bell" : ""} />
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                background: "var(--red-500)",
                color: "white",
                fontSize: "0.68rem",
                fontWeight: 900,
                borderRadius: "50%",
                width: 18,
                height: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2.5px solid var(--white)",
                boxShadow: "0 2px 6px rgba(239, 68, 68, 0.4)",
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Slide-out Drawer Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay background */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15,23,42,0.45)",
                backdropFilter: "blur(4px)",
                zIndex: 99990,
              }}
              onClick={handleClose}
            />

            {/* Notification panel container */}
            <motion.div
              ref={panelRef}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              style={{
                position: "fixed",
                top: 0,
                right: 0,
                bottom: 0,
                width: "90%",
                maxWidth: 400,
                background: "var(--white)",
                boxShadow: "-10px 0 30px rgba(0,0,0,0.18)",
                zIndex: 99995,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "20px 18px",
                  borderBottom: "1px solid var(--gray-100)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "var(--gray-50)",
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontWeight: 900, fontSize: "1.15rem", color: "var(--gray-900)" }}>
                    Notifications
                  </h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.78rem", color: "var(--gray-500)", fontWeight: 600 }}>
                    {unreadCount > 0 ? `${unreadCount} unread update(s)` : "All caught up!"}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--blue-600)",
                        fontSize: "0.78rem",
                        fontWeight: 800,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <CheckCheck size={14} /> Read all
                    </button>
                  )}
                  <button
                    onClick={handleClose}
                    style={{
                      background: "var(--gray-200)",
                      border: "none",
                      borderRadius: "50%",
                      width: 32,
                      height: 32,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "var(--gray-700)",
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Notification List */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  WebkitOverflowScrolling: "touch",
                  overscrollBehavior: "contain",
                  padding: "16px 16px 36px",
                  maxHeight: "100%",
                }}
              >
                {notifications.length === 0 ? (
                  <div style={{ padding: "60px 20px", textAlign: "center" }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        background: "var(--blue-50)",
                        color: "var(--blue-500)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 12px",
                      }}
                    >
                      <Bell size={26} />
                    </div>
                    <p style={{ fontWeight: 800, color: "var(--gray-800)", margin: "0 0 4px" }}>
                      No notifications yet
                    </p>
                    <p style={{ fontSize: "0.82rem", color: "var(--gray-500)", margin: 0 }}>
                      We will notify you here when there are errand updates.
                    </p>
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item._id || item.id || Math.random()}
                      onClick={() => handleMarkAsRead(item._id)}
                      style={{
                        padding: 14,
                        borderRadius: 14,
                        marginBottom: 10,
                        background: item.isRead ? "var(--white)" : "var(--blue-50)",
                        border: `1px solid ${item.isRead ? "var(--gray-200)" : "var(--blue-100)"}`,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        position: "relative",
                      }}
                    >
                      {!item.isRead && (
                        <span
                          style={{
                            position: "absolute",
                            top: 14,
                            right: 14,
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "var(--blue-600)",
                          }}
                        />
                      )}
                      <h4 style={{ margin: "0 0 4px", fontSize: "0.88rem", fontWeight: 800, color: "var(--gray-900)" }}>
                        {item.title || item.message || "Notification"}
                      </h4>
                      {item.message && item.title && (
                        <p style={{ margin: "0 0 6px", fontSize: "0.82rem", color: "var(--gray-600)" }}>
                          {item.message}
                        </p>
                      )}
                      <span style={{ fontSize: "0.72rem", color: "var(--gray-400)", fontWeight: 700 }}>
                        {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default NotificationCenter;
