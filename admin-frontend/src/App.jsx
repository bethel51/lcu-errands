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
  Eye,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Lock,
  User,
  MapPin,
  Calendar,
  Hash,
  Wallet,
  ChevronRight,
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
import { io } from "socket.io-client";

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
  const [footprints, setFootprints] = useState([]);

  // UI States
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [errandStatusFilter, setErrandStatusFilter] = useState("all"); // For Intel Center card navigation
  const [activeFilterLabel, setActiveFilterLabel] = useState(""); // Human-readable label for current filter
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

  // Withdrawal Evidence States
  const [withdrawalEvidence, setWithdrawalEvidence] = useState(null);
  const [selectedWithdrawalUser, setSelectedWithdrawalUser] = useState(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [expandedErrandIdx, setExpandedErrandIdx] = useState(null);

  // Errand Intel States
  const [errandIntelModal, setErrandIntelModal] = useState(null); // { errand, messages, footprint }
  const [errandIntelLoading, setErrandIntelLoading] = useState(false);
  const [intelActionLoading, setIntelActionLoading] = useState(""); // "approve" | "reject" | "flag" | "freeze"
  const [intelActionReason, setIntelActionReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const adminUrl = import.meta.env.VITE_ADMIN_API_URL || "http://localhost:5001";
    const socketUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace("/api", "")
      : adminUrl.replace(":5001", ":5000").replace("-admin", "");
      
    const socket = io(socketUrl);

    socket.on("connect", () => {
      console.log("Admin connected to socket");
      // Join the admin room to receive admin-targeted events (auto-release, footprints, etc.)
      const cronSecret = import.meta.env.VITE_CRON_SECRET || "";
      socket.emit("join_admin", cronSecret);
    });

    socket.on("notification", () => {
      fetchData();
    });

    socket.on("footprint_updated", () => {
      fetchData();
    });

    socket.on("new_errand", () => {
      fetchData();
    });

    socket.on("errand_auto_released", (data) => {
      console.log("[Admin] Auto-release event:", data);
      fetchData();
    });

    return () => {
      socket.disconnect();
    };
  }, [isLoggedIn]);

  useEffect(() => {
    // Reset search when switching tabs to avoid "ghost" filtering
    setSearchTerm("");
    setRoleFilter("all");
    setStatusFilter("all");
  }, [activeTab]);

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
        footprintsRes,
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
        adminApi.get("/management/footprints").catch(() => ({ data: [] })),
      ]);

      setStats(statsRes.data);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setErrands(Array.isArray(errandsRes.data) ? errandsRes.data : []);
      setWithdrawals(Array.isArray(withdrawalsRes.data) ? withdrawalsRes.data : []);
      setPendingVerifications(Array.isArray(verificationsRes.data) ? verificationsRes.data : []);
      setHealth(healthRes.data);
      setLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
      setFootprints(Array.isArray(footprintsRes.data) ? footprintsRes.data : []);
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
    } catch (_err) {
      alert("Failed to send broadcast");
    } finally {
      setBroadcastLoading(false);
    }
  };

  const fetchErrandIntel = async (errandId) => {
    setErrandIntelLoading(true);
    setErrandIntelModal(null);
    setShowRejectInput(false);
    setIntelActionReason("");
    try {
      const res = await adminApi.get(`/management/errands/${errandId}/intel`);
      setErrandIntelModal(res.data);
    } catch (_err) {
      alert("Failed to fetch errand intel");
    } finally {
      setErrandIntelLoading(false);
    }
  };

  const handleErrandAction = async (errandId, action, reason = "") => {
    setIntelActionLoading(action);
    try {
      if (action === "approve") {
        await adminApi.patch(`/management/errands/${errandId}/approve`);
      } else if (action === "reject") {
        await adminApi.patch(`/management/errands/${errandId}/reject`, { reason });
      } else if (action === "flag") {
        await adminApi.patch(`/management/errands/${errandId}/flag`);
      } else if (action === "freeze") {
        await adminApi.patch(`/management/errands/${errandId}/freeze`);
      }
      setErrandIntelModal(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} errand`);
    } finally {
      setIntelActionLoading("");
    }
  };

  const fetchChat = async (errandId) => {
    try {
      const res = await adminApi.get(`/management/chat/${errandId}`);
      setSelectedErrandChat(Array.isArray(res.data) ? res.data : []);
    } catch (_err) {
      alert("Failed to fetch chat log");
      setSelectedErrandChat([]);
    }
  };

  const fetchEvidence = async (userId, userName) => {
    setEvidenceLoading(true);
    setSelectedWithdrawalUser(userName);
    try {
      const res = await adminApi.get(`/management/withdrawal-evidence/${userId}`);
      setWithdrawalEvidence(Array.isArray(res.data) ? res.data : []);
    } catch (_err) {
      alert("Failed to fetch evidence");
      setWithdrawalEvidence([]);
    } finally {
      setEvidenceLoading(false);
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
    } catch (_err) {
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
    } catch (_err) {
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
    } catch (_err) {
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
    } catch (_err) {
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

  // navigateToFiltered: Navigate to a tab with optional pre-set filters.
  // Used by Intel Center stat cards to jump to relevant filtered views.
  const navigateToFiltered = (tab, options = {}) => {
    setSearchTerm("");
    setRoleFilter("all");
    setStatusFilter(options.statusFilter || "all");
    setErrandStatusFilter(options.errandStatusFilter || "all");
    setActiveFilterLabel(options.label || "");
    setSidebarOpen(false);
    setActiveTab(tab);
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredErrands = Array.isArray(errands)
    ? errands.filter((e) => {
        const matchesSearch = (e?.title || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        const matchesStatus =
          errandStatusFilter === "all" ||
          (errandStatusFilter === "completed" && ["completed", "confirmed_completed"].includes(e.status)) ||
          (errandStatusFilter === "pending" && ["pending_sender_confirmation", "pending_confirmation"].includes(e.status)) ||
          (errandStatusFilter === "failed" && ["cancelled"].includes(e.status)) ||
          (errandStatusFilter === "active" && ["open", "accepted", "assigned", "in_progress"].includes(e.status)) ||
          e.status === errandStatusFilter;
        return matchesSearch && matchesStatus;
      })
    : [];

  const filteredFootprints = Array.isArray(footprints)
    ? footprints.filter((f) => {
        const matchesSearch =
          (f.errandId?.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (f.senderId?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (f.messengerId?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (f.errandId?.trackingId || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "suspicious" && f.isSuspicious) ||
          f.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
    : [];

  const formatDateTime = (value) => {
    if (!value) return "Not recorded";
    return new Date(value).toLocaleString();
  };

  const renderIntelField = (label, value) => (
    <div
      style={{
        background: "#F8FAFC",
        border: "1px solid #E2E8F0",
        borderRadius: 10,
        padding: "10px 12px",
      }}
    >
      <div style={{ fontSize: "0.62rem", color: "#64748B", fontWeight: 900, textTransform: "uppercase", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: "0.86rem", color: "#0F172A", fontWeight: 700, overflowWrap: "anywhere" }}>
        {value || "Not recorded"}
      </div>
    </div>
  );

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
    { id: "footprints", label: "Digital Footprints", icon: <Activity size={18} /> },
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
        background: "var(--bg-primary)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        transition: "background-color 0.3s ease",
      }}
    >
      {/* Top Nav */}
      <nav
        style={{
          background: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border-color)",
          padding: "14px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "var(--shadow-sm)",
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
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
            className="mobile-only"
          >
            <Menu />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ background: "var(--accent-light)", padding: 8, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={20} color="var(--accent-color)" />
            </div>
            <span style={{ fontWeight: 900, fontSize: "1.1rem", letterSpacing: "1px", color: "var(--text-primary)" }}>
              LCU<span style={{ color: "var(--accent-color)", fontWeight: 800 }}>VAULT</span>
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
              transition: "all 0.2s ease",
            }}
            title="Toggle theme"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={handleLogout}
            className="btn-modern btn-modern-danger"
            style={{ padding: "8px 16px", borderRadius: 10 }}
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
            background: "var(--bg-secondary)",
            borderRight: "1px solid var(--border-color)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setErrandStatusFilter("all");
                  setActiveFilterLabel("");
                  setSidebarOpen(false);
                }}
                className={`sidebar-btn ${activeTab === item.id ? "active" : ""}`}
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
              background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(4px)",
              zIndex: 90,
            }}
            className="mobile-only"
          />
        )}

        {/* Main Content */}
        <main
          style={{
            flex: 1,
            padding: "32px 24px",
            maxWidth: "100vw",
            overflowX: "hidden",
            background: "var(--bg-primary)",
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
            <div>
              <h2 style={{ fontSize: "1.75rem", fontWeight: 900, margin: 0, textTransform: "capitalize", letterSpacing: "-0.5px", color: "var(--text-primary)" }}>
                {activeTab === "overview" ? "Dashboard Overview" : activeTab}
              </h2>
            </div>
            <button
              onClick={fetchData}
              className="btn-modern btn-modern-secondary"
            >
              Refresh Data
            </button>
          </div>

          {activeTab === "overview" && (
            <>
              {/* Premium Greeting Banner */}
              <div 
                className="card"
                style={{
                  background: "var(--accent-gradient)",
                  color: "white",
                  padding: "32px 40px",
                  borderRadius: "24px",
                  marginBottom: 30,
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: "var(--shadow-glow)",
                  border: "none",
                }}
              >
                <div style={{ position: "relative", zIndex: 2 }}>
                  <h3 style={{ fontSize: "1.75rem", fontWeight: 900, margin: 0, letterSpacing: "-0.5px" }}>
                    Welcome to LeadCity Management Vault 👋
                  </h3>
                  <p style={{ margin: "10px 0 0 0", opacity: 0.85, fontSize: "0.95rem", maxWidth: 520, lineHeight: 1.5 }}>
                    Monitor transaction streams, execute verification audits, dispatch global system announcements, and approve student withdrawal requests.
                  </p>
                </div>
                <div style={{ position: "absolute", right: -40, top: -40, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,0.06)", filter: "blur(20px)" }} />
                <div style={{ position: "absolute", right: 60, bottom: -50, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.04)", filter: "blur(15px)" }} />
              </div>
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
                  value={stats?.totalUsers ?? users.length}
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
                  value={errands.filter((e) => !["completed", "confirmed_completed"].includes(e.status)).length}
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

              {/* Communication Intel Center Stats */}
              <h3 style={{ fontSize: "1.25rem", fontWeight: 900, margin: "0 0 15px", letterSpacing: "-0.3px", color: "var(--text-primary)" }}>
                Communication Intel Center
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: 15,
                  marginBottom: 30,
                }}
              >
                <StatCard
                  label="Total Activities"
                  value={stats?.totalActivities || 0}
                  icon={<Activity size={18} />}
                  color="#6366F1"
                  subtitle="View all footprints"
                  onClick={() => navigateToFiltered("footprints", { label: "All Footprints" })}
                />
                <StatCard
                  label="Activities Today"
                  value={stats?.activitiesToday || 0}
                  icon={<Clock size={18} />}
                  color="#F59E0B"
                  subtitle="View today's activity"
                  onClick={() => navigateToFiltered("footprints", { label: "Today's Activities" })}
                />
                <StatCard
                  label="Completed Errands"
                  value={stats?.completedErrands || 0}
                  icon={<CheckCircle size={18} />}
                  color="#10B981"
                  subtitle="View completed errands"
                  onClick={() => navigateToFiltered("errands", { errandStatusFilter: "completed", label: "Completed Errands" })}
                />
                <StatCard
                  label="Pending Confirmations"
                  value={stats?.pendingConfirmations || 0}
                  icon={<Clock size={18} />}
                  color="#0891B2"
                  subtitle="Awaiting sender confirmation"
                  badge={stats?.pendingConfirmations > 0 ? "URGENT" : null}
                  onClick={() => navigateToFiltered("errands", { errandStatusFilter: "pending", label: "Pending Sender Confirmation" })}
                />
                <StatCard
                  label="Failed Errands"
                  value={stats?.failedErrands || 0}
                  icon={<X size={18} />}
                  color="#EF4444"
                  subtitle="Cancelled / failed errands"
                  onClick={() => navigateToFiltered("errands", { errandStatusFilter: "failed", label: "Failed / Cancelled Errands" })}
                />
                <StatCard
                  label="Disputes"
                  value={stats?.disputes || 0}
                  icon={<AlertTriangle size={18} />}
                  color="#EC4899"
                  subtitle="Suspicious activity"
                  badge={stats?.disputes > 0 ? "REVIEW" : null}
                  onClick={() => navigateToFiltered("footprints", { statusFilter: "suspicious", label: "Flagged Disputes" })}
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
              {/* Active filter banner */}
              {activeTab === "errands" && activeFilterLabel && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 16px",
                  background: "linear-gradient(90deg, #EFF6FF, #F0F9FF)",
                  borderBottom: "1px solid #BFDBFE",
                  gap: 10,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "0.7rem", background: "#2563EB", color: "white", padding: "2px 8px", borderRadius: 20, fontWeight: 800, letterSpacing: 0.5 }}>FILTERED</span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1E40AF" }}>Showing: {activeFilterLabel}</span>
                    <span style={{ fontSize: "0.8rem", color: "#64748B" }}>({filteredErrands.length} result{filteredErrands.length !== 1 ? "s" : ""})</span>
                  </div>
                  <button
                    onClick={() => { setErrandStatusFilter("all"); setActiveFilterLabel(""); }}
                    style={{ background: "none", border: "1px solid #BFDBFE", borderRadius: 8, padding: "4px 12px", fontSize: "0.75rem", fontWeight: 700, color: "#2563EB", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <X size={12} /> Clear Filter
                  </button>
                </div>
              )}
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
                    <option value="sender">Senders</option>
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
                {activeTab === "errands" && (
                  <select
                    value={errandStatusFilter}
                    onChange={(e) => { setErrandStatusFilter(e.target.value); setActiveFilterLabel(""); }}
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid #E2E8F0",
                      flexShrink: 0,
                      color: "#1E293B",
                    }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active (Open / In Progress)</option>
                    <option value="pending">Pending Confirmation</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Cancelled / Failed</option>
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
                      <th style={{ padding: 15 }}>AMOUNT</th>
                      {activeTab === "errands" && <th style={{ padding: 15 }}>STATUS</th>}
                      {activeTab === "users" && <th style={{ padding: 15 }}>STATUS / VAL</th>}
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
                            style={{ borderTop: "1px solid #F1F5F9", cursor: "pointer" }}
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
                              <span style={{
                                display: "inline-block",
                                padding: "3px 10px",
                                borderRadius: 6,
                                fontSize: "0.7rem",
                                fontWeight: 800,
                                background: ["completed", "confirmed_completed"].includes(e.status) ? "#ECFDF5" : ["pending_confirmation", "pending_sender_confirmation"].includes(e.status) ? "#FFF7ED" : ["open", "accepted", "assigned", "in_progress"].includes(e.status) ? "#EFF6FF" : "#F3F4F6",
                                color: ["completed", "confirmed_completed"].includes(e.status) ? "#065F46" : ["pending_confirmation", "pending_sender_confirmation"].includes(e.status) ? "#92400E" : ["open", "accepted", "assigned", "in_progress"].includes(e.status) ? "#1D4ED8" : "#374151",
                              }}>
                                {e.status?.toUpperCase()?.replace("_", " ")}
                              </span>
                            </td>
                            <td style={{ padding: 15 }}>
                              <button
                                onClick={() => fetchErrandIntel(e._id)}
                                style={{
                                  background: "#EFF6FF",
                                  color: "#2563EB",
                                  padding: "7px 14px",
                                  border: "1px solid #BFDBFE",
                                  borderRadius: 8,
                                  fontWeight: 800,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 5,
                                  fontSize: "0.75rem",
                                  cursor: "pointer",
                                }}
                              >
                                <Eye size={13} /> INTEL
                              </button>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "footprints" && (
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
                    placeholder="Search footprints by title, sender, messenger, tracking ID..."
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
                  <option value="all">All Footprints</option>
                  <option value="held">Held Escrow</option>
                  <option value="released">Released Funds</option>
                  <option value="frozen">Frozen Funds</option>
                  <option value="rejected">Refunded / Cancelled</option>
                  <option value="suspicious">Suspicious Only</option>
                </select>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: 800,
                  }}
                >
                  <thead style={{ background: "#F8FAFC", textAlign: "left" }}>
                    <tr>
                      <th style={{ padding: 15 }}>ERRAND / TRACKING ID</th>
                      <th style={{ padding: 15 }}>SENDER</th>
                      <th style={{ padding: 15 }}>MESSENGER</th>
                      <th style={{ padding: 15 }}>ESCROW STATUS</th>
                      <th style={{ padding: 15 }}>AUDIT TRAIL</th>
                      <th style={{ padding: 15 }}>LAST ACTIVITY</th>
                      <th style={{ padding: 15 }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFootprints.map((f) => {
                      const lastActivity = f.auditTrail?.[f.auditTrail.length - 1] || {};
                      return (
                        <tr
                          key={f._id}
                          style={{ borderTop: "1px solid #F1F5F9" }}
                        >
                          <td style={{ padding: 15 }}>
                            <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                              {f.errandId?.title || "Deleted Errand"}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#64748B", marginTop: 2 }}>
                              {f.errandId?.trackingId || f.errandId?._id || "N/A"}
                            </div>
                          </td>
                          <td style={{ padding: 15 }}>
                            <div style={{ fontWeight: 600 }}>{f.senderId?.name || "N/A"}</div>
                            <div style={{ fontSize: "0.72rem", color: "#64748B" }}>
                              {f.senderId?.email}
                            </div>
                          </td>
                          <td style={{ padding: 15 }}>
                            {f.messengerId ? (
                              <>
                                <div style={{ fontWeight: 600 }}>{f.messengerId.name}</div>
                                <div style={{ fontSize: "0.72rem", color: "#64748B" }}>
                                  {f.messengerId.email}
                                </div>
                              </>
                            ) : (
                              <span style={{ color: "#94A3B8", fontStyle: "italic", fontSize: "0.8rem" }}>Unassigned</span>
                            )}
                          </td>
                          <td style={{ padding: 15 }}>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                              <span style={{
                                display: "inline-block",
                                padding: "3px 8px",
                                borderRadius: 6,
                                fontSize: "0.7rem",
                                fontWeight: 800,
                                background: f.status === "released" ? "#ECFDF5" : f.status === "frozen" ? "#FEF3C7" : f.status === "rejected" ? "#FEF2F2" : "#EFF6FF",
                                color: f.status === "released" ? "#065F46" : f.status === "frozen" ? "#D97706" : f.status === "rejected" ? "#991B1B" : "#1D4ED8",
                              }}>
                                {f.status?.toUpperCase()}
                              </span>
                              {f.isSuspicious && (
                                <span style={{
                                  display: "inline-block",
                                  padding: "3px 8px",
                                  borderRadius: 6,
                                  fontSize: "0.7rem",
                                  fontWeight: 800,
                                  background: "#FEF2F2",
                                  color: "#EF4444",
                                  border: "1px solid #FECACA"
                                }}>
                                  SUSPICIOUS
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: 15, fontWeight: 700, fontSize: "0.85rem", color: "#475569" }}>
                            {f.auditTrail?.length || 0} steps
                          </td>
                          <td style={{ padding: 15, fontSize: "0.8rem" }}>
                            <div style={{ fontWeight: 600, color: "#1E293B" }}>
                              {lastActivity.actionTitle || lastActivity.action || "No activity"}
                            </div>
                            <div style={{ fontSize: "0.72rem", color: "#64748B", marginTop: 2 }}>
                              {lastActivity.timestamp ? new Date(lastActivity.timestamp).toLocaleString() : "N/A"}
                            </div>
                          </td>
                          <td style={{ padding: 15 }}>
                            <button
                              onClick={() => fetchErrandIntel(f.errandId?._id || f.errandId)}
                              style={{
                                background: "#EFF6FF",
                                color: "#2563EB",
                                padding: "7px 14px",
                                border: "1px solid #BFDBFE",
                                borderRadius: 8,
                                fontWeight: 800,
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                                fontSize: "0.75rem",
                                cursor: "pointer",
                              }}
                            >
                              <Eye size={13} /> INSPECT
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredFootprints.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: "center", padding: 30, color: "#64748B" }}>
                          No digital footprints found matching the filters.
                        </td>
                      </tr>
                    )}
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
                    minWidth: 700,
                  }}
                >
                  <thead style={{ background: "#F8FAFC", textAlign: "left" }}>
                    <tr>
                      <th style={{ padding: 15 }}>USER</th>
                      <th style={{ padding: 15 }}>DESTINATION</th>
                      <th style={{ padding: 15 }}>AMOUNT</th>
                      <th style={{ padding: 15 }}>EVIDENCE</th>
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
                            <div style={{ fontSize: "0.7rem", color: "#94A3B8" }}>
                              {w.userId?.email}
                            </div>
                          </td>
                          <td style={{ padding: 15 }}>
                            <div style={{ fontSize: "0.8rem" }}>
                              {w.bankName} - {w.accountNumber}
                            </div>
                            <div style={{ fontSize: "0.7rem", color: "#94A3B8", marginTop: 2 }}>
                              {w.accountName}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: 15,
                              fontWeight: 900,
                              color: "#10B981",
                            }}
                          >
                            ₦{w.amount?.toLocaleString()}
                          </td>
                          <td style={{ padding: 15 }}>
                            <button
                              onClick={() => fetchEvidence(w.userId?._id, w.userId?.name)}
                              style={{
                                background: "#EFF6FF",
                                color: "#2563EB",
                                padding: "6px 14px",
                                borderRadius: 8,
                                border: "1px solid #BFDBFE",
                                fontSize: "0.75rem",
                                fontWeight: 800,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                              }}
                            >
                              <MessageSquare size={13} /> VIEW EVIDENCE
                            </button>
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
                                cursor: "pointer",
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
                                cursor: "pointer",
                              }}
                            >
                              REJECT
                            </button>
                          </td>
                        </tr>
                      ))}
                    {withdrawals.filter((w) => w.status === "pending").length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#94A3B8" }}>
                          No pending withdrawal requests.
                        </td>
                      </tr>
                    )}
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

      {/* Errand Intelligence Modal */}
      <AnimatePresence>
        {errandIntelModal &&
          (() => {
            const { errand, messages = [], footprint } = errandIntelModal;
            const sender = errand?.posterId || {};
            const messenger = errand?.erranderId || {};
            const timeline = [
              ["Posted", footprint?.timePosted || errand?.createdAt],
              ["Accepted", footprint?.timeAccepted || errand?.acceptedAt],
              ["Completed", footprint?.timeCompleted || errand?.messengerCompletedAt],
              ["Confirmed", footprint?.timeConfirmed || errand?.senderConfirmedAt],
            ];

            return (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(15,23,42,0.62)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 1200,
                  padding: 18,
                }}
              >
                <motion.div
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  style={{
                    background: "white",
                    width: "100%",
                    maxWidth: 1040,
                    borderRadius: 18,
                    maxHeight: "88vh",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      padding: "18px 22px",
                      borderBottom: "1px solid #E2E8F0",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
                        <span
                          style={{
                            background: footprint ? "#ECFDF5" : "#FEF2F2",
                            color: footprint ? "#047857" : "#B91C1C",
                            border: `1px solid ${footprint ? "#A7F3D0" : "#FECACA"}`,
                            padding: "4px 8px",
                            borderRadius: 6,
                            fontSize: "0.68rem",
                            fontWeight: 900,
                          }}
                        >
                          {footprint ? "DIGITAL FOOTPRINT FOUND" : "DIGITAL FOOTPRINT MISSING"}
                        </span>
                        <span style={{ fontSize: "0.72rem", color: "#64748B", fontWeight: 800 }}>
                          {errand?.trackingId || errand?._id}
                        </span>
                      </div>
                      <h3 style={{ fontWeight: 900, fontSize: "1.1rem", margin: 0, color: "#0F172A" }}>
                        {errand?.title}
                      </h3>
                    </div>
                    <button
                      onClick={() => setErrandIntelModal(null)}
                      style={{ background: "none", border: "none", cursor: "pointer" }}
                    >
                      <X />
                    </button>
                  </div>

                  <div style={{ overflow: "auto", padding: 22 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginBottom: 18 }}>
                      <div style={{ border: "1px solid #E2E8F0", borderRadius: 14, padding: 14 }}>
                        <h4 style={{ fontWeight: 900, marginBottom: 10 }}>Sender Information</h4>
                        {renderIntelField("Full Name", sender.name)}
                        <div style={{ height: 8 }} />
                        {renderIntelField("Email", sender.email)}
                        <div style={{ height: 8 }} />
                        {renderIntelField("Department", sender.department)}
                        <div style={{ height: 8 }} />
                        {renderIntelField("Hostel / Location", sender.location)}
                      </div>

                      <div style={{ border: "1px solid #E2E8F0", borderRadius: 14, padding: 14 }}>
                        <h4 style={{ fontWeight: 900, marginBottom: 10 }}>Messenger Information</h4>
                        {renderIntelField("Full Name", messenger.name)}
                        <div style={{ height: 8 }} />
                        {renderIntelField("Email", messenger.email)}
                        <div style={{ height: 8 }} />
                        {renderIntelField("Hostel / Location", messenger.location)}
                        <div style={{ height: 8 }} />
                        {renderIntelField("Rating", messenger.rating ? `${messenger.rating}` : "Not rated")}
                      </div>

                      <div style={{ border: "1px solid #E2E8F0", borderRadius: 14, padding: 14 }}>
                        <h4 style={{ fontWeight: 900, marginBottom: 10 }}>Payment Status</h4>
                        {renderIntelField("Errand Status", errand?.status?.toUpperCase()?.replace("_", " "))}
                        <div style={{ height: 8 }} />
                        {renderIntelField("Fee", `₦${(errand?.fee || 0).toLocaleString()}`)}
                        <div style={{ height: 8 }} />
                        {renderIntelField("Payment Released", errand?.paymentReleased ? "Yes" : (footprint?.status === "released" ? "Yes" : "No"))}
                        <div style={{ height: 8 }} />
                        {renderIntelField("Released At", errand?.paymentReleasedAt ? formatDateTime(errand.paymentReleasedAt) : (footprint?.timeConfirmed ? formatDateTime(footprint.timeConfirmed) : "N/A"))}
                        <div style={{ height: 8 }} />
                        {renderIntelField("Tx Ref / ID", errand?.paymentTransactionId || footprint?.transactionReference || "N/A")}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginBottom: 18 }}>
                      <div style={{ border: "1px solid #E2E8F0", borderRadius: 14, padding: 14 }}>
                        <h4 style={{ fontWeight: 900, marginBottom: 10 }}>Activity Timeline</h4>
                        {timeline.map(([label, value]) => (
                          <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>
                            <span style={{ fontSize: "0.8rem", color: "#64748B", fontWeight: 800 }}>{label}</span>
                            <span style={{ fontSize: "0.8rem", color: "#0F172A", fontWeight: 700, textAlign: "right" }}>
                              {formatDateTime(value)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div style={{ border: "1px solid #E2E8F0", borderRadius: 14, padding: 14 }}>
                        <h4 style={{ fontWeight: 900, marginBottom: 10 }}>Device Logs</h4>
                        {renderIntelField("Posted Device", footprint?.deviceInfo?.posted)}
                        <div style={{ height: 8 }} />
                        {renderIntelField("Accepted Device", footprint?.deviceInfo?.accepted)}
                        <div style={{ height: 8 }} />
                        {renderIntelField("Completed Device", footprint?.deviceInfo?.completed)}
                        <div style={{ height: 8 }} />
                        {renderIntelField("Confirmed Device", footprint?.deviceInfo?.confirmed)}
                      </div>

                      <div style={{ border: "1px solid #E2E8F0", borderRadius: 14, padding: 14 }}>
                        <h4 style={{ fontWeight: 900, marginBottom: 10 }}>IP / Location Logs</h4>
                        {renderIntelField("Posted IP", footprint?.ipAddress?.posted)}
                        <div style={{ height: 8 }} />
                        {renderIntelField("Accepted IP", footprint?.ipAddress?.accepted)}
                        <div style={{ height: 8 }} />
                        {renderIntelField("Completed IP", footprint?.ipAddress?.completed)}
                        <div style={{ height: 8 }} />
                        {renderIntelField("Last Location", footprint?.locationData?.confirmed || footprint?.locationData?.completed || footprint?.locationData?.posted)}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 0.75fr)", gap: 14 }}>
                      <div style={{ border: "1px solid #E2E8F0", borderRadius: 14, padding: 14, minHeight: 220 }}>
                        <h4 style={{ fontWeight: 900, marginBottom: 10 }}>Chat History</h4>
                        {messages.length === 0 ? (
                          <div style={{ color: "#64748B", fontWeight: 700, padding: "30px 0", textAlign: "center" }}>
                            No chat messages found for this errand.
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 260, overflow: "auto" }}>
                            {messages.map((m) => (
                              <div key={m._id} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 10 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                                  <strong style={{ color: "#2563EB", fontSize: "0.75rem" }}>{m.senderId?.name || "System"}</strong>
                                  <span style={{ color: "#94A3B8", fontSize: "0.68rem", fontWeight: 700 }}>{formatDateTime(m.createdAt)}</span>
                                </div>
                                {m.text && <div style={{ fontSize: "0.85rem", color: "#0F172A" }}>{m.text}</div>}
                                {m.imageUrl && (
                                  <img
                                    src={m.imageUrl}
                                    alt="Chat attachment"
                                    style={{ marginTop: 8, maxWidth: "100%", maxHeight: 170, borderRadius: 8, objectFit: "cover", cursor: "pointer" }}
                                    onClick={() => window.open(m.imageUrl, "_blank")}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{ border: "1px solid #E2E8F0", borderRadius: 14, padding: 14 }}>
                        <h4 style={{ fontWeight: 900, marginBottom: 10 }}>Action Section</h4>
                        <div style={{ display: "grid", gap: 8 }}>
                          <button
                            onClick={() => handleErrandAction(errand._id, "approve")}
                            disabled={!!intelActionLoading}
                            style={{ padding: "10px 12px", borderRadius: 8, border: "none", background: "#10B981", color: "white", fontWeight: 900, cursor: "pointer" }}
                          >
                            {intelActionLoading === "approve" ? "Processing..." : "Approve Transaction"}
                          </button>
                          <button
                            onClick={() => handleErrandAction(errand._id, "approve")}
                            disabled={!!intelActionLoading}
                            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #BFDBFE", background: "#EFF6FF", color: "#2563EB", fontWeight: 900, cursor: "pointer" }}
                          >
                            Release Funds
                          </button>
                          <button
                            onClick={() => handleErrandAction(errand._id, "flag")}
                            disabled={!!intelActionLoading}
                            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #FED7AA", background: "#FFF7ED", color: "#C2410C", fontWeight: 900, cursor: "pointer" }}
                          >
                            {footprint?.isSuspicious ? "Unflag Suspicious Activity" : "Flag Suspicious Activity"}
                          </button>
                          <button
                            onClick={() => handleErrandAction(errand._id, "freeze")}
                            disabled={!!intelActionLoading}
                            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #CBD5E1", background: "#F8FAFC", color: "#334155", fontWeight: 900, cursor: "pointer" }}
                          >
                            Freeze Funds
                          </button>
                          <button
                            onClick={() => setShowRejectInput((value) => !value)}
                            disabled={!!intelActionLoading}
                            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #FECACA", background: "#FEF2F2", color: "#DC2626", fontWeight: 900, cursor: "pointer" }}
                          >
                            Reject Transaction
                          </button>
                        </div>

                        {showRejectInput && (
                          <div style={{ marginTop: 10 }}>
                            <textarea
                              value={intelActionReason}
                              onChange={(e) => setIntelActionReason(e.target.value)}
                              placeholder="Reason for rejection"
                              style={{ width: "100%", minHeight: 72, border: "1px solid #E2E8F0", borderRadius: 8, padding: 10 }}
                            />
                            <button
                              onClick={() => handleErrandAction(errand._id, "reject", intelActionReason)}
                              disabled={!intelActionReason.trim() || !!intelActionLoading}
                              style={{ marginTop: 8, width: "100%", padding: "10px 12px", borderRadius: 8, border: "none", background: "#DC2626", color: "white", fontWeight: 900, cursor: "pointer", opacity: intelActionReason.trim() ? 1 : 0.55 }}
                            >
                              Confirm Rejection
                            </button>
                          </div>
                        )}

                        <div style={{ marginTop: 14 }}>
                          <h5 style={{ fontWeight: 900, marginBottom: 8 }}>Full Audit Trail</h5>
                          <div style={{ maxHeight: 210, overflow: "auto", display: "grid", gap: 8 }}>
                            {(footprint?.auditTrail || []).map((entry, index) => (
                              <div key={`${entry.action}-${index}`} style={{ background: "#F8FAFC", borderRadius: 8, padding: 10, border: "1px solid #E2E8F0" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                                  <strong style={{ fontSize: "0.76rem", color: "#1E293B" }}>
                                    {entry.actionTitle || entry.action}
                                  </strong>
                                  <span style={{ fontSize: "0.65rem", color: "#64748B", fontWeight: 700 }}>
                                    {formatDateTime(entry.timestamp)}
                                  </span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                                  <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#475569" }}>
                                    {entry.actorName || "System"}
                                  </span>
                                  <span style={{
                                    fontSize: "0.6rem", padding: "1px 4px", borderRadius: 3,
                                    fontWeight: 900, textTransform: "uppercase",
                                    background: entry.actorRole === "admin" ? "#FEE2E2" : entry.actorRole === "messenger" ? "#DCFCE7" : "#DBEAFE",
                                    color: entry.actorRole === "admin" ? "#991B1B" : entry.actorRole === "messenger" ? "#166534" : "#1E40AF"
                                  }}>
                                    {entry.actorRole || "system"}
                                  </span>
                                </div>
                                <div style={{ fontSize: "0.78rem", color: "#475569" }}>
                                  {entry.actionDescription || entry.details || "No details"}
                                </div>
                                {entry.metadata && entry.metadata.imageUrl && (
                                  <img
                                    src={entry.metadata.imageUrl}
                                    alt="Proof"
                                    onClick={() => window.open(entry.metadata.imageUrl, "_blank")}
                                    style={{ marginTop: 8, width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid #E2E8F0", cursor: "zoom-in" }}
                                  />
                                )}
                              </div>
                            ))}
                            {(!footprint?.auditTrail || footprint.auditTrail.length === 0) && (
                              <div style={{ color: "#64748B", fontWeight: 700, padding: 10, textAlign: "center" }}>
                                No activity recorded yet. Activity logs will appear here automatically.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })()}
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
                      No chat messages found for this errand.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Withdrawal Evidence Modal */}
      <AnimatePresence>
        {withdrawalEvidence && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: 20,
            }}
            onClick={() => { setWithdrawalEvidence(null); setExpandedErrandIdx(null); }}
          >
            <motion.div
              initial={{ y: 50, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", duration: 0.3, bounce: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "white",
                width: "100%",
                maxWidth: 620,
                borderRadius: 24,
                padding: 0,
                maxHeight: "85vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "20px 25px",
                  borderBottom: "1px solid #E2E8F0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "linear-gradient(135deg, #EFF6FF, #F0FDF4)",
                }}
              >
                <div>
                  <h3 style={{ fontWeight: 900, margin: 0, fontSize: "1.1rem" }}>
                    🔍 Withdrawal Evidence
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#64748B" }}>
                    Digital footprint for <strong>{selectedWithdrawalUser}</strong>
                  </p>
                </div>
                <button
                  onClick={() => { setWithdrawalEvidence(null); setExpandedErrandIdx(null); }}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 8 }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
                {evidenceLoading ? (
                  <div style={{ textAlign: "center", padding: 40 }}>
                    <div className="loader-sm" style={{ width: 32, height: 32, margin: "0 auto 15px" }} />
                    <p style={{ fontSize: "0.85rem", color: "#64748B" }}>Loading evidence...</p>
                  </div>
                ) : withdrawalEvidence.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "50px 20px", color: "#94A3B8" }}>
                    <AlertTriangle size={40} style={{ opacity: 0.3, marginBottom: 15 }} />
                    <p style={{ fontWeight: 700, fontSize: "1rem", color: "#EF4444" }}>
                      ⚠️ No completed errands found
                    </p>
                    <p style={{ fontSize: "0.8rem", marginTop: 8 }}>
                      This user has no completed errands. Exercise caution before approving.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* Summary Bar */}
                    <div style={{
                      display: "flex", gap: 12, flexWrap: "wrap",
                      padding: "12px 16px", background: "#F8FAFC",
                      borderRadius: 14, border: "1px solid #E2E8F0",
                    }}>
                      <div style={{ flex: 1, minWidth: 80 }}>
                        <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "#94A3B8", textTransform: "uppercase" }}>Completed</div>
                        <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#10B981" }}>{withdrawalEvidence.length}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 80 }}>
                        <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "#94A3B8", textTransform: "uppercase" }}>With Chat</div>
                        <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#2563EB" }}>{withdrawalEvidence.filter(e => e.messageCount > 0).length}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 80 }}>
                        <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "#94A3B8", textTransform: "uppercase" }}>With Proof</div>
                        <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#8B5CF6" }}>{withdrawalEvidence.filter(e => e.hasProof).length}</div>
                      </div>
                    </div>

                    {/* Errand List */}
                    {withdrawalEvidence.map((ev, idx) => (
                      <div
                        key={ev.errand._id}
                        style={{
                          border: "1px solid #E2E8F0",
                          borderRadius: 16,
                          overflow: "hidden",
                          background: expandedErrandIdx === idx ? "#FAFBFF" : "white",
                          transition: "all 0.2s",
                        }}
                      >
                        {/* Errand Header - clickable */}
                        <div
                          onClick={() => setExpandedErrandIdx(expandedErrandIdx === idx ? null : idx)}
                          style={{
                            padding: "14px 18px",
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderBottom: expandedErrandIdx === idx ? "1px solid #E2E8F0" : "none",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#1E293B", marginBottom: 4 }}>
                              {ev.errand.title}
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              <span style={{
                                fontSize: "0.65rem", fontWeight: 800,
                                padding: "2px 8px", borderRadius: 6,
                                background: "#ECFDF5", color: "#10B981",
                              }}>
                                ₦{ev.errand.fee?.toLocaleString()}
                              </span>
                              <span style={{
                                fontSize: "0.65rem", fontWeight: 700,
                                padding: "2px 8px", borderRadius: 6,
                                background: ev.messageCount > 0 ? "#EFF6FF" : "#FEF2F2",
                                color: ev.messageCount > 0 ? "#2563EB" : "#EF4444",
                              }}>
                                {ev.messageCount > 0 ? `💬 ${ev.messageCount} messages` : "❌ No chat"}
                              </span>
                              {ev.hasProof && (
                                <span style={{
                                  fontSize: "0.65rem", fontWeight: 700,
                                  padding: "2px 8px", borderRadius: 6,
                                  background: "#F3E8FF", color: "#7C3AED",
                                }}>
                                  📸 Proof
                                </span>
                              )}
                              <span style={{ fontSize: "0.6rem", color: "#94A3B8" }}>
                                {new Date(ev.errand.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <span style={{ color: "#94A3B8", transform: expandedErrandIdx === idx ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", fontSize: "0.8rem" }}>
                            ▼
                          </span>
                        </div>

                        {/* Expanded content */}
                        {expandedErrandIdx === idx && (
                          <div style={{ padding: "14px 18px" }}>
                            {/* Errand details */}
                            <div style={{ marginBottom: 14, fontSize: "0.8rem", color: "#64748B", lineHeight: 1.5 }}>
                              <strong>Description:</strong> {ev.errand.description}
                            </div>
                            <div style={{ display: "flex", gap: 16, marginBottom: 14, fontSize: "0.75rem", color: "#64748B" }}>
                              <div><strong>Poster:</strong> {ev.errand.posterId?.name || "N/A"}</div>
                              <div><strong>Errander:</strong> {ev.errand.erranderId?.name || "N/A"}</div>
                            </div>

                            {/* Completion Proof */}
                            {ev.hasProof && (
                              <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#7C3AED", marginBottom: 8, textTransform: "uppercase" }}>
                                  📸 Completion Proof
                                </div>
                                <img
                                  src={ev.errand.completionProof}
                                  alt="Completion proof"
                                  style={{
                                    maxWidth: "100%", maxHeight: 200,
                                    borderRadius: 12, objectFit: "cover",
                                    border: "1px solid #E2E8F0", cursor: "pointer",
                                  }}
                                  onClick={() => window.open(ev.errand.completionProof, "_blank")}
                                />
                              </div>
                            )}

                            {/* Chat Messages */}
                            <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#2563EB", marginBottom: 10, textTransform: "uppercase" }}>
                              💬 Communication Log ({ev.messageCount} messages)
                            </div>
                            {ev.messages.length === 0 ? (
                              <div style={{
                                textAlign: "center", padding: "20px",
                                background: "#FEF2F2", borderRadius: 12,
                                color: "#EF4444", fontSize: "0.8rem", fontWeight: 600,
                              }}>
                                ⚠️ No communication found for this errand
                              </div>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflow: "auto" }}>
                                {ev.messages.map((m, mi) => (
                                  <div
                                    key={mi}
                                    style={{
                                      background: "#F8FAFC",
                                      padding: "10px 14px",
                                      borderRadius: 12,
                                      border: "1px solid #E2E8F0",
                                    }}
                                  >
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                      <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#2563EB" }}>
                                        {m.senderId?.name || "System"}
                                      </span>
                                      <span style={{ fontSize: "0.6rem", color: "#94A3B8" }}>
                                        {new Date(m.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                      </span>
                                    </div>
                                    {m.text && (
                                      <div style={{ fontSize: "0.85rem", color: "#1E293B", lineHeight: 1.4 }}>
                                        {m.text}
                                      </div>
                                    )}
                                    {m.imageUrl && (
                                      <img
                                        src={m.imageUrl}
                                        alt="Chat image"
                                        style={{
                                          marginTop: 8, borderRadius: 8,
                                          maxWidth: "100%", maxHeight: 150,
                                          objectFit: "cover", cursor: "pointer",
                                        }}
                                        onClick={() => window.open(m.imageUrl, "_blank")}
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
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

const StatCard = ({ label, value, icon, color, onClick, subtitle, badge }) => (
  <div
    className="card"
    style={{
      padding: "20px 22px",
      borderRadius: "20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "relative",
      overflow: "hidden",
      cursor: onClick ? "pointer" : "default",
      boxShadow: "var(--shadow-sm)",
      transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    }}
    onClick={onClick}
    onMouseEnter={(e) => {
      if (!onClick) return;
      e.currentTarget.style.transform = "translateY(-4px) scale(1.02)";
      e.currentTarget.style.boxShadow = `0 16px 32px -8px ${color}33`;
      e.currentTarget.style.borderColor = `${color}50`;
    }}
    onMouseLeave={(e) => {
      if (!onClick) return;
      e.currentTarget.style.transform = "translateY(0) scale(1)";
      e.currentTarget.style.boxShadow = "var(--shadow-sm)";
      e.currentTarget.style.borderColor = "var(--border-color)";
    }}
  >
    <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>
          {label}
        </span>
        {badge && (
          <span style={{ fontSize: "0.6rem", background: color, color: "white", padding: "1px 6px", borderRadius: 10, fontWeight: 900, letterSpacing: 0.5, animation: "pulse 2s infinite" }}>
            {badge}
          </span>
        )}
      </div>
      <span style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
        {value}
      </span>
      {subtitle && onClick && (
        <span style={{ fontSize: "0.7rem", color, fontWeight: 700, display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}>
          {subtitle} →
        </span>
      )}
    </div>
    <div
      style={{
        color,
        background: `${color}15`,
        width: 48,
        height: 48,
        borderRadius: "14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        marginLeft: 12,
        transition: "transform 0.2s",
      }}
    >
      {icon}
    </div>
  </div>
);

export default AdminPortal;
