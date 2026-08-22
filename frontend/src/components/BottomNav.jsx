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
            {isActive && (
              <motion.div
                layoutId="activeTabIndicator"
                className="bottom-tab-active-indicator"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            
            <div className="bottom-tab-icon-wrapper">
              <motion.div
                animate={isActive ? { scale: 1.15, y: -1 } : { scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <IconComponent size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              </motion.div>
            </div>

            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;
