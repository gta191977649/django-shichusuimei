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

const refreshApi = axios.create({
  baseURL: resolveBaseURL(),
});

const AUTH_CHANGED_EVENT = "auth:changed";
let refreshPromise = null;

function dispatchAuthChanged(authenticated) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT, { detail: { authenticated } }));
}

export function setStoredAuthTokens({ access, refresh }) {
  if (access) {
    localStorage.setItem(ACCESS_TOKEN, access);
  }
  if (refresh) {
    localStorage.setItem(REFRESH_TOKEN, refresh);
  }
  dispatchAuthChanged(true);
}

export function clearStoredAuthTokens() {
  localStorage.removeItem(ACCESS_TOKEN);
  localStorage.removeItem(REFRESH_TOKEN);
  dispatchAuthChanged(false);
}

export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN);
  if (!refreshToken) {
    clearStoredAuthTokens();
    throw new Error("Missing refresh token");
  }

  if (!refreshPromise) {
    refreshPromise = refreshApi
      .post("/api/token/refresh/", { refresh: refreshToken })
      .then((res) => {
        const nextAccessToken = res.data?.access;
        const nextRefreshToken = res.data?.refresh;

        if (!nextAccessToken) {
          throw new Error("Refresh response missing access token");
        }

        setStoredAuthTokens({ access: nextAccessToken, refresh: nextRefreshToken });
        return nextAccessToken;
      })
      .catch((error) => {
        clearStoredAuthTokens();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

function isAuthTokenEndpoint(url = "") {
  return url.includes("/api/token/");
}

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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (!originalRequest || status !== 401 || originalRequest._retry || isAuthTokenEndpoint(originalRequest.url)) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem(REFRESH_TOKEN);
    if (!refreshToken) {
      clearStoredAuthTokens();
      return Promise.reject(error);
    }

    try {
      originalRequest._retry = true;
      const nextAccessToken = await refreshAccessToken();
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  }
);

export { AUTH_CHANGED_EVENT };
export default api;
