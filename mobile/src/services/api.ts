import axios from 'axios';
import {
  TokenResponse, User, Bill, BillCreate, BillPayment, PayBillRequest,
  Complaint, ComplaintCreate, ComplaintComment, Poll, PollCreate,
  ReimbursementRequest, ReimbursementCreate, Notification, Flat,
  Announcement, AnnouncementCreate, ResidentInfo, ResidentStats,
  DashboardStats, SocietyInfoItem, EmergencyContact,
  UserUpdate, ChangePasswordRequest, RegisterRequest,
  Society, SocietyFlatSummary, CreateSocietyRequest, PendingUser,
  SocietyExpense, SocietyExpenseCreate, SocietyDocument
} from '../types';

// ── Token storage (works on all platforms) ──
let _token: string | null = null;

const tokenStorage = {
  get: async (): Promise<string | null> => {
    if (_token) return _token;
    try {
      const SecureStore = require('expo-secure-store');
      _token = await SecureStore.getItemAsync('access_token');
      return _token;
    } catch {
      return _token;
    }
  },
  set: async (token: string) => {
    _token = token;
    try {
      const SecureStore = require('expo-secure-store');
      await SecureStore.setItemAsync('access_token', token);
    } catch { }
  },
  remove: async () => {
    _token = null;
    try {
      const SecureStore = require('expo-secure-store');
      await SecureStore.deleteItemAsync('access_token');
    } catch { }
  },
};

// ── Base URL ──
// Use your machine's local network IP so Expo Go on a physical device can connect.
// Find your IP: run `ipconfig` (Windows) or `ifconfig` (Mac/Linux).
// const BASE_URL = 'https://vu4rynvvc2p2dlulccufo7vbti0vraom.lambda-url.ap-south-1.on.aws/api';
const BASE_URL = 'http://192.168.1.6:8000/api';
// const BASE_URL = 'http://10.0.2.2:8000/api'; // Android emulator only
// const BASE_URL = 'http://localhost:8000/api';  // iOS simulator / web only
const api = axios.create({ baseURL: BASE_URL, timeout: 10000 });

// Attach JWT token to every request
api.interceptors.request.use(async (config) => {
  const token = await tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses globally (expired/invalid token)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await tokenStorage.remove();
    }
    return Promise.reject(error);
  }
);

