import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

type Listener = (toasts: ToastItem[]) => void;
let listeners: Listener[] = [];
let toastsStore: ToastItem[] = [];

const notify = () => {
  listeners.forEach((l) => l([...toastsStore]));
};

export const toast = {
  show: (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    toastsStore = [...toastsStore, { id, type, message }];
    notify();
    setTimeout(() => {
      toast.dismiss(id);
    }, 3500);
  },
  success: (msg: string) => toast.show(msg, 'success'),
  error: (msg: string) => toast.show(msg, 'error'),
  info: (msg: string) => toast.show(msg, 'info'),
  warning: (msg: string) => toast.show(msg, 'warning'),
  dismiss: (id: string) => {
    toastsStore = toastsStore.filter((t) => t.id !== id);
    notify();
  },
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (newToasts: ToastItem[]) => setToasts(newToasts);
    listeners.push(handler);
    return () => {
      listeners = listeners.filter((l) => l !== handler);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((t) => {
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center justify-between gap-3 p-3.5 bg-slate-900/95 backdrop-blur-md text-white rounded-xl shadow-2xl border border-slate-800 text-xs font-medium animate-in slide-in-from-top-3 fade-in duration-200"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {t.type === 'success' && <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />}
              {t.type === 'error' && <XCircle size={18} className="text-red-400 shrink-0" />}
              {t.type === 'info' && <Info size={18} className="text-indigo-400 shrink-0" />}
              {t.type === 'warning' && <AlertTriangle size={18} className="text-amber-400 shrink-0" />}
              <span className="truncate leading-relaxed text-slate-200">{t.message}</span>
            </div>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
