import React, { useState } from 'react';
import { Plus, Pin, Trash2, Paperclip } from 'lucide-react';
import { announcementsAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import CreateAnnouncementModal from './components/CreateAnnouncementModal';
import { toast } from '../../components/Toast';
import { confirmDialog } from '../../components/ConfirmModal';
import {
  useAnnouncementsQuery,
  useCreateAnnouncementMutation,
  useDeleteAnnouncementMutation,
  useTogglePinAnnouncementMutation,
} from '../../hooks/queries/useAnnouncements';

export const AnnouncementsTab: React.FC = () => {
  const { user } = useAuthStore();
  const { data: announcements = [] } = useAnnouncementsQuery();
  const createAnnouncementMutation = useCreateAnnouncementMutation();
  const deleteAnnouncementMutation = useDeleteAnnouncementMutation();
  const togglePinAnnouncementMutation = useTogglePinAnnouncementMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form state
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annPriority, setAnnPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [annFile, setAnnFile] = useState<File | null>(null);

  const handleBlastAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAnnouncementMutation.mutateAsync({
        ann: {
          title: annTitle,
          body: annBody,
          priority: annPriority,
        },
        file: annFile || undefined,
      });

      setIsSuccess(true);
      toast.success('Announcement broadcasted successfully!');
      setTimeout(() => {
        setIsSuccess(false);
        setIsModalOpen(false);
        setAnnTitle('');
        setAnnBody('');
        setAnnPriority('normal');
        setAnnFile(null);
      }, 1000);
    } catch {
      toast.error('Failed to broadcast notice.');
    }
  };

  const handleTogglePinAnnouncement = async (id: string) => {
    try {
      await togglePinAnnouncementMutation.mutateAsync(id);
      toast.success('Pin status toggled!');
    } catch {
      toast.error('Failed to toggle pin.');
    }
  };

  const handleDeleteAnnouncement = (id: string) => {
    confirmDialog({
      title: 'Delete Announcement?',
      message: 'This announcement notice will be permanently removed from the notice board.',
      confirmText: 'Delete Notice',
      onConfirm: async () => {
        try {
          await deleteAnnouncementMutation.mutateAsync(id);
          toast.success('Announcement deleted!');
        } catch {
          toast.error('Failed to delete announcement.');
        }
      },
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 mb-6">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">Announcements Notice Board</h3>
          <p className="text-slate-500 text-xs mt-1">
            Read noticeboards and priority announcements from society leaders.
          </p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1"
          >
            <Plus size={16} /> Broadcast Notice
          </button>
        )}
      </div>

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <p className="text-center text-slate-400 py-12 text-sm">No notices posted yet.</p>
        ) : (
          announcements.map((ann) => (
            <div
              key={ann.id}
              className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col justify-between relative"
            >
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex gap-2 items-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                        ann.priority === 'urgent'
                          ? 'bg-red-100 text-red-700'
                          : ann.priority === 'important'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {ann.priority}
                    </span>
                    {ann.pinned && <Pin size={12} className="text-indigo-600 rotate-45" />}
                  </div>
                  {user?.role === 'admin' && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleTogglePinAnnouncement(ann.id)}
                        className="p-1 hover:bg-slate-200 text-slate-500 rounded"
                      >
                        <Pin size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteAnnouncement(ann.id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <h4 className="font-bold text-slate-800 text-lg mt-3">{ann.title}</h4>
                <p className="text-slate-600 text-sm mt-2 leading-relaxed whitespace-pre-line">{ann.body}</p>
                {ann.attachment_url && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <a
                      href={announcementsAPI.getAttachmentUrl(ann.attachment_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-bold hover:underline"
                    >
                      <Paperclip size={14} /> Download Attachment
                    </a>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-4 text-right">
                Posted by {ann.creator_name || 'Admin'} on {new Date(ann.created_at).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </div>

      <CreateAnnouncementModal
        isOpen={isModalOpen}
        isSuccess={isSuccess}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleBlastAnnouncement}
        title={annTitle}
        setTitle={setAnnTitle}
        body={annBody}
        setBody={setAnnBody}
        priority={annPriority}
        setPriority={setAnnPriority}
        setFile={setAnnFile}
      />
    </div>
  );
};

export default AnnouncementsTab;
