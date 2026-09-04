import api from './client';
import type { Flat } from '../../types';

export const flatsAPI = {
  list: async (): Promise<Flat[]> => {
    const { data } = await api.get<Flat[]>('/auth/flats');
    return data;
  },
  create: async (flat: { flat_number: string; block: string; floor: string }): Promise<Flat> => {
    const { data } = await api.post<Flat>('/auth/flats', flat);
    return data;
  },
  assignUser: async (userId: string, flatId: string | null): Promise<void> => {
    await api.put('/auth/assign-flat', { user_id: userId, flat_id: flatId });
  },
};
