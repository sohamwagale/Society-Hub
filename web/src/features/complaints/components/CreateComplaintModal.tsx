import React from 'react';

interface CreateComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  complaintCategory: string;
  setComplaintCategory: (cat: string) => void;
  complaintTitle: string;
  setComplaintTitle: (val: string) => void;
  complaintDesc: string;
  setComplaintDesc: (val: string) => void;
  setComplaintFile: (file: File | null) => void;
}

export const CreateComplaintModal: React.FC<CreateComplaintModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  complaintCategory,
  setComplaintCategory,
  complaintTitle,
  setComplaintTitle,
  complaintDesc,
  setComplaintDesc,
  setComplaintFile
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4">
        <h3 className="font-bold text-slate-800 text-lg">Raise Grievance Ticket</h3>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
          <select
            value={complaintCategory}
            onChange={(e) => setComplaintCategory(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="plumbing">Plumbing</option>
            <option value="electrical">Electrical</option>
            <option value="cleaning">Cleaning</option>
            <option value="security">Security</option>
            <option value="parking">Parking</option>
            <option value="lift">Lift Issues</option>
            <option value="water supply">Water Supply</option>
            <option value="other">Other Grievances</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Ticket Headline</label>
          <input
            type="text"
            required
            value={complaintTitle}
            onChange={(e) => setComplaintTitle(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            placeholder="Water leakage in restroom"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Grievance Details</label>
          <textarea
            required
            value={complaintDesc}
            onChange={(e) => setComplaintDesc(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            rows={3}
            placeholder="Please provide specific location/details..."
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Evidence File (Image/Photo)</label>
          <input
            type="file"
            onChange={(e) => setComplaintFile(e.target.files?.[0] || null)}
            className="w-full border border-slate-300 rounded-lg p-1.5 text-xs bg-white"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs">
            Raise Ticket
          </button>
          <button type="button" onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg text-xs">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateComplaintModal;
