import React from 'react';
import SuccessTickOverlay from '../../../components/SuccessTickOverlay';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  expenseTitle: string;
  setExpenseTitle: (val: string) => void;
  expenseDesc: string;
  setExpenseDesc: (val: string) => void;
  expenseAmount: number;
  setExpenseAmount: (val: number) => void;
  expenseDate: string;
  setExpenseDate: (val: string) => void;
  setExpenseFile: (file: File | null) => void;
  isSuccess?: boolean;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  expenseTitle,
  setExpenseTitle,
  expenseDesc,
  setExpenseDesc,
  expenseAmount,
  setExpenseAmount,
  expenseDate,
  setExpenseDate,
  setExpenseFile,
  isSuccess = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4 relative overflow-hidden">
        <SuccessTickOverlay show={isSuccess} message="Society Expense Logged!" />

        <h3 className="font-bold text-slate-800 text-lg">Log Society Expense</h3>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Expense Title</label>
          <input
            type="text"
            required
            value={expenseTitle}
            onChange={(e) => setExpenseTitle(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            placeholder="Lift Maintenance Services"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
          <textarea
            value={expenseDesc}
            onChange={(e) => setExpenseDesc(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            rows={2}
            placeholder="Details..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Amount Spent (₹)</label>
            <input
              type="number"
              required
              min="0"
              placeholder="0"
              value={expenseAmount || ''}
              onChange={(e) => setExpenseAmount(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Spend Date</label>
            <input
              type="date"
              required
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Voucher Invoice File</label>
          <input
            type="file"
            onChange={(e) => setExpenseFile(e.target.files?.[0] || null)}
            className="w-full border border-slate-300 rounded-lg p-1.5 text-xs bg-white"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs transition-colors">
            Record Expense
          </button>
          <button type="button" onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg text-xs transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddExpenseModal;
