const STATUS_CONFIG = {
  open: { label: "Open", class: "open" },
  pending: { label: "Pending", class: "pending" },
  accepted: { label: "Accepted", class: "accepted" },
  in_progress: { label: "In Progress", class: "in_progress" },
  completed: { label: "Completed", class: "completed" },
  delivered: { label: "Delivered", class: "delivered" },
  cancelled: { label: "Cancelled", class: "cancelled" },
};

const StatusBadge = ({ status = "open" }) => {
  const normalizedKey = (status || "open").toLowerCase().replace("-", "_");
  const config = STATUS_CONFIG[normalizedKey] || {
    label: status,
    class: "pending",
  };

  return <span className={`status-badge ${config.class}`}>{config.label}</span>;
};

export default StatusBadge;
