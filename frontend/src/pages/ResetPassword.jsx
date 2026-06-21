import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Eye, EyeOff, CheckCircle, AlertCircle, Check, X, ArrowLeft } from "lucide-react";
import api from "../api";

const ResetPassword = () => {
  const { token } = useParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // Password criteria checks
  const hasMinLength = password.length >= 6;
  const hasNumber = /\d/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const criteria = [
    { label: "At least 6 characters", met: hasMinLength },
    { label: "At least one number", met: hasNumber },
    { label: "At least one uppercase letter", met: hasUppercase },
    { label: "At least one special character", met: hasSpecial },
  ];

  const metCount = criteria.filter((c) => c.met).length;

  const getStrengthLabel = () => {
    if (!password) return "";
    if (metCount <= 1) return "Weak";
    if (metCount <= 3) return "Medium";
    return "Strong";
  };

  const getStrengthColor = () => {
    if (metCount <= 1) return "var(--red-500)";
    if (metCount <= 3) return "var(--amber-500)";
    return "var(--green-500)";
  };

  useEffect(() => {
    const verifyToken = async () => {
      try {
        await api.get(`/auth/verify-reset-token/${token}`);
        setTokenValid(true);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Invalid or expired password reset link. Please request a new one."
        );
        setTokenValid(false);
      } finally {
        setVerifying(false);
      }
    };
    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (metCount < 3) {
      setError("Password does not meet the minimum strength requirements.");
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
          "Failed to reset password. The link may have expired."
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
        style={{ overflow: "hidden" }}
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
          <h1>Set New Password</h1>
          <p>Please choose a strong new password below.</p>
        </div>

        <AnimatePresence mode="wait">
          {verifying ? (
            <motion.div
              key="verifying"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px 0",
                gap: 16,
              }}
            >
              <div className="loader" style={{ width: 40, height: 40 }} />
              <p style={{ color: "var(--gray-500)", fontSize: "0.9rem", fontWeight: 500 }}>
                Verifying reset link authenticity...
              </p>
            </motion.div>
          ) : !tokenValid ? (
            <motion.div
              key="invalid-token"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: "center", padding: "10px 0" }}
            >
              <div
                style={{
                  background: "var(--red-50)",
                  color: "var(--red-600)",
                  padding: "16px",
                  borderRadius: 12,
                  marginBottom: 24,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  border: "1px solid var(--red-100)",
                }}
              >
                <AlertCircle size={32} />
                <p style={{ fontWeight: 600, fontSize: "0.95rem", margin: 0 }}>
                  {error || "Invalid or Expired Link"}
                </p>
              </div>
              <p
                style={{
                  color: "var(--gray-500)",
                  fontSize: "0.875rem",
                  marginBottom: 24,
                  lineHeight: 1.6,
                }}
              >
                Password reset links are single-use only and automatically expire after 1 hour to keep your account secure.
              </p>
              <Link to="/forgot-password" className="clean-auth-outline-btn" style={{ width: "100%", display: "block", textAlign: "center" }}>
                Request New Link
              </Link>
            </motion.div>
          ) : success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: "center" }}
            >
              <div
                style={{
                  background: "var(--green-50)",
                  color: "var(--green-600)",
                  padding: "16px",
                  borderRadius: 12,
                  marginBottom: 24,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  border: "1px solid var(--green-100)",
                }}
              >
                <CheckCircle size={32} />
                <p style={{ fontWeight: 600, fontSize: "1rem", margin: 0 }}>
                  Password reset successful!
                </p>
              </div>
              <p style={{ color: "var(--gray-500)", fontSize: "0.875rem" }}>
                Redirecting you to the login screen...
              </p>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {error && (
                <div
                  style={{
                    background: "var(--red-50)",
                    color: "var(--red-600)",
                    padding: "12px 16px",
                    borderRadius: 8,
                    marginBottom: 20,
                    fontSize: "0.9rem",
                    border: "1px solid var(--red-100)",
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
                    placeholder="Create a strong password"
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
                    {showPw ? <EyeOff size={16} color="var(--gray-400)" /> : <Eye size={16} color="var(--gray-400)" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {password && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--gray-500)", fontWeight: 500 }}>
                        Password strength:
                      </span>
                      <span style={{ fontSize: "0.75rem", color: getStrengthColor(), fontWeight: 700 }}>
                        {getStrengthLabel()}
                      </span>
                    </div>
                    
                    {/* Strength Bar */}
                    <div style={{ height: 4, width: "100%", background: "var(--gray-100)", borderRadius: 2, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${(metCount / 4) * 100}%`,
                          backgroundColor: getStrengthColor(),
                          transition: "width 0.3s ease, background-color 0.3s ease",
                        }}
                      />
                    </div>

                    {/* Requirements Checklist */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", marginTop: 10 }}>
                      {criteria.map((c, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {c.met ? (
                            <Check size={12} color="var(--green-500)" style={{ strokeWidth: 3 }} />
                          ) : (
                            <div style={{ width: 12, height: 12, borderRadius: "50%", border: "1.5px solid var(--gray-300)" }} />
                          )}
                          <span style={{ fontSize: "0.7rem", color: c.met ? "var(--gray-700)" : "var(--gray-400)", fontWeight: 500 }}>
                            {c.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="clean-auth-form-group" style={{ marginTop: password ? 16 : 0 }}>
                <label className="clean-auth-label">Confirm New Password</label>
                <input
                  type={showPw ? "text" : "password"}
                  className="clean-auth-input"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                {confirmPassword && password !== confirmPassword && (
                  <span style={{ fontSize: "0.75rem", color: "var(--red-500)", display: "block", marginTop: 4 }}>
                    Passwords do not match
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="clean-auth-submit-btn"
                disabled={loading || metCount < 3 || password !== confirmPassword}
                style={{ marginTop: 8 }}
              >
                {loading ? "Updating..." : "Reset Password"}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
