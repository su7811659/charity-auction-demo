import axios from "axios";
import { message } from "antd";
import { triggerLogout } from "./authUtils"; 

const getBaseURL = () => {
  // If explicitly configured, use it (e.g., https://api.example.com or /api)
  const configured = import.meta.env.VITE_API_BASE?.trim();
  if (configured) return configured;

  // Default: same-origin. Combine with path like "/api/..." in calls
  // to work in both local dev (via Vite proxy) and behind Nginx.
  return "";
};

const axiosInstance = axios.create({
  baseURL: getBaseURL(),
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("jwt");
      if (token && config.headers) {
        config.headers.set?.("Authorization", `Bearer ${token}`);
      }
      if (config.data instanceof FormData && config.headers) {
        config.headers.delete?.("Content-Type");
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      message.warning("登入已過期，請重新登入");
      triggerLogout(); 
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
