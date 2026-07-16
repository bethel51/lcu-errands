import { useState, useEffect, useRef } from "react";
import { Bell, X, CheckCheck, Trash2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api";
import { useSocket } from "../context/SocketContext";

// Module-level cache: shared across all mounts, survives re-renders
// Avoids re-fetching on every tab switch / page navigation
let notifCache = [];
let lastFetchedAt = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

const NotificationCenter = () => {
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState(notifCache);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);

  const fetchNotifications = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFetchedAt < CACHE_TTL_MS && notifCache.length > 0) {
      // Use cached data — no network call needed
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
      // Add new notification at the top and update cache
      setNotifications((prev) => {
        const updated = [data, ...prev];
        notifCache = updated;
        return updated;
      });
    };

    socket.on("notification", handleNewNotification);
    return () => {
      socket.off("notification", handleNewNotification);
    };
  }, [socket]);

  // Click outside to close drawer
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && !e.target.closest(".notif-bell-btn")) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.body.style.overflow = "";
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.body.style.overflow = "";
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
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
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
                background: "rgba(15,23,42,0.4)",
                backdropFilter: "blur(3px)",
                zIndex: 99990,
              }}
              onClick={() => setIsOpen(false)}
            />

            {/* Notification panel container */}
            <motion.div
              ref={panelRef}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              style={{
                position: "fixed",
                top: 0,
                right: 0,
                bottom: 0,
                width: "90%",
                maxWidth: 400,
                background: "var(--white)",
                boxShadow: "-10px 0 30px rgba(0,0,0,0.15)",
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
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontWeight: 900, fontSize: "1.15rem", color: "var(--gray-900)" }}>
                    Notifications
                  </h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "var(--gray-500)" }}>
                    Updates on your active errands
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: "var(--gray-50)",
                    border: "none",
                    borderRadius: "50%",
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "var(--gray-500)",
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Action Bar */}
              {notifications.length > 0 && unreadCount > 0 && (
                <div
                  style={{
                    padding: "8px 18px",
                    background: "var(--gray-50)",
                    borderBottom: "1px solid var(--gray-100)",
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--blue-600)",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <CheckCheck size={14} /> Mark all as read
                  </button>
                </div>
              )}

              {/* Notification List */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "16px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {notifications.length === 0 ? (
                  <div
                    style={{
                      padding: "80px 24px",
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background: "var(--gray-50)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--gray-400)",
                        marginBottom: 16,
                      }}
                    >
                      <Bell size={24} />
                    </div>
                    <h4 style={{ margin: "0 0 6px 0", fontWeight: 800, color: "var(--gray-800)" }}>All Quiet Here</h4>
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--gray-500)", lineHeight: 1.5 }}>
                      No new updates at the moment. We'll alert you here when errands change status.
                    </p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif._id}
                      onClick={() => handleMarkAsRead(notif._id)}
                      style={{
                        padding: 14,
                        borderRadius: 16,
                        background: notif.isRead ? "var(--white)" : "linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 100%)",
                        border: notif.isRead ? "1px solid var(--gray-100)" : "1px solid var(--blue-200)",
                        boxShadow: "var(--shadow-sm)",
                        position: "relative",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {/* Unread blue dot indicator */}
                      {!notif.isRead && (
                        <span
                          style={{
                            position: "absolute",
                            top: 14,
                            right: 14,
                            width: 8,
                            height: 8,
                            background: "var(--blue-600)",
                            borderRadius: "50%",
                          }}
                        />
                      )}
                      
                      <div style={{ fontWeight: 800, fontSize: "0.85rem", color: "var(--gray-900)", marginBottom: 4, paddingRight: 12 }}>
                        {notif.title}
                      </div>
                      
                      <div style={{ fontSize: "0.8rem", color: "var(--gray-600)", lineHeight: 1.4, marginBottom: 8 }}>
                        {notif.message}
                      </div>
                      
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.72rem",
                          color: "var(--gray-400)",
                          fontWeight: 700,
                        }}
                      >
                        <span>
                          {new Date(notif.createdAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          at{" "}
                          {new Date(notif.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
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
