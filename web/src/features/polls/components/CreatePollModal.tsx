import React from 'react';

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  pollTitle: string;
  setPollTitle: (val: string) => void;
  pollDesc: string;
  setPollDesc: (val: string) => void;
  pollDeadline: string;
  setPollDeadline: (val: string) => void;
  pollOptions: string[];
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  pollTitle,
  setPollTitle,
  pollDesc,
  setPollDesc,
  pollDeadline,
  setPollDeadline,
  pollOptions
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4">
        <h3 className="font-bold text-slate-800 text-lg">Launch Opinion Poll</h3>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Poll Question</label>
          <input
            type="text"
            required
            value={pollTitle}
            onChange={(e) => setPollTitle(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            placeholder="Paint society walls next month?"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Context Description</label>
          <textarea
            value={pollDesc}
            onChange={(e) => setPollDesc(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            rows={2}
            placeholder="Explain options/decisions..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Voting Options</label>
            <input
              type="text"
              disabled
              value={pollOptions.join(', ')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-100 cursor-not-allowed text-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Close Deadline Date</label>
            <input
              type="date"
              required
              value={pollDeadline}
              onChange={(e) => setPollDeadline(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs">
            Launch Poll
          </button>
          <button type="button" onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg text-xs">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePollModal;
