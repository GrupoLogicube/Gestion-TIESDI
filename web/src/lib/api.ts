import axios from 'axios';

export const AUTH_TOKEN_KEY = 'auth_token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onUnauthorizedHandler: (() => void) | null = null;

export function registerUnauthorizedHandler(handler: () => void) {
  onUnauthorizedHandler = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl: string = error.config?.url || '';
    const isAuthAttempt =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/oauth/');

    if (status === 401 && !isAuthAttempt) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      if (onUnauthorizedHandler) {
        onUnauthorizedHandler();
      }
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/rsvp/')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;

