import React from 'react';

interface EditSocietyInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  editInfoKey: string;
  editInfoValue: string;
  setEditInfoValue: (val: string) => void;
}

export const EditSocietyInfoModal: React.FC<EditSocietyInfoModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editInfoKey,
  editInfoValue,
  setEditInfoValue
}) => {
  if (!isOpen) return null;

  const formatKey = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4">
        <h3 className="font-bold text-slate-800 text-lg">Modify {formatKey(editInfoKey)}</h3>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Updated Value</label>
          <textarea
            required
            value={editInfoValue}
            onChange={(e) => setEditInfoValue(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            rows={3}
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs">
            Save Changes
          </button>
          <button type="button" onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg text-xs">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditSocietyInfoModal;
