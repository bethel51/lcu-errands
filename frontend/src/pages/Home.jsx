import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Users } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../api";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const Home = () => {
  const isAuth = localStorage.getItem("isAuthenticated") === "true";
  const [stats, setStats] = useState({
    activeStudents: "500+",
    completedErrands: "2,000+",
    averageRating: "4.9",
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get("/auth/public-stats");
        setStats({
          activeStudents: `${response.data.activeStudents.toLocaleString()}`,
          completedErrands: `${response.data.completedErrands.toLocaleString()}`,
          averageRating: `${response.data.averageRating.toFixed(1)}`,
        });
      } catch (err) {
        console.error("Failed to fetch public stats", err);
      }
    };
    fetchStats();
  }, []);

  return (
    <>
      <div className="hero-wrapper">
        <div className="container">
          <section className="hero">
            <motion.div className="hero-left" {...fadeUp}>
              <div className="hero-badge">
                <span className="hero-badge-dot" />
                Live on Campus — LeadCity University, Ibadan
              </div>
              <h1>
                Campus errands,
                <br />
                <span className="text-blue">delivered </span>
                <span className="text-pink">fast.</span>
              </h1>
              <p className="hero-desc">
                Need food from the cafeteria? Documents printed? Groceries
                picked up? Post your errand and let a verified student handle it
                in minutes.
              </p>
              <div className="hero-ctas">
                <Link
                  to={isAuth ? "/dashboard" : "/register"}
                  className="btn btn-primary btn-lg"
                >
                  {isAuth ? "Go to Dashboard" : "Get Started Free"}{" "}
                  <ArrowRight size={18} />
                </Link>
                <Link to="/dashboard" className="btn btn-outline btn-lg">
                  Browse Errands
                </Link>
              </div>
              <div className="hero-stats">
                <div className="hero-stat">
                  <h3>{stats.activeStudents}</h3>
                  <p>Active Students</p>
                </div>
                <div className="hero-stat">
                  <h3>{stats.completedErrands}</h3>
                  <p>Errands Completed</p>
                </div>
                <div className="hero-stat">
                  <h3>{stats.averageRating}★</h3>
                  <p>Avg. Rating</p>
                </div>
              </div>
            </motion.div>
          </section>
        </div>
      </div>

      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <h2>How it works</h2>
            <p>Three simple steps to get any errand done on campus.</p>
          </div>
          <div className="features-grid">
            {[
              {
                icon: (
                  <img
                    src="/logo.png"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ),
                cls: "blue",
                title: "Post Your Errand",
                desc: "Describe what you need — meals, shopping, printing, package delivery.",
              },
              {
                icon: <Users size={24} />,
                cls: "pink",
                title: "Get Matched Instantly",
                desc: "Verified student erranders nearby see your request and accept it.",
              },
              {
                icon: <CheckCircle size={24} />,
                cls: "green",
                title: "Delivered to You",
                desc: "Your errand gets completed and delivered to your door.",
              },
            ].map((f, i) => (
              <motion.div
                key={i}
                className="card feature-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <div className="card-body">
                  <div className={`feature-icon ${f.cls}`}>{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "80px 0", background: "var(--gray-50)" }}>
        <div className="container">
          <div className="section-header">
            <h2>Available Errands</h2>
            <p>Live tasks currently available on campus.</p>
          </div>

          <div style={{ position: "relative" }}>
            {/* Blured marketplace preview */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: 24,
                filter: isAuth ? "none" : "blur(8px)",
                pointerEvents: isAuth ? "auto" : "none",
                opacity: isAuth ? 1 : 0.6,
                transition: "all 0.4s",
              }}
            >
              {[
                {
                  title: "Buy Lunch from Cafeteria 2",
                  fee: 500,
                  category: "Meals",
                  loc: "Abebe Hall",
                },
                {
                  title: "Print & Staple 50 Pages",
                  fee: 1200,
                  category: "Academic",
                  loc: "Faculty of Arts",
                },
                {
                  title: "Pick up Grocery at Gate",
                  fee: 800,
                  category: "Shopping",
                  loc: "New Hostel",
                },
              ].map((err, i) => (
                <div key={i} className="card" style={{ padding: 24 }}>
                  <span
                    className="badge badge-blue"
                    style={{ marginBottom: 12 }}
                  >
                    {err.category}
                  </span>
                  <h3 style={{ fontWeight: 800, marginBottom: 8 }}>
                    {err.title}
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{ color: "var(--gray-500)", fontSize: "0.85rem" }}
                    >
                      {err.loc}
                    </span>
                    <span style={{ fontWeight: 900, color: "var(--blue-600)" }}>
                      ₦{err.fee}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {!isAuth && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 10,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    background: "white",
                    padding: "40px",
                    borderRadius: 32,
                    boxShadow: "var(--shadow-xl)",
                    border: "1px solid var(--gray-100)",
                    maxWidth: 400,
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      background: "var(--blue-50)",
                      color: "var(--blue-600)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 24px",
                    }}
                  >
                    <Users size={32} />
                  </div>
                  <h3
                    style={{
                      fontWeight: 800,
                      fontSize: "1.5rem",
                      marginBottom: 12,
                    }}
                  >
                    Students Only
                  </h3>
                  <p style={{ color: "var(--gray-500)", marginBottom: 32 }}>
                    Sign up with your LCU matric number to view and accept
                    errands.
                  </p>
                  <Link
                    to="/register"
                    className="btn btn-primary"
                    style={{ width: "100%" }}
                  >
                    Create Account
                  </Link>
                  <Link
                    to="/login"
                    style={{
                      display: "block",
                      marginTop: 16,
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: "var(--blue-600)",
                    }}
                  >
                    Already a member? Log in
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="container">
        <div className="cta-banner">
          <h2>Ready to earn money on campus?</h2>
          <p>
            {isAuth
              ? "Check the dashboard for open tasks."
              : "Sign up as an errander and start accepting tasks today."}
          </p>
          <Link
            to={isAuth ? "/dashboard" : "/register"}
            className="btn btn-accent btn-lg"
          >
            {isAuth ? "View Market" : "Join the Community"}{" "}
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>

      <footer className="footer">
        <div className="container">
          <p>
            © 2026 LCU Errands. LeadCity University, Ibadan. All rights
            reserved.
          </p>
        </div>
      </footer>
    </>
  );
};

export default Home;
