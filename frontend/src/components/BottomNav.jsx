import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, History, User, Radio } from "lucide-react";
import { useSocket } from "../context/SocketContext";
import { PageImports } from "../App";
import { usePrefetch } from "../hooks/usePrefetch";

const BottomNav = () => {
  const location = useLocation();
  const prefetch = usePrefetch();
  const isActive = (path) => location.pathname === path;

  return (
    <div className="bottom-nav">
      <Link
        to="/dashboard"
        className={`bottom-nav-item ${isActive("/dashboard") ? "active" : ""}`}
        onMouseEnter={() => prefetch(PageImports.Dashboard)}
      >
        <LayoutDashboard size={22} />
        <span>Market</span>
      </Link>
      <Link
        to="/stream"
        className={`bottom-nav-item ${isActive("/stream") ? "active" : ""}`}
        onMouseEnter={() => prefetch(PageImports.ErrandStream)}
      >
        <Radio size={22} />
        <span>Stream</span>
      </Link>
      <Link
        to="/history"
        className={`bottom-nav-item ${isActive("/history") ? "active" : ""}`}
        onMouseEnter={() => prefetch(PageImports.History)}
      >
        <History size={22} />
        <span>Errands</span>
      </Link>

      <Link
        to="/profile"
        className={`bottom-nav-item ${isActive("/profile") ? "active" : ""}`}
        onMouseEnter={() => prefetch(PageImports.Profile)}
      >
        <User size={22} />
        <span>Profile</span>
      </Link>
    </div>
  );
};

export default BottomNav;
