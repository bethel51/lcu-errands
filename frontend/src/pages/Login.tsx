import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation, Navigate } from "react-router-dom";
import { Eye, EyeOff, CheckCircle } from "lucide-react";
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

  // Read success message from URL params
  const searchParams = new URLSearchParams(location.search);
  const regSuccess = searchParams.get("registration") === "success";
  
  const state = location.state as { message?: string } | null;
  const [successMsg, setSuccessMsg] = useState<string>(
    regSuccess
      ? "Account created! Please log in."
      : state?.message || "",
  );

  // Auth check
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
    <div className="clean-auth-wrapper">
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
                fontWeight: 700,
                color: "#111827",
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
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="clean-auth-card"
      >
        <div className="clean-auth-header">
          <div className="clean-auth-logo">
            <div className="clean-auth-logo-mark">
              <span>LC</span>
            </div>
            <span className="clean-auth-logo-text">
              LEADCITY <em>ERRANDS</em>
            </span>
          </div>
          <h1>Welcome back</h1>
          <p>Access your campus errands account</p>
        </div>

        {successMsg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: "var(--green-100)",
              color: "var(--green-500)",
              padding: "12px 14px",
              borderRadius: 8,
              marginBottom: 20,
              fontSize: "0.875rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
              border: "1px solid var(--green-100)",
            }}
          >
            <CheckCircle size={16} /> {successMsg}
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: "#FEF2F2",
              color: "#B91C1C",
              padding: "12px 14px",
              borderRadius: 8,
              marginBottom: 20,
              fontSize: "0.875rem",
              fontWeight: 600,
              textAlign: "center",
              border: "1px solid #FEE2E2",
            }}
          >
            {error}
          </motion.div>
        )}

        <div className="clean-auth-role-tabs">
          <button
            type="button"
            onClick={() => setRole("sender")}
            className={`clean-auth-role-btn ${role === "sender" ? "active" : ""}`}
          >
            Sender
          </button>
          <button
            type="button"
            onClick={() => setRole("messenger")}
            className={`clean-auth-role-btn ${role === "messenger" ? "active" : ""}`}
          >
            Messenger
          </button>
        </div>

        <form onSubmit={handleLogin}>
          <div className="clean-auth-form-group">
            <label className="clean-auth-label">Email Address</label>
            <input
              type="email"
              className="clean-auth-input"
              placeholder="student@lcu.edu.ng"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="clean-auth-form-group" style={{ marginBottom: 12 }}>
            <label className="clean-auth-label">Password</label>
            <div className="clean-auth-input-container">
              <input
                type={showPw ? "text" : "password"}
                className="clean-auth-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: 40 }}
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
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                  zIndex: 2,
                }}
              >
                {showPw ? (
                  <EyeOff size={16} color="var(--gray-400)" />
                ) : (
                  <Eye size={16} color="var(--gray-400)" />
                )}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
            <Link
              to="/forgot-password"
              style={{
                fontSize: "0.85rem",
                color: "var(--blue-600)",
                fontWeight: 600,
                textDecoration: "underline",
              }}
            >
              Forgot password?
            </Link>
          </div>

          <button type="submit" className="clean-auth-submit-btn" disabled={processing}>
            Log in as {role.charAt(0).toUpperCase() + role.slice(1)}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: "center", borderTop: "1px solid var(--gray-200)", paddingTop: 20 }}>
          <p style={{ color: "var(--gray-500)", fontSize: "0.875rem", margin: 0 }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "var(--blue-600)", fontWeight: 700, textDecoration: "underline" }}>
              Create account
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
