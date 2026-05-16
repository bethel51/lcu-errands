import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context)
    throw new Error("useSocket must be used within a SocketProvider");
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [hasNotification, setHasNotification] = useState(false);
  const [isAuth, setIsAuth] = useState(
    localStorage.getItem("isAuthenticated") === "true",
  );

  useEffect(() => {
    // Listen for storage changes (for multi-tab sync or login/logout)
    const handleStorageChange = () => {
      setIsAuth(localStorage.getItem("isAuthenticated") === "true");
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    if (!isAuth) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const userStr = localStorage.getItem("user");
    const currentUser = userStr ? JSON.parse(userStr) : null;

    const backendUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace("/api", "")
      : window.location.origin;

    const newSocket = io(backendUrl, {
      transports: ["polling", "websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      if (currentUser?.id) newSocket.emit("join", currentUser.id);
    });

    newSocket.on("connect_error", (err) => {
      console.warn("[Socket] Connection error:", err.message);
    });

    newSocket.on("notification", () => {
      setHasNotification(true);
    });

    newSocket.on("receive_message", (data) => {
      if (data.senderId !== currentUser?.id) {
        setHasNotification(true);
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [isAuth]);

  return (
    <SocketContext.Provider
      value={{ socket, hasNotification, setHasNotification }}
    >
      {children}
    </SocketContext.Provider>
  );
};
