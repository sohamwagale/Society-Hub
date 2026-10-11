import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pin, Trash2, Paperclip, PhoneCall, CreditCard, PenTool, Vote } from 'lucide-react';
import type { EmergencyContact, Society, SocietyInfoItem } from '../../../types';
import { announcementsAPI, societyAPI } from '../../../services/api';
import { useAuthStore } from '../../../store';
import CreateAnnouncementModal from '../../announcements/components/CreateAnnouncementModal';
import { toast } from '../../../components/Toast';
import { confirmDialog } from '../../../components/ConfirmModal';
import { useDashboardStatsQuery } from '../../../hooks/queries/useDashboard';
import { useBillsQuery } from '../../../hooks/queries/useBills';
import { useComplaintsQuery } from '../../../hooks/queries/useComplaints';
import { usePollsQuery } from '../../../hooks/queries/usePolls';
import {
  useAnnouncementsQuery,
  useCreateAnnouncementMutation,
  useTogglePinAnnouncementMutation,
  useDeleteAnnouncementMutation,
} from '../../../hooks/queries/useAnnouncements';
import { OverviewSkeleton } from '../../../components/skeleton';
import EmptyState from '../../../components/ui/EmptyState';

export const OverviewTab: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const { data: dashboardStats, isLoading: loadingStats } = useDashboardStatsQuery();
  const { data: announcements = [], isLoading: loadingAnnouncements } = useAnnouncementsQuery();
  const { data: bills = [] } = useBillsQuery();
  const { data: complaints = [] } = useComplaintsQuery();
  const { data: polls = [] } = usePollsQuery();
  const createAnnouncementMutation = useCreateAnnouncementMutation();
  const togglePinAnnouncementMutation = useTogglePinAnnouncementMutation();
  const deleteAnnouncementMutation = useDeleteAnnouncementMutation();

  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [societyInfo, setSocietyInfo] = useState<SocietyInfoItem[]>([]);
  const [currentSociety, setCurrentSociety] = useState<Society | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annPriority, setAnnPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [annFile, setAnnFile] = useState<File | null>(null);

  useEffect(() => {
    setLoadingInfo(true);
    Promise.all([
      societyAPI.getEmergencyContacts(),
      societyAPI.getInfo(),
      societyAPI.listSocieties().then((list) => list.find((s) => s.id === user?.society_id) || null),
    ])
      .then(([contacts, info, soc]) => {
        setEmergencyContacts(contacts);
        setSocietyInfo(info);
        setCurrentSociety(soc);
      })
      .catch(console.error)
      .finally(() => setLoadingInfo(false));
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
      await createAnnouncementMutation.mutateAsync({
        ann: { title: annTitle, body: annBody, priority: annPriority },
        file: annFile || undefined,
      });

      setIsSuccess(true);
      toast.success('Announcement broadcasted!');
      setTimeout(() => {
        setIsSuccess(false);
        setIsModalOpen(false);
        setAnnTitle('');
        setAnnBody('');
        setAnnPriority('normal');
        setAnnFile(null);
      }, 1000);
    } catch {
      toast.error('Broadcast failure.');
    }
  };

  const handleTogglePinAnnouncement = async (id: string) => {
    try {
      await togglePinAnnouncementMutation.mutateAsync(id);
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
          await deleteAnnouncementMutation.mutateAsync(id);
          toast.success('Announcement deleted!');
        } catch {
          toast.error('Failed to delete announcement.');
        }
      },
    });
  };

  if (loadingStats && !dashboardStats) {
    return <OverviewSkeleton />;
  }

  const unpaidBills = bills.filter((b) => b.payment_status !== 'paid' && b.payment_status !== 'overdue_paid');
  const dueAmount = unpaidBills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
  const myOpenTickets = complaints.filter((c) => c.status !== 'resolved');
  const activePolls = polls.filter((p) => p.is_active);
  const pinnedOrLatest = announcements.find((a) => a.pinned) || announcements[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">{isAdmin ? 'Committee overview' : 'Home'}</h2>
        <p className="text-slate-500 text-sm mt-1">
          {isAdmin
            ? 'Collection, tickets, and society activity at a glance.'
            : 'Dues, notices, and helpdesk in one place.'}
        </p>
      </div>

      {emergencyContacts.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {emergencyContacts.slice(0, 4).map((contact) => (
            <a
              key={contact.id}
              href={`tel:${contact.phone}`}
              className="shrink-0 inline-flex items-center gap-2 min-h-11 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-800 shadow-sm"
            >
              <PhoneCall size={16} className="text-indigo-600" />
              {contact.name}
            </a>
          ))}
        </div>
      )}

      {isAdmin && dashboardStats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-sm font-medium">Billing collection</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{dashboardStats.billing.collection_rate}%</p>
            <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${Math.min(100, dashboardStats.billing.collection_rate)}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              ₹{dashboardStats.billing.total_collected.toLocaleString()} / ₹
              {dashboardStats.billing.total_amount.toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-sm font-medium">Overdue bills</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{dashboardStats.billing.overdue_bills}</p>
            <p className="text-xs text-slate-400 mt-1">{dashboardStats.billing.total_bills} cycles in total</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-sm font-medium">Open helpdesk tickets</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">
              {dashboardStats.complaints.open + dashboardStats.complaints.in_progress}
            </p>
            <p className="text-xs text-slate-400 mt-1">{dashboardStats.complaints.resolved} resolved</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-sm font-medium">Occupied flats</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{dashboardStats.community.total_residents}</p>
            <p className="text-xs text-slate-400 mt-1">
              of {dashboardStats.community.total_flats} units · {dashboardStats.reimbursements.pending} pending
              reimbursements
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Link to="/billing" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-200">
            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
              <CreditCard size={16} className="text-indigo-600" /> Amount due
            </div>
            <p className="text-2xl font-bold text-slate-800 mt-1">₹{dueAmount.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1">
              {unpaidBills.length === 0 ? 'Nothing due right now' : `${unpaidBills.length} unpaid bill(s)`}
            </p>
          </Link>
          <Link to="/announcements" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-200">
            <p className="text-slate-500 text-sm font-medium">Latest notice</p>
            <p className="text-base font-bold text-slate-800 mt-2 line-clamp-2">
              {pinnedOrLatest?.title || 'No notices yet'}
            </p>
            <p className="text-xs text-slate-400 mt-1">{pinnedOrLatest ? 'Tap to read' : 'Check back later'}</p>
          </Link>
          <Link to="/complaints" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-200">
            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
              <PenTool size={16} className="text-indigo-600" /> Open tickets
            </div>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{myOpenTickets.length}</p>
            <p className="text-xs text-slate-400 mt-1">Raise a ticket if something needs attention</p>
          </Link>
          <Link to="/polls" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-200">
            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
              <Vote size={16} className="text-indigo-600" /> Active polls
            </div>
            <p className="text-2xl font-bold text-slate-800 mt-1">{activePolls.length}</p>
            <p className="text-xs text-slate-400 mt-1">Vote on community resolutions</p>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-base">Announcements</h3>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1 text-sm text-indigo-600 font-bold bg-indigo-50 hover:bg-indigo-100 px-3 py-2 min-h-11 rounded-xl transition-colors"
              >
                <Plus size={14} /> New notice
              </button>
            )}
          </div>
          <div className="p-5 space-y-4 max-h-[500px] overflow-y-auto">
            {loadingAnnouncements && announcements.length === 0 ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                    <div className="skeleton-shimmer h-4 w-16 rounded bg-slate-200" />
                    <div className="skeleton-shimmer h-4 w-3/4 rounded bg-slate-200" />
                  </div>
                ))}
              </div>
            ) : announcements.length === 0 ? (
              <EmptyState
                icon={Pin}
                title="No notices yet"
                description="Society announcements will show up here when the committee posts them."
                action={
                  isAdmin ? (
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="bg-indigo-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm min-h-11"
                    >
                      Post the first notice
                    </button>
                  ) : undefined
                }
              />
            ) : (
              announcements.map((ann) => (
                <div key={ann.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 relative group">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-2 items-center">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded capitalize ${
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
                    {isAdmin && (
                      <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => handleTogglePinAnnouncement(ann.id)}
                          className="p-2 hover:bg-slate-200 text-slate-500 rounded-lg min-h-11 min-w-11 flex items-center justify-center"
                        >
                          <Pin size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          className="p-2 hover:bg-red-50 text-red-500 rounded-lg min-h-11 min-w-11 flex items-center justify-center"
                        >
                          <Trash2 size={14} />
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
                        className="inline-flex items-center gap-1.5 text-sm text-indigo-600 font-bold hover:underline"
                      >
                        <Paperclip size={12} /> View attachment
                      </a>
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-3 text-right">
                    Posted by {ann.creator_name || 'Admin'} on {new Date(ann.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col min-h-[280px] lg:min-h-[500px]">
          <h3 className="font-bold text-slate-800 text-base pb-3 border-b border-slate-100 mb-4">Key details</h3>
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="text-sm space-y-2">
              <p>
                <strong>Society:</strong> {loadingInfo ? 'Loading…' : getInfoValue('society_name', currentSociety?.name)}
              </p>
              <p>
                <strong>Address:</strong> {loadingInfo ? 'Loading…' : getInfoValue('address', currentSociety?.address)}
              </p>
              <p>
                <strong>Registration No:</strong> {loadingInfo ? 'Loading…' : getInfoValue('registration_no')}
              </p>
            </div>
            <hr className="border-slate-100" />
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Emergency contacts</h4>
            {emergencyContacts.length === 0 ? (
              <p className="text-sm text-slate-400">No emergency contacts added yet.</p>
            ) : (
              emergencyContacts.slice(0, 5).map((contact) => (
                <a
                  key={contact.id}
                  href={`tel:${contact.phone}`}
                  className="flex justify-between items-center p-3 min-h-11 bg-slate-50 rounded-xl border border-slate-100 text-sm"
                >
                  <span>
                    {contact.name} ({contact.role})
                  </span>
                  <span className="text-indigo-600 font-bold">{contact.phone}</span>
                </a>
              ))
            )}
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
