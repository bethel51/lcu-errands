import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { X, Wallet, ShieldCheck } from "lucide-react";
import api from "../api";
import { useToast } from "../context/ToastContext";

const QUICK_AMOUNTS = ["500", "1000", "2000", "5000", "10000", "20000"];

const TopUp = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  // Hydrate from localStorage instantly — no blank state
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  });
  const [amount, setAmount] = useState("1000");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Background revalidate to get fresh balance
    api.get("/users/profile")
      .then((res) => {
        setUser(res.data);
        localStorage.setItem("user", JSON.stringify(res.data));
      })
      .catch(console.error);
  }, []);

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

  const isFormValid = Boolean(amount && Number(amount) >= 100);

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
          Top Up Wallet
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
          ₦{user?.balance?.toLocaleString() || "0"}
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
          {/* Current Balance Banner */}
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
                Available Balance
              </span>
              <div style={{ fontSize: "1.8rem", fontWeight: 900, marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
                <Wallet size={24} />
                ₦{user?.balance?.toLocaleString() || "0"}
              </div>
            </div>
          </div>

          <form onSubmit={handleDeposit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
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
                Enter Deposit Amount (₦) *
              </label>
              <input
                type="number"
                placeholder="e.g. 2000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                style={{
                  width: "100%",
                  height: 60,
                  border: "1.5px solid #CBD5E1",
                  borderRadius: 16,
                  padding: "0 18px",
                  fontSize: "1.4rem",
                  fontWeight: 900,
                  color: "#0F172A",
                  outline: "none",
                  boxSizing: "border-box",
                  background: "#FFFFFF",
                }}
              />

              {/* Quick Amount Chips */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 14 }}>
                {QUICK_AMOUNTS.map((amt) => {
                  const isActive = amount === amt;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(amt)}
                      style={{
                        height: 46,
                        borderRadius: 14,
                        border: `1.5px solid ${isActive ? "#2563EB" : "#CBD5E1"}`,
                        background: isActive ? "#EFF6FF" : "#FFFFFF",
                        color: isActive ? "#1D4ED8" : "#334155",
                        fontWeight: 800,
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        transition: "all 0.15s",
                      }}
                    >
                      ₦{Number(amt).toLocaleString()}
                    </button>
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
                background: "#FFFFFF",
                borderRadius: 20,
                fontSize: "0.82rem",
                color: "#475569",
                border: "1.5px solid #E2E8F0",
              }}
            >
              <ShieldCheck size={22} color="#16A34A" style={{ flexShrink: 0 }} />
              <div>
                <span style={{ fontWeight: 800, color: "#0F172A", display: "block" }}>Secured by Paystack</span>
                Card · Bank Transfer · USSD · Safe Escrow Protection
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
            onClick={handleDeposit}
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
                <span>Redirecting to Paystack…</span>
              </>
            ) : (
              <span>Deposit ₦{Number(amount || 0).toLocaleString()}</span>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default TopUp;
