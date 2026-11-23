import { create } from 'zustand';
import api, { AUTH_TOKEN_KEY, registerUnauthorizedHandler } from '../lib/api';
import type { AuthResponse, User, UserRole } from '../types/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  initialize: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  setSmtpStatus: (hasSmtpConfigured: boolean, smtpEmail: string | null) => void;
  login: (email: string, password: string) => Promise<User>;
  setSession: (token: string, user: User) => void;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    phone?: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  clearAuth: () => void;
  hasRole: (role: UserRole) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => {
  registerUnauthorizedHandler(() => {
    set({ user: null, token: null, isInitialized: true });
  });

  return {
    user: null,
    token: localStorage.getItem(AUTH_TOKEN_KEY),
    isLoading: false,
    isInitialized: false,

    initialize: async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        set({ user: null, token: null, isInitialized: true });
        return;
      }

      set({ isLoading: true });
      try {
        const { data } = await api.get<User>('/user');
        set({ user: data, token, isLoading: false, isInitialized: true });
      } catch {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        set({ user: null, token: null, isLoading: false, isInitialized: true });
      }
    },

    refreshUser: async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) return null;

      try {
        const { data } = await api.get<User>('/user');
        set({ user: data });
        return data;
      } catch {
        return get().user;
      }
    },

    setSmtpStatus: (hasSmtpConfigured, smtpEmail) => {
      const current = get().user;
      if (!current) return;
      set({
        user: {
          ...current,
          has_smtp_configured: hasSmtpConfigured,
          smtp_email: smtpEmail,
        },
      });
    },

    login: async (email, password) => {
      set({ isLoading: true });
      try {
        const { data } = await api.post<AuthResponse>('/auth/login', {
          email,
          password,
          device_name: 'web',
        });
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        set({ user: data.user, token: data.token, isLoading: false, isInitialized: true });
        return data.user;
      } catch (err) {
        set({ isLoading: false });
        throw err;
      }
    },

    setSession: (token, user) => {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      set({ user, token, isLoading: false, isInitialized: true });
    },

    register: async (payload) => {
      set({ isLoading: true });
      try {
        const { data } = await api.post<AuthResponse>('/auth/register', {
          ...payload,
          device_name: 'web',
        });
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        set({ user: data.user, token: data.token, isLoading: false, isInitialized: true });
        return data.user;
      } catch (err) {
        set({ isLoading: false });
        throw err;
      }
    },

    logout: async () => {
      try {
        await api.post('/auth/logout');
      } catch {
        // Ignore errors if token is already expired
      } finally {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        set({ user: null, token: null });
      }
    },

    clearAuth: () => {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      set({ user: null, token: null });
    },

    hasRole: (role) => {
      const user = get().user;
      return user ? user.roles.includes(role) : false;
    },
  };
});
