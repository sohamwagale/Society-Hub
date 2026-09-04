import api from './client';
import type { Poll, PollCreate } from '../../types';

export const pollsAPI = {
  list: async (): Promise<Poll[]> => {
    const { data } = await api.get<Poll[]>('/polls/');
    return data;
  },
  get: async (id: string): Promise<Poll> => {
    const { data } = await api.get<Poll>(`/polls/${encodeURIComponent(id)}`);
    return data;
  },
  create: async (poll: PollCreate): Promise<Poll> => {
    const { data } = await api.post<Poll>('/polls/', poll);
    return data;
  },
  vote: async (pollId: string, optionId: string): Promise<void> => {
    await api.post(`/polls/${encodeURIComponent(pollId)}/vote`, { option_id: optionId });
  },
  close: async (pollId: string): Promise<void> => {
    await api.put(`/polls/${encodeURIComponent(pollId)}/close`);
  },
  delete: async (pollId: string): Promise<void> => {
    await api.delete(`/polls/${encodeURIComponent(pollId)}`);
  },
};
