import React from 'react';
import SuccessTickOverlay from '../../../components/SuccessTickOverlay';

interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  title: string;
  setTitle: (val: string) => void;
  body: string;
  setBody: (val: string) => void;
  priority: 'normal' | 'important' | 'urgent';
  setPriority: (val: 'normal' | 'important' | 'urgent') => void;
  setFile: (file: File | null) => void;
  isSuccess?: boolean;
}

export const CreateAnnouncementModal: React.FC<CreateAnnouncementModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  setTitle,
  body,
  setBody,
  priority,
  setPriority,
  setFile,
  isSuccess = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4 relative overflow-hidden">
        <SuccessTickOverlay show={isSuccess} message="Announcement Broadcasted!" />

        <h3 className="font-bold text-slate-800 text-lg">Broadcast Announcement</h3>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Notice Headline</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            placeholder="Urgent Water Shutdown"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Notice Details</label>
          <textarea
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            rows={4}
            placeholder="Description..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Priority Weight</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Attachment File</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full border border-slate-300 rounded-lg p-1 text-xs bg-white"
            />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs transition-colors">
            Send Broadcast
          </button>
          <button type="button" onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg text-xs transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateAnnouncementModal;
