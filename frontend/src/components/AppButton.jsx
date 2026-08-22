import { motion } from "framer-motion";

const AppButton = ({
  children,
  variant = "primary",
  fullWidth = false,
  loading = false,
  disabled = false,
  onClick,
  type = "button",
  className = "",
  style = {},
  icon: Icon,
}) => {
  const variantClass = `app-btn-${variant}`;
  const blockClass = fullWidth ? "app-btn-block" : "";

  return (
    <motion.button
      type={type}
      className={`app-btn ${variantClass} ${blockClass} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      whileHover={disabled || loading ? {} : { scale: 1.01 }}
      whileTap={disabled || loading ? {} : { scale: 0.96 }}
      style={{ ...style }}
    >
      {loading ? (
        <div
          className="loader"
          style={{
            width: 20,
            height: 20,
            borderWidth: 2,
            borderColor: "rgba(255,255,255,0.3)",
            borderTopColor: "white",
          }}
        />
      ) : (
        <>
          {Icon && <Icon size={18} />}
          {children}
        </>
      )}
    </motion.button>
  );
};

export default AppButton;
