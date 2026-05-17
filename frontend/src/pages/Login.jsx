import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation, Navigate } from "react-router-dom";
import { Eye, EyeOff, User, Bike, CheckCircle } from "lucide-react";
import api from "../api";

/**
 * @typedef {'sender' | 'messenger'} LoginRole
 */

const Login = () => {
  const location = useLocation();

  /** @type {[LoginRole, React.Dispatch<React.SetStateAction<LoginRole>>]} */
  const [role, setRole] = useState("sender");

  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
  const [email, setEmail] = useState("");

  /** @type {[string, React.Dispatch<React.SetStateAction<string>>]} */
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Read success message from URL params (set by hard redirect from Signup)
  const searchParams = new URLSearchParams(location.search);
  const regSuccess = searchParams.get("registration") === "success";
  const [successMsg, setSuccessMsg] = useState(
    regSuccess
      ? "Account created! Please log in."
      : location.state?.message || "",
  );
  const [backendStatus, setBackendStatus] = useState("checking");

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

  const handleLogin = async (e) => {
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
    } catch (err) {
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
    <div
      className="auth-wrapper"
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#F8FAFC",
      }}
    >
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

      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "white",
          borderRadius: 32,
          padding: "48px 32px",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.08)",
        }}
      >
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

        <div
          style={{
            display: "flex",
            background: "#F3F4F6",
            padding: 5,
            borderRadius: 16,
            marginBottom: 30,
            gap: 5,
          }}
        >
          <button
            type="button"
            onClick={() => setRole("sender")}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: 12,
              border: "none",
              background: role === "sender" ? "white" : "transparent",
              color: role === "sender" ? "#2563EB" : "#6B7280",
              fontWeight: 800,
              fontSize: "0.9rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow:
                role === "sender" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              transition: "0.2s",
            }}
          >
            <User size={18} /> Sender
          </button>
          <button
            type="button"
            onClick={() => setRole("messenger")}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: 12,
              border: "none",
              background: role === "messenger" ? "white" : "transparent",
              color: role === "messenger" ? "#2563EB" : "#6B7280",
              fontWeight: 800,
              fontSize: "0.9rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow:
                role === "messenger" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              transition: "0.2s",
            }}
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
            <input
              type="email"
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 12,
                border: "1px solid #E5E7EB",
                outline: "none",
              }}
              placeholder="name@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
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
            <div style={{ position: "relative" }}>
              <input
                type={showPw ? "text" : "password"}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: 12,
                  border: "1px solid #E5E7EB",
                  outline: "none",
                }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
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

          <button
            type="submit"
            style={{
              width: "100%",
              background: "#2563EB",
              color: "white",
              padding: "16px",
              borderRadius: 12,
              border: "none",
              fontWeight: 800,
              fontSize: "1rem",
              cursor: "pointer",
              marginTop: 10,
            }}
          >
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
