import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { notificationsAPI } from '../../services/api';

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

  // Global Header Notifications State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.society_id) {
      notificationsAPI.list().then(setNotifications).catch(console.error);
    }
  }, [user, navigate]);

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

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar */}
      <DashboardSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSidebarOpen={isSidebarOpen}
        user={user}
        onLogout={handleLogoutClick}
        onResetSelections={() => {}}
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
        />

        {/* Dynamic Nested Feature Views */}
        <div className="flex-1 overflow-auto p-6 bg-slate-50">
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
            {activeTab === 'approvals' && user?.role === 'admin' && <ApprovalsTab />}
            {activeTab === 'activity-log' && user?.role === 'admin' && <ActivityLogTab />}
            {activeTab === 'settings' && <SettingsTab />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
