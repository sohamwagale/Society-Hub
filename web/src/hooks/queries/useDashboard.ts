import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '../../services/api/dashboard';

export function useDashboardStatsQuery() {
  return useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => dashboardAPI.stats(),
  });
}
