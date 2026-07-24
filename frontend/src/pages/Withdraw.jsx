import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Wallet, AlertCircle, HelpCircle } from "lucide-react";
import api from "../api";
import { useToast } from "../context/ToastContext";

const Withdraw = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
  });

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

  const handleWithdraw = async (e) => {
    if (e) e.preventDefault();
    if (!formData.bankName || !formData.accountNumber || !formData.accountName) {
      showToast("Please fill all bank details", "error");
      return;
    }
    const amt = Number(formData.amount);
    if (!amt || amt <= 0) {
      showToast("Please enter a valid amount", "error");
      return;
    }
    if (amt > (user?.balance || 0)) {
      showToast("Insufficient balance", "error");
      return;
    }
    if (amt < 1000) {
      showToast("Minimum withdrawal is ₦1,000", "error");
      return;
    }
    setLoading(true);
    try {
      await api.post("/withdrawals/request", formData);
      showToast("Withdrawal request submitted successfully!");
      navigate("/dashboard");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to submit withdrawal", "error");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    formData.bankName &&
    formData.accountNumber &&
    formData.accountName &&
    Number(formData.amount) >= 1000;

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
            <h1 style={{ fontSize: "1.3rem", fontWeight: 900, margin: 0, color: "var(--gray-900)" }}>Withdraw Funds</h1>
            <p style={{ fontSize: "0.8rem", color: "var(--gray-400)", margin: 0, fontWeight: 600 }}>Transfer earnings to your bank</p>
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

        {/* Withdrawal Form */}
        <form onSubmit={handleWithdraw} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              background: "#ffffff",
              borderRadius: 24,
              padding: 24,
              boxShadow: "0 4px 16px rgba(0,0,0,0.02)",
              border: "1px solid var(--gray-100)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "var(--gray-500)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Amount to Withdraw (₦)
              </label>
              <input
                type="number"
                placeholder="Min. ₦1,000"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                style={{
                  width: "100%",
                  height: 52,
                  border: "2px solid var(--gray-100)",
                  borderRadius: 14,
                  padding: "0 16px",
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "var(--gray-900)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "var(--gray-500)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Bank Name
              </label>
              <input
                type="text"
                placeholder="e.g. GTBank, Kuda, Access Bank"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                required
                style={{
                  width: "100%",
                  height: 52,
                  border: "2px solid var(--gray-100)",
                  borderRadius: 14,
                  padding: "0 16px",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  color: "var(--gray-900)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "var(--gray-500)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Account Number
              </label>
              <input
                type="text"
                maxLength="10"
                placeholder="10-digit account number"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value.replace(/\D/g, "") })}
                required
                style={{
                  width: "100%",
                  height: 52,
                  border: "2px solid var(--gray-100)",
                  borderRadius: 14,
                  padding: "0 16px",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  color: "var(--gray-900)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "var(--gray-500)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Account Name
              </label>
              <input
                type="text"
                placeholder="Name on bank account"
                value={formData.accountName}
                onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                required
                style={{
                  width: "100%",
                  height: 52,
                  border: "2px solid var(--gray-100)",
                  borderRadius: 14,
                  padding: "0 16px",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  color: "var(--gray-900)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Info Banner */}
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              padding: "16px 20px",
              background: "rgba(30, 77, 183, 0.05)",
              borderRadius: 20,
              fontSize: "0.8rem",
              color: "var(--blue-700)",
              border: "1px solid rgba(30, 77, 183, 0.1)",
            }}
          >
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <div>
              <span style={{ fontWeight: 800, display: "block" }}>Important Notice</span>
              Withdrawals are processed manually by administrators within 24 hours. Please double check all details.
            </div>
          </div>

          {/* Action Button */}
          <motion.button
            type="submit"
            disabled={loading || !isFormValid}
            whileTap={{ scale: 0.98 }}
            style={{
              width: "100%",
              height: 56,
              borderRadius: 16,
              background: loading || !isFormValid
                ? "var(--gray-200)"
                : "linear-gradient(135deg, #1e4db7 0%, #1e3a8a 100%)",
              color: loading || !isFormValid ? "var(--gray-400)" : "#ffffff",
              fontWeight: 800,
              fontSize: "1rem",
              border: "none",
              cursor: loading || !isFormValid ? "not-allowed" : "pointer",
              boxShadow: loading || !isFormValid ? "none" : "0 4px 16px rgba(30,77,183,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.2s",
            }}
          >
            {loading ? "Submitting Request..." : "Submit Withdrawal Request"}
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
};

export default Withdraw;
