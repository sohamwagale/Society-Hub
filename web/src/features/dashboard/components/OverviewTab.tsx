import React, { useState, useEffect } from 'react';
import { Plus, Pin, Trash2, Paperclip } from 'lucide-react';
import type { Announcement, EmergencyContact, Society } from '../../../types';
import { dashboardAPI, announcementsAPI, societyAPI } from '../../../services/api';
import { useAuthStore } from '../../../store';
import CreateAnnouncementModal from '../../announcements/components/CreateAnnouncementModal';
import { toast } from '../../../components/Toast';
import { confirmDialog } from '../../../components/ConfirmModal';

export const OverviewTab: React.FC = () => {
  const { user } = useAuthStore();
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [societyInfo, setSocietyInfo] = useState<any[]>([]);
  const [currentSociety, setCurrentSociety] = useState<Society | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);

  // Announcement blast modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annPriority, setAnnPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [annFile, setAnnFile] = useState<File | null>(null);

  const loadData = async () => {
    setLoadingInfo(true);
    try {
      const [stats, ann, contacts, info, soc] = await Promise.all([
        dashboardAPI.stats(),
        announcementsAPI.list(),
        societyAPI.getEmergencyContacts(),
        societyAPI.getInfo(),
        societyAPI.listSocieties().then(list => list.find(s => s.id === user?.society_id) || null)
      ]);
      setDashboardStats(stats);
      setAnnouncements(ann);
      setEmergencyContacts(contacts);
      setSocietyInfo(info);
      setCurrentSociety(soc);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingInfo(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const getInfoValue = (key: string, fallback?: string) => {
    const found = societyInfo.find((i) => i.key === key)?.value;
    if (found) return found;
    if (fallback) return fallback;
    return 'Not specified';
  };

  const handleBlastAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await announcementsAPI.create(
        {
          title: annTitle,
          body: annBody,
          priority: annPriority,
        },
        annFile || undefined
      );

      setIsSuccess(true);
      toast.success('Announcement broadcasted!');
      setTimeout(() => {
        setIsSuccess(false);
        setIsModalOpen(false);
        setAnnTitle('');
        setAnnBody('');
        setAnnPriority('normal');
        setAnnFile(null);
        loadData();
      }, 1000);
    } catch (e) {
      toast.error('Broadcast failure.');
    }
  };

  const handleTogglePinAnnouncement = async (id: string) => {
    try {
      await announcementsAPI.togglePin(id);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAnnouncement = (id: string) => {
    confirmDialog({
      title: 'Delete Announcement?',
      message: 'This announcement notice will be permanently removed.',
      confirmText: 'Delete Notice',
      onConfirm: async () => {
        try {
          await announcementsAPI.delete(id);
          toast.success('Announcement deleted!');
          loadData();
        } catch (e) {
          toast.error('Failed to delete announcement.');
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
        <p className="text-slate-500 text-sm mt-1">Quick metrics and society announcements feed.</p>
      </div>

      {/* Dashboard Stats */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-sm font-medium">Billing Collection Rate</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{dashboardStats.billing.collection_rate}%</p>
            <p className="text-xs text-slate-400 mt-1">
              ₹{dashboardStats.billing.total_collected.toLocaleString()} / ₹{dashboardStats.billing.total_amount.toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-sm font-medium">Active Helpdesk Tickets</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">
              {dashboardStats.complaints.open + dashboardStats.complaints.in_progress}
            </p>
            <p className="text-xs text-slate-400 mt-1">{dashboardStats.complaints.resolved} resolved tickets</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-sm font-medium">Occupied Flats</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{dashboardStats.community.total_residents}</p>
            <p className="text-xs text-slate-400 mt-1">Out of {dashboardStats.community.total_flats} units total</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-sm font-medium">Pending Reimbursements</p>
            <p className="text-2xl font-bold text-amber-500 mt-1">{dashboardStats.reimbursements.pending}</p>
            <p className="text-xs text-slate-400 mt-1">
              Approved sum: ₹{dashboardStats.reimbursements.approved_amount.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Split layout: Announcements & Pinned notices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Announcements feed */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-base">Announcements Broadcast</h3>
            {user?.role === 'admin' && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1 text-xs text-indigo-600 font-bold bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus size={14} /> New Blast
              </button>
            )}
          </div>
          <div className="p-5 space-y-4 max-h-[500px] overflow-y-auto">
            {announcements.length === 0 ? (
              <p className="text-slate-400 text-center text-sm py-8">No notices or announcements posted yet.</p>
            ) : (
              announcements.map((ann) => (
                <div key={ann.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 relative group">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-2 items-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
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
                          <Pin size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          className="p-1 hover:bg-red-50 text-red-500 rounded"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  <h4 className="font-bold text-slate-800 text-base mt-2">{ann.title}</h4>
                  <p className="text-slate-600 text-sm mt-1 leading-relaxed whitespace-pre-line">{ann.body}</p>

                  {ann.attachment_url && (
                    <div className="mt-3 pt-3 border-t border-slate-200/50">
                      <a
                        href={announcementsAPI.getAttachmentUrl(ann.attachment_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-bold hover:underline"
                      >
                        <Paperclip size={12} /> View Attachment
                      </a>
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400 mt-3 text-right">
                    Posted by {ann.creator_name || 'Admin'} on {new Date(ann.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick links & emergency */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col justify-between h-[500px]">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-800 text-base">Key Details</h3>
            </div>

            <div className="space-y-4 max-h-[360px] overflow-y-auto">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Info</h4>
              <div className="text-xs space-y-2">
                <p>
                  <strong>Society Name:</strong>{' '}
                  {loadingInfo ? 'Loading...' : getInfoValue('society_name', currentSociety?.name)}
                </p>
                <p>
                  <strong>Address:</strong>{' '}
                  {loadingInfo ? 'Loading...' : getInfoValue('address', currentSociety?.address)}
                </p>
                <p>
                  <strong>Registration No:</strong>{' '}
                  {loadingInfo ? 'Loading...' : getInfoValue('registration_no')}
                </p>
              </div>
              <hr className="my-2 border-slate-100" />
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Emergency contacts</h4>
              {emergencyContacts.slice(0, 3).map((contact) => (
                <div
                  key={contact.id}
                  className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100 text-xs"
                >
                  <span>
                    {contact.name} ({contact.role})
                  </span>
                  <a href={`tel:${contact.phone}`} className="text-indigo-600 font-bold hover:underline">
                    {contact.phone}
                  </a>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 text-xs text-indigo-800 leading-normal">
            Use the sidebar to explore details about billing, documents, complaints resolution, and voting.
          </div>
        </div>
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

export default OverviewTab;
