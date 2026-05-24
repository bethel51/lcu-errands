import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle } from "lucide-react";
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
    <div className="clean-auth-wrapper">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="clean-auth-card"
      >
        <div className="clean-auth-header">
          <Link
            to="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "#71717a",
              fontSize: "0.85rem",
              marginBottom: 16,
              fontWeight: 500,
              textDecoration: "underline",
            }}
          >
            <ArrowLeft size={14} /> Back to Login
          </Link>
          <h1>Forgot Password?</h1>
          <p>No worries, we'll send you reset instructions.</p>
        </div>

        {submitted ? (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                background: "#ECFDF5",
                color: "#047857",
                padding: "12px 14px",
                borderRadius: 8,
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                gap: 8,
                border: "1px solid #A7F3D0",
              }}
            >
              <CheckCircle size={20} />
              <p style={{ fontWeight: 600, fontSize: "0.875rem", margin: 0, textAlign: "left" }}>{message}</p>
            </div>
            <p
              style={{
                color: "#71717a",
                fontSize: "0.875rem",
                marginBottom: 24,
                lineHeight: 1.5,
              }}
            >
              Didn't receive the email? Check your spam folder or try again.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="clean-auth-submit-btn"
              style={{ background: "#ffffff", color: "#09090b", border: "1px solid #e4e4e7" }}
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
                  border: "1px solid #FEE2E2",
                }}
              >
                {error}
              </div>
            )}
            <div className="clean-auth-form-group">
              <label className="clean-auth-label">Email Address</label>
              <input
                type="email"
                className="clean-auth-input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="clean-auth-submit-btn"
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
