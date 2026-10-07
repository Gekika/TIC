import axios from "axios";

const TOKEN_STORAGE_KEY = "tic_access_token";
const USER_STORAGE_KEY = "tic_current_user";

function clearStoredSession() {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(USER_STORAGE_KEY);
}

function isExpiredJwt(token: string) {
  try {
    const base64Payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = base64Payload.padEnd(Math.ceil(base64Payload.length / 4) * 4, "=");
    const payload = JSON.parse(atob(paddedPayload)) as { exp?: number };
    return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function redirectToExpiredSessionLogin() {
  if (window.location.pathname === "/login") return;
  window.location.assign("/login?reason=session-expired");
}

function redirectToInactiveLicenseLogin() {
  if (window.location.pathname === "/login") return;
  window.location.assign("/login?reason=license-inactive");
}

export const apiClient = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
  headers: {
    "X-Tenant-Slug": "agricert-kenya"
  }
});

apiClient.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  const storedUser = window.localStorage.getItem(USER_STORAGE_KEY);
  const isAuthRequest = config.url?.startsWith("/auth/") ?? false;
  if (!isAuthRequest && ((!token && storedUser) || (token && isExpiredJwt(token)))) {
    clearStoredSession();
    redirectToExpiredSessionLogin();
    return Promise.reject(new axios.CanceledError("Your session expired. Sign in again to continue."));
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isAuthRequest = error.config?.url?.startsWith("/auth/") ?? false;
    if (error.response?.status === 401 && !isAuthRequest) {
      clearStoredSession();
      redirectToExpiredSessionLogin();
    }
    if (error.response?.status === 403
        && error.response?.data?.error?.code === "ORGANIZATION_LICENSE_INACTIVE"
        && !isAuthRequest) {
      clearStoredSession();
      redirectToInactiveLicenseLogin();
    }
    return Promise.reject(error);
  }
);
