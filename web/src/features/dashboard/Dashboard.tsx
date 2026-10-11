import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { notificationsAPI, onboardingAPI } from '../../services/api';
import type { Notification } from '../../types';
import { useIsMdUp } from '../../hooks/useMediaQuery';
import { NOTIF_TYPE_TO_PATH, pathToTab } from './navConfig';

import DashboardSidebar from './components/DashboardSidebar';
import DashboardHeader from './components/DashboardHeader';
import MobileBottomNav from './components/MobileBottomNav';
import CommandPalette from './components/CommandPalette';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isMdUp = useIsMdUp();

  const [isSidebarOpen, setIsSidebarOpen] = useState(isMdUp);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);

  const activeTab = pathToTab(location.pathname);

  useEffect(() => {
    setIsSidebarOpen(isMdUp);
  }, [isMdUp]);

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
  }, [user, navigate, location.pathname]);

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
            !n.is_read && matchingTypes.includes(n.notification_type) ? { ...n, is_read: true } : n
          )
        );
      }
    }
  }, [activeTab, notifications]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsCommandOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
    navigate(NOTIF_TYPE_TO_PATH[notif.notification_type] || '/');
  };

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
    <div className="flex h-dvh bg-slate-50 font-sans overflow-hidden">
      <DashboardSidebar
        activeTab={activeTab}
        onNavigate={(path) => navigate(path)}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isMdUp={isMdUp}
        user={user}
        onLogout={handleLogoutClick}
        tabBadges={tabBadges}
      />

      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0">
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
          onOpenCommand={() => setIsCommandOpen(true)}
          onOpenSettings={() => navigate('/settings')}
        />

        <div className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50 pb-24 md:pb-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </div>
      </main>

      <MobileBottomNav
        activePath={location.pathname}
        onNavigate={(path) => {
          navigate(path);
          setIsSidebarOpen(false);
        }}
        onMore={() => setIsSidebarOpen(!isSidebarOpen)}
        moreOpen={isSidebarOpen}
        user={user}
      />

      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onNavigate={(path) => navigate(path)}
        user={user}
      />
    </div>
  );
};

export default Dashboard;
