import api, { BASE_URL, tokenStorage } from './client';
import type { ActivityLog } from '../../types';

export const activityLogAPI = {
  list: async (skip = 0, limit = 50, entityType?: string): Promise<ActivityLog[]> => {
    const params: Record<string, string | number> = { skip, limit };
    if (entityType) params.entity_type = entityType;
    const { data } = await api.get<ActivityLog[]>('/activity-log', { params });
    return data;
  },
  getExportCsvUrl: (): string => {
    const token = tokenStorage.get();
    return `${BASE_URL}/activity-log/export-csv?token=${encodeURIComponent(token || '')}`;
  },
};
