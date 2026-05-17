import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Bike, Mail, ChevronRight, ArrowLeft } from "lucide-react";
import api from "../api";

/**
 * @typedef {Object} SignupFormData
 * @property {string} name - The user's full name.
 * @property {string} email - The institutional email address (must end with @lcu.edu.ng).
 * @property {string} password - Minimum 6-character secure password.
 * @property {string} confirmPassword - Verification to match password.
 * @property {string} location - Selected LCU campus location/zone.
 * @property {string} phoneNumber - Active contact mobile number.
 * @property {string} matricNumber - Valid student matriculation number.
 */

/**
 * @typedef {'sender' | 'messenger'} UserRole
 */

const Signup = () => {
  /** @type {[number, React.Dispatch<React.SetStateAction<number>>]} */
  const [step, setStep] = useState(1);

  /** @type {[UserRole, React.Dispatch<React.SetStateAction<UserRole>>]} */
  const [role, setRole] = useState("sender");

  /** @type {[SignupFormData, React.Dispatch<React.SetStateAction<SignupFormData>>]} */
  const [formData, setFormData] = useState({
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

  const update = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const validateStep1 = () => {
    if (!formData.name || !formData.email || !formData.password)
      return "Please fill all fields";
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
      await api.post("/auth/send-otp", { ...formData, role });
      console.log("[Signup] OTP request successful");
      setStep(2);
      setResendCooldown(30);
    } catch (err) {
      console.error("[Signup] OTP request failed:", err);
      if (err.code === "ERR_NETWORK") {
        setError("Network Error: Cannot reach the server. Please check your internet or if the server is down.");
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
      await api.post("/auth/resend-otp", { email: formData.email });
      setResendCooldown(60);
      setError(""); // Clear error on success
    } catch (err) {
      console.error("[Signup] Resend OTP failed:", err);
      setError(err.response?.data?.message || "Failed to resend code");
    } finally {
      setProcessing(false);
    }
  };

  const handleOtpChange = (value, index) => {
    // Handle paste: spread digits across boxes
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
          // Small delay so UI renders the digits before overlay appears
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

    if (newOtp.every((d) => d !== "") && index === 5) {
      // Auto-submit on last digit but allow manual if preferred
      setTimeout(() => autoSubmitOtp(newOtp), 150);
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const autoSubmitOtp = async (otpArr) => {
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
      // Hard redirect with success flag
      window.location.href = "/login?registration=success";
    } catch (err) {
      setError(err.response?.data?.message || "Invalid OTP. Please try again.");
      // Don't clear OTP immediately to let user see what they typed
      isSubmittingOtp.current = false;
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      className="auth-wrapper"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F8FAFC",
        padding: "24px",
      }}
    >
      <AnimatePresence>
        {processing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(255,255,255,0.8)",
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
              PROCESSING...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ width: "100%", maxWidth: 480 }}>
        {step === 1 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="auth-card"
            style={{
              background: "white",
              padding: "48px 32px",
              borderRadius: 32,
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <h1 style={{ fontSize: "2rem", fontWeight: 900, color: "#1E293B", letterSpacing: "-0.025em" }}>
                Get Started
              </h1>
              <p style={{ color: "#64748B", marginTop: 8, fontSize: "0.95rem" }}>
                Create your LeadCity Errands account
              </p>
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
              <button
                type="button"
                onClick={() => setRole("sender")}
                style={{
                  flex: 1,
                  padding: "20px 12px",
                  borderRadius: 20,
                  border: "2px solid",
                  borderColor: role === "sender" ? "#2563EB" : "#F1F5F9",
                  background: role === "sender" ? "#EFF6FF" : "white",
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  transform: role === "sender" ? "scale(1.02)" : "scale(1)",
                }}
              >
                <User
                  size={24}
                  color={role === "sender" ? "#2563EB" : "#94A3B8"}
                  style={{ margin: "0 auto 10px", display: "block" }}
                />
                <span
                  style={{
                    fontWeight: 800,
                    color: role === "sender" ? "#2563EB" : "#64748B",
                    fontSize: "0.85rem",
                  }}
                >
                  Sender
                </span>
              </button>
              <button
                type="button"
                onClick={() => setRole("messenger")}
                style={{
                  flex: 1,
                  padding: "20px 12px",
                  borderRadius: 20,
                  border: "2px solid",
                  borderColor: role === "messenger" ? "#2563EB" : "#F1F5F9",
                  background: role === "messenger" ? "#EFF6FF" : "white",
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  transform: role === "messenger" ? "scale(1.02)" : "scale(1)",
                }}
              >
                <Bike
                  size={24}
                  color={role === "messenger" ? "#2563EB" : "#94A3B8"}
                  style={{ margin: "0 auto 10px", display: "block" }}
                />
                <span
                  style={{
                    fontWeight: 800,
                    color: role === "messenger" ? "#2563EB" : "#64748B",
                    fontSize: "0.85rem",
                  }}
                >
                  Messenger
                </span>
              </button>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                style={{
                  background: "#FFF1F2",
                  color: "#E11D48",
                  padding: "14px",
                  borderRadius: 16,
                  marginBottom: 24,
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  textAlign: "center",
                  border: "1px solid #FFE4E6",
                }}
              >
                {error}
              </motion.div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: 6 }}>Full Name</label>
                <input
                  className="input-field"
                  value={formData.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Enter your full name"
                  style={{ padding: "14px 16px", borderRadius: 14 }}
                />
              </div>
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: 6 }}>Email Address</label>
                <input
                  className="input-field"
                  type="email"
                  value={formData.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="student@lcu.edu.ng"
                  style={{ padding: "14px 16px", borderRadius: 14 }}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: 6 }}>Matric Number</label>
                <input
                  className="input-field"
                  value={formData.matricNumber}
                  onChange={(e) => update("matricNumber", e.target.value)}
                  placeholder="LCU/UG/..."
                  style={{ padding: "14px 16px", borderRadius: 14 }}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: 6 }}>Phone Number</label>
                <input
                  className="input-field"
                  value={formData.phoneNumber}
                  onChange={(e) => update("phoneNumber", e.target.value)}
                  placeholder="080..."
                  style={{ padding: "14px 16px", borderRadius: 14 }}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: 6 }}>Password</label>
                <input
                  className="input-field"
                  type="password"
                  value={formData.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder="••••••••"
                  style={{ padding: "14px 16px", borderRadius: 14 }}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: 6 }}>Confirm Password</label>
                <input
                  className="input-field"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => update("confirmPassword", e.target.value)}
                  placeholder="••••••••"
                  style={{ padding: "14px 16px", borderRadius: 14 }}
                />
              </div>
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: 6 }}>Hostel / Current Location</label>
                <input
                  className="input-field"
                  value={formData.location}
                  onChange={(e) => update("location", e.target.value)}
                  placeholder="e.g. Hostel A, Block B, or Off-campus"
                  style={{ padding: "14px 16px", borderRadius: 14 }}
                />
              </div>
            </div>

            <button
              onClick={handleNext}
              disabled={processing}
              className="btn btn-primary"
              style={{
                width: "100%",
                padding: "18px",
                marginTop: 32,
                borderRadius: 16,
                fontSize: "1rem",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.2)",
              }}
            >
              Continue to Verify <ChevronRight size={20} />
            </button>

            <div style={{ textAlign: "center", marginTop: 24 }}>
              <p style={{ color: "#64748B", fontSize: "0.9rem" }}>
                Already have an account?{" "}
                <a href="/login" style={{ color: "#2563EB", fontWeight: 800, textDecoration: "none" }}>Log In</a>
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="auth-card"
            style={{
              background: "white",
              padding: "48px 32px",
              borderRadius: 32,
              textAlign: "center",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{
                background: "#EFF6FF",
                width: 72,
                height: 72,
                borderRadius: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
              }}
            >
              <Mail color="#2563EB" size={32} />
            </div>
            <h2
              style={{ fontSize: "1.75rem", fontWeight: 900, marginBottom: 8, color: "#1E293B" }}
            >
              Verify Email
            </h2>
            <p
              style={{ color: "#64748B", marginBottom: 32, fontSize: "0.95rem", lineHeight: 1.5 }}
            >
              We've sent a verification code to<br />
              <span style={{ color: "#1E293B", fontWeight: 700 }}>{formData.email}</span>
            </p>

            {error && (
              <div
                style={{ 
                  background: "#FFF1F2",
                  color: "#E11D48", 
                  padding: "12px", 
                  borderRadius: 12, 
                  marginBottom: 24, 
                  fontWeight: 700,
                  fontSize: "0.85rem"
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 12,
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
                    width: 52,
                    height: 64,
                    textAlign: "center",
                    fontSize: "1.75rem",
                    fontWeight: 900,
                    borderRadius: 16,
                    border: `2px solid ${digit ? "#2563EB" : "#E2E8F0"}`,
                    outline: "none",
                    transition: "all 0.15s ease",
                    background: digit ? "#EFF6FF" : "white",
                    color: "#1E293B",
                    boxShadow: digit ? "0 0 0 4px rgba(37, 99, 235, 0.1)" : "none",
                  }}
                />
              ))}
            </div>

            <button
              onClick={() => autoSubmitOtp(otp)}
              disabled={otp.some(d => !d) || processing}
              style={{
                width: "100%",
                padding: "18px",
                background: "#2563EB",
                color: "white",
                borderRadius: 16,
                border: "none",
                fontWeight: 800,
                fontSize: "1rem",
                cursor: "pointer",
                marginBottom: 24,
                boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.2)",
                opacity: otp.some(d => !d) ? 0.6 : 1,
              }}
            >
              Verify & Create Account
            </button>

            <button
              onClick={handleResend}
              disabled={resendCooldown > 0 || processing}
              style={{
                background: "none",
                border: "none",
                color: resendCooldown > 0 ? "#94A3B8" : "#2563EB",
                fontWeight: 800,
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              {resendCooldown > 0
                ? `Resend code in ${resendCooldown}s`
                : "Didn't receive a code? Resend"}
            </button>

            <div style={{ marginTop: 32 }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  background: "#F1F5F9",
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
                }}
              >
                <ArrowLeft size={16} /> Edit Details
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Signup;
