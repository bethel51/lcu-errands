import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import api from "../api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await api.post("/auth/forgot-password", { email });
      setSubmitted(true);
      setMessage("A reset link has been sent to your email.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="auth-card"
      >
        <div className="auth-header">
          <Link
            to="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "var(--gray-500)",
              fontSize: "0.85rem",
              marginBottom: 24,
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={16} /> Back to Login
          </Link>
          <div
            style={{
              width: 64,
              height: 64,
              background: "var(--blue-50)",
              color: "var(--blue-600)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <Mail size={32} />
          </div>
          <h1>Forgot Password?</h1>
          <p>No worries, we'll send you reset instructions.</p>
        </div>

        {submitted ? (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                background: "#D1FAE5",
                color: "#065F46",
                padding: "16px",
                borderRadius: 12,
                marginBottom: 24,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <CheckCircle size={24} />
              <p style={{ fontWeight: 600 }}>{message}</p>
            </div>
            <p
              style={{
                color: "var(--gray-500)",
                fontSize: "0.9rem",
                marginBottom: 24,
              }}
            >
              Didn't receive the email? Check your spam folder or try again.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="btn btn-outline"
              style={{ width: "100%" }}
            >
              Try another email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div
                style={{
                  background: "#FEE2E2",
                  color: "#B91C1C",
                  padding: "12px 16px",
                  borderRadius: 8,
                  marginBottom: 24,
                  fontSize: "0.9rem",
                }}
              >
                {error}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="input-field"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", padding: "14px" }}
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
