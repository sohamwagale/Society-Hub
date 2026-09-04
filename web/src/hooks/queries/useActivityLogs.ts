import { useQuery } from '@tanstack/react-query';
import { activityLogAPI } from '../../services/api/activityLog';

export function useActivityLogsQuery(skip = 0, limit = 50, entityType?: string) {
  return useQuery({
    queryKey: ['activityLogs', skip, limit, entityType || 'ALL'],
    queryFn: () => activityLogAPI.list(skip, limit, entityType),
  });
}
