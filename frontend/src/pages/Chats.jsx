import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageSquare, ArrowRight, Search, Clock, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api";

const Chats = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const userStr = localStorage.getItem("user");
  const currentUser = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await api.get("/chat/conversations");
      setConversations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch conversations", err);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = conversations.filter(
    (c) =>
      c.errand.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.errand.posterId.name || "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      (c.errand.erranderId?.name || "")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "80vh",
        }}
      >
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div
        className="container"
        style={{ paddingTop: 20, paddingBottom: 80, maxWidth: 800 }}
      >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 40,
          }}
        >
          <div>
            <h1
              style={{ fontSize: "2.5rem", fontWeight: 900, marginBottom: 8 }}
            >
              My Chats
            </h1>
            <p style={{ color: "var(--gray-500)" }}>
              Keep track of all your active errand conversations.
            </p>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="btn btn-primary"
            style={{
              borderRadius: 16,
              height: 52,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <User size={20} /> New Chat
          </button>
        </div>

        <div style={{ position: "relative", marginBottom: 32 }}>
          <Search
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--gray-400)",
            }}
            size={20}
          />
          <input
            type="text"
            className="input-field"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              paddingLeft: 48,
              background: "white",
              border: "1px solid var(--gray-100)",
              height: 60,
              borderRadius: 16,
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filtered.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 0",
                background: "white",
                borderRadius: 24,
                border: "1px solid var(--gray-100)",
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  background: "var(--gray-50)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                  color: "var(--gray-300)",
                }}
              >
                <MessageSquare size={40} />
              </div>
              <h3 style={{ fontWeight: 800, marginBottom: 8 }}>
                No Conversations Yet
              </h3>
              <p
                style={{
                  color: "var(--gray-400)",
                  maxWidth: 300,
                  margin: "0 auto",
                }}
              >
                Once you start chatting about an errand, it will appear here.
              </p>
            </div>
          ) : (
            filtered.map((c) => {
              const otherUser =
                c.errand.posterId._id === currentUser?.id
                  ? c.errand.erranderId
                  : c.errand.posterId;
              const isMe = c.lastMessage.senderId === currentUser?.id;

              return (
                <motion.div
                  key={c.errand._id}
                  whileHover={{ y: -4, boxShadow: "var(--shadow-lg)" }}
                  onClick={() =>
                    navigate("/dashboard", {
                      state: { openChatId: c.errand._id },
                    })
                  }
                  style={{
                    background: "white",
                    padding: 20,
                    borderRadius: 24,
                    border: "1px solid var(--gray-100)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ position: "relative" }}>
                    {otherUser?.profilePicture ? (
                      <img
                        src={otherUser.profilePicture}
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: 18,
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: 18,
                          background: "var(--blue-100)",
                          color: "var(--blue-600)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.25rem",
                          fontWeight: 800,
                        }}
                      >
                        {(otherUser?.name || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div
                      style={{
                        position: "absolute",
                        bottom: -4,
                        right: -4,
                        width: 24,
                        height: 24,
                        background: "var(--blue-600)",
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        border: "3px solid white",
                      }}
                    >
                      <Clock size={12} />
                    </div>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <h4 style={{ fontWeight: 800, fontSize: "1.1rem" }}>
                        {otherUser?.name || "User"}
                      </h4>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--gray-400)",
                        }}
                      >
                        {new Date(c.lastMessage.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: "var(--blue-600)",
                        marginBottom: 6,
                      }}
                    >
                      Re: {c.errand.title}
                    </div>
                    <p
                      style={{
                        fontSize: "0.9rem",
                        color: "var(--gray-500)",
                        margin: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {isMe && (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 800,
                            color: "var(--gray-400)",
                            textTransform: "uppercase",
                          }}
                        >
                          You:
                        </span>
                      )}
                      {c.lastMessage.text.length > 40
                        ? c.lastMessage.text.substring(0, 40) + "..."
                        : c.lastMessage.text}
                    </p>
                  </div>

                  <div style={{ color: "var(--gray-300)" }}>
                    <ArrowRight size={24} />
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </motion.div>
      </div>
    </div>
  );
};

export default Chats;
