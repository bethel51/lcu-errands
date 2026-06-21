import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { ChevronRight, ArrowLeft } from "lucide-react";
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
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown > 0]);


  const update = (field: keyof SignupFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const validateStep1 = (): string => {
    if (!formData.name || !formData.email || !formData.password || !formData.matricNumber || !formData.phoneNumber)
      return "Please fill all required fields";
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email))
      return "Please enter a valid email address";

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

      if (response.data.devOtp) {
        setDevOtpHint(response.data.devOtp);
      } else {
        setDevOtpHint("");
      }

      setStep(2);
      setResendCooldown(30);
      setError("");
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
    <div className="clean-auth-wrapper">
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
                fontWeight: 700,
                color: "#111827",
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

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="clean-auth-card"
        style={{ maxWidth: step === 1 ? 500 : 420 }}
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
          <h1>{step === 1 ? "Create account" : "Verify your email"}</h1>
          <p>{step === 1 ? "Get started with LeadCity Errands" : `We sent a code to ${formData.email}`}</p>
        </div>

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

        {step === 1 ? (
          <div>
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

            <div className="clean-auth-grid">
              <div className="clean-auth-form-group" style={{ gridColumn: "span 2" }}>
                <label className="clean-auth-label">Full Name</label>
                <input
                  className="clean-auth-input"
                  value={formData.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="clean-auth-form-group" style={{ gridColumn: "span 2" }}>
                <label className="clean-auth-label">Email Address</label>
                <input
                  className="clean-auth-input"
                  type="email"
                  value={formData.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="student@lcu.edu.ng"
                  required
                />
              </div>

              <div className="clean-auth-form-group">
                <label className="clean-auth-label">Matric Number</label>
                <input
                  className="clean-auth-input"
                  value={formData.matricNumber}
                  onChange={(e) => update("matricNumber", e.target.value)}
                  placeholder="LCU/UG/..."
                  required
                />
              </div>

              <div className="clean-auth-form-group">
                <label className="clean-auth-label">Phone Number</label>
                <input
                  className="clean-auth-input"
                  value={formData.phoneNumber}
                  onChange={(e) => update("phoneNumber", e.target.value)}
                  placeholder="080..."
                  required
                />
              </div>

              <div className="clean-auth-form-group">
                <label className="clean-auth-label">Password</label>
                <input
                  className="clean-auth-input"
                  type="password"
                  value={formData.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="clean-auth-form-group">
                <label className="clean-auth-label">Confirm Password</label>
                <input
                  className="clean-auth-input"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => update("confirmPassword", e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="clean-auth-form-group" style={{ gridColumn: "span 2" }}>
                <label className="clean-auth-label">Hostel / Location</label>
                <input
                  className="clean-auth-input"
                  value={formData.location}
                  onChange={(e) => update("location", e.target.value)}
                  placeholder="e.g. Hostel A, Block B"
                  required
                />
              </div>
            </div>

            <button
              onClick={handleNext}
              disabled={processing}
              className="clean-auth-submit-btn"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginTop: 20,
              }}
            >
              Continue <ChevronRight size={16} />
            </button>
          </div>
        ) : (
          <div>
            {/* Monospace OTP Grid */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }}>
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
                    width: 44,
                    height: 52,
                    textAlign: "center",
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    borderRadius: "var(--radius-sm)",
                    border: `1.5px solid ${digit ? "var(--blue-600)" : "var(--gray-300)"}`,
                    outline: "none",
                    background: digit ? "var(--blue-50)" : "var(--white)",
                    color: "var(--blue-900)",
                    fontFamily: "monospace",
                  }}
                />
              ))}
            </div>

            {/* Developer Friendly Staging OTP Hint */}
            {devOtpHint && (
              <div
                style={{
                  background: "var(--blue-50)",
                  color: "var(--blue-700)",
                  padding: "10px 12px",
                  borderRadius: 8,
                  marginBottom: 20,
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  border: "1px dashed var(--blue-100)",
                  textAlign: "center",
                }}
              >
                Staging Code: <span style={{ fontFamily: "monospace", fontSize: "0.95rem", letterSpacing: "2px", marginLeft: 4, fontWeight: 700 }}>{devOtpHint}</span>
              </div>
            )}

            <button
              onClick={() => autoSubmitOtp(otp)}
              disabled={otp.some(d => !d) || processing}
              className="clean-auth-submit-btn"
              style={{
                opacity: otp.some(d => !d) ? 0.6 : 1,
                cursor: otp.some(d => !d) ? "not-allowed" : "pointer",
                marginBottom: 20,
              }}
            >
              Verify & Create Account
            </button>

            <div style={{ textAlign: "center" }}>
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0 || processing}
                style={{
                  background: "none",
                  border: "none",
                  color: resendCooldown > 0 ? "var(--gray-500)" : "var(--blue-600)",
                  fontWeight: 600,
                  cursor: resendCooldown > 0 ? "default" : "pointer",
                  fontSize: "0.875rem",
                  outline: "none",
                  textDecoration: resendCooldown > 0 ? "none" : "underline",
                }}
              >
                {resendCooldown > 0
                  ? `Resend code in ${resendCooldown}s`
                  : "Didn't receive a code? Resend"}
              </button>
            </div>

            <div style={{ marginTop: 24, textAlign: "center", borderTop: "1px solid var(--gray-200)", paddingTop: 20 }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--gray-500)",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  outline: "none",
                }}
              >
                <ArrowLeft size={16} /> Edit details
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ marginTop: 24, textAlign: "center", borderTop: "1px solid var(--gray-200)", paddingTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ color: "var(--gray-500)", fontSize: "0.875rem", margin: 0 }}>
              Already have an account?{" "}
              <Link to="/login" style={{ color: "var(--blue-600)", fontWeight: 700, textDecoration: "underline" }}>
                Log In
              </Link>
            </p>
            <div>
              <Link
                to="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--gray-505, var(--gray-500))",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "color 0.2s",
                }}
              >
                <ArrowLeft size={16} /> Back to Main Page
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Signup;
