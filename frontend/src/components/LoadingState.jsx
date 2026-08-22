import { motion } from "framer-motion";

export const SkeletonCard = () => (
  <div
    style={{
      background: "var(--white)",
      borderRadius: "var(--radius-xl)",
      padding: 20,
      marginBottom: 16,
      border: "1px solid var(--gray-200)",
    }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
      <div className="skeleton-loader-box" style={{ width: 80, height: 22, borderRadius: 12 }} />
      <div className="skeleton-loader-box" style={{ width: 60, height: 22, borderRadius: 12 }} />
    </div>
    <div className="skeleton-loader-box" style={{ width: "85%", height: 20, marginBottom: 10 }} />
    <div className="skeleton-loader-box" style={{ width: "60%", height: 16, marginBottom: 16 }} />
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1px solid var(--gray-100)" }}>
      <div className="skeleton-loader-box" style={{ width: 100, height: 16 }} />
      <div className="skeleton-loader-box" style={{ width: 70, height: 24, borderRadius: 8 }} />
    </div>
  </div>
);

export const LoadingState = ({ count = 3 }) => {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
};

export default LoadingState;
