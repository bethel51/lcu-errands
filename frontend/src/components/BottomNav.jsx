import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, Radio, History, User } from "lucide-react";
import { PageImports } from "../App";
import { usePrefetch } from "../hooks/usePrefetch";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Market", icon: LayoutDashboard, importKey: "Dashboard" },
  { path: "/stream", label: "Stream", icon: Radio, importKey: "ErrandStream" },
  { path: "/history", label: "Errands", icon: History, importKey: "History" },
  { path: "/profile", label: "Profile", icon: User, importKey: "Profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const prefetch = usePrefetch();

  return (
    <nav className="bottom-nav-v2" aria-label="Bottom Navigation">
      {NAV_ITEMS.map((item) => {
        const isActive = location.pathname === item.path;
        const IconComponent = item.icon;

        return (
          <Link
            key={item.path}
            to={item.path}
            className={`bottom-tab-item ${isActive ? "active" : ""}`}
            onMouseEnter={() => prefetch(PageImports[item.importKey])}
          >
            {/* Perfectly Centered Top Indicator Bar */}
            {isActive && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  display: "flex",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                <motion.div
                  layoutId="bottomNavActiveBar"
                  style={{
                    width: 32,
                    height: 3,
                    borderRadius: "0 0 6px 6px",
                    background: "var(--blue-600)",
                    boxShadow: "0 2px 10px rgba(30,77,183,0.45)",
                  }}
                  transition={{ type: "spring", stiffness: 450, damping: 30 }}
                />
              </div>
            )}
            
            <div className="bottom-tab-icon-wrapper">
              <motion.div
                animate={isActive ? { scale: 1.14, y: -1 } : { scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <IconComponent size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              </motion.div>
            </div>

            <span style={{ fontWeight: isActive ? 800 : 600 }}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;
