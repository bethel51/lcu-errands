import { motion } from "framer-motion";

const AppCard = ({ children, className = "", onClick, style = {} }) => {
  const Component = onClick ? motion.div : "div";
  const motionProps = onClick
    ? {
        whileHover: { y: -2 },
        whileTap: { scale: 0.98 },
        onClick,
        style: { cursor: "pointer", ...style },
      }
    : { style };

  return (
    <Component className={`app-card ${className}`} {...motionProps}>
      {children}
    </Component>
  );
};

export default AppCard;
