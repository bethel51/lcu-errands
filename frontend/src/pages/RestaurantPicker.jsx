import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { X, ChevronRight, MapPin, Star, Clock } from "lucide-react";

const RESTAURANTS = [
  {
    id: "tasty-vine",
    name: "Tasty Vine",
    emoji: "🍲",
    tagline: "Home-style meals & stews",
    rating: 4.8,
    deliveryTime: "15–25 min",
    popular: ["Jollof Rice", "Fried Rice", "Pounded Yam"],
    color: "#EA580C",
    bg: "#FFF7ED",
    border: "#FED7AA",
  },
  {
    id: "cresta",
    name: "Cresta",
    emoji: "🍛",
    tagline: "Premium campus dining",
    rating: 4.7,
    deliveryTime: "20–30 min",
    popular: ["Spaghetti", "Chicken & Chips", "Shawarma"],
    color: "#7C3AED",
    bg: "#F5F3FF",
    border: "#DDD6FE",
  },
  {
    id: "marigold",
    name: "Marigold",
    emoji: "🌻",
    tagline: "Fresh meals & smoothies",
    rating: 4.6,
    deliveryTime: "15–20 min",
    popular: ["Amala & Ewedu", "Porridge", "Smoothies"],
    color: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
  },
  {
    id: "zangabar",
    name: "Zangabar",
    emoji: "🔥",
    tagline: "Grills, wraps & fast bites",
    rating: 4.5,
    deliveryTime: "10–20 min",
    popular: ["Suya", "Shawarma", "Grilled Chicken"],
    color: "#DC2626",
    bg: "#FEF2F2",
    border: "#FECACA",
  },
  {
    id: "citrus",
    name: "Citrus",
    emoji: "🍊",
    tagline: "Refreshing drinks & light meals",
    rating: 4.4,
    deliveryTime: "10–15 min",
    popular: ["Fruit Parfait", "Smoothie Bowl", "Sandwiches"],
    color: "#16A34A",
    bg: "#F0FDF4",
    border: "#BBF7D0",
  },
];

const RestaurantPicker = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const template = location.state?.template || {};

  const handleSelect = (restaurant) => {
    navigate("/post-errand", {
      state: {
        template: {
          ...template,
          title: `Buy Lunch at ${restaurant.name}`,
          description: template.description && !template.description.includes("campus cafeteria")
            ? `${template.description}\n\nRestaurant: ${restaurant.name}`
            : `Order food from ${restaurant.name}. Popular: ${restaurant.popular.join(", ")}. Please buy and deliver to my location.`,
          location: template.location && !["Campus Cafeteria", restaurant.name].includes(template.location) ? template.location : "",
          category: "Meals",
          restaurant: restaurant.name,
          pickupLocation: restaurant.name,
        },
      },
    });
  };

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 320, mass: 0.8 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#F8FAFC",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        height: "100dvh",
        width: "100vw",
        overflow: "hidden",
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          height: 64,
          padding: "0 16px",
          background: "#FFFFFF",
          borderBottom: "1.5px solid #E2E8F0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04)",
        }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "1.5px solid #CBD5E1",
            background: "#F8FAFC",
            color: "#0F172A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          aria-label="Close"
        >
          <X size={20} color="#0F172A" />
        </button>

        <h1
          style={{
            fontSize: "1.15rem",
            fontWeight: 900,
            color: "#0F172A",
            margin: 0,
            fontFamily: "Outfit, sans-serif",
            letterSpacing: "-0.3px",
          }}
        >
          Choose Restaurant
        </h1>

        <div style={{ width: 40 }} />
      </div>

      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #1E4DB7, #2563EB)",
          padding: "18px 20px",
          color: "#FFFFFF",
        }}
      >
        <div style={{ maxWidth: 540, margin: "0 auto" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.85, marginBottom: 4 }}>
            🍽️ Campus Restaurants
          </div>
          <div style={{ fontSize: "1rem", fontWeight: 600, opacity: 0.92 }}>
            Pick where you'd like your food from
          </div>
        </div>
      </div>

      {/* Scrollable Restaurant List */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          padding: "16px 16px 40px",
        }}
      >
        <div style={{ maxWidth: 540, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
          {RESTAURANTS.map((r, idx) => (
            <motion.button
              key={r.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.25 }}
              onClick={() => handleSelect(r)}
              style={{
                width: "100%",
                background: "#FFFFFF",
                border: `1.5px solid ${r.border}`,
                borderRadius: 20,
                padding: "16px 18px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 14,
                textAlign: "left",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = `0 8px 24px ${r.color}18`;
                e.currentTarget.style.borderColor = r.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.04)";
                e.currentTarget.style.borderColor = r.border;
              }}
            >
              {/* Emoji Icon */}
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: r.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.6rem",
                  flexShrink: 0,
                  border: `1px solid ${r.border}`,
                }}
              >
                {r.emoji}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontWeight: 900, fontSize: "1rem", color: "#0F172A" }}>
                    {r.name}
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      color: "#D97706",
                      background: "#FFFBEB",
                      padding: "2px 8px",
                      borderRadius: 20,
                      border: "1px solid #FDE68A",
                    }}
                  >
                    <Star size={10} fill="#D97706" color="#D97706" /> {r.rating}
                  </span>
                </div>
                <div style={{ fontSize: "0.78rem", color: "#64748B", fontWeight: 600, marginBottom: 6 }}>
                  {r.tagline}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: "#64748B",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <Clock size={11} color="#94A3B8" /> {r.deliveryTime}
                  </span>
                  <span style={{ fontSize: "0.7rem", color: "#94A3B8", fontWeight: 600 }}>
                    {r.popular.slice(0, 2).join(" · ")}
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <ChevronRight size={20} color="#CBD5E1" style={{ flexShrink: 0 }} />
            </motion.button>
          ))}

          {/* Custom option */}
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: RESTAURANTS.length * 0.06, duration: 0.25 }}
            onClick={() => {
              navigate("/post-errand", {
                state: {
                  template: {
                    ...template,
                    category: "Meals",
                  },
                },
              });
            }}
            style={{
              width: "100%",
              background: "#FFFFFF",
              border: "1.5px dashed #CBD5E1",
              borderRadius: 20,
              padding: "16px 18px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 14,
              textAlign: "left",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#2563EB";
              e.currentTarget.style.background = "#F8FAFC";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#CBD5E1";
              e.currentTarget.style.background = "#FFFFFF";
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: "#F1F5F9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.4rem",
                flexShrink: 0,
              }}
            >
              <MapPin size={22} color="#64748B" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "#334155" }}>
                Other / Custom Location
              </div>
              <div style={{ fontSize: "0.76rem", color: "#94A3B8", fontWeight: 600, marginTop: 2 }}>
                Enter your own restaurant or pickup spot
              </div>
            </div>
            <ChevronRight size={20} color="#CBD5E1" style={{ flexShrink: 0 }} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default RestaurantPicker;

