import axios from "axios";

const getBaseURL = () => {
  const envURL = import.meta.env.VITE_API_URL;
  if (!envURL) return "/api";
  // Ensure the URL ends with /api if it's a full domain
  return envURL.endsWith("/api") ? envURL : `${envURL.replace(/\/$/, "")}/api`;
};

const api = axios.create({
  baseURL: getBaseURL(),
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if the response is HTML (indicates hit a 404 page or proxy issue)
    const contentType = error.response?.headers?.["content-type"];
    if (contentType && contentType.includes("text/html")) {
      console.error("[API] Received HTML instead of JSON. Check VITE_API_URL.");
      error.response.data = { 
        message: "Server Configuration Error: The API URL (VITE_API_URL) might be wrong or the backend is not reachable." 
      };
    }

    const currentHash = window.location.hash;
    const isAuthPage = 
      currentHash.includes("/login") || 
      currentHash.includes("/register") || 
      currentHash.includes("/forgot-password");

    if (error.response?.status === 401 && !isAuthPage) {
      console.warn("[API] Unauthorized access detected. Redirecting to login...");
      localStorage.clear();
      // Use the hash-friendly path for login
      window.location.hash = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;
