import React from 'react';

interface AddSocietyInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  newInfoKey: string;
  setNewInfoKey: (val: string) => void;
  newInfoValue: string;
  setNewInfoValue: (val: string) => void;
}

export const AddSocietyInfoModal: React.FC<AddSocietyInfoModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  newInfoKey,
  setNewInfoKey,
  newInfoValue,
  setNewInfoValue
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4">
        <h3 className="font-bold text-slate-800 text-lg">New Society Attribute</h3>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Parameter Descriptor (e.g. GST Number)</label>
          <input
            type="text"
            required
            value={newInfoKey}
            onChange={(e) => setNewInfoKey(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            placeholder="GST Number"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Value</label>
          <textarea
            required
            value={newInfoValue}
            onChange={(e) => setNewInfoValue(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            rows={2}
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs">
            Commit Record
          </button>
          <button type="button" onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg text-xs">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddSocietyInfoModal;
