import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { notificationsAPI, onboardingAPI } from '../../services/api';
import type { Notification } from '../../types';

// Shell components
import DashboardSidebar from './components/DashboardSidebar';
import DashboardHeader from './components/DashboardHeader';
import OverviewTab from './components/OverviewTab';

// Feature Views
import AnnouncementsTab from '../announcements/AnnouncementsTab';
import ResidentsTab from '../residents/ResidentsTab';
import BillingTab from '../billing/BillingTab';
import ComplaintsTab from '../complaints/ComplaintsTab';
import DocumentsTab from '../documents/DocumentsTab';
import ExpensesTab from '../expenses/ExpensesTab';
import ReimbursementsTab from '../reimbursements/ReimbursementsTab';
import PollsTab from '../polls/PollsTab';
import EmergencyInfoTab from '../emergency/EmergencyInfoTab';
import FlatsTab from '../flats/FlatsTab';
import ApprovalsTab from '../approvals/ApprovalsTab';
import ActivityLogTab from '../activityLog/ActivityLogTab';
import SettingsTab from '../settings/SettingsTab';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Global Header Notifications & Approvals State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.society_id) {
      notificationsAPI.list().then(setNotifications).catch(console.error);

      if (user.role === 'admin' || user.resident_type === 'owner' || user.resident_type === 'renter') {
        onboardingAPI
          .pendingApprovals()
          .then((list) => setPendingApprovalsCount(list.length))
          .catch(console.error);
      }
    }
  }, [user, navigate, activeTab]);

  // Auto-clear tab notification count bubbles when opening that tab
  useEffect(() => {
    const tabTypeMap: Record<string, string[]> = {
      billing: ['bill', 'payment_reminder'],
      complaints: ['complaint'],
      reimbursements: ['reimbursement'],
      polls: ['poll'],
      announcements: ['general'],
    };

    const matchingTypes = tabTypeMap[activeTab];
    if (matchingTypes && notifications.length > 0) {
      const unreadForTab = notifications.filter(
        (n) => !n.is_read && matchingTypes.includes(n.notification_type)
      );
      if (unreadForTab.length > 0) {
        unreadForTab.forEach((n) => notificationsAPI.markRead(n.id).catch(console.error));
        setNotifications((prev) =>
          prev.map((n) =>
            !n.is_read && matchingTypes.includes(n.notification_type)
              ? { ...n, is_read: true }
              : n
          )
        );
      }
    }
  }, [activeTab, notifications]);

  const handleLogoutClick = async () => {
    await logout();
    navigate('/login');
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      const list = await notificationsAPI.list();
      setNotifications(list);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      await notificationsAPI.clearAll();
      setNotifications([]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearNotificationItem = async (id: string) => {
    try {
      await notificationsAPI.deleteSingle(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    try {
      await notificationsAPI.deleteSingle(notif.id);
      setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    } catch (e) {
      console.error(e);
    }

    setIsNotificationOpen(false);

    const typeMap: Record<string, string> = {
      bill: 'billing',
      payment_reminder: 'billing',
      complaint: 'complaints',
      reimbursement: 'reimbursements',
      poll: 'polls',
      general: 'announcements',
    };

    const targetTab = typeMap[notif.notification_type] || 'dashboard';
    setActiveTab(targetTab);
  };

  // Compute unread/pending notification bubble counts for sidebar tabs
  const tabBadges: Record<string, number> = {
    approvals: pendingApprovalsCount,
    billing: notifications.filter(
      (n) => !n.is_read && (n.notification_type === 'bill' || n.notification_type === 'payment_reminder')
    ).length,
    complaints: notifications.filter((n) => !n.is_read && n.notification_type === 'complaint').length,
    reimbursements: notifications.filter((n) => !n.is_read && n.notification_type === 'reimbursement').length,
    polls: notifications.filter((n) => !n.is_read && n.notification_type === 'poll').length,
    announcements: notifications.filter((n) => !n.is_read && n.notification_type === 'general').length,
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar */}
      <DashboardSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        user={user}
        onLogout={handleLogoutClick}
        onResetSelections={() => {}}
        tabBadges={tabBadges}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <DashboardHeader
          user={user}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          notifications={notifications}
          isNotificationOpen={isNotificationOpen}
          setIsNotificationOpen={setIsNotificationOpen}
          onMarkAllRead={handleMarkAllNotificationsRead}
          onClearAll={handleClearAllNotifications}
          onNotificationClick={handleNotificationClick}
          onClearNotification={handleClearNotificationItem}
        />

        {/* Dynamic Nested Feature Views */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 bg-slate-50">
          <div className="max-w-7xl mx-auto space-y-6">
            {activeTab === 'dashboard' && <OverviewTab />}
            {activeTab === 'announcements' && <AnnouncementsTab />}
            {activeTab === 'residents' && <ResidentsTab />}
            {activeTab === 'billing' && <BillingTab />}
            {activeTab === 'complaints' && <ComplaintsTab />}
            {activeTab === 'documents' && <DocumentsTab />}
            {activeTab === 'expenses' && <ExpensesTab />}
            {activeTab === 'reimbursements' && <ReimbursementsTab />}
            {activeTab === 'polls' && <PollsTab />}
            {activeTab === 'emergency' && <EmergencyInfoTab />}
            {activeTab === 'flats' && user?.role === 'admin' && <FlatsTab />}
            {activeTab === 'approvals' && (user?.role === 'admin' || user?.resident_type === 'owner' || user?.resident_type === 'renter') && <ApprovalsTab />}
            {activeTab === 'activity-log' && user?.role === 'admin' && <ActivityLogTab />}
            {activeTab === 'settings' && <SettingsTab />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
