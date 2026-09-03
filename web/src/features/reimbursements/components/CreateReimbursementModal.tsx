import React from 'react';
import SuccessTickOverlay from '../../../components/SuccessTickOverlay';

interface CreateReimbursementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  reimbTitle: string;
  setReimbTitle: (val: string) => void;
  reimbDesc: string;
  setReimbDesc: (val: string) => void;
  reimbAmount: number;
  setReimbAmount: (val: number) => void;
  reimbDate: string;
  setReimbDate: (val: string) => void;
  reimbCategory: string;
  setReimbCategory: (val: string) => void;
  reimbPaymentAddress: string;
  setReimbPaymentAddress: (val: string) => void;
  setReimbFile: (file: File | null) => void;
  isSuccess?: boolean;
}

export const CreateReimbursementModal: React.FC<CreateReimbursementModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  reimbTitle,
  setReimbTitle,
  reimbDesc,
  setReimbDesc,
  reimbAmount,
  setReimbAmount,
  reimbDate,
  setReimbDate,
  reimbCategory,
  setReimbCategory,
  reimbPaymentAddress,
  setReimbPaymentAddress,
  setReimbFile,
  isSuccess = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto relative">
        <SuccessTickOverlay show={isSuccess} message="Reimbursement Claim Submitted!" />

        <h3 className="font-bold text-slate-800 text-lg">File Payout Claim</h3>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Claim Title</label>
          <input
            type="text"
            required
            value={reimbTitle}
            onChange={(e) => setReimbTitle(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Purchased Corridor Bulbs"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Claim Justification</label>
          <textarea
            required
            value={reimbDesc}
            onChange={(e) => setReimbDesc(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={2}
            placeholder="Explain why this expense was made..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Amount Claimed (₹)</label>
            <input
              type="number"
              required
              min="0"
              placeholder="0"
              value={reimbAmount || ''}
              onChange={(e) => setReimbAmount(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Date of Purchase</label>
            <input
              type="date"
              required
              value={reimbDate}
              onChange={(e) => setReimbDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Payment UPI ID / Phone Number (Optional)</label>
          <input
            type="text"
            value={reimbPaymentAddress}
            onChange={(e) => setReimbPaymentAddress(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="john@upi or 9876543210"
          />
          <p className="text-[10px] text-slate-400 mt-1">Admin will use this UPI ID / Phone to transfer your reimbursement.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
            <select
              value={reimbCategory}
              onChange={(e) => setReimbCategory(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="plumbing">Plumbing</option>
              <option value="electrical">Electrical</option>
              <option value="cleaning">Cleaning</option>
              <option value="maintenance">Maintenance</option>
              <option value="event">Event Organization</option>
              <option value="other">Other Stuff</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Receipt Invoice File</label>
            <input
              type="file"
              onChange={(e) => setReimbFile(e.target.files?.[0] || null)}
              className="w-full border border-slate-300 rounded-lg p-1.5 text-xs bg-white"
            />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs transition-colors">
            Submit Claim
          </button>
          <button type="button" onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg text-xs transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateReimbursementModal;
