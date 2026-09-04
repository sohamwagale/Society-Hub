import api from './client';
import type { ActivityLog } from '../../types';

export const activityLogAPI = {
  list: async (skip = 0, limit = 50, entityType?: string): Promise<ActivityLog[]> => {
    const params: Record<string, string | number> = { skip, limit };
    if (entityType) params.entity_type = entityType;
    const { data } = await api.get<ActivityLog[]>('/activity-log', { params });
    return data;
  },
};
