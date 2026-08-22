import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { X, Wallet, AlertCircle, Building2, User, CreditCard } from "lucide-react";
import api from "../api";
import { useToast } from "../context/ToastContext";

const Withdraw = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  // Hydrate from localStorage instantly — no blank state
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
  });

  useEffect(() => {
    // Background revalidate to get fresh balance
    api.get("/users/profile")
      .then((res) => {
        setUser(res.data);
        localStorage.setItem("user", JSON.stringify(res.data));
      })
      .catch(console.error);
  }, []);

  const amt = Number(formData.amount) || 0;
  const userBalance = user?.balance || 0;
  const isFormValid =
    formData.bankName.trim().length > 0 &&
    formData.accountNumber.trim().length >= 10 &&
    formData.accountName.trim().length > 0 &&
    amt >= 1000 &&
    amt <= userBalance;

  const handleWithdraw = async (e) => {
    if (e) e.preventDefault();
    if (!isFormValid || loading) return;

    setLoading(true);
    try {
      await api.post("/withdrawals/request", formData);
      showToast("🚀 Withdrawal request submitted successfully!");
      navigate("/dashboard");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to submit withdrawal", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 320, mass: 0.8 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        height: "100dvh",
        width: "100vw",
        overflow: "hidden",
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          height: 64,
          padding: "0 16px",
          background: "#FFFFFF",
          borderBottom: "1.5px solid #E2E8F0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04)",
        }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "1.5px solid #CBD5E1",
            background: "#F8FAFC",
            color: "#0F172A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          aria-label="Close"
        >
          <X size={20} color="#0F172A" />
        </button>

        <h1
          style={{
            fontSize: "1.15rem",
            fontWeight: 900,
            color: "#0F172A",
            margin: 0,
            fontFamily: "Outfit, sans-serif",
            letterSpacing: "-0.3px",
          }}
        >
          Withdraw Earnings
        </h1>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            borderRadius: 20,
            background: "#EFF6FF",
            border: "1.5px solid #BFDBFE",
            color: "#1D4ED8",
            fontWeight: 800,
            fontSize: "0.82rem",
          }}
        >
          <Wallet size={15} color="#1D4ED8" />
          ₦{userBalance.toLocaleString()}
        </div>
      </div>

      {/* Scrollable Form Body */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          padding: "20px 16px 130px",
          background: "#F8FAFC",
        }}
      >
        <div style={{ maxWidth: 540, margin: "0 auto" }}>
          {/* Header Balance Banner */}
          <div
            style={{
              background: "linear-gradient(135deg, #1E4DB7, #2563EB)",
              borderRadius: 20,
              padding: "20px 22px",
              color: "#FFFFFF",
              marginBottom: 20,
              boxShadow: "0 10px 28px rgba(37,99,235,0.28)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <span style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.88, fontWeight: 700 }}>
                Withdrawable Balance
              </span>
              <div style={{ fontSize: "1.8rem", fontWeight: 900, marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
                <Wallet size={24} />
                ₦{userBalance.toLocaleString()}
              </div>
            </div>
          </div>

          <form onSubmit={handleWithdraw} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Amount Card */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 20,
                padding: 20,
                border: "1.5px solid #E2E8F0",
                boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
              }}
            >
              <label
                style={{
                  display: "block",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  color: "#475569",
                  marginBottom: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Withdrawal Amount (₦) *
              </label>
              <input
                type="number"
                placeholder="Min. ₦1,000"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                style={{
                  width: "100%",
                  height: 56,
                  border: "1.5px solid #CBD5E1",
                  borderRadius: 16,
                  padding: "0 18px",
                  fontSize: "1.3rem",
                  fontWeight: 900,
                  color: "#0F172A",
                  outline: "none",
                  boxSizing: "border-box",
                  background: "#FFFFFF",
                }}
              />
              <span style={{ fontSize: "0.76rem", color: "#64748B", fontWeight: 700, marginTop: 6, display: "block" }}>
                Minimum withdrawal amount is ₦1,000
              </span>
            </div>

            {/* Bank Details Card */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 20,
                padding: 20,
                border: "1.5px solid #E2E8F0",
                boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    color: "#475569",
                    marginBottom: 8,
                    textTransform: "uppercase",
                  }}
                >
                  <Building2 size={15} color="#2563EB" /> Bank Name *
                </label>
                <input
                  className="input-field"
                  placeholder="e.g. Access Bank / Kuda / GTBank"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  required
                  style={{
                    fontSize: "0.98rem",
                    fontWeight: 700,
                    background: "#FFFFFF",
                    border: "1.5px solid #CBD5E1",
                    color: "#0F172A",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    color: "#475569",
                    marginBottom: 8,
                    textTransform: "uppercase",
                  }}
                >
                  <CreditCard size={15} color="#2563EB" /> Account Number *
                </label>
                <input
                  className="input-field"
                  type="number"
                  placeholder="10-digit account number"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  required
                  style={{
                    fontSize: "0.98rem",
                    fontWeight: 700,
                    background: "#FFFFFF",
                    border: "1.5px solid #CBD5E1",
                    color: "#0F172A",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    color: "#475569",
                    marginBottom: 8,
                    textTransform: "uppercase",
                  }}
                >
                  <User size={15} color="#2563EB" /> Account Name *
                </label>
                <input
                  className="input-field"
                  placeholder="Full name registered on bank account"
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  required
                  style={{
                    fontSize: "0.98rem",
                    fontWeight: 700,
                    background: "#FFFFFF",
                    border: "1.5px solid #CBD5E1",
                    color: "#0F172A",
                  }}
                />
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#FFFFFF",
          borderTop: "1.5px solid #E2E8F0",
          padding: "14px 16px calc(14px + env(safe-area-inset-bottom, 14px))",
          boxShadow: "0 -10px 30px rgba(0,0,0,0.06)",
          zIndex: 100000,
        }}
      >
        <div style={{ maxWidth: 540, margin: "0 auto" }}>
          <motion.button
            whileTap={isFormValid ? { scale: 0.98 } : {}}
            type="button"
            onClick={handleWithdraw}
            disabled={loading || !isFormValid}
            style={{
              width: "100%",
              height: 54,
              borderRadius: 16,
              border: "none",
              background: isFormValid ? "linear-gradient(135deg, #1E4DB7, #2563EB)" : "#E2E8F0",
              color: isFormValid ? "#FFFFFF" : "#94A3B8",
              fontWeight: 900,
              fontSize: "1.02rem",
              cursor: isFormValid ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: isFormValid ? "0 8px 24px rgba(37,99,235,0.35)" : "none",
              transition: "all 0.18s ease",
            }}
          >
            {loading ? (
              <>
                <div className="loader" style={{ width: 22, height: 22, borderTopColor: "#fff" }} />
                <span>Submitting Request…</span>
              </>
            ) : (
              <span>Submit Withdrawal Request</span>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default Withdraw;
