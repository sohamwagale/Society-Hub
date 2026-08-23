import React from 'react';
import type { BillCreate, BillType } from '../../../types';

interface CreateBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  newBill: BillCreate;
  setNewBill: React.Dispatch<React.SetStateAction<BillCreate>> | ((val: any) => void);
}

export const CreateBillModal: React.FC<CreateBillModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  newBill,
  setNewBill
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4">
        <h3 className="font-bold text-slate-800 text-lg">Generate Billing Cycle</h3>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Cycle Title</label>
          <input
            type="text"
            required
            value={newBill.title}
            onChange={(e) => setNewBill({ ...newBill, title: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            placeholder="Jan 2026 Maintenance"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
          <textarea
            value={newBill.description}
            onChange={(e) => setNewBill({ ...newBill, description: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            rows={2}
            placeholder="Description..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Base Amount (₹)</label>
            <input
              type="number"
              required
              value={newBill.amount}
              onChange={(e) => setNewBill({ ...newBill, amount: parseInt(e.target.value) || 0 })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
            <select
              value={newBill.bill_type}
              onChange={(e) => setNewBill({ ...newBill, bill_type: e.target.value as BillType })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="maintenance">Maintenance</option>
              <option value="extra">Extra Charge</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Due Date</label>
          <input
            type="date"
            required
            value={newBill.due_date}
            onChange={(e) => setNewBill({ ...newBill, due_date: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs">
            Generate
          </button>
          <button type="button" onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg text-xs">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateBillModal;
