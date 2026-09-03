import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import SuccessTickOverlay from '../../../components/SuccessTickOverlay';

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
  setPollOptions: React.Dispatch<React.SetStateAction<string[]>>;
  isSuccess?: boolean;
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
  pollOptions,
  setPollOptions,
  isSuccess = false,
}) => {
  if (!isOpen) return null;

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...pollOptions];
    updated[index] = value;
    setPollOptions(updated);
  };

  const handleRemoveOption = (index: number) => {
    if (pollOptions.length <= 2) return;
    setPollOptions(pollOptions.filter((_, i) => i !== index));
  };

  const handleAddOption = () => {
    setPollOptions([...pollOptions, '']);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto relative">
        <SuccessTickOverlay show={isSuccess} message="Survey Poll Launched!" />

        <h3 className="font-bold text-slate-800 text-lg">Launch Opinion Poll</h3>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Poll Question</label>
          <input
            type="text"
            required
            value={pollTitle}
            onChange={(e) => setPollTitle(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Paint society walls next month?"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Context Description</label>
          <textarea
            value={pollDesc}
            onChange={(e) => setPollDesc(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={2}
            placeholder="Explain options/decisions..."
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Close Deadline Date</label>
          <input
            type="date"
            required
            value={pollDeadline}
            onChange={(e) => setPollDeadline(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="space-y-2 pt-1">
          <div className="flex justify-between items-center">
            <label className="block text-xs font-semibold text-slate-600">Voting Options</label>
            <span className="text-[10px] text-slate-400">At least 2 required</span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto p-1">
            {pollOptions.map((option, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  value={option}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={`Option ${idx + 1}`}
                />
                <button
                  type="button"
                  disabled={pollOptions.length <= 2}
                  onClick={() => handleRemoveOption(idx)}
                  className="p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors shrink-0"
                  title="Remove Option"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddOption}
            className="flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline pt-1"
          >
            <Plus size={14} /> Add Option
          </button>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs transition-colors">
            Launch Poll
          </button>
          <button type="button" onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg text-xs transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePollModal;
