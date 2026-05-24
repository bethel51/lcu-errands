import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { Eye, EyeOff, CheckCircle } from "lucide-react";
import api from "../api";

const ResetPassword = () => {
  const { token } = useParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.post(`/auth/reset-password/${token}`, { password });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Invalid or expired token. Please try again.",
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
          <h1>Set New Password</h1>
          <p>Please enter your new password below.</p>
        </div>

        {success ? (
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
              <p style={{ fontWeight: 600, fontSize: "0.875rem", margin: 0, textAlign: "left" }}>Password reset successful!</p>
            </div>
            <p style={{ color: "#71717a", fontSize: "0.875rem" }}>
              Redirecting you to login...
            </p>
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
              <label className="clean-auth-label">New Password</label>
              <div className="clean-auth-input-container">
                <input
                  type={showPw ? "text" : "password"}
                  className="clean-auth-input"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
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
                  {showPw ? <EyeOff size={16} color="#71717a" /> : <Eye size={16} color="#71717a" />}
                </button>
              </div>
            </div>

            <div className="clean-auth-form-group">
              <label className="clean-auth-label">Confirm New Password</label>
              <input
                type={showPw ? "text" : "password"}
                className="clean-auth-input"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="clean-auth-submit-btn"
              disabled={loading}
            >
              {loading ? "Updating..." : "Reset Password"}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default ResetPassword;
