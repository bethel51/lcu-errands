import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Bike, Mail, ChevronRight, ArrowLeft, BookOpen, Phone, Lock, MapPin, Compass, Sparkles } from "lucide-react";
import api from "../api";

interface SignupFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  location: string;
  phoneNumber: string;
  matricNumber: string;
}

type UserRole = "sender" | "messenger";

const Signup: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [role, setRole] = useState<UserRole>("sender");

  const [formData, setFormData] = useState<SignupFormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    location: "",
    phoneNumber: "",
    matricNumber: "",
  });
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devOtpHint, setDevOtpHint] = useState("");
  const isSubmittingOtp = useRef(false);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(
        () => setResendCooldown((prev) => prev - 1),
        1000,
      );
      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  const update = (field: keyof SignupFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const validateStep1 = (): string => {
    if (!formData.name || !formData.email || !formData.password || !formData.matricNumber || !formData.phoneNumber)
      return "Please fill all required fields";
    if (formData.password !== formData.confirmPassword)
      return "Passwords do not match";
    if (formData.password.length < 6)
      return "Password must be at least 6 characters";
    return "";
  };

  const handleNext = async () => {
    const err = validateStep1();
    if (err) {
      setError(err);
      return;
    }

    setProcessing(true);
    console.log("[Signup] Requesting OTP for:", formData.email);
    try {
      const response = await api.post("/auth/send-otp", { ...formData, role });
      console.log("[Signup] OTP request successful", response.data);

      // Capture devOtp if sent by the backend (dev/staging modes)
      if (response.data.devOtp) {
        setDevOtpHint(response.data.devOtp);
      } else {
        setDevOtpHint("");
      }

      setStep(2);
      setResendCooldown(30);
      setError(""); // Clear any errors
    } catch (err: any) {
      console.error("[Signup] OTP request failed:", err);
      if (err.code === "ERR_NETWORK") {
        setError("Network Error: Cannot reach the server. Please check your internet connection.");
      } else if (err.response?.status === 500) {
        setError("Email service is temporarily unavailable. Our team has been notified.");
      } else {
        setError(
          err.response?.data?.message || "Registration failed. Check your data."
        );
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setProcessing(true);
    try {
      console.log("[Signup] Resending OTP for:", formData.email);
      const response = await api.post("/auth/resend-otp", { email: formData.email });

      if (response.data.devOtp) {
        setDevOtpHint(response.data.devOtp);
      } else {
        setDevOtpHint("");
      }

      setResendCooldown(60);
      setError("");
    } catch (err: any) {
      console.error("[Signup] Resend OTP failed:", err);
      setError(err.response?.data?.message || "Failed to resend code");
    } finally {
      setProcessing(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6);
      if (digits.length > 1) {
        const newOtp = [...otp];
        digits.split("").forEach((d, i) => {
          if (index + i < 6) newOtp[index + i] = d;
        });
        setOtp(newOtp);
        const nextFocus = Math.min(index + digits.length, 5);
        document.getElementById(`otp-${nextFocus}`)?.focus();
        if (newOtp.every((d) => d !== "")) {
          setTimeout(() => autoSubmitOtp(newOtp), 80);
        }
        return;
      }
      value = value[0];
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }

    if (newOtp.every((d) => d !== "")) {
      setTimeout(() => autoSubmitOtp(newOtp), 150);
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const autoSubmitOtp = async (otpArr: string[]) => {
    if (isSubmittingOtp.current) return;
    isSubmittingOtp.current = true;
    const otpString = otpArr.join("");
    if (otpString.length < 6) {
      isSubmittingOtp.current = false;
      return;
    }

    setProcessing(true);
    setError("");
    try {
      await api.post("/auth/verify-otp", {
        email: formData.email,
        otp: otpString,
      });
      window.location.href = "/login?registration=success";
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid code. Please try again.");
      isSubmittingOtp.current = false;
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="upgraded-auth-split-layout">
      {/* Left visual panel */}
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
            Create an account to join the largest community of Senders and Messengers at Lead City University. Fully secured transactions with secure wallet systems.
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

      {/* Right form panel */}
      <div className="upgraded-auth-form-panel">
        <AnimatePresence>
          {processing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(255,255,255,0.85)",
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
                Processing...
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="upgraded-auth-form-container" style={{ maxWidth: 520 }}>
          {/* Logo visible only on mobile/tablet */}
          <div className="mobile-logo-header" style={{ display: "none", alignItems: "center", gap: 8, marginBottom: 24 }}>
            <div className="upgraded-auth-visual-logo" style={{ width: 36, height: 36 }}>
              <Compass size={20} />
            </div>
            <span className="upgraded-auth-visual-logo-text" style={{ fontSize: "1.2rem", color: "#0f172a" }}>LeadCity <span>Errands</span></span>
          </div>

          {step === 1 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: "1.85rem", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.025em" }}>
                  Get Started
                </h2>
                <p style={{ color: "#64748b", marginTop: 6, fontSize: "0.95rem" }}>
                  Create your LeadCity Errands account
                </p>
              </div>

              {/* Slider for role selection */}
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

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    background: "#FEF2F2",
                    color: "#B91C1C",
                    padding: "12px 14px",
                    borderRadius: 16,
                    marginBottom: 24,
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    textAlign: "center",
                    border: "1px solid #FEE2E2",
                  }}
                >
                  {error}
                </motion.div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-group" style={{ gridColumn: "span 2", marginBottom: 0 }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: 6 }}>Full Name</label>
                  <div className="upgraded-auth-input-wrapper" style={{ marginBottom: 0 }}>
                    <input
                      className="upgraded-auth-input"
                      value={formData.name}
                      onChange={(e) => update("name", e.target.value)}
                      placeholder="Enter your full name"
                      required
                    />
                    <div className="upgraded-auth-input-icon">
                      <User size={18} />
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ gridColumn: "span 2", marginBottom: 0 }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: 6 }}>Email Address</label>
                  <div className="upgraded-auth-input-wrapper" style={{ marginBottom: 0 }}>
                    <input
                      className="upgraded-auth-input"
                      type="email"
                      value={formData.email}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder="student@lcu.edu.ng"
                      required
                    />
                    <div className="upgraded-auth-input-icon">
                      <Mail size={18} />
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: 6 }}>Matric Number</label>
                  <div className="upgraded-auth-input-wrapper" style={{ marginBottom: 0 }}>
                    <input
                      className="upgraded-auth-input"
                      value={formData.matricNumber}
                      onChange={(e) => update("matricNumber", e.target.value)}
                      placeholder="LCU/UG/..."
                      style={{ paddingLeft: 40, paddingRight: 10 }}
                      required
                    />
                    <div className="upgraded-auth-input-icon" style={{ left: 12 }}>
                      <BookOpen size={16} />
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: 6 }}>Phone Number</label>
                  <div className="upgraded-auth-input-wrapper" style={{ marginBottom: 0 }}>
                    <input
                      className="upgraded-auth-input"
                      value={formData.phoneNumber}
                      onChange={(e) => update("phoneNumber", e.target.value)}
                      placeholder="080..."
                      style={{ paddingLeft: 40, paddingRight: 10 }}
                      required
                    />
                    <div className="upgraded-auth-input-icon" style={{ left: 12 }}>
                      <Phone size={16} />
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: 6 }}>Password</label>
                  <div className="upgraded-auth-input-wrapper" style={{ marginBottom: 0 }}>
                    <input
                      className="upgraded-auth-input"
                      type="password"
                      value={formData.password}
                      onChange={(e) => update("password", e.target.value)}
                      placeholder="••••••••"
                      style={{ paddingLeft: 40, paddingRight: 10 }}
                      required
                    />
                    <div className="upgraded-auth-input-icon" style={{ left: 12 }}>
                      <Lock size={16} />
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: 6 }}>Confirm Password</label>
                  <div className="upgraded-auth-input-wrapper" style={{ marginBottom: 0 }}>
                    <input
                      className="upgraded-auth-input"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => update("confirmPassword", e.target.value)}
                      placeholder="••••••••"
                      style={{ paddingLeft: 40, paddingRight: 10 }}
                      required
                    />
                    <div className="upgraded-auth-input-icon" style={{ left: 12 }}>
                      <Lock size={16} />
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ gridColumn: "span 2", marginBottom: 0 }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: 6 }}>Hostel / Current Location</label>
                  <div className="upgraded-auth-input-wrapper" style={{ marginBottom: 0 }}>
                    <input
                      className="upgraded-auth-input"
                      value={formData.location}
                      onChange={(e) => update("location", e.target.value)}
                      placeholder="e.g. Hostel A, Block B, or Off-campus"
                      required
                    />
                    <div className="upgraded-auth-input-icon">
                      <MapPin size={18} />
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleNext}
                disabled={processing}
                className="upgraded-auth-submit-btn"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  marginTop: 24,
                }}
              >
                Continue to Verify <ChevronRight size={18} />
              </button>

              <div style={{ textAlign: "center", marginTop: 24, borderTop: "1px solid #f1f5f9", paddingTop: 20 }}>
                <p style={{ color: "#64748B", fontSize: "0.9rem" }}>
                  Already have an account?{" "}
                  <a href="/login" style={{ color: "#4f46e5", fontWeight: 800, textDecoration: "none" }}>Log In</a>
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              style={{ textAlign: "center" }}
            >
              <div
                style={{
                  background: "#EEF2FF",
                  width: 72,
                  height: 72,
                  borderRadius: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 24px",
                  boxShadow: "0 10px 20px -5px rgba(99, 102, 241, 0.15)",
                }}
              >
                <Mail color="#4f46e5" size={32} />
              </div>
              <h2
                style={{ fontSize: "1.75rem", fontWeight: 900, marginBottom: 8, color: "#0f172a" }}
              >
                Verify Email
              </h2>
              <p
                style={{ color: "#64748B", marginBottom: 32, fontSize: "0.95rem", lineHeight: 1.5 }}
              >
                We've sent a verification code to<br />
                <span style={{ color: "#0f172a", fontWeight: 700 }}>{formData.email}</span>
              </p>

              {error && (
                <div
                  style={{
                    background: "#FEF2F2",
                    color: "#B91C1C",
                    padding: "14px",
                    borderRadius: 16,
                    marginBottom: 24,
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    border: "1px solid #FEE2E2"
                  }}
                >
                  {error}
                </div>
              )}

              {/* Monospace OTP Grid */}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "center",
                  marginBottom: 32,
                }}
              >
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, i)}
                    onKeyDown={(e) => handleOtpKeyDown(e, i)}
                    style={{
                      width: 50,
                      height: 60,
                      textAlign: "center",
                      fontSize: "1.75rem",
                      fontWeight: 900,
                      borderRadius: 14,
                      border: `2px solid ${digit ? "#4f46e5" : "#e2e8f0"}`,
                      outline: "none",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      background: digit ? "#EEF2FF" : "#f8fafc",
                      color: "#0f172a",
                      boxShadow: digit ? "0 0 0 4px rgba(99, 102, 241, 0.12)" : "none",
                      fontFamily: "monospace",
                    }}
                  />
                ))}
              </div>

              {/* Developer Friendly Staging OTP Hint */}
              {devOtpHint && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: "#EEF2FF",
                    color: "#4f46e5",
                    padding: "12px",
                    borderRadius: 12,
                    marginBottom: 24,
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    border: "1px dashed rgba(79, 70, 229, 0.3)",
                    display: "inline-block",
                  }}
                >
                  Staging Code: <span style={{ fontFamily: "monospace", fontSize: "1rem", letterSpacing: "2px", marginLeft: 4 }}>{devOtpHint}</span>
                </motion.div>
              )}

              <button
                onClick={() => autoSubmitOtp(otp)}
                disabled={otp.some(d => !d) || processing}
                className="upgraded-auth-submit-btn"
                style={{
                  opacity: otp.some(d => !d) ? 0.6 : 1,
                  cursor: otp.some(d => !d) ? "not-allowed" : "pointer",
                  marginBottom: 24,
                }}
              >
                Verify & Create Account
              </button>

              <div>
                <button
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || processing}
                  style={{
                    background: "none",
                    border: "none",
                    color: resendCooldown > 0 ? "#94A3B8" : "#4f46e5",
                    fontWeight: 800,
                    cursor: resendCooldown > 0 ? "default" : "pointer",
                    fontSize: "0.9rem",
                    outline: "none",
                  }}
                >
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : "Didn't receive a code? Resend"}
                </button>
              </div>

              <div style={{ marginTop: 32 }}>
                <button
                  onClick={() => setStep(1)}
                  style={{
                    background: "#f1f5f9",
                    border: "none",
                    color: "#475569",
                    padding: "10px 20px",
                    borderRadius: 12,
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    outline: "none",
                  }}
                >
                  <ArrowLeft size={16} /> Edit Details
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Styled displays for mobile branding toggle */}
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

export default Signup;
