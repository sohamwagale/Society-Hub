import api from './client';
import type { ResidentInfo, ResidentStats } from '../../types';

export const residentsAPI = {
  list: async (): Promise<ResidentInfo[]> => {
    const { data } = await api.get<ResidentInfo[]>('/residents/');
    return data;
  },
  stats: async (): Promise<ResidentStats> => {
    const { data } = await api.get<ResidentStats>('/residents/stats');
    return data;
  },
  setCommittee: async (userId: string, isCommittee: boolean, role?: string): Promise<ResidentInfo> => {
    const { data } = await api.put(`/residents/${encodeURIComponent(userId)}/committee`, { is_committee: isCommittee, committee_role: role });
    return data;
  },
};
