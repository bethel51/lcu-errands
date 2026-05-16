import { useState, useEffect } from "react";
import "./App.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Users,
  Package,
  TrendingUp,
  Search,
  Activity,
  CreditCard,
  CheckCircle,
  LogOut,
  AlertTriangle,
  X,
  Clock,
  FileText,
  MessageSquare,
  Megaphone,
  Send,
  Menu,
  Moon,
  Sun,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import adminApi from "./adminApi";

const AdminPortal = () => {
  // Auth States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [securityKey, setSecurityKey] = useState("");
  const [error, setError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("isAdminLoggedIn") === "true",
  );

  // Data States
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [errands, setErrands] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [health, setHealth] = useState(null);
  const [logs, setLogs] = useState([]);

  // UI States
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedErrandChat, setSelectedErrandChat] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("adminDarkMode") === "true",
  );

  useEffect(() => {
    localStorage.setItem("adminDarkMode", darkMode);
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [darkMode]);

  // Campaign States
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastLoading, setBroadcastLoading] = useState(false);

  const [showSetup, setShowSetup] = useState(false);
  const [setupName, setSetupName] = useState("");

  // Rejection Modal States
  const [rejectionModal, setRejectionModal] = useState({
    isOpen: false,
    id: null,
    type: null, // "withdrawal" or "verification"
    status: null,
  });
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionLoading, setRejectionLoading] = useState(false);

  const handleInitialSetup = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setError("");
    try {
      await adminApi.post("/auth/init", {
        name: setupName,
        email,
        password,
        securityKey,
      });
      alert("Master Admin Created! You can now login.");
      setShowSetup(false);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Setup Failed. System already initialized?",
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const [dataLoading, setDataLoading] = useState(false);
  const [renderError, setRenderError] = useState(null);

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
    }
    // Reset search when switching tabs to avoid "ghost" filtering
    setSearchTerm("");
    setRoleFilter("all");
    setStatusFilter("all");
  }, [isLoggedIn]);

  const fetchData = async () => {
    setDataLoading(true);
    setRenderError(null);
    try {
      const [
        statsRes,
        usersRes,
        errandsRes,
        withdrawalsRes,
        verificationsRes,
        healthRes,
        logsRes,
      ] = await Promise.all([
        adminApi.get("/management/stats").catch(() => ({ data: null })),
        adminApi.get("/management/users").catch(() => ({ data: [] })),
        adminApi.get("/management/errands").catch(() => ({ data: [] })),
        adminApi.get("/management/withdrawals").catch(() => ({ data: [] })),
        adminApi
          .get("/management/pending-verifications")
          .catch(() => ({ data: [] })),
        adminApi.get("/management/health").catch(() => ({ data: null })),
        adminApi.get("/management/logs").catch(() => ({ data: [] })),
      ]);

      setStats(statsRes.data);
      setUsers(usersRes.data || []);
      setErrands(errandsRes.data || []);
      setWithdrawals(withdrawalsRes.data || []);
      setPendingVerifications(verificationsRes.data || []);
      setHealth(healthRes.data);
      setLogs(logsRes.data || []);
    } catch (err) {
      if (err.response?.status === 401) {
        handleLogout();
      } else {
        setRenderError(
          "Network Error: Failed to synchronize with Administrative Services.",
        );
      }
    } finally {
      setDataLoading(false);
    }
  };

  const formatChartData = (data, key) => {
    return (data || []).map((item) => ({
      name: new Date(item._id).toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
      }),
      [key]: item.total || item.count || 0,
    }));
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (
      !window.confirm(
        `Are you sure you want to send this broadcast to ${users.length} users?`,
      )
    )
      return;

    setBroadcastLoading(true);
    try {
      await adminApi.post("/management/broadcast", {
        subject: broadcastSubject,
        message: broadcastMessage,
      });
      alert("Broadcast sent successfully!");
      setBroadcastSubject("");
      setBroadcastMessage("");
      fetchData();
    } catch (err) {
      alert("Failed to send broadcast");
    } finally {
      setBroadcastLoading(false);
    }
  };

  const fetchChat = async (errandId) => {
    try {
      const res = await adminApi.get(`/management/chat/${errandId}`);
      setSelectedErrandChat(res.data);
    } catch (err) {
      alert("Failed to fetch chat log");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setError("");
    try {
      const response = await adminApi.post("/auth/login", {
        email,
        password,
        securityKey,
      });
      localStorage.setItem("adminToken", response.data.token);
      localStorage.setItem("isAdminLoggedIn", "true");
      setIsLoggedIn(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Access Denied. Invalid Credentials or Protocol Violation.",
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("isAdminLoggedIn");
    setIsLoggedIn(false);
  };

  const handleToggleSuspend = async (id, currentStatus) => {
    if (
      !window.confirm(
        `Confirm protocol: ${currentStatus ? "REACTIVE" : "SUSPEND"} user?`,
      )
    )
      return;
    try {
      await adminApi.patch(`/management/users/${id}/suspend`);
      fetchData();
    } catch (err) {
      alert("System Error");
    }
  };

  const handleProcessWithdrawal = async (id, status) => {
    if (status === "rejected") {
      setRejectionModal({ isOpen: true, id, type: "withdrawal", status });
      return;
    }
    try {
      await adminApi.patch(`/management/withdrawals/${id}/process`, {
        status,
      });
      fetchData();
    } catch (err) {
      alert("Transaction Error");
    }
  };

  const handleProcessVerification = async (id, status) => {
    if (status === "unverified") {
      setRejectionModal({ isOpen: true, id, type: "verification", status });
      return;
    }
    try {
      await adminApi.patch(`/management/users/${id}/verify`, {
        status,
      });
      fetchData();
    } catch (err) {
      alert("Verification Error");
    }
  };

  const submitRejection = async () => {
    if (!rejectionReason.trim()) return;
    setRejectionLoading(true);
    try {
      const { id, type, status } = rejectionModal;
      const endpoint =
        type === "withdrawal"
          ? `/management/withdrawals/${id}/process`
          : `/management/users/${id}/verify`;

      await adminApi.patch(endpoint, {
        status,
        reason: rejectionReason,
      });

      setRejectionModal({ isOpen: false, id: null, type: null, status: null });
      setRejectionReason("");
      fetchData();
    } catch (err) {
      alert("Failed to process rejection");
    } finally {
      setRejectionLoading(false);
    }
  };

  const filteredUsers = Array.isArray(users)
    ? users.filter((u) => {
        const matchesSearch =
          (u?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (u?.email || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === "all" || u?.role === roleFilter;
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "suspended" && u?.isSuspended) ||
          (statusFilter === "active" && !u?.isSuspended) ||
          (statusFilter === "unverified" && !u?.isVerified);
        return matchesSearch && matchesRole && matchesStatus;
      })
    : [];

  const filteredErrands = Array.isArray(errands)
    ? errands.filter((e) => {
        const matchesSearch = (e?.title || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        return matchesSearch;
      })
    : [];

  if (renderError) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F8FAFC",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <AlertTriangle
            size={48}
            color="#EF4444"
            style={{ marginBottom: 20 }}
          />
          <h2 style={{ fontWeight: 800 }}>Sync Failure</h2>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#2563EB",
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: 12,
              marginTop: 20,
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F0F4F8",
          padding: 20,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            width: "100%",
            maxWidth: 400,
            background: "white",
            borderRadius: 24,
            padding: "40px 30px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <Shield
              size={48}
              color="#2563EB"
              style={{ margin: "0 auto 20px" }}
            />
            <h1 style={{ fontSize: "1.5rem", fontWeight: 900 }}>
              {showSetup ? "Master Setup" : "Admin Vault"}
            </h1>
          </div>
          {error && (
            <div
              style={{
                color: "#EF4444",
                background: "#FEF2F2",
                padding: 12,
                borderRadius: 10,
                marginBottom: 20,
                textAlign: "center",
                fontSize: "0.9rem",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={showSetup ? handleInitialSetup : handleLogin}>
            {showSetup && (
              <input
                placeholder="Full Name"
                style={{
                  width: "100%",
                  padding: 14,
                  borderRadius: 12,
                  border: "1px solid #E2E8F0",
                  marginBottom: 16,
                  background: "#F8FAFC",
                  outline: "none",
                  color: "#1E293B",
                }}
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                required
              />
            )}
            <input
              placeholder="Email"
              type="email"
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 12,
                border: "1px solid #E2E8F0",
                marginBottom: 16,
                background: "#F8FAFC",
                outline: "none",
                color: "#1E293B",
              }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              placeholder="Security Key"
              type="password"
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 12,
                border: "1px solid #E2E8F0",
                marginBottom: 16,
                background: "#F8FAFC",
                outline: "none",
                color: "#1E293B",
              }}
              value={securityKey}
              onChange={(e) => setSecurityKey(e.target.value)}
              required
            />
            <input
              placeholder="Password"
              type="password"
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 12,
                border: "1px solid #E2E8F0",
                marginBottom: 24,
                background: "#F8FAFC",
                outline: "none",
                color: "#1E293B",
              }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={authLoading}
              style={{
                width: "100%",
                background: "#2563EB",
                color: "white",
                padding: 16,
                borderRadius: 12,
                fontWeight: 800,
                border: "none",
                cursor: "pointer",
              }}
            >
              {authLoading
                ? "Verifying..."
                : showSetup
                  ? "Create Master Account"
                  : "Authorize"}
            </button>
          </form>

          <button
            onClick={() => {
              setShowSetup(!showSetup);
              setError("");
            }}
            style={{
              width: "100%",
              marginTop: 20,
              background: "none",
              border: "none",
              color: "#64748B",
              fontSize: "0.8rem",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {showSetup
              ? "Return to Login"
              : "First-time setup? Create Master Admin"}
          </button>
        </motion.div>
      </div>
    );
  }

  const menuItems = [
    { id: "overview", label: "Dashboard", icon: <Activity size={18} /> },
    { id: "users", label: "Directory", icon: <Users size={18} /> },
    { id: "errands", label: "Errands", icon: <Package size={18} /> },
    { id: "withdrawals", label: "Payouts", icon: <CreditCard size={18} /> },
    {
      id: "verifications",
      label: "KYC Approval",
      icon: <CheckCircle size={18} />,
    },
    { id: "campaigns", label: "Campaigns", icon: <Megaphone size={18} /> },
    { id: "logs", label: "Audit Logs", icon: <FileText size={18} /> },
    { id: "system", label: "System", icon: <Activity size={18} /> },
  ];

  return (
    <div
      style={{
        background: "#F8FAFC",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top Nav */}
      <nav
        style={{
          background: "white",
          borderBottom: "1px solid #E2E8F0",
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              background: "none",
              border: "none",
              padding: 8,
            }}
            className="mobile-only"
          >
            <Menu />
          </button>
          <Shield size={24} color="#2563EB" />
          <span style={{ fontWeight: 900, color: "var(--accent-color)" }}>VAULT</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              padding: 10,
              borderRadius: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-primary)",
            }}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={handleLogout}
            style={{
              background: "#FEF2F2",
              color: "#EF4444",
              border: "none",
              padding: "8px 16px",
              borderRadius: 8,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      <div style={{ display: "flex", flex: 1, position: "relative" }}>
        {/* Sidebar - Desktop & Mobile Drawer */}
        <aside
          className={`sidebar ${sidebarOpen ? "open" : ""}`}
          style={{
            width: 260,
            background: "white",
            borderRight: "1px solid #E2E8F0",
            padding: 20,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  borderRadius: 10,
                  border: "none",
                  background: activeTab === item.id ? "#EFF6FF" : "transparent",
                  color: activeTab === item.id ? "#2563EB" : "#64748B",
                  fontWeight: 700,
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                }}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </div>
        </aside>

        {/* Sidebar Overlay for Mobile */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 90,
            }}
            className="mobile-only"
          />
        )}

        {/* Main Content */}
        <main
          style={{
            flex: 1,
            padding: "30px 20px",
            maxWidth: "100vw",
            overflowX: "hidden",
          }}
        >
          <div
            style={{
              marginBottom: 30,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 15,
            }}
          >
            <h2 style={{ fontSize: "1.5rem", fontWeight: 900 }}>
              {activeTab.toUpperCase()}
            </h2>
            <button
              onClick={fetchData}
              style={{
                background: "white",
                border: "1px solid #E2E8F0",
                padding: "10px 20px",
                borderRadius: 10,
                fontWeight: 700,
              }}
            >
              Refresh
            </button>
          </div>

          {activeTab === "overview" && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: 15,
                  marginBottom: 30,
                }}
              >
                <StatCard
                  label="Users"
                  value={users.length}
                  icon={<Users size={18} />}
                  color="#2563EB"
                />
                <StatCard
                  label="Pending Payouts"
                  value={
                    withdrawals.filter((w) => w.status === "pending").length
                  }
                  icon={<CreditCard size={18} />}
                  color="#EF4444"
                />
                <StatCard
                  label="Live Errands"
                  value={errands.filter((e) => e.status !== "completed").length}
                  icon={<Package size={18} />}
                  color="#0891B2"
                />
                <StatCard
                  label="Total Revenue"
                  value={`₦${(stats?.totalFees || 0).toLocaleString()}`}
                  icon={<TrendingUp size={18} />}
                  color="#10B981"
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
                  gap: 20,
                  marginBottom: 30,
                }}
              >
                {/* Financial Performance Chart */}
                <div className="card shadow-sm" style={{ padding: 25, height: 400, borderRadius: 20 }}>
                  <h4 style={{ marginBottom: 25, fontWeight: 800 }}>
                    7-Day Financial Performance (Revenue)
                  </h4>
                  <ResponsiveContainer width="100%" height="80%">
                    <AreaChart data={formatChartData(stats?.revenueTrends, "Revenue")}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                      />
                      <Tooltip
                        contentStyle={{ 
                          borderRadius: 12, 
                          border: "none", 
                          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                          background: "var(--bg-secondary)",
                          color: "var(--text-primary)"
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="Revenue"
                        stroke="#10B981"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorRev)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Errand Trends Chart */}
                <div className="card shadow-sm" style={{ padding: 25, height: 400, borderRadius: 20 }}>
                  <h4 style={{ marginBottom: 25, fontWeight: 800 }}>
                    7-Day Errand Volume (Activity)
                  </h4>
                  <ResponsiveContainer width="100%" height="80%">
                    <AreaChart data={formatChartData(stats?.errandTrends, "Errands")}>
                      <defs>
                        <linearGradient id="colorErr" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563EB" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                      />
                      <Tooltip
                        contentStyle={{ 
                          borderRadius: 12, 
                          border: "none", 
                          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                          background: "var(--bg-secondary)",
                          color: "var(--text-primary)"
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="Errands"
                        stroke="#2563EB"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorErr)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {activeTab === "campaigns" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: "white",
                padding: "30px 20px",
                borderRadius: 20,
                border: "1px solid #E2E8F0",
                maxWidth: 800,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 30,
                }}
              >
                <div
                  style={{
                    background: "#EFF6FF",
                    padding: 12,
                    borderRadius: 12,
                  }}
                >
                  <Megaphone color="#2563EB" />
                </div>
                <div>
                  <h3 style={{ fontWeight: 900 }}>Global Broadcast</h3>
                  <p style={{ color: "#64748B", fontSize: "0.9rem" }}>
                    Send platform announcements via email.
                  </p>
                </div>
              </div>
              <form onSubmit={handleSendBroadcast}>
                <div style={{ marginBottom: 20 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      marginBottom: 8,
                    }}
                  >
                    SUBJECT
                  </label>
                  <input
                    placeholder="Subject"
                    style={{
                      width: "100%",
                      padding: 14,
                      borderRadius: 12,
                      border: "1px solid #E2E8F0",
                      color: "#1E293B",
                    }}
                    value={broadcastSubject}
                    onChange={(e) => setBroadcastSubject(e.target.value)}
                    required
                  />
                </div>
                <div style={{ marginBottom: 30 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      marginBottom: 8,
                    }}
                  >
                    MESSAGE
                  </label>
                  <textarea
                    placeholder="Write announcement here..."
                    style={{
                      width: "100%",
                      padding: 14,
                      borderRadius: 12,
                      border: "1px solid #E2E8F0",
                      minHeight: 180,
                      color: "#1E293B",
                    }}
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={broadcastLoading}
                  style={{
                    background: "#2563EB",
                    color: "white",
                    padding: "16px 32px",
                    borderRadius: 12,
                    fontWeight: 800,
                    border: "none",
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                  }}
                >
                  {broadcastLoading ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send size={18} /> Dispatch Campaign
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {(activeTab === "users" || activeTab === "errands") && (
            <div
              style={{
                background: "white",
                borderRadius: 20,
                border: "1px solid #E2E8F0",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: 15,
                  borderBottom: "1px solid #F1F5F9",
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
                  <Search
                    size={18}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#94A3B8",
                    }}
                  />
                  <input
                    placeholder="Search records..."
                    style={{
                      width: "100%",
                      padding: "12px 40px",
                      borderRadius: 10,
                      border: "1px solid #E2E8F0",
                      outline: "none",
                      color: "#1E293B",
                    }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                {activeTab === "users" && (
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid #E2E8F0",
                      flexShrink: 0,
                      color: "#1E293B",
                    }}
                  >
                    <option value="all">All Roles</option>
                    <option value="student">Students</option>
                    <option value="messenger">Messengers</option>
                  </select>
                )}
                {activeTab === "users" && (
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid #E2E8F0",
                      flexShrink: 0,
                      color: "#1E293B",
                    }}
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active Only</option>
                    <option value="suspended">Suspended</option>
                    <option value="unverified">Unverified</option>
                  </select>
                )}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: 600,
                  }}
                >
                  <thead style={{ background: "#F8FAFC", textAlign: "left" }}>
                    <tr>
                      <th style={{ padding: 15 }}>IDENTIFIER</th>
                      <th style={{ padding: 15 }}>STATUS / VAL</th>
                      <th style={{ padding: 15 }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTab === "users"
                      ? filteredUsers.map((u) => (
                          <tr
                            key={u._id}
                            style={{ borderTop: "1px solid #F1F5F9" }}
                          >
                            <td style={{ padding: 15 }}>
                              <div style={{ fontWeight: 700 }}>{u.name}</div>
                              <div
                                style={{
                                  fontSize: "0.75rem",
                                  color: "#64748B",
                                }}
                              >
                                {u.email}
                              </div>
                            </td>
                            <td style={{ padding: 15 }}>
                              <span
                                style={{
                                  color: u.isSuspended ? "#EF4444" : "#10B981",
                                  fontWeight: 800,
                                  fontSize: "0.8rem",
                                }}
                              >
                                {u.isSuspended ? "SUSPENDED" : "ACTIVE"}
                              </span>
                            </td>
                            <td
                              style={{ padding: 15, display: "flex", gap: 12 }}
                            >
                              <button
                                onClick={() => setSelectedUser(u)}
                                style={{
                                  color: "#2563EB",
                                  fontWeight: 800,
                                  background: "none",
                                  border: "none",
                                  fontSize: "0.8rem",
                                }}
                              >
                                VIEW
                              </button>
                              <button
                                onClick={() =>
                                  handleToggleSuspend(u._id, u.isSuspended)
                                }
                                style={{
                                  color: u.isSuspended ? "#10B981" : "#EF4444",
                                  fontWeight: 800,
                                  background: "none",
                                  border: "none",
                                  fontSize: "0.8rem",
                                }}
                              >
                                {u.isSuspended ? "RESTORE" : "SUSPEND"}
                              </button>
                            </td>
                          </tr>
                        ))
                      : filteredErrands.map((e) => (
                          <tr
                            key={e._id}
                            style={{ borderTop: "1px solid #F1F5F9" }}
                          >
                            <td style={{ padding: 15 }}>
                              <div
                                style={{ fontWeight: 700, fontSize: "0.9rem" }}
                              >
                                {e.title}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.75rem",
                                  color: "#64748B",
                                }}
                              >
                                {e.posterId?.name}
                              </div>
                            </td>
                            <td style={{ padding: 15 }}>
                              <span
                                style={{ color: "#2563EB", fontWeight: 800 }}
                              >
                                ₦{e.fee}
                              </span>
                            </td>
                            <td style={{ padding: 15 }}>
                              <button
                                onClick={() => fetchChat(e._id)}
                                style={{
                                  color: "#2563EB",
                                  background: "none",
                                  border: "none",
                                  fontWeight: 800,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                  fontSize: "0.8rem",
                                }}
                              >
                                <MessageSquare size={14} /> MONITOR
                              </button>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "withdrawals" && (
            <div
              style={{
                background: "white",
                borderRadius: 20,
                border: "1px solid #E2E8F0",
                overflow: "hidden",
              }}
            >
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: 600,
                  }}
                >
                  <thead style={{ background: "#F8FAFC", textAlign: "left" }}>
                    <tr>
                      <th style={{ padding: 15 }}>USER</th>
                      <th style={{ padding: 15 }}>DESTINATION</th>
                      <th style={{ padding: 15 }}>AMOUNT</th>
                      <th style={{ padding: 15 }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals
                      .filter((w) => w.status === "pending")
                      .map((w) => (
                        <tr
                          key={w._id}
                          style={{ borderTop: "1px solid #F1F5F9" }}
                        >
                          <td style={{ padding: 15 }}>
                            <div style={{ fontWeight: 700 }}>
                              {w.userId?.name}
                            </div>
                          </td>
                          <td style={{ padding: 15 }}>
                            <div style={{ fontSize: "0.8rem" }}>
                              {w.bankName} - {w.accountNumber}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: 15,
                              fontWeight: 900,
                              color: "#10B981",
                            }}
                          >
                            ₦{w.amount}
                          </td>
                          <td style={{ padding: 15, display: "flex", gap: 10 }}>
                            <button
                              onClick={() =>
                                handleProcessWithdrawal(w._id, "approved")
                              }
                              style={{
                                background: "#2563EB",
                                color: "white",
                                padding: "6px 12px",
                                borderRadius: 8,
                                border: "none",
                                fontSize: "0.75rem",
                              }}
                            >
                              APPROVE
                            </button>
                            <button
                              onClick={() =>
                                handleProcessWithdrawal(w._id, "rejected")
                              }
                              style={{
                                background: "#FEF2F2",
                                color: "#EF4444",
                                padding: "6px 12px",
                                borderRadius: 8,
                                border: "none",
                                fontSize: "0.75rem",
                              }}
                            >
                              REJECT
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "verifications" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 20,
              }}
            >
              {pendingVerifications.map((v) => (
                <div
                  key={v._id}
                  style={{
                    background: "white",
                    padding: 20,
                    borderRadius: 20,
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: 15 }}>
                    {v.name}
                  </div>
                  <div
                    style={{
                      aspectRatio: "4/3",
                      background: "#F1F5F9",
                      borderRadius: 12,
                      marginBottom: 20,
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={
                        v.verificationProof?.startsWith("http")
                          ? v.verificationProof
                          : v.verificationProof
                      }
                      alt="Proof"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                      onError={(e) => {
                        e.target.src =
                          "https://via.placeholder.com/400x300?text=Verification+Image+Missing";
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() =>
                        handleProcessVerification(v._id, "verified")
                      }
                      style={{
                        flex: 1,
                        background: "#2563EB",
                        color: "white",
                        padding: 12,
                        borderRadius: 10,
                        border: "none",
                        fontWeight: 700,
                      }}
                    >
                      APPROVE
                    </button>
                    <button
                      onClick={() =>
                        handleProcessVerification(v._id, "unverified")
                      }
                      style={{
                        flex: 1,
                        background: "#FEF2F2",
                        color: "#EF4444",
                        padding: 12,
                        borderRadius: 10,
                        border: "none",
                        fontWeight: 700,
                      }}
                    >
                      REJECT
                    </button>
                  </div>
                </div>
              ))}
              {pendingVerifications.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    gridColumn: "1/-1",
                    padding: 40,
                    color: "#64748B",
                  }}
                >
                  No pending verification requests.
                </div>
              )}
            </div>
          )}

          {activeTab === "logs" && (
            <div
              style={{
                background: "white",
                borderRadius: 20,
                border: "1px solid #E2E8F0",
                overflow: "hidden",
              }}
            >
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: 600,
                  }}
                >
                  <thead style={{ background: "#F8FAFC", textAlign: "left" }}>
                    <tr>
                      <th style={{ padding: 15 }}>TIME</th>
                      <th style={{ padding: 15 }}>ADMIN</th>
                      <th style={{ padding: 15 }}>ACTION</th>
                      <th style={{ padding: 15 }}>TARGET</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((l) => (
                      <tr
                        key={l._id}
                        style={{ borderTop: "1px solid #F1F5F9" }}
                      >
                        <td style={{ padding: 15, fontSize: "0.8rem" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <Clock size={12} />{" "}
                            {new Date(l.createdAt).toLocaleTimeString()}
                          </div>
                        </td>
                        <td style={{ padding: 15, fontWeight: 700 }}>
                          {l.adminName}
                        </td>
                        <td style={{ padding: 15 }}>
                          <span
                            style={{
                              padding: "4px 8px",
                              borderRadius: 6,
                              background: "#F1F5F9",
                              fontSize: "0.7rem",
                              fontWeight: 800,
                            }}
                          >
                            {l.action}
                          </span>
                        </td>
                        <td style={{ padding: 15, fontSize: "0.9rem" }}>
                          {l.targetName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "system" && health && (
            <div
              style={{
                background: "white",
                padding: 30,
                borderRadius: 20,
                border: "1px solid #E2E8F0",
              }}
            >
              <h3 style={{ marginBottom: 20, fontWeight: 800 }}>
                Core Health Status
              </h3>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 15 }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "12px 0",
                    borderBottom: "1px solid #F1F5F9",
                  }}
                >
                  <span>Database Persistence</span>
                  <span style={{ color: "#10B981", fontWeight: 800 }}>
                    {health.database.toUpperCase()}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "12px 0",
                    borderBottom: "1px solid #F1F5F9",
                  }}
                >
                  <span>System Uptime</span>
                  <span>{Math.floor(health.uptime / 60)} minutes</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "12px 0",
                  }}
                >
                  <span>Service Mode</span>
                  <span style={{ color: "#2563EB", fontWeight: 800 }}>
                    PRODUCTION
                  </span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* User Inspection Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                background: "white",
                width: "100%",
                maxWidth: 500,
                borderRadius: 24,
                padding: 30,
                position: "relative",
              }}
            >
              <button
                onClick={() => setSelectedUser(null)}
                style={{
                  position: "absolute",
                  right: 20,
                  top: 20,
                  background: "none",
                  border: "none",
                }}
              >
                <X />
              </button>
              <h2 style={{ fontWeight: 900 }}>{selectedUser.name}</h2>
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "#64748B",
                  marginBottom: 20,
                }}
              >
                {selectedUser.email}
              </div>
              <div
                style={{
                  background: "#F8FAFC",
                  padding: 20,
                  borderRadius: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 15,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: "#64748B",
                      fontWeight: 800,
                      textTransform: "uppercase",
                    }}
                  >
                    Wallet Balance
                  </div>
                  <div
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: 900,
                      color: "#10B981",
                    }}
                  >
                    ₦{(selectedUser.balance || 0).toLocaleString()}
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 15,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "0.65rem",
                        color: "#64748B",
                        fontWeight: 800,
                      }}
                    >
                      MATRIC NO.
                    </div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 700 }}>
                      {selectedUser.matricNumber || "N/A"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.65rem",
                        color: "#64748B",
                        fontWeight: 800,
                      }}
                    >
                      PHONE
                    </div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 700 }}>
                      {selectedUser.phoneNumber || "N/A"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.65rem",
                        color: "#64748B",
                        fontWeight: 800,
                      }}
                    >
                      ROLE
                    </div>
                    <div
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 700,
                        textTransform: "capitalize",
                      }}
                    >
                      {selectedUser.role}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.65rem",
                        color: "#64748B",
                        fontWeight: 800,
                      }}
                    >
                      VERIFIED
                    </div>
                    <div
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 700,
                        color: selectedUser.isVerified ? "#10B981" : "#EF4444",
                      }}
                    >
                      {selectedUser.isVerified ? "YES" : "NO"}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Intel Chat Monitor Modal */}
      <AnimatePresence>
        {selectedErrandChat && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: 20,
            }}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              style={{
                background: "white",
                width: "100%",
                maxWidth: 500,
                borderRadius: 24,
                padding: 25,
                maxHeight: "80vh",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 20,
                }}
              >
                <h3 style={{ fontWeight: 900 }}>Communication Intel</h3>
                <button
                  onClick={() => setSelectedErrandChat(null)}
                  style={{ background: "none", border: "none" }}
                >
                  <X />
                </button>
              </div>
              <div
                style={{
                  flex: 1,
                  overflow: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {selectedErrandChat.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      background: "#F8FAFC",
                      padding: "12px 16px",
                      borderRadius: 16,
                      border: "1px solid #E2E8F0",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 800,
                          color: "#2563EB",
                          textTransform: "uppercase",
                        }}
                      >
                        {m.senderId?.name || "System"}
                      </span>
                      <span
                        style={{
                          fontSize: "0.6rem",
                          color: "#94A3B8",
                          fontWeight: 600,
                        }}
                      >
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {m.text && (
                      <div
                        style={{
                          fontSize: "0.9rem",
                          lineHeight: 1.5,
                          color: "#1E293B",
                        }}
                      >
                        {m.text}
                      </div>
                    )}
                    {m.imageUrl && (
                      <img
                        src={m.imageUrl}
                        alt="Attachment"
                        style={{
                          marginTop: 10,
                          borderRadius: 10,
                          maxWidth: "100%",
                          maxHeight: 200,
                          objectFit: "cover",
                          cursor: "pointer",
                        }}
                        onClick={() => window.open(m.imageUrl, "_blank")}
                      />
                    )}
                  </div>
                ))}
                {selectedErrandChat.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "60px 20px",
                      color: "#64748B",
                    }}
                  >
                    <MessageSquare
                      size={40}
                      style={{ opacity: 0.2, marginBottom: 15 }}
                    />
                    <p style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                      No digital footprint found for this errand.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global CSS for Mobile Responsiveness */}
      <style>{`
        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            left: -260px;
            top: 0;
            bottom: 0;
            z-index: 100;
            transition: left 0.3s ease;
          }
          .sidebar.open {
            left: 0;
          }
          .mobile-only {
            display: flex !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-only {
            display: none !important;
          }
        }
        .loader-sm {
          border: 2px solid #F3F3F3;
          border-top: 2px solid #2563EB;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active{
            -webkit-box-shadow: 0 0 0 30px white inset !important;
        }
        input:focus {
          border-color: #2563EB !important;
        }
      `}</style>

        {/* Rejection Reason Modal */}
        <AnimatePresence>
          {rejectionModal.isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15, 23, 42, 0.7)",
                backdropFilter: "blur(8px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
                padding: 20,
              }}
              onClick={() =>
                !rejectionLoading &&
                setRejectionModal({ ...rejectionModal, isOpen: false })
              }
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="card"
                style={{
                  width: "100%",
                  maxWidth: 400,
                  borderRadius: 24,
                  padding: 30,
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                }}
              >
                <div style={{ textAlign: "center", marginBottom: 25 }}>
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      background: "#FEE2E2",
                      color: "#EF4444",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 15px",
                    }}
                  >
                    <AlertTriangle size={30} />
                  </div>
                  <h2
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 900,
                      color: "var(--text-primary)",
                    }}
                  >
                    Provide Reason
                  </h2>
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-secondary)",
                      marginTop: 8,
                    }}
                  >
                    Explain why this{" "}
                    {rejectionModal.type === "withdrawal"
                      ? "payout"
                      : "verification"}{" "}
                    is being rejected.
                  </p>
                </div>

                <textarea
                  placeholder="Type rejection reason here..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  style={{
                    width: "100%",
                    minHeight: 120,
                    padding: 15,
                    borderRadius: 16,
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                    fontSize: "0.9rem",
                    resize: "none",
                    outline: "none",
                    marginBottom: 20,
                    display: "block",
                  }}
                  autoFocus
                />

                <div
                  style={{ display: "flex", gap: 12, flexDirection: "column" }}
                >
                  <button
                    onClick={submitRejection}
                    disabled={!rejectionReason.trim() || rejectionLoading}
                    className="btn btn-primary"
                    style={{
                      width: "100%",
                      padding: "14px",
                      background: "#EF4444",
                      border: "none",
                      opacity: rejectionReason.trim() ? 1 : 0.5,
                    }}
                  >
                    {rejectionLoading ? (
                      <div
                        className="loader-sm"
                        style={{ width: 18, height: 18, margin: "0 auto" }}
                      />
                    ) : (
                      "Confirm Rejection"
                    )}
                  </button>
                  <button
                    onClick={() =>
                      setRejectionModal({ ...rejectionModal, isOpen: false })
                    }
                    disabled={rejectionLoading}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "transparent",
                      border: "1px solid #E2E8F0",
                      borderRadius: 12,
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "#64748B",
                      cursor: "pointer",
                    }}
                  >
                    Go Back
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
};

const StatCard = ({ label, value, icon, color }) => (
  <div
    className="card"
    style={{
      padding: 20,
      borderRadius: 16,
    }}
  >
    <div
      style={{
        color,
        background: `${color}15`,
        width: 36,
        height: 36,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
      }}
    >
      {icon}
    </div>
    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700 }}>
      {label}
    </div>
    <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--text-primary)" }}>{value}</div>
  </div>
);

export default AdminPortal;
