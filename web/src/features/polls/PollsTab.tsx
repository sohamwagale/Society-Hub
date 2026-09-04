import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../store';
import CreatePollModal from './components/CreatePollModal';
import { toast } from '../../components/Toast';
import { confirmDialog } from '../../components/ConfirmModal';
import {
  usePollsQuery,
  useCreatePollMutation,
  useVotePollMutation,
  useClosePollMutation,
  useDeletePollMutation,
} from '../../hooks/queries/usePolls';

export const PollsTab: React.FC = () => {
  const { user } = useAuthStore();
  const { data: polls = [] } = usePollsQuery();
  const createPollMutation = useCreatePollMutation();
  const votePollMutation = useVotePollMutation();
  const closePollMutation = useClosePollMutation();
  const deletePollMutation = useDeletePollMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form state
  const [pollTitle, setPollTitle] = useState('');
  const [pollDesc, setPollDesc] = useState('');
  const [pollDeadline, setPollDeadline] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['Yes', 'No']);

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = pollOptions.map((opt) => opt.trim()).filter((opt) => opt.length > 0);
    if (validOptions.length < 2) {
      toast.warning('Please provide at least 2 valid poll options.');
      return;
    }
    try {
      await createPollMutation.mutateAsync({
        title: pollTitle,
        description: pollDesc || undefined,
        deadline: pollDeadline,
        options: validOptions.map((opt) => ({ text: opt })),
      });
      setIsSuccess(true);
      toast.success('Survey launched successfully!');
      setTimeout(() => {
        setIsSuccess(false);
        setIsModalOpen(false);
        setPollTitle('');
        setPollDesc('');
        setPollDeadline('');
        setPollOptions(['Yes', 'No']);
      }, 1000);
    } catch {
      toast.error('Failed to create poll.');
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    try {
      await votePollMutation.mutateAsync({ pollId, optionId });
      toast.success('Vote recorded!');
    } catch {
      toast.error('Failed to register vote.');
    }
  };

  const handleClosePoll = async (id: string) => {
    try {
      await closePollMutation.mutateAsync(id);
      toast.success('Poll closed!');
    } catch {
      toast.error('Failed to close poll.');
    }
  };

  const handleDeletePoll = (id: string) => {
    confirmDialog({
      title: 'Delete Survey Poll?',
      message: 'Are you sure you want to delete this community survey poll?',
      confirmText: 'Delete Poll',
      onConfirm: async () => {
        try {
          await deletePollMutation.mutateAsync(id);
          toast.success('Poll deleted!');
        } catch {
          toast.error('Failed to delete poll.');
        }
      },
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 font-sans">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">Democratic Community Polls</h3>
          <p className="text-slate-500 text-xs mt-1">Cast opinions on active surveys, or check finished voting logs.</p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Plus size={16} /> Launch Poll
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {polls.length === 0 ? (
          <p className="col-span-full text-slate-400 text-sm text-center py-12">No community surveys listed.</p>
        ) : (
          polls.map((poll) => {
            const totalVotes = poll.options.reduce((acc, curr) => acc + curr.vote_count, 0);
            return (
              <div
                key={poll.id}
                className="p-5 border border-slate-200 rounded-xl bg-slate-50/20 relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                        poll.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {poll.is_active ? 'Active' : 'Closed'}
                    </span>
                    {user?.role === 'admin' && (
                      <div className="flex gap-2">
                        {poll.is_active && (
                          <button
                            onClick={() => handleClosePoll(poll.id)}
                            className="text-xs text-amber-500 font-bold hover:underline"
                          >
                            Close
                          </button>
                        )}
                        <button onClick={() => handleDeletePoll(poll.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  <h4 className="font-bold text-slate-800 text-lg mt-3">{poll.title}</h4>
                  <p className="text-slate-500 text-xs mt-1">{poll.description || 'Survey for society feedback.'}</p>

                  <div className="mt-5 space-y-3">
                    {poll.options.map((opt) => {
                      const percent = totalVotes > 0 ? Math.round((opt.vote_count / totalVotes) * 100) : 0;
                      return (
                        <div key={opt.id} className="space-y-1 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-700">{opt.text}</span>
                            <span className="text-slate-500 text-[10px]">
                              {opt.vote_count} votes ({percent}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                            <div className="bg-indigo-600 h-full" style={{ width: `${percent}%` }}></div>
                          </div>
                          {poll.is_active && !poll.user_voted && (
                            <button
                              onClick={() => handleVote(poll.id, opt.id)}
                              className="text-[9px] text-indigo-600 font-bold hover:underline block pt-0.5"
                            >
                              Cast Vote
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-200/50 flex justify-between items-center text-[10px] text-slate-400">
                  <span>Deadline: {new Date(poll.deadline).toLocaleDateString()}</span>
                  <span>Total votes: {totalVotes}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <CreatePollModal
        isOpen={isModalOpen}
        isSuccess={isSuccess}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreatePoll}
        pollTitle={pollTitle}
        setPollTitle={setPollTitle}
        pollDesc={pollDesc}
        setPollDesc={setPollDesc}
        pollDeadline={pollDeadline}
        setPollDeadline={setPollDeadline}
        pollOptions={pollOptions}
        setPollOptions={setPollOptions}
      />
    </div>
  );
};

export default PollsTab;
