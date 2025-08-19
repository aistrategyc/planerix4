// src/lib/api/axios.ts
import axios, { AxiosError, AxiosRequestConfig } from "axios";

const BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(
    /\/+$/,
    ""
  );

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // отправляем cookies (refresh) на бек
});

// ---------- helpers: управление токеном ----------
export function setAuthToken(token: string) {
  if (!token) return;
  try {
    localStorage.setItem("access_token", token);
  } catch {}
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export function clearAuthToken() {
  try {
    localStorage.removeItem("access_token");
  } catch {}
  delete api.defaults.headers.common.Authorization;
}

// Инициализация токена при загрузке страницы
try {
  const saved = localStorage.getItem("access_token");
  if (saved) setAuthToken(saved);
} catch {}

// ---------- refresh queue (чтобы не плодить конкурентные refresh-запросы) ----------
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
let subscribers: Array<(token: string | null) => void> = [];

function onRefreshed(token: string | null) {
  subscribers.forEach((cb) => cb(token));
  subscribers = [];
}

function addSubscriber(cb: (token: string | null) => void) {
  subscribers.push(cb);
}

async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) return refreshPromise;

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const { data } = await api.post(
        "/auth/refresh",
        {},
        {
          headers: {
            // не перехватывать этот запрос самим интерсептором 401
            "x-skip-auth-retry": "true",
          },
        }
      );

      const token = data?.access_token || null;
      if (token) setAuthToken(token);
      onRefreshed(token);
      return token;
    } catch (e) {
      onRefreshed(null);
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ---------- request interceptor: подставляем токен ----------
api.interceptors.request.use((config) => {
  const hasAuth = Boolean(config.headers?.Authorization);
  if (!hasAuth) {
    try {
      const token = localStorage.getItem("access_token");
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {}
  }
  return config;
});

// ---------- response interceptor: единый обработчик 401 + retry ----------
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = (error.config || {}) as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // Если нет ответа или статус не 401 — отдать дальше
    if (!error.response || error.response.status !== 401) {
      return Promise.reject(error);
    }

    const url = (original.url || "") as string;
    const isRefreshCall = url.includes("/auth/refresh");
    const alreadyRetried = original._retry === true;
    const skipHeader =
      original.headers &&
      (original.headers as any)["x-skip-auth-retry"] === "true";

    // Ничего не делаем для refresh-запроса / уже ретраили / стоит skip-флаг
    if (isRefreshCall || alreadyRetried || skipHeader) {
      clearAuthToken();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    // Ставим метку, чтобы не зациклиться
    original._retry = true;

    // Подпишем исходный запрос на результат refresh (чтобы очередь отработала корректно)
    const newToken = await new Promise<string | null>((resolve) => {
      addSubscriber(resolve);
      refreshAccessToken().catch(() => resolve(null));
    });

    if (newToken) {
      // Повторяем исходный запрос с новым токеном
      original.headers = original.headers || {};
      (original.headers as any).Authorization = `Bearer ${newToken}`;
      return api(original);
    }

    // refresh не удался — чистим и уводим на /login
    clearAuthToken();
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;