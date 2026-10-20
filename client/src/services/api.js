import axios from "axios";
import { TOKEN_KEY } from "../utils/constants";

const baseUrl = process.env.REACT_APP_BASE_URL || "http://localhost:5000/api";
const api = axios.create({
  baseURL: baseUrl,
  withCredentials: true,
});

// Read the markup_csrf cookie that the server sets alongside markup_token on
// login. The CSRF middleware on the server short-circuits when a Bearer token
// is present, so this header is technically redundant today — but if a future
// flow relies on cookie auth (e.g. opening an export link in a new tab) the
// header is required and it's cheaper to send it always.
function readCsrfCookie() {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(/(?:^|;\s*)markup_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const csrf = readCsrfCookie();
  if (csrf && config.headers) {
    config.headers['X-CSRF-Token'] = csrf;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const isAuthRoute =
      url.includes("/auth/login") || url.includes("/auth/signup");

    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem(TOKEN_KEY);

      const code = error.response?.data?.code;
      if (code === "SESSION_REPLACED") {
        sessionStorage.setItem("session_replaced", "true");
      }

      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;
