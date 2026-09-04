import api, { tokenStorage } from './client';
import type {
  TokenResponse,
  User,
  UserUpdate,
  ChangePasswordRequest,
  RegisterRequest,
} from '../../types';

export const authAPI = {
  login: async (email: string, password: string): Promise<TokenResponse> => {
    const formBody = `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
    const { data } = await api.post<TokenResponse>('/auth/login', formBody, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    tokenStorage.set(data.access_token);
    return data;
  },
  register: async (req: RegisterRequest): Promise<User> => {
    const { data } = await api.post<User>('/auth/register', req);
    return data;
  },
  getMe: async (): Promise<User> => {
    const { data } = await api.get<User>('/auth/me');
    return data;
  },
  updateProfile: async (updates: UserUpdate): Promise<User> => {
    const { data } = await api.patch<User>('/auth/me', updates);
    return data;
  },
  changePassword: async (req: ChangePasswordRequest): Promise<{ message: string }> => {
    const { data } = await api.post<{ message: string }>('/auth/change-password', req);
    return data;
  },
  logout: async () => {
    tokenStorage.remove();
  },
  registerPushToken: async (token: string): Promise<void> => {
    await api.post('/auth/push-token', { token });
  },
};
