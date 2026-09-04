import api from './client';
import type { CreateSocietyRequest, PendingUser } from '../../types';

export const onboardingAPI = {
  joinSociety: async (payload: {
    society_id: string; flat_id: string; resident_type: string;
    aadhar_number?: string; pan_number?: string;
  }): Promise<{ detail: string; user_id: string }> => {
    const { data } = await api.post<{ detail: string; user_id: string }>('/onboarding/join', payload);
    return data;
  },
  createSociety: async (payload: CreateSocietyRequest): Promise<{ detail: string; society_id: string; flats_created: number }> => {
    const { data } = await api.post('/onboarding/create-society', payload);
    return data;
  },
  pendingApprovals: async (): Promise<PendingUser[]> => {
    const { data } = await api.get<PendingUser[]>('/onboarding/pending-approvals');
    return data;
  },
  approve: async (userId: string, approve = true): Promise<{ detail: string }> => {
    const { data } = await api.post<{ detail: string }>('/onboarding/approve', { user_id: userId, approve });
    return data;
  },
  revokeRenter: async (userId: string): Promise<{ detail: string }> => {
    const { data } = await api.post<{ detail: string }>('/onboarding/revoke-renter', { user_id: userId });
    return data;
  },
};
