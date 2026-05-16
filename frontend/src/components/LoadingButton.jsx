import React from "react";
import { Loader2 } from "lucide-react";

const LoadingButton = ({
  loading,
  children,
  variant = "primary",
  className = "",
  disabled,
  ...props
}) => {
  const baseStyles =
    "btn flex items-center justify-center gap-2 transition-all duration-200";
  const variantStyles = {
    primary: "btn-primary",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
    danger: "bg-red-600 text-white hover:bg-red-700",
    outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50",
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className} ${loading ? "opacity-80 cursor-not-allowed" : ""}`}
      disabled={loading || disabled}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" size={18} />}
      {children}
    </button>
  );
};

export default LoadingButton;
