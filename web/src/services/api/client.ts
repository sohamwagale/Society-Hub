import axios from 'axios';

let _token: string | null = null;

export const tokenStorage = {
  get: (): string | null => {
    if (_token) return _token;
    _token = localStorage.getItem('access_token');
    return _token;
  },
  set: (token: string) => {
    _token = token;
    localStorage.setItem('access_token', token);
  },
  remove: () => {
    _token = null;
    localStorage.removeItem('access_token');
  },
};

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'ngrok-skip-browser-warning': '1' },
});

export const publicApi = api;

api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      tokenStorage.remove();
      window.dispatchEvent(new Event('unauthorized-logout'));
    }
    return Promise.reject(error);
  }
);

export default api;
