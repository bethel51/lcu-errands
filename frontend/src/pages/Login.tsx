import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation, Navigate } from "react-router-dom";
import { Eye, EyeOff, User, Bike, CheckCircle, Mail, Lock, Compass, Sparkles, ArrowRight } from "lucide-react";
import api from "../api";

type LoginRole = "sender" | "messenger";

const Login: React.FC = () => {
  const location = useLocation();

  const [role, setRole] = useState<LoginRole>("sender");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPw, setShowPw] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [processing, setProcessing] = useState<boolean>(false);
  const [redirecting, setRedirecting] = useState<boolean>(false);

  // Read success message from URL params (set by hard redirect from Signup)
  const searchParams = new URLSearchParams(location.search);
  const regSuccess = searchParams.get("registration") === "success";
  
  const state = location.state as { message?: string } | null;
  const [successMsg, setSuccessMsg] = useState<string>(
    regSuccess
      ? "Account created! Please log in."
      : state?.message || "",
  );

  // Auth check AFTER all hooks
  const isAuth = localStorage.getItem("isAuthenticated") === "true";
  if (isAuth) return <Navigate to="/dashboard" replace />;

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProcessing(true);
    setError("");
    setSuccessMsg("");

    try {
      const response = await api.post("/auth/login", {
        email: email.toLowerCase().trim(),
        password,
        role,
      });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      localStorage.setItem("userRole", response.data.user.role);
      localStorage.setItem("isAuthenticated", "true");

      setRedirecting(true);
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 500);
    } catch (err: any) {
      if (err.code === "ERR_NETWORK") {
        setError("Network Error: Cannot reach the server. Please check your internet connection.");
      } else {
        setError(
          err.response?.data?.message ||
            "Login failed. Check your role & credentials.",
        );
      }
      setProcessing(false);
    }
  };

  return (
    <div className="upgraded-auth-split-layout">
      {/* Visual left panel */}
      <div className="upgraded-auth-visual-panel">
        <div className="upgraded-auth-visual-header">
          <div className="upgraded-auth-visual-logo">
            <Compass size={24} />
          </div>
          <span className="upgraded-auth-visual-logo-text">LeadCity <span>Errands</span></span>
        </div>
        
        <div className="upgraded-auth-visual-body">
          <h1 className="upgraded-auth-visual-title">
            Campus Errands, <br /><span>Simplified.</span>
          </h1>
          <p className="upgraded-auth-visual-subtitle">
            The premier peer-to-peer task and errand platform for Lead City University students. Outsource chores, buy food, deliver books, or earn pocket money.
          </p>
          
          <div className="errand-simulator-widget">
            <div className="errand-simulator-header">
              <span className="errand-simulator-title">Live Errand Stream</span>
              <div className="errand-simulator-pulse">
                <span className="errand-simulator-pulse-dot" />
                <span>Active now</span>
              </div>
            </div>
            
            <div className="errand-simulator-items">
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="errand-simulator-card"
              >
                <div className="errand-sim-left">
                  <div className="errand-sim-icon-box food">
                    <Sparkles size={16} />
                  </div>
                  <div className="errand-sim-details">
                    <span className="errand-sim-task">Food delivery from Cafe 2</span>
                    <span className="errand-sim-loc">Cafe 2 ➔ Hostel B</span>
                  </div>
                </div>
                <span className="errand-sim-badge active">In Progress</span>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="errand-simulator-card"
              >
                <div className="errand-sim-left">
                  <div className="errand-sim-icon-box doc">
                    <Sparkles size={16} />
                  </div>
                  <div className="errand-sim-details">
                    <span className="errand-sim-task">Print assignment & photocopy</span>
                    <span className="errand-sim-loc">Senate Building ➔ Hostel C</span>
                  </div>
                </div>
                <span className="errand-sim-badge pending">Pending</span>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="errand-simulator-card"
              >
                <div className="errand-sim-left">
                  <div className="errand-sim-icon-box laundry">
                    <Sparkles size={16} />
                  </div>
                  <div className="errand-sim-details">
                    <span className="errand-sim-task">Laundry Pick up</span>
                    <span className="errand-sim-loc">Gate 3 ➔ Hostel A</span>
                  </div>
                </div>
                <span className="errand-sim-badge success">Completed</span>
              </motion.div>
            </div>
          </div>
        </div>
        
        <div className="upgraded-auth-visual-footer">
          <div className="upgraded-auth-stat">
            <span className="upgraded-auth-stat-val">1,200+</span>
            <span className="upgraded-auth-stat-lbl">Active Users</span>
          </div>
          <div className="upgraded-auth-stat">
            <span className="upgraded-auth-stat-val">5,400+</span>
            <span className="upgraded-auth-stat-lbl">Errands Filled</span>
          </div>
          <div className="upgraded-auth-stat">
            <span className="upgraded-auth-stat-val">100%</span>
            <span className="upgraded-auth-stat-lbl">Safe Escrow</span>
          </div>
        </div>
      </div>

      {/* Form right panel */}
      <div className="upgraded-auth-form-panel">
        <AnimatePresence>
          {(processing || redirecting) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(255, 255, 255, 0.85)",
                backdropFilter: "blur(6px)",
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div className="loader" style={{ width: 48, height: 48 }} />
              <div
                style={{
                  fontWeight: 900,
                  color: "#4f46e5",
                  fontSize: "0.8rem",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}
              >
                {redirecting ? "Loading Dashboard..." : "Authenticating..."}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="upgraded-auth-form-container"
        >
          {/* Logo visible only on mobile/tablet */}
          <div className="mobile-logo-header" style={{ display: "none", alignItems: "center", gap: 8, marginBottom: 24 }}>
            <div className="upgraded-auth-visual-logo" style={{ width: 36, height: 36 }}>
              <Compass size={20} />
            </div>
            <span className="upgraded-auth-visual-logo-text" style={{ fontSize: "1.2rem", color: "#0f172a" }}>LeadCity <span>Errands</span></span>
          </div>

          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: "1.85rem", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.025em" }}>
              Welcome back
            </h2>
            <p style={{ color: "#64748b", marginTop: 6, fontSize: "0.95rem" }}>
              Access your LeadCity Errands account
            </p>
          </div>

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                background: "#ECFDF5",
                color: "#047857",
                padding: "14px 16px",
                borderRadius: 16,
                marginBottom: 28,
                fontSize: "0.9rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 10,
                border: "1px solid #A7F3D0",
              }}
            >
              <CheckCircle size={18} /> {successMsg}
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                background: "#FEF2F2",
                color: "#B91C1C",
                padding: "14px 16px",
                borderRadius: 16,
                marginBottom: 28,
                fontSize: "0.85rem",
                fontWeight: 700,
                textAlign: "center",
                border: "1px solid #FEE2E2",
              }}
            >
              {error}
            </motion.div>
          )}

          {/* Premium Selector Slider tab */}
          <div className="upgraded-auth-role-toggle" style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setRole("sender")}
              className={`upgraded-auth-role-btn ${role === "sender" ? "active" : ""}`}
              style={{ 
                zIndex: 2, 
                background: "transparent", 
                boxShadow: "none",
                color: role === "sender" ? "#4f46e5" : "#64748b" 
              }}
            >
              <User size={18} /> Sender
            </button>
            <button
              type="button"
              onClick={() => setRole("messenger")}
              className={`upgraded-auth-role-btn ${role === "messenger" ? "active" : ""}`}
              style={{ 
                zIndex: 2, 
                background: "transparent", 
                boxShadow: "none",
                color: role === "messenger" ? "#4f46e5" : "#64748b" 
              }}
            >
              <Bike size={18} /> Messenger
            </button>
            <motion.div
              animate={{
                left: role === "sender" ? 6 : "calc(50% + 3px)",
              }}
              className="upgraded-auth-role-bg-slider"
              style={{
                position: "absolute",
                top: 6,
                bottom: 6,
                width: "calc(50% - 9px)",
                background: "white",
                borderRadius: 12,
                boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
                zIndex: 1,
              }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: 8, color: "#475569" }}>
                Email Address
              </label>
              <div className="upgraded-auth-input-wrapper">
                <input
                  type="email"
                  className="upgraded-auth-input"
                  placeholder="student@lcu.edu.ng"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <div className="upgraded-auth-input-icon">
                  <Mail size={18} />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: 8, color: "#475569" }}>
                Password
              </label>
              <div className="upgraded-auth-input-wrapper">
                <input
                  type={showPw ? "text" : "password"}
                  className="upgraded-auth-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className="upgraded-auth-input-icon">
                  <Lock size={18} />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: "absolute",
                    right: 16,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    padding: 0,
                  }}
                >
                  {showPw ? (
                    <EyeOff size={18} color="#94a3b8" />
                  ) : (
                    <Eye size={18} color="#94a3b8" />
                  )}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 28 }}>
              <Link
                to="/forgot-password"
                style={{
                  fontSize: "0.85rem",
                  color: "#4f46e5",
                  fontWeight: 700,
                  textDecoration: "none",
                  transition: "color 0.15s ease",
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = "#3b82f6")}
                onMouseOut={(e) => (e.currentTarget.style.color = "#4f46e5")}
              >
                Forgot password?
              </Link>
            </div>

            <button type="submit" className="upgraded-auth-submit-btn" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              Log in as {role.charAt(0).toUpperCase() + role.slice(1)} <ArrowRight size={18} />
            </button>
          </form>

          <div style={{ marginTop: 32, textAlign: "center", borderTop: "1px solid #f1f5f9", paddingTop: 24 }}>
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
              Don't have an account?{" "}
              <Link to="/register" style={{ color: "#4f46e5", fontWeight: 800, textDecoration: "none" }}>
                Create account
              </Link>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Styled display details for responsive header toggle */}
      <style>{`
        @media (max-width: 1024px) {
          .mobile-logo-header {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