// ── Auth ──
export const authAPI = {
  login: async (email: string, password: string): Promise<TokenResponse> => {
    // Build form data manually for maximum compatibility
    const formBody = `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
    const { data } = await api.post<TokenResponse>('/auth/login', formBody, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    await tokenStorage.set(data.access_token);
    return data;
  },
  register: async (req: RegisterRequest): Promise<User> => {
    const { data } = await api.post<User>('/auth/register', req);
    return data;
  },
  getMe: async (): Promise<User> => {
    const { data } = await api.get<User>('/auth/me');
    return data;
  },
  updateProfile: async (updates: UserUpdate): Promise<User> => {
    const { data } = await api.patch<User>('/auth/me', updates);
    return data;
  },
  changePassword: async (req: ChangePasswordRequest): Promise<{ message: string }> => {
    const { data } = await api.post<{ message: string }>('/auth/change-password', req);
    return data;
  },
  logout: async () => {
    await tokenStorage.remove();
  },
  registerPushToken: async (token: string): Promise<void> => {
    await api.post('/auth/push-token', { token });
  },
};

// ── Bills ──
export const billsAPI = {
  list: async (billType?: string, activeOnly?: boolean): Promise<Bill[]> => {
    const params: any = {};
    if (billType) params.bill_type = billType;
    if (activeOnly !== undefined) params.active_only = activeOnly;
    const { data } = await api.get<Bill[]>('/bills/', { params });
    return data;
  },
  get: async (id: string): Promise<Bill> => {
    const { data } = await api.get<Bill>(`/bills/${id}`);
    return data;
  },
  getResidentStatus: async (id: string): Promise<{ user_id: string; name: string; flat: string; status: 'paid' | 'due'; paid_at?: string }[]> => {
    const { data } = await api.get<{ user_id: string; name: string; flat: string; status: 'paid' | 'due'; paid_at?: string }[]>(`/bills/${id}/residents`);
    return data;
  },
  create: async (bill: BillCreate): Promise<Bill> => {
    const { data } = await api.post<Bill>('/bills/', bill);
    return data;
  },
  pay: async (payment: PayBillRequest): Promise<BillPayment> => {
    const { data } = await api.post<BillPayment>('/bills/pay', payment);
    return data;
  },
  paymentHistory: async (): Promise<BillPayment[]> => {
    const { data } = await api.get<BillPayment[]>('/bills/payments/history');
    return data;
  },
  update: async (id: string, updates: { title?: string; description?: string; bill_type?: string; amount?: number; due_date?: string; is_active?: boolean }): Promise<Bill> => {
    const { data } = await api.put<Bill>(`/bills/${id}`, updates);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/bills/${id}`);
  },
  uploadReceipt: async (paymentId: string, uri: string): Promise<{ receipt_path: string }> => {
    const formData = new FormData();
    formData.append('file', { uri, name: 'receipt.jpg', type: 'image/jpeg' } as any);
    const { data } = await api.post(`/bills/${paymentId}/upload-receipt`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  getReceiptUrl: async (paymentId: string): Promise<string> => {
    const token = await tokenStorage.get();
    return `${BASE_URL}/bills/${paymentId}/receipt?token=${encodeURIComponent(token || '')}`;
  },
  getExportReportUrl: async (): Promise<string> => {
    const token = await tokenStorage.get();
    return `${BASE_URL}/bills/export-report?token=${encodeURIComponent(token || '')}`;
  },
};

// ── Society Expenses ──
export const expensesAPI = {
  list: async (sortBy = 'date_desc'): Promise<SocietyExpense[]> => {
    const { data } = await api.get<SocietyExpense[]>('/expenses/', { params: { sort_by: sortBy } });
    return data;
  },
  get: async (id: string): Promise<SocietyExpense> => {
    const { data } = await api.get<SocietyExpense>(`/expenses/${id}`);
    return data;
  },
  create: async (expense: SocietyExpenseCreate, documentUri?: string): Promise<SocietyExpense> => {
    const formData = new FormData();
    formData.append('title', expense.title);
    formData.append('amount', String(expense.amount));
    formData.append('expense_date', expense.expense_date);
    if (expense.description) formData.append('description', expense.description);

    if (documentUri) {
      const ext = documentUri.split('.').pop() || 'pdf';
      const type = ext === 'pdf' ? 'application/pdf' : `image/${ext}`;
      formData.append('document', { uri: documentUri, name: `document.${ext}`, type } as any);
    }

    const { data } = await api.post<SocietyExpense>('/expenses/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  getDocumentUrl: (path: string): string => {
    return BASE_URL.replace('/api', '') + path;
  },
};

// ── Society Documents ──
export const documentsAPI = {
  list: async (): Promise<SocietyDocument[]> => {
    const { data } = await api.get<SocietyDocument[]>('/documents/');
    return data;
  },
  get: async (id: string): Promise<SocietyDocument> => {
    const { data } = await api.get<SocietyDocument>(`/documents/${id}`);
    return data;
  },
  upload: async (title: string, fileUri: string, description?: string): Promise<SocietyDocument> => {
    const formData = new FormData();
    formData.append('title', title);
    if (description) formData.append('description', description);

    const ext = fileUri.split('.').pop()?.toLowerCase() || 'pdf';
    const type = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
      ? `image/${ext === 'jpg' ? 'jpeg' : ext}`
      : 'application/pdf';
    formData.append('file', { uri: fileUri, name: `document.${ext}`, type } as any);

    const { data } = await api.post<SocietyDocument>('/documents/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  approve: async (id: string): Promise<SocietyDocument> => {
    const { data } = await api.patch<SocietyDocument>(`/documents/${id}/approve`);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/documents/${id}`);
  },
  getFileUrl: (path: string): string => {
    return BASE_URL.replace('/api', '') + path;
  },
};

// ── Complaints ──
export const complaintsAPI = {
  list: async (status?: string, category?: string): Promise<Complaint[]> => {
    const params: any = {};
    if (status) params.status = status;
    if (category) params.category = category;
    const { data } = await api.get<Complaint[]>('/complaints/', { params });
    return data;
  },
  get: async (id: string): Promise<Complaint> => {
    const { data } = await api.get<Complaint>(`/complaints/${id}`);
    return data;
  },
  create: async (complaint: ComplaintCreate): Promise<Complaint> => {
    const { data } = await api.post<Complaint>('/complaints/', complaint);
    return data;
  },
  update: async (id: string, updates: { status?: string; admin_notes?: string }): Promise<Complaint> => {
    const { data } = await api.patch<Complaint>(`/complaints/${id}`, updates);
    return data;
  },
  // Comments (V2)
  listComments: async (id: string): Promise<ComplaintComment[]> => {
    const { data } = await api.get<ComplaintComment[]>(`/complaints/${id}/comments`);
    return data;
  },
  addComment: async (id: string, message: string): Promise<ComplaintComment> => {
    const { data } = await api.post<ComplaintComment>(`/complaints/${id}/comments`, { message });
    return data;
  },
  uploadImage: async (id: string, uri: string): Promise<{ image_path: string }> => {
    const formData = new FormData();
    formData.append('file', { uri, name: 'image.jpg', type: 'image/jpeg' } as any);
    const { data } = await api.post(`/complaints/${id}/upload-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};

// ── Polls ──
export const pollsAPI = {
  list: async (): Promise<Poll[]> => {
    const { data } = await api.get<Poll[]>('/polls/');
    return data;
  },
  get: async (id: string): Promise<Poll> => {
    const { data } = await api.get<Poll>(`/polls/${id}`);
    return data;
  },
  create: async (poll: PollCreate): Promise<Poll> => {
    const { data } = await api.post<Poll>('/polls/', poll);
    return data;
  },
  vote: async (pollId: string, optionId: string): Promise<void> => {
    await api.post(`/polls/${pollId}/vote`, { option_id: optionId });
  },
  close: async (pollId: string): Promise<void> => {
    await api.put(`/polls/${pollId}/close`);
  },
  delete: async (pollId: string): Promise<void> => {
    await api.delete(`/polls/${pollId}`);
  },
};

// ── Reimbursements ──
export const reimbursementsAPI = {
  list: async (): Promise<ReimbursementRequest[]> => {
    const { data } = await api.get<ReimbursementRequest[]>('/reimbursements/');
    return data;
  },
  get: async (id: string): Promise<ReimbursementRequest> => {
    const { data } = await api.get<ReimbursementRequest>(`/reimbursements/${id}`);
    return data;
  },
  create: async (req: ReimbursementCreate): Promise<ReimbursementRequest> => {
    const { data } = await api.post<ReimbursementRequest>('/reimbursements/', req);
    return data;
  },
  review: async (id: string, updates: { status?: string; approved_amount?: number; admin_notes?: string }): Promise<ReimbursementRequest> => {
    const { data } = await api.patch<ReimbursementRequest>(`/reimbursements/${id}`, updates);
    return data;
  },
  markPaid: async (id: string, payment: { amount: number; payment_method: string; transaction_ref?: string; payment_date: string }) => {
    const { data } = await api.post(`/reimbursements/${id}/pay`, { request_id: id, ...payment });
    return data;
  },
  uploadReceipt: async (id: string, uri: string) => {
    const formData = new FormData();
    formData.append('file', { uri, name: 'receipt.jpg', type: 'image/jpeg' } as any);
    const { data } = await api.post(`/reimbursements/${id}/upload-receipt`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};

// ── Notifications ──
export const notificationsAPI = {
  list: async (): Promise<Notification[]> => {
    const { data } = await api.get<Notification[]>('/notifications/');
    return data;
  },
  unreadCount: async (): Promise<number> => {
    const { data } = await api.get<{ count: number }>('/notifications/unread-count');
    return data.count;
  },
  markRead: async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
  },
  markAllRead: async () => {
    await api.patch('/notifications/read-all');
  },
  clearAll: async () => {
    await api.delete('/notifications/clear');
  },
};

// ── Announcements (V2) ──
export const announcementsAPI = {
  list: async (): Promise<Announcement[]> => {
    const { data } = await api.get<Announcement[]>('/announcements/');
    return data;
  },
  create: async (ann: AnnouncementCreate, attachmentUri?: string): Promise<Announcement> => {
    const formData = new FormData();
    formData.append('title', ann.title);
    formData.append('body', ann.body);
    formData.append('priority', ann.priority || 'normal');
    formData.append('pinned', String(ann.pinned || false));

    if (attachmentUri) {
      const ext = attachmentUri.split('.').pop()?.toLowerCase() || 'pdf';
      const type = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
        ? `image/${ext === 'jpg' ? 'jpeg' : ext}`
        : 'application/pdf';
      formData.append('attachment', { uri: attachmentUri, name: `attachment.${ext}`, type } as any);
    }

    const { data } = await api.post<Announcement>('/announcements/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  delete: async (id: string) => {
    await api.delete(`/announcements/${id}`);
  },
  togglePin: async (id: string): Promise<{ pinned: boolean }> => {
    const { data } = await api.patch<{ pinned: boolean }>(`/announcements/${id}/pin`);
    return data;
  },
  update: async (id: string, updates: { title?: string; body?: string; priority?: string }): Promise<Announcement> => {
    const { data } = await api.put<Announcement>(`/announcements/${id}`, updates);
    return data;
  },
  getAttachmentUrl: (path: string): string => {
    return BASE_URL.replace('/api', '') + path;
  },
};

// ── Residents (V2) ──
export const residentsAPI = {
  list: async (): Promise<ResidentInfo[]> => {
    const { data } = await api.get<ResidentInfo[]>('/residents/');
    return data;
  },
  stats: async (): Promise<ResidentStats> => {
    const { data } = await api.get<ResidentStats>('/residents/stats');
    return data;
  },
  setCommittee: async (userId: string, isCommittee: boolean, role?: string): Promise<any> => {
    const { data } = await api.put(`/residents/${userId}/committee`, { is_committee: isCommittee, committee_role: role });
    return data;
  },
};

// ── Dashboard (V2) ──
export const dashboardAPI = {
  stats: async (): Promise<DashboardStats> => {
    const { data } = await api.get<DashboardStats>('/dashboard/stats');
    return data;
  },
};

// ── Society (V2) ──
export const societyAPI = {
  getInfo: async (): Promise<SocietyInfoItem[]> => {
    const { data } = await api.get<SocietyInfoItem[]>('/society/info');
    return data;
  },
  updateInfo: async (key: string, value: string) => {
    await api.put('/society/info', { key, value });
  },
  getEmergencyContacts: async (): Promise<EmergencyContact[]> => {
    const { data } = await api.get<EmergencyContact[]>('/society/emergency-contacts');
    return data;
  },
  createEmergencyContact: async (contact: { name: string; phone: string; role: string }): Promise<EmergencyContact> => {
    const { data } = await api.post<EmergencyContact>('/society/emergency-contacts', contact);
    return data;
  },
  deleteEmergencyContact: async (id: string) => {
    await api.delete(`/society/emergency-contacts/${id}`);
  },
  listSocieties: async (): Promise<Society[]> => {
    const { data } = await api.get<Society[]>('/society/');
    return data;
  },
  listFlatsForSociety: async (societyId: string): Promise<SocietyFlatSummary[]> => {
    const { data } = await api.get<SocietyFlatSummary[]>(`/society/${societyId}/flats`);
    return data;
  },
};

// ── Onboarding (V2) ──
export const onboardingAPI = {
  joinSociety: async (payload: {
    society_id: string;
    flat_id: string;
    resident_type: string;
    aadhar_number?: string;
    pan_number?: string;
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

// ── Flats ──
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

export default api;
