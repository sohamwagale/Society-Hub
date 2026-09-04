import api from './client';
import type { SocietyInfoItem, EmergencyContact, Society, SocietyFlatSummary } from '../../types';

export const societyAPI = {
  getInfo: async (): Promise<SocietyInfoItem[]> => {
    const { data } = await api.get<SocietyInfoItem[]>('/society/info');
    return data;
  },
  updateInfo: async (key: string, value: string) => {
    await api.put('/society/info', { key, value });
  },
  deleteInfo: async (key: string) => {
    await api.delete(`/society/info/${encodeURIComponent(key)}`);
  },
  getEmergencyContacts: async (): Promise<EmergencyContact[]> => {
    const { data } = await api.get<EmergencyContact[]>('/society/emergency-contacts');
    return data;
  },
  createEmergencyContact: async (contact: { name: string; phone: string; role: string }): Promise<EmergencyContact> => {
    const { data } = await api.post<EmergencyContact>('/society/emergency-contacts', contact);
    return data;
  },
  updateEmergencyContact: async (id: string, contact: { name: string; phone: string; role: string }): Promise<EmergencyContact> => {
    const { data } = await api.put<EmergencyContact>(`/society/emergency-contacts/${encodeURIComponent(id)}`, contact);
    return data;
  },
  deleteEmergencyContact: async (id: string) => {
    await api.delete(`/society/emergency-contacts/${encodeURIComponent(id)}`);
  },
  listSocieties: async (): Promise<Society[]> => {
    const { data } = await api.get<Society[]>('/society/');
    return data;
  },
  listFlatsForSociety: async (societyId: string): Promise<SocietyFlatSummary[]> => {
    const { data } = await api.get<SocietyFlatSummary[]>(`/society/${encodeURIComponent(societyId)}/flats`);
    return data;
  },
  create: async (society: { name: string; address?: string }): Promise<Society> => {
    const { data } = await api.post<Society>('/society', society);
    return data;
  },
};
