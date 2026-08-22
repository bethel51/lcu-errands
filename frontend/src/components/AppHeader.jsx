import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Bell, Search, Plus, Radio } from "lucide-react";
import { useSocket } from "../context/SocketContext";
import NotificationCenter from "./NotificationCenter";

const AppHeader = ({
  title = "LCU Errands",
  showBack = false,
  onBack,
  action,
  showNotification = true,
  showLive = true,
}) => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <>
      <header className="mobile-app-header">
        <div className="mobile-app-header-left">
          {showBack ? (
            <button
              onClick={handleBack}
              className="header-icon-btn"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>
          ) : (
            <Link to="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              <img
                src="/logo.png"
                alt="LCU Errands"
                style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
              />
            </Link>
          )}

          <h1 className="mobile-app-header-title">{title}</h1>

          {showLive && socket?.connected && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "2px 8px",
                borderRadius: 12,
                background: "var(--green-50)",
                border: "1px solid var(--green-100)",
                fontSize: "0.7rem",
                fontWeight: 700,
                color: "var(--green-600)",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: "var(--green-500)",
                  boxShadow: "0 0 6px var(--green-500)",
                }}
              />
              Live
            </div>
          )}
        </div>

        <div className="mobile-app-header-right">
          {action}

          {showNotification && (
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="header-icon-btn"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="header-badge-dot" />
            </button>
          )}

          {user && (
            <Link to="/profile" style={{ textDecoration: "none" }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  border: "2px solid var(--blue-500)",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--blue-50)",
                  color: "var(--blue-700)",
                  fontWeight: 800,
                  fontSize: "0.85rem",
                }}
              >
                {user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={user.name || "User"}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  (user.name || "U").charAt(0).toUpperCase()
                )}
              </div>
            </Link>
          )}
        </div>
      </header>

      {/* Notification Center Popover */}
      {isNotificationsOpen && (
        <NotificationCenter onClose={() => setIsNotificationsOpen(false)} />
      )}
    </>
  );
};

export default AppHeader;
