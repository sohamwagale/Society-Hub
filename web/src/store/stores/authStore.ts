import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import axios from 'axios';
import type { User } from '../../types';
import { authAPI } from '../../services/api';

function isUnauthorized(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

export const AUTH_STORAGE_KEY = 'auth-storage';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (email, password) => {
        await authAPI.login(email, password);
        const user = await authAPI.getMe();
        set({ user, isAuthenticated: true });
      },

      logout: async () => {
        try { await authAPI.logout(); } catch { }
        set({ user: null, isAuthenticated: false });
      },

      loadUser: async () => {
        try {
          const user = await authAPI.getMe();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error: unknown) {
          if (isUnauthorized(error)) {
            set({ user: null, isAuthenticated: false, isLoading: false });
          } else {
            set((s) => ({
              isLoading: false,
              ...(s.user ? { isAuthenticated: true } : {}),
            }));
          }
        }
      },

      refreshUser: async () => {
        try {
          const user = await authAPI.getMe();
          set({ user });
        } catch { }
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState && typeof persistedState === 'object' ? persistedState : {}),
        isLoading: true,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.loadUser) void state.loadUser();
        else void useAuthStore.getState().loadUser();
      },
    }
  )
);

if (typeof window !== 'undefined') {
  window.addEventListener('unauthorized-logout', () => {
    useAuthStore.getState().logout();
  });
}
