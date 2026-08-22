import { useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";

const AppInput = ({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  required = false,
  icon: Icon,
  clearable = false,
  onClear,
  style = {},
  inputMode,
  maxLength,
  disabled = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordType = type === "password";
  const actualType = isPasswordType ? (showPassword ? "text" : "password") : type;

  return (
    <div style={{ marginBottom: 16, width: "100%", ...style }}>
      {label && (
        <label
          style={{
            display: "block",
            fontSize: "0.85rem",
            fontWeight: 700,
            color: "var(--gray-700)",
            marginBottom: 6,
          }}
        >
          {label} {required && <span style={{ color: "var(--red-500)" }}>*</span>}
        </label>
      )}

      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {Icon && (
          <div
            style={{
              position: "absolute",
              left: 14,
              color: "var(--gray-400)",
              display: "flex",
              alignItems: "center",
              pointerEvents: "none",
            }}
          >
            <Icon size={18} />
          </div>
        )}

        <input
          type={actualType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          inputMode={inputMode}
          maxLength={maxLength}
          disabled={disabled}
          style={{
            width: "100%",
            height: 48,
            borderRadius: "var(--radius-lg)",
            border: `1.5px solid ${error ? "var(--red-500)" : "var(--gray-300)"}`,
            paddingLeft: Icon ? 44 : 14,
            paddingRight: isPasswordType || clearable ? 44 : 14,
            fontSize: "0.95rem",
            color: "var(--gray-900)",
            background: disabled ? "var(--gray-100)" : "var(--white)",
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
        />

        {clearable && value && !isPasswordType && (
          <button
            type="button"
            onClick={onClear}
            style={{
              position: "absolute",
              right: 12,
              background: "none",
              border: "none",
              color: "var(--gray-400)",
              cursor: "pointer",
              padding: 2,
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={16} />
          </button>
        )}

        {isPasswordType && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: 12,
              background: "none",
              border: "none",
              color: "var(--gray-400)",
              cursor: "pointer",
              padding: 2,
              display: "flex",
              alignItems: "center",
            }}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {error && (
        <span style={{ fontSize: "0.78rem", color: "var(--red-500)", marginTop: 4, display: "block" }}>
          {error}
        </span>
      )}
    </div>
  );
};

export default AppInput;
