import api, { BASE_URL } from './client';
import type {
  Bill,
  BillCreate,
  BillPayment,
  PayBillRequest,
  BillResidentStatus,
  FlatAmountOverride,
  FlatAmountOverrideOut,
} from '../../types';

export const billsAPI = {
  list: async (billType?: string, activeOnly?: boolean): Promise<Bill[]> => {
    const params: Record<string, string | boolean> = {};
    if (billType) params.bill_type = billType;
    if (activeOnly !== undefined) params.active_only = activeOnly;
    const { data } = await api.get<Bill[]>('/bills/', { params });
    return data;
  },
  get: async (id: string): Promise<Bill> => {
    const { data } = await api.get<Bill>(`/bills/${encodeURIComponent(id)}`);
    return data;
  },
  getResidentStatus: async (id: string): Promise<BillResidentStatus[]> => {
    const { data } = await api.get<BillResidentStatus[]>(`/bills/${encodeURIComponent(id)}/residents`);
    return data;
  },
  getFlatOverrides: async (id: string): Promise<FlatAmountOverrideOut[]> => {
    const { data } = await api.get<FlatAmountOverrideOut[]>(`/bills/${encodeURIComponent(id)}/overrides`);
    return data;
  },
  updateFlatOverrides: async (id: string, overrides: FlatAmountOverride[]): Promise<Bill> => {
    const { data } = await api.put<Bill>(`/bills/${encodeURIComponent(id)}`, { flat_overrides: overrides });
    return data;
  },
  create: async (bill: BillCreate): Promise<Bill> => {
    const { data } = await api.post<Bill>('/bills', bill);
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
  update: async (id: string, updates: Partial<BillCreate> & { is_active?: boolean }): Promise<Bill> => {
    const { data } = await api.put<Bill>(`/bills/${encodeURIComponent(id)}`, updates);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/bills/${encodeURIComponent(id)}`);
  },
  uploadReceipt: async (paymentId: string, file: File): Promise<{ receipt_path: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post(`/bills/${encodeURIComponent(paymentId)}/upload-receipt`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  getReceiptUrl: (paymentId: string): string => {
    return `${BASE_URL}/bills/${encodeURIComponent(paymentId)}/receipt`;
  },
  getExportReportUrl: (): string => {
    return `${BASE_URL}/bills/export-report`;
  },
  getExportDuesCsvUrl: (): string => {
    return `${BASE_URL}/bills/export-dues-csv`;
  },
  getExportPaymentsCsvUrl: (): string => {
    return `${BASE_URL}/bills/payments/export-csv`;
  },
  createRazorpayOrder: async (billId: string): Promise<{
    razorpay_order_id: string; amount: number; amount_paise: number;
    currency: string; key_id: string;
  }> => {
    const { data } = await api.post(`/bills/${encodeURIComponent(billId)}/create-razorpay-order`);
    return data;
  },
  verifyRazorpayPayment: async (billId: string, payload: {
    razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string;
  }): Promise<BillPayment> => {
    const { data } = await api.post<BillPayment>(`/bills/${encodeURIComponent(billId)}/verify-razorpay-payment`, payload);
    return data;
  },
};
