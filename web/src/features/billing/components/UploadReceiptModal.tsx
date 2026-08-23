import React from 'react';

interface UploadReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  setBillReceiptFile: (file: File | null) => void;
}

export const UploadReceiptModal: React.FC<UploadReceiptModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  setBillReceiptFile
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4">
        <h3 className="font-bold text-slate-800 text-lg">Upload manual Receipt / Proof</h3>
        <p className="text-xs text-slate-500">
          Attach the photo/PDF of your physical payment voucher or bank transfer receipt for verification.
        </p>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Voucher Receipt File</label>
          <input
            type="file"
            required
            onChange={(e) => setBillReceiptFile(e.target.files?.[0] || null)}
            className="w-full border border-slate-300 rounded-lg p-1.5 text-xs bg-white"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs">
            Submit Receipt
          </button>
          <button type="button" onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg text-xs">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default UploadReceiptModal;
