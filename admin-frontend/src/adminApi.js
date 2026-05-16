import axios from "axios";

const adminApi = axios.create({
  baseURL: import.meta.env.VITE_ADMIN_API_URL || "http://localhost:5001",
});

adminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("isAdminLoggedIn");
      // No auto-redirect here to avoid breaking the admin portal flow
    }
    return Promise.reject(error);
  },
);

export default adminApi;
