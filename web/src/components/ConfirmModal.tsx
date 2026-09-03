import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void | Promise<void>;
}

interface ConfirmItem extends ConfirmOptions {
  id: string;
}

type Listener = (item: ConfirmItem | null) => void;
let listener: Listener | null = null;
let currentConfirm: ConfirmItem | null = null;

export const confirmDialog = (options: ConfirmOptions) => {
  currentConfirm = {
    ...options,
    id: Math.random().toString(36).substring(2, 9),
  };
  if (listener) listener(currentConfirm);
};

export const ConfirmContainer: React.FC = () => {
  const [confirmState, setConfirmState] = useState<ConfirmItem | null>(null);

  useEffect(() => {
    listener = (item) => setConfirmState(item);
    return () => {
      listener = null;
    };
  }, []);

  if (!confirmState) return null;

  const handleClose = () => {
    setConfirmState(null);
    currentConfirm = null;
  };

  const handleConfirm = async () => {
    const action = confirmState.onConfirm;
    handleClose();
    await action();
  };

  const variant = confirmState.variant || 'danger';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-sm flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-200">
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md ${
            variant === 'danger'
              ? 'bg-red-100 text-red-600 border border-red-200/60'
              : variant === 'warning'
              ? 'bg-amber-100 text-amber-600 border border-amber-200/60'
              : 'bg-indigo-100 text-indigo-600 border border-indigo-200/60'
          }`}
        >
          {variant === 'danger' ? <Trash2 size={26} /> : <AlertTriangle size={26} />}
        </div>

        <div>
          <h3 className="font-bold text-slate-800 text-lg tracking-tight">
            {confirmState.title || 'Are you sure?'}
          </h3>
          <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">{confirmState.message}</p>
        </div>

        <div className="flex gap-3 w-full pt-2">
          <button
            onClick={handleConfirm}
            className={`flex-1 font-bold py-2.5 rounded-xl text-xs text-white shadow-md transition-colors ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : variant === 'warning'
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {confirmState.confirmText || (variant === 'danger' ? 'Delete' : 'Confirm')}
          </button>
          <button
            onClick={handleClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-xs transition-colors"
          >
            {confirmState.cancelText || 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmContainer;
