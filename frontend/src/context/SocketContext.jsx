import React, { createContext, useContext, useEffect, useRef, useState } from "react";
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
  // Track last auth value without triggering re-renders in the interval
  const isAuthRef = useRef(isAuth);
  useEffect(() => { isAuthRef.current = isAuth; }, [isAuth]);

  useEffect(() => {
    // Listen for cross-tab login/logout via storage events
    const handleStorageChange = (e) => {
      if (e.key === "isAuthenticated" || e.key === null) {
        const auth = localStorage.getItem("isAuthenticated") === "true";
        if (auth !== isAuthRef.current) setIsAuth(auth);
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // Poll only every 5s (instead of 1s) to catch same-tab logout
    const interval = setInterval(() => {
      const auth = localStorage.getItem("isAuthenticated") === "true";
      if (auth !== isAuthRef.current) setIsAuth(auth);
    }, 5000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []); // run once on mount only

  useEffect(() => {
    if (!isAuth) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const userStr = localStorage.getItem("user");
    let currentUser = null;
    try {
      currentUser = userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      console.error("[SocketContext] LocalStorage user parse failed:", e);
    }

    const backendUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace("/api", "")
      : window.location.origin;

    // websocket-first: skip the polling upgrade round-trip for faster connect
    const newSocket = io(backendUrl, {
      transports: ["websocket", "polling"],
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
