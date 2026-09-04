import api, { BASE_URL } from './client';
import type { Complaint, ComplaintCreate, ComplaintComment } from '../../types';

export const complaintsAPI = {
  list: async (status?: string, category?: string): Promise<Complaint[]> => {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (category) params.category = category;
    const { data } = await api.get<Complaint[]>('/complaints/', { params });
    return data;
  },
  get: async (id: string): Promise<Complaint> => {
    const { data } = await api.get<Complaint>(`/complaints/${encodeURIComponent(id)}`);
    return data;
  },
  create: async (complaint: ComplaintCreate): Promise<Complaint> => {
    const { data } = await api.post<Complaint>('/complaints/', complaint);
    return data;
  },
  update: async (id: string, updates: { status?: string; admin_notes?: string }): Promise<Complaint> => {
    const { data } = await api.patch<Complaint>(`/complaints/${encodeURIComponent(id)}`, updates);
    return data;
  },
  listComments: async (id: string): Promise<ComplaintComment[]> => {
    const { data } = await api.get<ComplaintComment[]>(`/complaints/${encodeURIComponent(id)}/comments`);
    return data;
  },
  addComment: async (id: string, message: string): Promise<ComplaintComment> => {
    const { data } = await api.post<ComplaintComment>(`/complaints/${encodeURIComponent(id)}/comments`, { message });
    return data;
  },
  uploadImage: async (id: string, file: File): Promise<{ image_path: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post(`/complaints/${encodeURIComponent(id)}/upload-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  getImageUrl: (path: string): string => {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return BASE_URL.replace('/api', '') + path;
  }
};
