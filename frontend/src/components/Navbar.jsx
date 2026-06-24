import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell, CheckCircle, MessageSquare, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "../context/SocketContext";
import { PageImports } from "../App";
import { usePrefetch } from "../hooks/usePrefetch";
import api from "../api";

const Navbar = () => {
  const location = useLocation();
  const prefetch = usePrefetch();
  const isActive = (path) => location.pathname === path;
  const isAuth = localStorage.getItem("isAuthenticated") === "true";
  const { hasNotification, setHasNotification, socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    if (isAuth) {
      fetchNotifications(true); // Fetch silently in background on load
    }
  }, [isAuth]);

  useEffect(() => {
    if (socket) {
      socket.on("notification", (data) => {
        setNotifications((prev) => [data, ...prev]);
        setHasNotification(true);
      });
      return () => {
        socket.off("notification");
      };
    }
  }, [socket]);

  const fetchNotifications = async (silent = false) => {
    if (!silent) setNotificationsLoading(true);
    try {
      const res = await api.get("/notifications");
      const data = Array.isArray(res.data) ? res.data : [];
      setNotifications(data);
      const unread = data.some((n) => !n.isRead);
      setHasNotification(unread);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => {
        const next = prev.map((n) => (n._id === id ? { ...n, isRead: true } : n));
        setHasNotification(next.some((n) => !n.isRead));
        return next;
      });
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setHasNotification(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <nav className="navbar">
      <div className="container">
        <Link
          to="/"
          className="nav-brand"
          onMouseEnter={() => prefetch(PageImports.Home)}
        >
          <img src="/logo.png" alt="LCU Errands Logo" />
          <div className="nav-brand-text">
            <span className="nav-brand-title">LCU Errands</span>
            <span className="nav-brand-sub">Meals & Errands</span>
          </div>
        </Link>

        <div className="nav-center">
          <Link
            to="/"
            className={`nav-pill ${isActive("/") ? "active" : ""}`}
            onMouseEnter={() => prefetch(PageImports.Home)}
          >
            Home
          </Link>
          <Link
            to="/dashboard"
            className={`nav-pill ${isActive("/dashboard") ? "active" : ""}`}
            onMouseEnter={() => prefetch(PageImports.Dashboard)}
          >
            Marketplace
          </Link>
          <Link
            to="/history"
            className={`nav-pill ${isActive("/history") ? "active" : ""}`}
            onMouseEnter={() => prefetch(PageImports.History)}
          >
            My Errands
          </Link>
          {isAuth && (
            <Link
              to="/chats"
              className={`nav-pill ${isActive("/chats") ? "active" : ""}`}
              onMouseEnter={() => prefetch(PageImports.Chats)}
            >
              Chats
            </Link>
          )}
        </div>

        <div className="nav-actions">
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {socket?.connected && (
                <div className="nav-live-pill">
                  <span className="nav-live-dot" />
                  <span className="nav-live-text">Live</span>
                </div>
              )}
              <button
                className="btn-icon"
                aria-label="Notifications"
                onClick={() => {
                  const nextState = !isDropdownOpen;
                  setIsDropdownOpen(nextState);
                  setIsProfileDropdownOpen(false);
                  if (nextState) {
                    setTimeout(() => {
                      fetchNotifications(notifications.length > 0);
                    }, 250);
                  }
                }}
              >
                <Bell size={18} />
                {hasNotification && unreadCount > 0 && (
                  <span
                    className="notification-dot"
                    style={{
                      width: unreadCount > 9 ? 22 : 18,
                      height: 18,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.62rem",
                      fontWeight: 900,
                      color: "white",
                      lineHeight: 1,
                    }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            </div>

            <AnimatePresence>
              {isDropdownOpen && (
                <>
                  <div className="dropdown-backdrop" onClick={() => setIsDropdownOpen(false)} />
                  <motion.div
                    className="notification-dropdown"
                    initial={{ opacity: 0, y: 15, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.97 }}
                    transition={{ type: "spring", duration: 0.25, bounce: 0.1 }}
                  >
                    <div className="notification-header">
                      <h4 style={{ fontWeight: 800, margin: 0 }}>
                        Notifications
                      </h4>
                      {notifications.some((n) => !n.isRead) && (
                        <button
                          onClick={markAllRead}
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--blue-600)",
                            background: "none",
                            border: "none",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="notification-list">
                      {notificationsLoading && notifications.length === 0 ? (
                        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="skeleton-card" style={{ padding: "12px", borderRadius: "var(--radius-md)", border: "1px solid var(--gray-100)" }}>
                              <div className="skeleton skeleton-line medium" style={{ height: "16px", marginBottom: "8px" }} />
                              <div className="skeleton skeleton-line full" style={{ height: "12px", marginBottom: "6px" }} />
                              <div className="skeleton skeleton-line short" style={{ height: "10px" }} />
                            </div>
                          ))}
                        </div>
                      ) : notifications.length === 0 ? (
                        <div
                          style={{
                            padding: 40,
                            textAlign: "center",
                            color: "var(--gray-400)",
                          }}
                        >
                          <Bell
                            size={32}
                            style={{ margin: "0 auto 12px", opacity: 0.3 }}
                          />
                          <p style={{ fontSize: "0.85rem" }}>
                            No notifications yet
                          </p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n._id || Math.random()}
                            onClick={() => {
                              if (!n.isRead) markRead(n._id);
                            }}
                            className={`notification-item ${n.type === "errand_requested" && !n.isRead ? "high-priority" : ""}`}
                            style={{
                              background:
                                n.type === "errand_requested" && !n.isRead
                                  ? "var(--amber-50)"
                                  : n.isRead
                                    ? "white"
                                    : "var(--blue-50)",
                              borderLeft:
                                n.type === "errand_requested" && !n.isRead
                                  ? "4px solid var(--amber-500)"
                                  : "none",
                            }}
                          >
                            <div
                              className="notification-icon"
                              style={{
                                background:
                                  n.type === "message_received"
                                    ? "var(--blue-100)"
                                    : n.type === "errand_completed"
                                      ? "var(--green-100)"
                                      : n.type === "errand_requested"
                                        ? "var(--amber-100)"
                                        : "var(--pink-100)",
                                color:
                                  n.type === "message_received"
                                    ? "var(--blue-600)"
                                    : n.type === "errand_completed"
                                      ? "var(--green-600)"
                                      : n.type === "errand_requested"
                                        ? "var(--amber-600)"
                                        : "var(--pink-600)",
                              }}
                            >
                              {n.type === "message_received" ? (
                                <MessageSquare size={18} />
                              ) : n.type === "errand_completed" ? (
                                <CheckCircle size={18} />
                              ) : (
                                <Info size={18} />
                              )}
                            </div>
                            <div>
                              <div
                                style={{
                                  fontWeight: 700,
                                  fontSize: "0.85rem",
                                  color: "var(--gray-900)",
                                  marginBottom: 2,
                                }}
                              >
                                {n.type === "errand_requested" && (
                                  <span
                                    style={{
                                      color: "var(--amber-600)",
                                      fontSize: "0.65rem",
                                      fontWeight: 900,
                                      display: "block",
                                      textTransform: "uppercase",
                                      marginBottom: 2,
                                    }}
                                  >
                                    ⚠️ Action Required
                                  </span>
                                )}
                                {n.title}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.75rem",
                                  color: "var(--gray-500)",
                                  lineHeight: 1.4,
                                }}
                              >
                                {n.message}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.65rem",
                                  color: "var(--gray-400)",
                                  marginTop: 6,
                                }}
                              >
                                {new Date(n.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <Link
                      to="/history"
                      onClick={() => setIsDropdownOpen(false)}
                      onMouseEnter={() => prefetch(PageImports.History)}
                      style={{
                        display: "block",
                        padding: 16,
                        textAlign: "center",
                        fontSize: "0.85rem",
                        fontWeight: 800,
                        color: "var(--gray-500)",
                        borderTop: "1px solid var(--gray-100)",
                        background: "var(--gray-50)",
                      }}
                    >
                      View All Activity
                    </Link>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {isAuth ? (
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <button
                onClick={() => {
                  setIsProfileDropdownOpen(!isProfileDropdownOpen);
                  setIsDropdownOpen(false);
                }}
                className="nav-profile-avatar"
                style={{ padding: 0, border: "2px solid var(--blue-200)", background: "none" }}
                title="Account Menu"
              >
                {JSON.parse(localStorage.getItem("user") || "{}").profilePicture ? (
                  <img
                    src={JSON.parse(localStorage.getItem("user") || "{}").profilePicture}
                    alt="P"
                  />
                ) : (
                  JSON.parse(localStorage.getItem("user") || "{}").name?.charAt(0).toUpperCase() || "U"
                )}
              </button>

              {isProfileDropdownOpen && (
                <>
                  <div className="dropdown-backdrop" onClick={() => setIsProfileDropdownOpen(false)} />
                  <div className="profile-dropdown">
                    <div className="profile-dropdown-header">
                      <p className="profile-name">
                        {JSON.parse(localStorage.getItem("user") || "{}").name || "User"}
                      </p>
                      <p className="profile-role">
                        {JSON.parse(localStorage.getItem("user") || "{}").role || "student"}
                      </p>
                    </div>
                    <div className="profile-dropdown-list">
                      <Link
                        to="/profile"
                        onClick={() => setIsProfileDropdownOpen(false)}
                        className="profile-dropdown-item"
                      >
                        My Profile
                      </Link>
                      {JSON.parse(localStorage.getItem("user") || "{}").role === "admin" && (
                        <a
                          href={window.location.hostname === "localhost" ? "http://localhost:5174" : "https://leadcity-admin-portal.onrender.com"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="profile-dropdown-item"
                          style={{ color: "var(--blue-600)", fontWeight: "bold" }}
                        >
                          Admin Portal 🛡️
                        </a>
                      )}
                      <Link
                        to="/dashboard"
                        onClick={() => setIsProfileDropdownOpen(false)}
                        className="profile-dropdown-item"
                      >
                        Marketplace
                      </Link>
                      <Link
                        to="/history"
                        onClick={() => setIsProfileDropdownOpen(false)}
                        className="profile-dropdown-item"
                      >
                        My Errands
                      </Link>
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          localStorage.removeItem("isAuthenticated");
                          localStorage.removeItem("token");
                          localStorage.removeItem("user");
                          localStorage.removeItem("userRole");
                          window.location.href = "/";
                        }}
                        className="profile-dropdown-item logout"
                        style={{ width: "100%", textAlign: "left" }}
                      >
                        Log out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="btn btn-ghost btn-sm"
                onMouseEnter={() => prefetch(PageImports.Login)}
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="btn btn-primary btn-sm"
                onMouseEnter={() => prefetch(PageImports.Signup)}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
