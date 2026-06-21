import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, AlertCircle, Check, Eye, EyeOff, Key } from "lucide-react";
import api from "../api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [step, setStep] = useState(1); // 1 = Enter Email, 2 = Verify OTP & Reset
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState("");
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

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await api.post("/auth/forgot-password", { email });
      setMessage(response.data?.message || "A verification code has been sent to your email.");
      setStep(2);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Something went wrong. Please check your email and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    setError("");
    setMessage("");

    try {
      const response = await api.post("/auth/forgot-password", { email });
      setMessage(response.data?.message || "A new code has been sent to your email.");
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to resend code. Please try again."
      );
    } finally {
      setResending(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (metCount < 3) {
      setError("Password does not meet the minimum strength requirements.");
      return;
    }

    if (otp.trim().length !== 6) {
      setError("Please enter a valid 6-digit verification code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.post("/auth/reset-password-otp", {
        email: email.toLowerCase().trim(),
        otp: otp.trim(),
        password,
      });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to reset password. The code may be incorrect or expired."
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
          
          {step === 1 && (
            <>
              <Link
                to="/login"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--gray-500)",
                  fontSize: "0.85rem",
                  marginBottom: 12,
                  fontWeight: 500,
                  textDecoration: "underline",
                }}
              >
                <ArrowLeft size={14} /> Back to Login
              </Link>
              <h1>Forgot Password?</h1>
              <p>Enter your email to receive a 6-digit security code.</p>
            </>
          )}

          {step === 2 && !success && (
            <>
              <button
                onClick={() => {
                  setStep(1);
                  setError("");
                  setMessage("");
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--gray-500)",
                  fontSize: "0.85rem",
                  marginBottom: 12,
                  fontWeight: 500,
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                <ArrowLeft size={14} /> Change Email
              </button>
              <h1>Verify & Reset</h1>
              <p>Enter the code sent to <b>{email}</b> and set your new password.</p>
            </>
          )}

          {success && (
            <>
              <h1>Success!</h1>
              <p>Your password has been successfully reset.</p>
            </>
          )}
        </div>

        <AnimatePresence mode="wait">
          {success ? (
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
          ) : step === 1 ? (
            <motion.form
              key="step1"
              onSubmit={handleSendOtp}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.2 }}
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
                {loading ? "Sending..." : "Send Verification Code"}
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="step2"
              onSubmit={handleResetPassword}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
            >
              {message && (
                <div
                  style={{
                    background: "var(--green-50)",
                    color: "var(--green-600)",
                    padding: "12px 16px",
                    borderRadius: 8,
                    marginBottom: 20,
                    fontSize: "0.9rem",
                    border: "1px solid var(--green-100)",
                  }}
                >
                  {message}
                </div>
              )}

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
                <label className="clean-auth-label">Verification Code (6-digit)</label>
                <input
                  type="text"
                  maxLength={6}
                  className="clean-auth-input"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  required
                  style={{
                    letterSpacing: otp ? "4px" : "normal",
                    textAlign: otp ? "center" : "left",
                    fontSize: otp ? "1.2rem" : "0.95rem",
                    fontWeight: 700,
                  }}
                />
              </div>

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
                disabled={loading || metCount < 3 || password !== confirmPassword || otp.length !== 6}
                style={{ marginTop: 8 }}
              >
                {loading ? "Updating..." : "Reset Password"}
              </button>

              <div style={{ marginTop: 20, textAlign: "center" }}>
                <p style={{ color: "var(--gray-500)", fontSize: "0.8rem", margin: 0 }}>
                  Didn't receive the code?{" "}
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resending}
                    style={{
                      color: "var(--blue-600)",
                      fontWeight: 700,
                      textDecoration: "underline",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                    }}
                  >
                    {resending ? "Sending..." : "Resend Code"}
                  </button>
                </p>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
