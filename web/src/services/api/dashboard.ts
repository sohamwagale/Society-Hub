import api from './client';
import type { DashboardStats } from '../../types';

export const dashboardAPI = {
  stats: async (): Promise<DashboardStats> => {
    const { data } = await api.get<DashboardStats>('/dashboard/stats');
    return data;
  },
};
