import api, { BASE_URL } from './client';
import type { SocietyDocument } from '../../types';

export const documentsAPI = {
  list: async (): Promise<SocietyDocument[]> => {
    const { data } = await api.get<SocietyDocument[]>('/documents/');
    return data;
  },
  get: async (id: string): Promise<SocietyDocument> => {
    const { data } = await api.get<SocietyDocument>(`/documents/${encodeURIComponent(id)}`);
    return data;
  },
  upload: async (title: string, file: File, description?: string): Promise<SocietyDocument> => {
    const formData = new FormData();
    formData.append('title', title);
    if (description) formData.append('description', description);
    formData.append('file', file);
    const { data } = await api.post<SocietyDocument>('/documents/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  approve: async (id: string): Promise<SocietyDocument> => {
    const { data } = await api.patch<SocietyDocument>(`/documents/${encodeURIComponent(id)}/approve`);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/documents/${encodeURIComponent(id)}`);
  },
  getFileUrl: (path: string): string => {
    return BASE_URL.replace('/api', '') + path;
  },
};
