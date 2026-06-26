import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell, CheckCircle, Info, MessageSquare, AlertCircle, RefreshCw, Wallet } from "lucide-react";
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
  const [notificationsError, setNotificationsError] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const notificationsRef = useRef(notifications);
  const abortControllerRef = useRef(null);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Keep ref in sync — avoids stale closure in onClick handlers
  useEffect(() => { notificationsRef.current = notifications; }, [notifications]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isAuth) fetchNotifications(true);
  }, [isAuth]);

  useEffect(() => {
    if (socket) {
      socket.on("notification", (data) => {
        setNotifications((prev) => [data, ...prev]);
      });
      return () => { socket.off("notification"); };
    }
  }, [socket]);

  const fetchNotifications = useCallback(async (silent = false) => {
    // Cancel any in-flight request before starting a new one
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    // Hard 8-second timeout — prevents infinite skeleton on slow servers
    const timeout = setTimeout(() => controller.abort(), 8000);

    if (!silent) setNotificationsLoading(true);
    setNotificationsError(false);

    try {
      const res = await api.get("/notifications", { signal: controller.signal });
      const data = Array.isArray(res.data) ? res.data : [];
      setNotifications(data);
      setHasNotification(data.some((n) => !n.isRead));
    } catch (err) {
      const cancelled = err.name === "AbortError" || err.name === "CanceledError" || err.code === "ERR_CANCELED";
      if (!cancelled) {
        console.error("Failed to fetch notifications", err);
        if (!silent) setNotificationsError(true);
      }
    } finally {
      clearTimeout(timeout);
      setNotificationsLoading(false);
    }
  }, [setHasNotification]);

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => {
        const next = prev.map((n) => (n._id === id ? { ...n, isRead: true } : n));
        setHasNotification(next.some((n) => !n.isRead));
        return next;
      });
    } catch (err) { console.error(err); }
  };

  const markAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setHasNotification(false);
    } catch (err) { console.error(err); }
  };

  const getNotifStyle = (type) => {
    const map = {
      message_received:  { icon: <MessageSquare size={15} />, bg: "var(--blue-100)",          color: "var(--blue-600)" },
      errand_completed:  { icon: <CheckCircle size={15} />,   bg: "var(--green-100)",         color: "var(--green-600)" },
      errand_accepted:   { icon: <CheckCircle size={15} />,   bg: "var(--green-100)",         color: "var(--green-600)" },
      errand_requested:  { icon: <AlertCircle size={15} />,   bg: "var(--amber-100)",         color: "var(--amber-600)" },
      errand_delivered:  { icon: <CheckCircle size={15} />,   bg: "var(--blue-100)",          color: "var(--blue-600)" },
      wallet_credited:   { icon: <Wallet size={15} />,        bg: "#f0fdf4",                  color: "#16a34a" },
      payment_released:  { icon: <Wallet size={15} />,        bg: "#faf5ff",                  color: "#9333ea" },
    };
    return map[type] || { icon: <Info size={15} />, bg: "var(--gray-100)", color: "var(--gray-500)" };
  };

  const formatTime = (date) => {
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="nav-brand" onMouseEnter={() => prefetch(PageImports.Home)}>
          <img src="/logo.png" alt="LCU Errands Logo" />
          <div className="nav-brand-text">
            <span className="nav-brand-title">LCU Errands</span>
            <span className="nav-brand-sub">Meals &amp; Errands</span>
          </div>
        </Link>

        <div className="nav-center">
          <Link to="/" className={`nav-pill ${isActive("/") ? "active" : ""}`} onMouseEnter={() => prefetch(PageImports.Home)}>Home</Link>
          <Link to="/dashboard" className={`nav-pill ${isActive("/dashboard") ? "active" : ""}`} onMouseEnter={() => prefetch(PageImports.Dashboard)}>Marketplace</Link>
          <Link to="/history" className={`nav-pill ${isActive("/history") ? "active" : ""}`} onMouseEnter={() => prefetch(PageImports.History)}>My Errands</Link>
        </div>

        <div className="nav-actions">
          <div className="nav-bell-wrapper">
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
                style={{ position: "relative" }}
                onClick={() => {
                  const next = !isDropdownOpen;
                  setIsDropdownOpen(next);
                  setIsProfileDropdownOpen(false);
                  if (next) {
                    // Use ref to read current length — avoids stale closure returning 0
                    fetchNotifications(notificationsRef.current.length > 0);
                  }
                }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{ position: "absolute", top: "-4px", right: "-4px", minWidth: "18px", height: "18px", padding: "0 5px", borderRadius: "10px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.62rem", fontWeight: 900, color: "white", lineHeight: 1, border: "2px solid white", background: "var(--red-500)" }}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            </div>

            <AnimatePresence>
              {isDropdownOpen && (
                <>
                  <div
                    className="dropdown-backdrop"
                    onClick={() => setIsDropdownOpen(false)}
                    style={isMobile ? { position: "fixed", inset: 0, zIndex: 1099, background: "rgba(0,0,0,0.35)" } : {}}
                  />
                  <motion.div
                    className="notification-dropdown"
                    initial={isMobile ? { y: "100%" } : { opacity: 0, y: -8, scale: 0.97 }}
                    animate={isMobile ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
                    exit={isMobile ? { y: "100%" } : { opacity: 0, y: -8, scale: 0.97 }}
                    transition={isMobile ? { type: "tween", duration: 0.28, ease: "easeOut" } : { type: "spring", duration: 0.25, bounce: 0.1 }}
                  >
                    {/* ── Header ── */}
                    <div className="notification-header">
                      {isMobile && <div className="notif-drag-handle" />}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <h4 style={{ fontWeight: 800, margin: 0, fontSize: "0.95rem" }}>Notifications</h4>
                        {unreadCount > 0 && (
                          <span style={{ background: "var(--blue-600)", color: "#fff", borderRadius: 20, padding: "1px 8px", fontSize: "0.68rem", fontWeight: 800 }}>
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {notifications.some((n) => !n.isRead) && (
                          <button onClick={markAllRead} style={{ fontSize: "0.68rem", color: "var(--blue-600)", background: "none", border: "none", fontWeight: 700, cursor: "pointer" }}>
                            Mark all read
                          </button>
                        )}
                        <button
                          onClick={() => fetchNotifications(false)}
                          disabled={notificationsLoading}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gray-400)", display: "flex", alignItems: "center", padding: 4 }}
                          title="Refresh"
                        >
                          <RefreshCw size={13} style={{ animation: notificationsLoading ? "spin 1s linear infinite" : "none" }} />
                        </button>
                      </div>
                    </div>

                    {/* ── Body ── */}
                    <div className="notification-list">
                      {notificationsLoading && notifications.length === 0 ? (
                        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="skeleton-card" style={{ padding: "12px", borderRadius: "var(--radius-md)", border: "1px solid var(--gray-100)" }}>
                              <div className="skeleton skeleton-line medium" style={{ height: "13px", marginBottom: "8px" }} />
                              <div className="skeleton skeleton-line full" style={{ height: "11px", marginBottom: "6px" }} />
                              <div className="skeleton skeleton-line short" style={{ height: "9px" }} />
                            </div>
                          ))}
                        </div>
                      ) : notificationsError ? (
                        <div style={{ padding: "32px 20px", textAlign: "center" }}>
                          <AlertCircle size={28} style={{ margin: "0 auto 10px", color: "var(--gray-300)", display: "block" }} />
                          <p style={{ fontSize: "0.82rem", color: "var(--gray-500)", marginBottom: 14 }}>Couldn't load notifications</p>
                          <button
                            onClick={() => fetchNotifications(false)}
                            style={{ padding: "7px 20px", borderRadius: 20, background: "var(--blue-600)", color: "#fff", border: "none", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}
                          >
                            Retry
                          </button>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--gray-400)" }}>
                          <Bell size={30} style={{ margin: "0 auto 12px", opacity: 0.22, display: "block" }} />
                          <p style={{ fontSize: "0.85rem", fontWeight: 700 }}>All caught up!</p>
                          <p style={{ fontSize: "0.74rem", marginTop: 4 }}>No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((n) => {
                          const { icon, bg, color } = getNotifStyle(n.type);
                          return (
                            <div
                              key={n._id || Math.random()}
                              onClick={() => { if (!n.isRead) markRead(n._id); }}
                              className={`notification-item ${n.type === "errand_requested" && !n.isRead ? "high-priority" : ""}`}
                              style={{
                                background: n.type === "errand_requested" && !n.isRead ? "var(--amber-50)" : n.isRead ? "white" : "var(--blue-50)",
                                borderLeft: !n.isRead ? `3px solid ${color}` : "3px solid transparent",
                              }}
                            >
                              <div className="notification-icon" style={{ background: bg, color, width: 34, height: 34, flexShrink: 0 }}>
                                {icon}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                {n.type === "errand_requested" && !n.isRead && (
                                  <span style={{ color: "var(--amber-600)", fontSize: "0.6rem", fontWeight: 900, display: "block", textTransform: "uppercase", marginBottom: 2 }}>
                                    ⚠️ Action Required
                                  </span>
                                )}
                                <div style={{ fontWeight: 700, fontSize: "0.81rem", color: "var(--gray-900)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {n.title}
                                </div>
                                <div style={{ fontSize: "0.73rem", color: "var(--gray-500)", lineHeight: 1.4 }}>
                                  {n.message}
                                </div>
                                <div style={{ fontSize: "0.62rem", color: "var(--gray-400)", marginTop: 5 }}>
                                  {formatTime(n.createdAt)}
                                </div>
                              </div>
                              {!n.isRead && (
                                <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 6 }} />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* ── Footer ── */}
                    <Link
                      to="/history"
                      onClick={() => setIsDropdownOpen(false)}
                      onMouseEnter={() => prefetch(PageImports.History)}
                      style={{ display: "block", padding: "13px 16px", textAlign: "center", fontSize: "0.82rem", fontWeight: 800, color: "var(--blue-600)", borderTop: "1px solid var(--gray-100)", background: "var(--gray-50)" }}
                    >
                      View All Activity →
                    </Link>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {isAuth ? (
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <button
                onClick={() => { setIsProfileDropdownOpen(!isProfileDropdownOpen); setIsDropdownOpen(false); }}
                className="nav-profile-avatar"
                style={{ padding: 0, border: "2px solid var(--blue-200)", background: "none" }}
                title="Account Menu"
              >
                {JSON.parse(localStorage.getItem("user") || "{}").profilePicture ? (
                  <img src={JSON.parse(localStorage.getItem("user") || "{}").profilePicture} alt="P" />
                ) : (
                  JSON.parse(localStorage.getItem("user") || "{}").name?.charAt(0).toUpperCase() || "U"
                )}
              </button>

              {isProfileDropdownOpen && (
                <>
                  <div className="dropdown-backdrop" onClick={() => setIsProfileDropdownOpen(false)} />
                  <div className="profile-dropdown">
                    <div className="profile-dropdown-header">
                      <p className="profile-name">{JSON.parse(localStorage.getItem("user") || "{}").name || "User"}</p>
                      <p className="profile-role">{JSON.parse(localStorage.getItem("user") || "{}").role || "student"}</p>
                    </div>
                    <div className="profile-dropdown-list">
                      <Link to="/profile" onClick={() => setIsProfileDropdownOpen(false)} className="profile-dropdown-item">My Profile</Link>
                      {JSON.parse(localStorage.getItem("user") || "{}").role === "admin" && (
                        <a
                          href={window.location.hostname === "localhost" ? "http://localhost:5174" : "https://leadcity-admin-portal.onrender.com"}
                          target="_blank" rel="noopener noreferrer"
                          className="profile-dropdown-item"
                          style={{ color: "var(--blue-600)", fontWeight: "bold" }}
                        >
                          Admin Portal 🛡️
                        </a>
                      )}
                      <Link to="/dashboard" onClick={() => setIsProfileDropdownOpen(false)} className="profile-dropdown-item">Marketplace</Link>
                      <Link to="/history" onClick={() => setIsProfileDropdownOpen(false)} className="profile-dropdown-item">My Errands</Link>
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
              <Link to="/login" className="btn btn-ghost btn-sm" onMouseEnter={() => prefetch(PageImports.Login)}>Log in</Link>
              <Link to="/register" className="btn btn-primary btn-sm" onMouseEnter={() => prefetch(PageImports.Signup)}>Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
