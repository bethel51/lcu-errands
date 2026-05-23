import { useState, useEffect } from "react";
import imageCompression from "browser-image-compression";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Hash,
  LogOut,
  Edit2,
  Camera,
  Check,
  X,
  Star,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api";

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const userStr = localStorage.getItem("user");
  const initialUser = userStr ? JSON.parse(userStr) : null;
  const [user, setUser] = useState(initialUser);
  const [isEditing, setIsEditing] = useState(location.state?.edit || false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    location: user?.location || "",
    phoneNumber: user?.phoneNumber || "",
    profilePicture: user?.profilePicture || "",
    name: user?.name || "",
  });
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("1000");
  const [transactions, setTransactions] = useState([]);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawData, setWithdrawData] = useState({
    amount: "1000",
    accountNumber: "",
    bankName: "",
    accountName: "",
  });
  const [isBoostModalOpen, setIsBoostModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchTransactions();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/users/profile");
      setUser(res.data);
      setFormData({
        location: res.data.location || "",
        phoneNumber: res.data.phoneNumber || "",
        profilePicture: res.data.profilePicture || "",
        name: res.data.name || "",
      });
    } catch (err) {
      console.error("Failed to fetch profile", err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await api.get("/users/transactions");
      setTransactions(res.data);
    } catch (err) {
      console.error("Failed to fetch transactions", err);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete your account? This action is permanent and cannot be undone.",
      )
    )
      return;
    try {
      await api.delete("/users/profile");
      localStorage.clear();
      navigate("/login");
    } catch (err) {
      console.error("Failed to delete account", err);
      alert("Failed to delete account. Please try again.");
    }
  };

  const handleSave = async () => {
    setProcessing(true);
    try {
      const res = await api.put("/users/profile", formData);
      setUser(res.data);
      localStorage.setItem("user", JSON.stringify(res.data));
      setIsEditing(false);
      alert("✅ Profile updated successfully!");
    } catch (err) {
      console.error("Failed to update profile", err);
      alert("Failed to update profile. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleTopUp = async () => {
    setProcessing(true);
    try {
      const res = await api.post("/users/top-up", {
        amount: topUpAmount,
        email: user?.email,
      });
      if (res.data.checkout_url) {
        window.location.href = res.data.checkout_url;
        return;
      }
      const updatedUser = res.data.user || res.data;
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setIsTopUpModalOpen(false);
      fetchTransactions();
      alert(
        `✅ ₦${Number(topUpAmount).toLocaleString()} added to your wallet!`,
      );
    } catch (err) {
      alert(`❌ ${err.response?.data?.message || "Payment failed"}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawData.accountNumber || !withdrawData.bankName || !withdrawData.accountName) {
      alert("❌ Please fill in all bank details");
      return;
    }

    if (Number(withdrawData.amount) > (user?.balance || 0)) {
      alert("❌ Insufficient balance");
      return;
    }
    setProcessing(true);
    try {
      await api.post("/withdrawals/request", withdrawData);
      setIsWithdrawModalOpen(false);
      fetchProfile();
      fetchTransactions();
      alert("✅ Withdrawal request submitted!");
    } catch (err) {
      alert(`❌ ${err.response?.data?.message || "Withdrawal failed"}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleBoost = async () => {
    if ((user?.balance || 0) < 200) {
      alert("❌ Insufficient balance to boost (₦200 required)");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/users/boost-profile");
      setUser(res.data.user);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setIsBoostModalOpen(false);
      fetchTransactions();
      alert(
        "🚀 Profile boosted! You are now featured at the top for 24 hours.",
      );
    } catch (err) {
      alert("❌ Boost failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      // Compress image
      const options = {
        maxSizeMB: 0.2, // Max size 200KB
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);
      const uploadData = new FormData();
      uploadData.append("profilePicture", compressedFile);

      const res = await api.post("/users/profile-picture", uploadData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUser(res.data);
      localStorage.setItem("user", JSON.stringify(res.data));
      setFormData((prev) => ({
        ...prev,
        profilePicture: res.data.profilePicture,
      }));
      alert("Profile picture updated!");
    } catch (err) {
      console.error("Image upload failed", err);
      alert("Failed to upload image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 100 }}>
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
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 15,
            }}
          >
            <div className="loader" style={{ width: 40, height: 40 }} />
            <div
              style={{
                fontWeight: 800,
                color: "var(--blue-600)",
                fontSize: "0.75rem",
              }}
            >
              UPDATING...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="dashboard-header" style={{ marginBottom: 32 }}>
        <div className="dashboard-title">
          <h1>My Profile</h1>
          <p>Manage your account and view your status.</p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="btn"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--gray-900)",
            }}
          >
            <Edit2 size={18} /> Edit Profile
          </button>
        ) : (
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => setIsEditing(false)}
              className="btn btn-outline"
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <X size={18} /> Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn"
              disabled={loading}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              {loading ? (
                "Saving..."
              ) : (
                <>
                  <Check size={18} /> Save Changes
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="grid-responsive">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card"
          style={{ padding: 32, textAlign: "center", height: "fit-content" }}
        >
          <div
            style={{
              position: "relative",
              width: 120,
              height: 120,
              margin: "0 auto 24px",
            }}
          >
            {user.profilePicture || formData.profilePicture ? (
              <img
                src={isEditing ? formData.profilePicture : user.profilePicture}
                alt="Profile"
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "4px solid var(--blue-50)",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  background: "var(--blue-600)",
                  color: "white",
                  fontSize: "3rem",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}

            {isEditing && (
              <label
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  background: "var(--gray-900)",
                  color: "white",
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  border: "3px solid white",
                }}
              >
                <Camera size={18} />
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={loading}
                />
              </label>
            )}
          </div>

          <h2 style={{ marginBottom: 4 }}>{user.name}</h2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginBottom: 12,
              color: "var(--amber-500)",
              fontWeight: 700,
            }}
          >
            <Star size={16} fill="var(--amber-400)" color="var(--amber-400)" />{" "}
            {user.rating?.toFixed(1) || "No ratings"}
          </div>
          <div
            style={{
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: 99,
              fontSize: "0.75rem",
              fontWeight: 700,
              background:
                user.role === "messenger"
                  ? "var(--pink-100)"
                  : "var(--blue-100)",
              color:
                user.role === "messenger"
                  ? "var(--pink-500)"
                  : "var(--blue-600)",
              textTransform: "uppercase",
              marginBottom: 20,
            }}
          >
            {user.role}
          </div>

          <div
            style={{
              borderTop: "1px solid var(--gray-100)",
              paddingTop: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                color: "var(--gray-600)",
              }}
            >
              <ShieldCheck
                size={20}
                color={user.isVerified ? "var(--green-500)" : "var(--gray-300)"}
              />
              <span style={{ fontWeight: 600 }}>
                {user.isVerified ? "Verified Account" : "Unverified Student"}
              </span>
            </div>
            {!isEditing && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  marginTop: 20,
                }}
              >
                <button
                  onClick={handleLogout}
                  className="btn btn-outline"
                  style={{
                    width: "100%",
                    borderColor: "var(--gray-200)",
                    color: "var(--gray-600)",
                  }}
                >
                  <LogOut size={18} style={{ marginRight: 8 }} /> Log Out
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="btn btn-ghost"
                  style={{
                    width: "100%",
                    color: "var(--pink-600)",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                  }}
                >
                  Delete Account
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Details Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card"
          style={{ padding: 40 }}
        >
          <h3
            style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: 32 }}
          >
            Account Information
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 40,
            }}
          >
            <div>
              <div style={{ marginBottom: 32 }}>
                <p
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "var(--gray-400)",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  Full Name
                </p>
                {isEditing ? (
                  <input
                    type="text"
                    className="input-field"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Your Full Name"
                  />
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontWeight: 600,
                    }}
                  >
                    <User size={18} color="var(--blue-600)" /> {user.name}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 32 }}>
                <p
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "var(--gray-400)",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  Email Address
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontWeight: 600,
                  }}
                >
                  <Mail size={18} color="var(--blue-600)" /> {user.email}
                </div>
              </div>

              <div style={{ marginBottom: 32 }}>
                <p
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "var(--gray-400)",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  Phone Number
                </p>
                {isEditing ? (
                  <input
                    type="text"
                    className="input-field"
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, phoneNumber: e.target.value })
                    }
                    placeholder="Enter phone number"
                  />
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontWeight: 600,
                    }}
                  >
                    <Phone size={18} color="var(--blue-600)" />{" "}
                    {user.phoneNumber || "Not provided"}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 32 }}>
                <p
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "var(--gray-400)",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  Campus Location
                </p>
                {isEditing ? (
                  <input
                    type="text"
                    className="input-field"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="e.g. Hostel A, Block B"
                  />
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontWeight: 600,
                    }}
                  >
                    <MapPin size={18} color="var(--blue-600)" />{" "}
                    {user.location || "Not provided"}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div style={{ marginBottom: 32 }}>
                <p
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "var(--gray-400)",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  Matric Number
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontWeight: 600,
                    color: "var(--gray-500)",
                  }}
                >
                  <Hash size={18} color="var(--gray-400)" />{" "}
                  {user.matricNumber || "Not provided"}
                </div>
                <p
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--gray-400)",
                    marginTop: 4,
                  }}
                >
                  (Cannot be changed)
                </p>
              </div>

              <div
                style={{
                  marginBottom: 32,
                  background:
                    "linear-gradient(135deg, var(--blue-600), var(--blue-900))",
                  padding: 24,
                  borderRadius: 24,
                  color: "white",
                  boxShadow: "0 10px 25px -5px rgba(30, 77, 183, 0.4)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <motion.div
                    key={user.balance}
                    initial={{ scale: 1.1, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      fontSize: "2rem",
                      fontWeight: 900,
                    }}
                  >
                    <Wallet size={32} /> ₦{user.balance?.toLocaleString() || 0}
                  </motion.div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {user.role === "messenger" && (
                      <button
                        onClick={() => setIsWithdrawModalOpen(true)}
                        className="btn btn-sm"
                        style={{
                          background: "rgba(255,255,255,0.1)",
                          border: "1px solid rgba(255,255,255,0.3)",
                          color: "white",
                          borderRadius: 12,
                          fontWeight: 700,
                          padding: "10px 14px",
                        }}
                      >
                        Withdraw
                      </button>
                    )}
                    <button
                      onClick={() => setIsTopUpModalOpen(true)}
                      className="btn btn-sm"
                      style={{
                        background: "white",
                        color: "var(--blue-600)",
                        borderRadius: 12,
                        fontWeight: 800,
                        padding: "10px 18px",
                      }}
                    >
                      Top Up
                    </button>
                  </div>
                </div>
                {user.role === "messenger" && (
                  <div
                    style={{
                      marginBottom: 32,
                      background:
                        user.verificationStatus === "verified"
                          ? "var(--green-50)"
                          : "var(--gray-50)",
                      border: `1px solid ${user.verificationStatus === "verified" ? "var(--green-200)" : "var(--gray-200)"}`,
                      padding: 24,
                      borderRadius: 24,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 16,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 4,
                        }}
                      >
                        <ShieldCheck
                          size={18}
                          color={
                            user.verificationStatus === "verified"
                              ? "var(--green-600)"
                              : "var(--gray-400)"
                          }
                        />
                        <span
                          style={{
                            fontWeight: 800,
                            color:
                              user.verificationStatus === "verified"
                                ? "var(--green-800)"
                                : "var(--gray-700)",
                          }}
                        >
                          {user.verificationStatus === "verified"
                            ? "Verified Messenger"
                            : "Account Verification"}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--gray-500)",
                          margin: 0,
                        }}
                      >
                        {user.verificationStatus === "verified"
                          ? "You are a trusted LCU messenger."
                          : "Your account is active. Complete errands to build your rating!"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Transaction History */}
              <div
                style={{
                  background: "white",
                  border: "1px solid var(--gray-100)",
                  borderRadius: 24,
                  padding: 24,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <TrendingUp size={20} color="var(--blue-600)" />
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 800 }}>
                    Wallet Activity
                  </h3>
                </div>

                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  {transactions.length === 0 ? (
                    <p
                      style={{
                        textAlign: "center",
                        color: "var(--gray-400)",
                        padding: "20px 0",
                        fontSize: "0.9rem",
                      }}
                    >
                      No recent transactions
                    </p>
                  ) : (
                    transactions.map((t) => (
                      <div
                        key={t._id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px 0",
                          borderBottom: "1px solid var(--gray-50)",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: "0.9rem",
                              color: "var(--gray-800)",
                            }}
                          >
                            {t.description}
                          </div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--gray-400)",
                            }}
                          >
                            {new Date(t.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div
                          style={{
                            fontWeight: 800,
                            color: t.type === "credit" ? "#10B981" : "#EF4444",
                            fontSize: "0.95rem",
                          }}
                        >
                          {t.type === "credit" ? "+" : "-"}₦{t.amount}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Top Up Modal */}
      {isTopUpModalOpen && (
        <>
          <div
            className="modal-overlay"
            onClick={() => setIsTopUpModalOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="modal-container"
            style={{
              maxWidth: 420,
              padding: 0,
              overflow: "hidden",
              transform: "translate(-50%, -50%)",
            }}
          >
            <div
              style={{
                background:
                  "linear-gradient(135deg, var(--blue-600), var(--blue-900))",
                padding: "28px 24px",
                color: "white",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 16,
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      opacity: 0.7,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      marginBottom: 4,
                    }}
                  >
                    Current Balance
                  </p>
                  <div style={{ fontSize: "2rem", fontWeight: 900 }}>
                    ₦{user?.balance?.toLocaleString() || 0}
                  </div>
                </div>
                <button
                  onClick={() => setIsTopUpModalOpen(false)}
                  style={{
                    border: "none",
                    background: "rgba(255,255,255,0.2)",
                    color: "white",
                    borderRadius: 10,
                    width: 36,
                    height: 36,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={18} />
                </button>
              </div>
              <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                Add money to post errands and pay messengers instantly.
              </div>
            </div>

            <div style={{ padding: "24px" }}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Enter Amount (₦)</label>
                <input
                  type="number"
                  className="input-field"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  placeholder="e.g. 2000"
                  style={{ fontSize: "1.25rem", fontWeight: 700, height: 56 }}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 8,
                  marginBottom: 20,
                }}
              >
                {["500", "1000", "2000", "5000", "10000", "20000"].map(
                  (amt) => (
                    <button
                      key={amt}
                      onClick={() => setTopUpAmount(amt)}
                      style={{
                        padding: "10px 8px",
                        borderRadius: 12,
                        border: `2px solid ${topUpAmount === amt ? "var(--blue-600)" : "var(--gray-200)"}`,
                        background:
                          topUpAmount === amt ? "var(--blue-50)" : "white",
                        color:
                          topUpAmount === amt
                            ? "var(--blue-700)"
                            : "var(--gray-600)",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontSize: "0.85rem",
                      }}
                    >
                      ₦{Number(amt).toLocaleString()}
                    </button>
                  ),
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginBottom: 20,
                  padding: "10px 14px",
                  background: "var(--gray-50)",
                  borderRadius: 12,
                  fontSize: "0.78rem",
                  color: "var(--gray-500)",
                }}
              >
                <ShieldCheck size={16} color="var(--green-500)" />
                <span>Secured by Paystack · Card · Bank Transfer · USSD</span>
              </div>
              <button
                onClick={handleTopUp}
                className="btn"
                disabled={loading || !topUpAmount || Number(topUpAmount) < 100}
                style={{
                  width: "100%",
                  background: "var(--blue-600)",
                  height: 52,
                  fontSize: "1rem",
                  fontWeight: 800,
                }}
              >
                {loading
                  ? "Processing..."
                  : `Deposit ₦${Number(topUpAmount || 0).toLocaleString()}`}
              </button>
              <p
                style={{
                  textAlign: "center",
                  fontSize: "0.75rem",
                  color: "var(--gray-400)",
                  marginTop: 10,
                }}
              >
                Minimum deposit: ₦100
              </p>
            </div>
          </motion.div>
        </>
      )}
      {/* Withdrawal Modal */}
      {isWithdrawModalOpen && (
        <>
          <div
            className="modal-overlay"
            onClick={() => setIsWithdrawModalOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="modal-container"
            style={{ maxWidth: 450 }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <h2 style={{ fontWeight: 800 }}>Withdraw Funds</h2>
              <button
                onClick={() => setIsWithdrawModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <X />
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Amount to Withdraw (₦)</label>
              <input
                type="number"
                className="input-field"
                value={withdrawData.amount}
                onChange={(e) =>
                  setWithdrawData({ ...withdrawData, amount: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">Bank Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. GTBank, Zenith"
                value={withdrawData.bankName}
                onChange={(e) =>
                  setWithdrawData({ ...withdrawData, bankName: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Number</label>
              <input
                type="text"
                className="input-field"
                placeholder="10 digits"
                value={withdrawData.accountNumber}
                onChange={(e) =>
                  setWithdrawData({
                    ...withdrawData,
                    accountNumber: e.target.value,
                  })
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="Full Account Name"
                value={withdrawData.accountName}
                onChange={(e) =>
                  setWithdrawData({
                    ...withdrawData,
                    accountName: e.target.value,
                  })
                }
              />
            </div>

            <div
              style={{
                background: "var(--blue-50)",
                padding: 16,
                borderRadius: 12,
                fontSize: "0.8rem",
                color: "var(--blue-700)",
                marginBottom: 24,
              }}
            >
              <b>Note:</b> Withdrawals are processed manually by admins within
              24 hours. Minimum: ₦1,000.
            </div>

            <button
              onClick={handleWithdraw}
              className="btn"
              style={{ width: "100%" }}
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </motion.div>
        </>
      )}

      {/* Boost Modal */}
      {isBoostModalOpen && (
        <>
          <div
            className="modal-overlay"
            onClick={() => setIsBoostModalOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="modal-container"
            style={{ maxWidth: 400, textAlign: "center" }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                background: "var(--amber-100)",
                color: "var(--amber-600)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <TrendingUp size={32} />
            </div>
            <h2 style={{ fontWeight: 800, marginBottom: 12 }}>
              Boost Your Profile
            </h2>
            <p style={{ color: "var(--gray-500)", marginBottom: 24 }}>
              Stand out from the crowd! Your profile will appear at the very top
              of the messenger directory for the next 24 hours.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "16px 20px",
                background: "var(--gray-50)",
                borderRadius: 16,
                marginBottom: 24,
              }}
            >
              <span style={{ fontWeight: 600 }}>Boost Fee:</span>
              <span style={{ fontWeight: 800, color: "var(--blue-600)" }}>
                ₦200
              </span>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setIsBoostModalOpen(false)}
                className="btn btn-outline"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={handleBoost}
                className="btn"
                style={{ flex: 1 }}
                disabled={loading}
              >
                {loading ? "Boosting..." : "Boost Now"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default Profile;
