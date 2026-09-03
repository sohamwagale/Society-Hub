import React, { useState, useEffect } from 'react';
import { Plus, HelpCircle, X } from 'lucide-react';
import type { Complaint, ComplaintComment } from '../../types';
import { complaintsAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import CreateComplaintModal from './components/CreateComplaintModal';
import { toast } from '../../components/Toast';

export const ComplaintsTab: React.FC = () => {
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [comments, setComments] = useState<ComplaintComment[]>([]);
  const [commentInput, setCommentInput] = useState('');

  // Modal form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [complaintCategory, setComplaintCategory] = useState<string>('plumbing');
  const [complaintTitle, setComplaintTitle] = useState('');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [complaintFile, setComplaintFile] = useState<File | null>(null);

  const loadComplaints = async () => {
    try {
      const list = await complaintsAPI.list();
      setComplaints(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, []);

  // Sync comments thread when active complaint opens
  useEffect(() => {
    if (selectedComplaint) {
      complaintsAPI
        .listComments(selectedComplaint.id)
        .then(setComments)
        .catch(console.error);
    }
  }, [selectedComplaint]);

  const handleRaiseComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const complaint = await complaintsAPI.create({
        category: complaintCategory as any,
        title: complaintTitle,
        description: complaintDesc,
      });

      if (complaintFile) {
        await complaintsAPI.uploadImage(complaint.id, complaintFile);
      }

      setIsSuccess(true);
      toast.success('Grievance logged successfully!');
      setTimeout(() => {
        setIsSuccess(false);
        setIsModalOpen(false);
        setComplaintTitle('');
        setComplaintDesc('');
        setComplaintFile(null);
        loadComplaints();
      }, 1000);
    } catch (e) {
      toast.error('Failed to register complaint.');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !selectedComplaint) return;
    try {
      const c = await complaintsAPI.addComment(selectedComplaint.id, commentInput);
      setComments([...comments, c]);
      setCommentInput('');
      toast.success('Comment posted!');
    } catch (e) {
      toast.error('Failed to submit comment.');
    }
  };

  const handleUpdateComplaintStatus = async (status: 'in_progress' | 'resolved') => {
    if (!selectedComplaint) return;
    try {
      const updated = await complaintsAPI.update(selectedComplaint.id, {
        status,
      });
      setSelectedComplaint(updated);
      toast.success(`Status updated to ${status.replace('_', ' ')}!`);
      loadComplaints();
    } catch (e) {
      toast.error('Failed to update ticket status.');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">Helpdesk Grievances</h3>
          <p className="text-slate-500 text-xs mt-1">
            Submit support tickets, communicate with board members, or manage status.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <Plus size={16} /> Raise Ticket
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {complaints.length === 0 ? (
            <p className="text-slate-400 text-sm py-12 text-center">No active complaints logged.</p>
          ) : (
            complaints.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedComplaint(c)}
                className={`p-4 border rounded-xl cursor-pointer transition-all ${
                  selectedComplaint?.id === c.id
                    ? 'border-indigo-600 bg-indigo-50/10'
                    : 'border-slate-200 bg-slate-50/30 hover:border-slate-350'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded uppercase">
                      {c.category}
                    </span>
                    <h4 className="font-bold text-slate-800 text-base mt-2">{c.title}</h4>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      c.status === 'open'
                        ? 'bg-red-100 text-red-700'
                        : c.status === 'in_progress'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {c.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-slate-500 text-xs mt-2 line-clamp-2">{c.description}</p>
                <p className="text-[10px] text-slate-400 mt-3 text-right">
                  Logged on {new Date(c.created_at).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm h-[500px] flex flex-col justify-between">
          {!selectedComplaint ? (
            <div className="text-center py-20">
              <HelpCircle size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-xs text-slate-400 font-medium">
                Select a grievance ticket from the registry to view details and chat thread.
              </p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                <div className="flex justify-between items-start pb-3 border-b border-slate-200">
                  <div>
                    <span className="text-[9px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded uppercase">
                      {selectedComplaint.category}
                    </span>
                    <h4 className="font-bold text-slate-800 text-base mt-2">{selectedComplaint.title}</h4>
                  </div>
                  <button
                    onClick={() => setSelectedComplaint(null)}
                    className="text-slate-400 hover:text-slate-600 text-sm"
                  >
                    <X size={16} />
                  </button>
                </div>

                <p className="text-slate-700 text-xs leading-relaxed">{selectedComplaint.description}</p>

                {selectedComplaint.images && selectedComplaint.images.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Attached Image</p>
                    <a
                      href={complaintsAPI.getImageUrl(selectedComplaint.images[0])}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block border border-slate-200 rounded-lg overflow-hidden max-h-40"
                    >
                      <img
                        src={complaintsAPI.getImageUrl(selectedComplaint.images[0])}
                        alt="evidence"
                        className="w-full h-full object-cover"
                      />
                    </a>
                  </div>
                )}

                {user?.role === 'admin' && (
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs space-y-2 mt-4">
                    <p className="font-bold text-indigo-800">Admin Ticket Management</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateComplaintStatus('in_progress')}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-1.5 px-3 rounded text-xs transition-colors"
                      >
                        In Progress
                      </button>
                      <button
                        onClick={() => handleUpdateComplaintStatus('resolved')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded text-xs transition-colors"
                      >
                        Resolved
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-200">
                  <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Resolution Thread
                  </h5>
                  <div className="space-y-3">
                    {comments.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic">No messages in this thread yet.</p>
                    ) : (
                      comments.map((comm) => (
                        <div key={comm.id} className="p-2 bg-white rounded border border-slate-100">
                          <div className="flex justify-between items-center text-[9px] font-bold text-slate-600">
                            <span>
                              {comm.user_name} ({comm.user_role})
                            </span>
                            <span className="text-slate-400 font-normal">
                              {new Date(comm.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-slate-700 text-xs mt-1">{comm.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <form onSubmit={handleAddComment} className="pt-3 border-t border-slate-200 flex gap-2">
                <input
                  type="text"
                  placeholder="Type resolution comment..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="flex-1 border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-700"
                >
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <CreateComplaintModal
        isOpen={isModalOpen}
        isSuccess={isSuccess}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleRaiseComplaint}
        complaintCategory={complaintCategory}
        setComplaintCategory={setComplaintCategory}
        complaintTitle={complaintTitle}
        setComplaintTitle={setComplaintTitle}
        complaintDesc={complaintDesc}
        setComplaintDesc={setComplaintDesc}
        setComplaintFile={setComplaintFile}
      />
    </div>
  );
};

export default ComplaintsTab;
