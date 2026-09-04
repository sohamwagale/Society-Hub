import api, { BASE_URL } from './client';
import type { ReimbursementRequest, ReimbursementCreate } from '../../types';

export const reimbursementsAPI = {
  list: async (): Promise<ReimbursementRequest[]> => {
    const { data } = await api.get<ReimbursementRequest[]>('/reimbursements/');
    return data;
  },
  get: async (id: string): Promise<ReimbursementRequest> => {
    const { data } = await api.get<ReimbursementRequest>(`/reimbursements/${encodeURIComponent(id)}`);
    return data;
  },
  create: async (req: ReimbursementCreate): Promise<ReimbursementRequest> => {
    const { data } = await api.post<ReimbursementRequest>('/reimbursements/', req);
    return data;
  },
  review: async (id: string, updates: { status?: string; approved_amount?: number; admin_notes?: string }): Promise<ReimbursementRequest> => {
    const { data } = await api.patch<ReimbursementRequest>(`/reimbursements/${encodeURIComponent(id)}`, updates);
    return data;
  },
  markPaid: async (id: string, payment: { amount: number; payment_method: string; transaction_ref?: string; payment_date: string }) => {
    const { data } = await api.post(`/reimbursements/${encodeURIComponent(id)}/pay`, { request_id: id, ...payment });
    return data;
  },
  uploadReceipt: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post(`/reimbursements/${encodeURIComponent(id)}/upload-receipt`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  getReceiptUrl: (path: string): string => {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return BASE_URL.replace('/api', '') + path;
  }
};
