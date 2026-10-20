import axios from "axios";
import { TOKEN_KEY } from "../utils/constants";

const baseUrl = process.env.REACT_APP_BASE_URL || "http://localhost:5000/api";
// TODO: We should probably split this into two instances, one for the admin and one for the client, so that we don't have to check the URL in the response interceptor. But for now, we'll just use one instance and check the URL in the response interceptor.
const api = axios.create({
  baseURL: baseUrl,
  withCredentials: true,
});

function readCsrfCookie() {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|;\s*)markup_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const csrf = readCsrfCookie();
  if (csrf) {
    config.headers["X-CSRF-Token"] = csrf;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
