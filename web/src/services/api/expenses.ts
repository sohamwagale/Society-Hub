import api, { BASE_URL, tokenStorage } from './client';
import type { SocietyExpense, SocietyExpenseCreate } from '../../types';

export const expensesAPI = {
  list: async (sortBy = 'date_desc'): Promise<SocietyExpense[]> => {
    const { data } = await api.get<SocietyExpense[]>('/expenses/', { params: { sort_by: sortBy } });
    return data;
  },
  get: async (id: string): Promise<SocietyExpense> => {
    const { data } = await api.get<SocietyExpense>(`/expenses/${encodeURIComponent(id)}`);
    return data;
  },
  create: async (expense: SocietyExpenseCreate, file?: File): Promise<SocietyExpense> => {
    const formData = new FormData();
    formData.append('title', expense.title);
    formData.append('amount', String(expense.amount));
    formData.append('expense_date', expense.expense_date);
    if (expense.description) formData.append('description', expense.description);
    if (file) {
      formData.append('document', file);
    }
    const { data } = await api.post<SocietyExpense>('/expenses/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  getDocumentUrl: (path: string): string => {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return BASE_URL.replace('/api', '') + path;
  },
  getExportCsvUrl: (): string => {
    const token = tokenStorage.get();
    return `${BASE_URL}/expenses/export-csv?token=${encodeURIComponent(token || '')}`;
  },
};
