import axios from "axios";

export const ACCESS_TOKEN = "access_token";
export const REFRESH_TOKEN = "refresh_token";

const LOCAL_API_ORIGIN = "http://127.0.0.1:8000";

function isLoopbackHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function isLoopbackUrl(url) {
  try {
    return isLoopbackHost(new URL(url).hostname);
  } catch {
    return false;
  }
}

function resolveBaseURL() {
  const envBase = import.meta.env.VITE_API_URL?.trim();

  if (typeof window === "undefined") {
    return envBase || "";
  }

  const browserHost = window.location.hostname;
  const browserIsLocal = isLoopbackHost(browserHost);

  if (envBase) {
    if (!browserIsLocal && isLoopbackUrl(envBase)) {
      return "";
    }
    return envBase;
  }

  return browserIsLocal ? LOCAL_API_ORIGIN : "";
}

const api = axios.create({
  baseURL: resolveBaseURL(),
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
