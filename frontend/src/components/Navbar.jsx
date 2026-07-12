import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { Info, MessageSquare, AlertCircle, RefreshCw, Wallet, X } from "lucide-react";
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
  const { socket } = useSocket();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    // Always enforce light mode on load
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);



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
          <Link to="/stream" className={`nav-pill ${isActive("/stream") ? "active" : ""}`} onMouseEnter={() => prefetch(PageImports.ErrandStream)}>Errand Stream</Link>
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
            </div>
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
