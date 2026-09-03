import React from 'react';
import SuccessTickOverlay from '../../../components/SuccessTickOverlay';

interface CreateFlatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  newFlatNumber: string;
  setNewFlatNumber: (val: string) => void;
  newFlatBlock: string;
  setNewFlatBlock: (val: string) => void;
  newFlatFloor: string;
  setNewFlatFloor: (val: string) => void;
  isSuccess?: boolean;
}

export const CreateFlatModal: React.FC<CreateFlatModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  newFlatNumber,
  setNewFlatNumber,
  newFlatBlock,
  setNewFlatBlock,
  newFlatFloor,
  setNewFlatFloor,
  isSuccess = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4 relative overflow-hidden">
        <SuccessTickOverlay show={isSuccess} message="Flat Unit Registered!" />

        <h3 className="font-bold text-slate-800 text-lg">Register Flat Unit Asset</h3>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Flat / Unit Number</label>
          <input
            type="text"
            required
            value={newFlatNumber}
            onChange={(e) => setNewFlatNumber(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            placeholder="402"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Block / Wing</label>
          <input
            type="text"
            required
            value={newFlatBlock}
            onChange={(e) => setNewFlatBlock(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            placeholder="A"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Floor Level</label>
          <input
            type="text"
            required
            value={newFlatFloor}
            onChange={(e) => setNewFlatFloor(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            placeholder="4"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs transition-colors">
            Commit Asset
          </button>
          <button type="button" onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg text-xs transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateFlatModal;
