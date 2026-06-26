import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, History, User, MessageSquare, Radio } from "lucide-react";
import { useSocket } from "../context/SocketContext";
import { PageImports } from "../App";
import { usePrefetch } from "../hooks/usePrefetch";

const BottomNav = () => {
  const { hasNotification, setHasNotification } = useSocket();
  const location = useLocation();
  const prefetch = usePrefetch();
  const isActive = (path) => location.pathname === path;

  // Clear notification when clicking on Chats
  const handleNavClick = (path) => {
    if (path === "/chats") {
      setHasNotification(false);
    }
  };

  return (
    <div className="bottom-nav">
      <Link
        to="/dashboard"
        className={`bottom-nav-item ${isActive("/dashboard") ? "active" : ""}`}
        onClick={() => handleNavClick("/dashboard")}
        onMouseEnter={() => prefetch(PageImports.Dashboard)}
      >
        <LayoutDashboard size={22} />
        <span>Market</span>
      </Link>
      <Link
        to="/stream"
        className={`bottom-nav-item ${isActive("/stream") ? "active" : ""}`}
        onClick={() => handleNavClick("/stream")}
        onMouseEnter={() => prefetch(PageImports.ErrandStream)}
      >
        <Radio size={22} />
        <span>Stream</span>
      </Link>
      <Link
        to="/history"
        className={`bottom-nav-item ${isActive("/history") ? "active" : ""}`}
        onClick={() => handleNavClick("/history")}
        onMouseEnter={() => prefetch(PageImports.History)}
      >
        <History size={22} />
        <span>Errands</span>
      </Link>
      <Link
        to="/chats"
        className={`bottom-nav-item ${isActive("/chats") ? "active" : ""}`}
        onClick={() => handleNavClick("/chats")}
        onMouseEnter={() => prefetch(PageImports.Chats)}
      >
        <div style={{ position: "relative" }}>
          <MessageSquare size={22} />
          {hasNotification && (
            <div className="bottom-nav-dot" />
          )}
        </div>
        <span>Chats</span>
      </Link>
      <Link
        to="/profile"
        className={`bottom-nav-item ${isActive("/profile") ? "active" : ""}`}
        onClick={() => handleNavClick("/profile")}
        onMouseEnter={() => prefetch(PageImports.Profile)}
      >
        <User size={22} />
        <span>Profile</span>
      </Link>
    </div>
  );
};

export default BottomNav;
