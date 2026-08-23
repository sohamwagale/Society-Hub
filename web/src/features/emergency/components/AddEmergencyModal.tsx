import React from 'react';

interface AddEmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  emergName: string;
  setEmergName: (val: string) => void;
  emergPhone: string;
  setEmergPhone: (val: string) => void;
  emergRole: string;
  setEmergRole: (val: string) => void;
}

export const AddEmergencyModal: React.FC<AddEmergencyModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  emergName,
  setEmergName,
  emergPhone,
  setEmergPhone,
  emergRole,
  setEmergRole
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4">
        <h3 className="font-bold text-slate-800 text-lg">Add Emergency Contact</h3>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Name</label>
          <input
            type="text"
            required
            value={emergName}
            onChange={(e) => setEmergName(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            placeholder="Gate Security Desk"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Telephone Number</label>
            <input
              type="text"
              required
              value={emergPhone}
              onChange={(e) => setEmergPhone(e.target.value.replace(/\D/g, ''))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              placeholder="9876543210"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Role Type</label>
            <input
              type="text"
              required
              value={emergRole}
              onChange={(e) => setEmergRole(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              placeholder="security, board, plumber"
            />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs">
            Add Contact
          </button>
          <button type="button" onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg text-xs">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddEmergencyModal;
