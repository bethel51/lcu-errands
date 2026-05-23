import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation, Navigate } from "react-router-dom";
import { Eye, EyeOff, User, Bike, CheckCircle, Mail, Lock } from "lucide-react";
import api from "../api";

type LoginRole = "sender" | "messenger";
type BackendStatus = "checking" | "connected" | "error";

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
  
  // Need to correctly type the location state
  const state = location.state as { message?: string } | null;
  const [successMsg, setSuccessMsg] = useState<string>(
    regSuccess
      ? "Account created! Please log in."
      : state?.message || "",
  );
  
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("checking");

  useEffect(() => {
    const checkConnection = async () => {
      try {
        await api.get("/health");
        setBackendStatus("connected");
      } catch (err) {
        console.error("Backend health check failed:", err);
        setBackendStatus("error");
      }
    };
    checkConnection();
  }, []);

  // Auth check AFTER all hooks (React rules)
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

      // Show brief success state, then redirect
      setRedirecting(true);
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 300);
    } catch (err: any) {
      if (err.code === "ERR_NETWORK") {
        setError("Network Error: Cannot reach the server. Please check your internet or if the server is down.");
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
    <div className="upgraded-auth-wrapper">
      <AnimatePresence>
        {(processing || redirecting) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(4px)",
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
                fontWeight: 800,
                color: "#2563EB",
                fontSize: "0.85rem",
                letterSpacing: "0.1em",
              }}
            >
              {redirecting ? "LOADING DASHBOARD..." : "AUTHENTICATING..."}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="upgraded-auth-card">
        <div className="upgraded-auth-brand-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>

        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1
            style={{ fontSize: "2rem", fontWeight: 900, color: "#1E293B", letterSpacing: "-0.025em" }}
          >
            Welcome back
          </h1>
          <p style={{ color: "#64748B", marginTop: 8, fontSize: "0.95rem" }}>
            Log in to manage your errands
          </p>
          <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: "20px",
                fontSize: "0.75rem",
                fontWeight: 700,
                background: backendStatus === "connected" ? "#ECFDF5" : backendStatus === "error" ? "#FEF2F2" : "#F3F4F6",
                color: backendStatus === "connected" ? "#10B981" : backendStatus === "error" ? "#EF4444" : "#6B7280",
                border: "1px solid",
                borderColor: backendStatus === "connected" ? "#D1FAE5" : backendStatus === "error" ? "#FEE2E2" : "#E5E7EB",
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: backendStatus === "connected" ? "#10B981" : backendStatus === "error" ? "#EF4444" : "#9CA3AF",
                  boxShadow: backendStatus === "connected" ? "0 0 8px #10B981" : "none",
                }}
              />
              {backendStatus === "connected" ? "BACKEND ONLINE" : backendStatus === "error" ? "BACKEND OFFLINE" : "CHECKING CONNECTION..."}
            </div>
          </div>
        </div>

        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: "#ECFDF5",
              color: "#059669",
              padding: "16px",
              borderRadius: 16,
              marginBottom: 32,
              fontSize: "0.9rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 12,
              border: "1px solid #D1FAE5",
            }}
          >
            <CheckCircle size={20} /> {successMsg}
          </motion.div>
        )}

        <div className="upgraded-auth-role-toggle">
          <button
            type="button"
            onClick={() => setRole("sender")}
            className={`upgraded-auth-role-btn ${role === "sender" ? "active" : ""}`}
          >
            <User size={18} /> Sender
          </button>
          <button
            type="button"
            onClick={() => setRole("messenger")}
            className={`upgraded-auth-role-btn ${role === "messenger" ? "active" : ""}`}
          >
            <Bike size={18} /> Messenger
          </button>
        </div>

        <form onSubmit={handleLogin}>
          {error && (
            <div
              style={{
                background: "#FEF2F2",
                color: "#B91C1C",
                padding: "12px",
                borderRadius: 10,
                marginBottom: 20,
                fontSize: "0.85rem",
                fontWeight: 700,
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 700,
                marginBottom: 8,
                color: "#374151",
              }}
            >
              Email Address
            </label>
            <div className="upgraded-auth-input-wrapper">
              <input
                type="email"
                className="upgraded-auth-input"
                placeholder="name@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <div className="upgraded-auth-input-icon">
                <Mail size={18} />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 700,
                marginBottom: 8,
                color: "#374151",
              }}
            >
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
                }}
              >
                {showPw ? (
                  <EyeOff size={18} color="#9CA3AF" />
                ) : (
                  <Eye size={18} color="#9CA3AF" />
                )}
              </button>
            </div>
          </div>

          <button type="submit" className="upgraded-auth-submit-btn">
            Log in as {role.charAt(0).toUpperCase() + role.slice(1)}
          </button>
        </form>

        <div style={{ marginTop: 25, textAlign: "center" }}>
          <Link
            to="/forgot-password"
            style={{
              display: "block",
              marginBottom: 15,
              fontSize: "0.9rem",
              color: "#2563EB",
              fontWeight: 700,
            }}
          >
            Forgot Password?
          </Link>
          <p style={{ color: "#6B7280", fontSize: "0.9rem" }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "#2563EB", fontWeight: 800 }}>
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
