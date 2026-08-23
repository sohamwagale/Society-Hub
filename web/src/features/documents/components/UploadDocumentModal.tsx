import React from 'react';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  docTitle: string;
  setDocTitle: (val: string) => void;
  docDesc: string;
  setDocDesc: (val: string) => void;
  setDocFile: (file: File | null) => void;
}

export const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  docTitle,
  setDocTitle,
  docDesc,
  setDocDesc,
  setDocFile
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4">
        <h3 className="font-bold text-slate-800 text-lg">Upload Archive Document</h3>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Document Title</label>
          <input
            type="text"
            required
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            placeholder="AGM Meeting Minutes 2026"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Brief Description</label>
          <textarea
            value={docDesc}
            onChange={(e) => setDocDesc(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            rows={2}
            placeholder="Description..."
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Select File (PDF / Image)</label>
          <input
            type="file"
            required
            onChange={(e) => setDocFile(e.target.files?.[0] || null)}
            className="w-full border border-slate-300 rounded-lg p-1.5 text-xs bg-white"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs">
            Upload File
          </button>
          <button type="button" onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg text-xs">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default UploadDocumentModal;
