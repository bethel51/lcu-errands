import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Wallet, ShieldCheck, HelpCircle } from "lucide-react";
import api from "../api";
import { useToast } from "../context/ToastContext";

const QUICK_AMOUNTS = ["500", "1000", "2000", "5000", "10000", "20000"];

const TopUp = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [user, setUser] = useState(null);
  const [amount, setAmount] = useState("1000");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/users/profile");
      setUser(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeposit = async (e) => {
    if (e) e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt < 100) {
      showToast("Minimum deposit is ₦100", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/users/top-up", {
        amount: amt,
        email: user?.email,
      });
      if (res.data.checkout_url) {
        window.location.href = res.data.checkout_url;
        return;
      }
      showToast(`✅ ₦${amt.toLocaleString()} added to your wallet!`);
      navigate("/dashboard");
    } catch (err) {
      showToast(err.response?.data?.message || "Payment failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      style={{
        minHeight: "100vh",
        background: "var(--gray-50)",
        paddingBottom: 100,
        paddingTop: 24,
      }}
    >
      <div className="container" style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px" }}>
        {/* Navigation Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: "#ffffff",
              border: "none",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--gray-700)",
            }}
          >
            <ArrowLeft size={20} />
          </motion.button>
          <div>
            <h1 style={{ fontSize: "1.3rem", fontWeight: 900, margin: 0, color: "var(--gray-900)" }}>Top Up Wallet</h1>
            <p style={{ fontSize: "0.8rem", color: "var(--gray-400)", margin: 0, fontWeight: 600 }}>Fund your account via Paystack</p>
          </div>
        </div>

        {/* Current Balance Card */}
        <div
          style={{
            background: "linear-gradient(135deg, #1e4db7 0%, #0f172a 100%)",
            borderRadius: 24,
            padding: 24,
            color: "#ffffff",
            boxShadow: "0 10px 25px -5px rgba(30, 77, 183, 0.25)",
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <span style={{ fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.8, fontWeight: 700 }}>
              Available Balance
            </span>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
              <Wallet size={24} />
              ₦{user?.balance?.toLocaleString() || "0"}
            </div>
          </div>
        </div>

        {/* Top Up Form */}
        <form onSubmit={handleDeposit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              background: "#ffffff",
              borderRadius: 24,
              padding: 24,
              boxShadow: "0 4px 16px rgba(0,0,0,0.02)",
              border: "1px solid var(--gray-100)",
            }}
          >
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 800, color: "var(--gray-500)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Enter Amount (₦)
            </label>
            <input
              type="number"
              placeholder="e.g. 2000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              style={{
                width: "100%",
                height: 64,
                border: "2px solid var(--gray-100)",
                borderRadius: 16,
                padding: "0 20px",
                fontSize: "1.5rem",
                fontWeight: 800,
                color: "var(--gray-900)",
                outline: "none",
                transition: "all 0.2s",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--blue-600)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--gray-100)")}
            />

            {/* Quick Amounts Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 18 }}>
              {QUICK_AMOUNTS.map((amt) => {
                const isActive = amount === amt;
                return (
                  <motion.button
                    key={amt}
                    type="button"
                    onClick={() => setAmount(amt)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      height: 48,
                      borderRadius: 12,
                      border: `2px solid ${isActive ? "var(--blue-600)" : "var(--gray-100)"}`,
                      background: isActive ? "var(--blue-50)" : "#ffffff",
                      color: isActive ? "var(--blue-700)" : "var(--gray-600)",
                      fontWeight: 800,
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      transition: "all 0.2s",
                    }}
                  >
                    ₦{Number(amt).toLocaleString()}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Security Badge */}
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              padding: "16px 20px",
              background: "#ffffff",
              borderRadius: 20,
              fontSize: "0.8rem",
              color: "var(--gray-500)",
              border: "1px solid var(--gray-100)",
            }}
          >
            <ShieldCheck size={20} color="var(--green-500)" style={{ flexShrink: 0 }} />
            <div>
              <span style={{ fontWeight: 800, color: "var(--gray-800)", display: "block" }}>Secured by Paystack</span>
              Card · Bank Transfer · USSD · Safe Escrow System
            </div>
          </div>

          {/* Action Button */}
          <motion.button
            type="submit"
            disabled={loading || !amount || Number(amount) < 100}
            whileTap={{ scale: 0.98 }}
            style={{
              width: "100%",
              height: 56,
              borderRadius: 16,
              background: loading || !amount || Number(amount) < 100
                ? "var(--gray-200)"
                : "linear-gradient(135deg, #1e4db7 0%, #1e3a8a 100%)",
              color: loading || !amount || Number(amount) < 100 ? "var(--gray-400)" : "#ffffff",
              fontWeight: 800,
              fontSize: "1rem",
              border: "none",
              cursor: loading || !amount || Number(amount) < 100 ? "not-allowed" : "pointer",
              boxShadow: loading || !amount || Number(amount) < 100 ? "none" : "0 4px 16px rgba(30,77,183,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.2s",
            }}
          >
            {loading ? "Redirecting to Paystack..." : `Deposit ₦${Number(amount || 0).toLocaleString()}`}
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
};

export default TopUp;
