import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

// attach token to requests (skip attaching for /auth endpoints)
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers ?? {};
      // don't attach to auth endpoints that expect no bearer
      if (!config.url?.includes("/auth")) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default API;
