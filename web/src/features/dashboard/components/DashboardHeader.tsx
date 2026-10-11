import React, { useRef, useEffect, useState } from 'react';
import { Menu, Bell, Search } from 'lucide-react';
import type { User, Notification } from '../../../types';
import { societyAPI } from '../../../services/api';
import NotificationDropdown from './NotificationDropdown';

interface DashboardHeaderProps {
  user: User | null;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  notifications: Notification[];
  isNotificationOpen: boolean;
  setIsNotificationOpen: (open: boolean) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onNotificationClick?: (notification: Notification) => void;
  onClearNotification?: (id: string) => void;
  onOpenCommand: () => void;
  onOpenSettings: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  user,
  isSidebarOpen,
  setIsSidebarOpen,
  notifications,
  isNotificationOpen,
  setIsNotificationOpen,
  onMarkAllRead,
  onClearAll,
  onNotificationClick,
  onClearNotification,
  onOpenCommand,
  onOpenSettings,
}) => {
  const notificationRef = useRef<HTMLDivElement>(null);
  const [societyName, setSocietyName] = useState<string>(() => user?.society_name || '');

  useEffect(() => {
    if (user?.society_name) {
      setSocietyName(user.society_name);
      return;
    }
    if (user?.society_id) {
      societyAPI
        .listSocieties()
        .then((societies) => {
          const match = societies.find((s) => s.id === user.society_id);
          if (match?.name) {
            setSocietyName(match.name);
          }
        })
        .catch(console.error);
    }
  }, [user?.society_id, user?.society_name]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        isNotificationOpen &&
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isNotificationOpen, setIsNotificationOpen]);

  return (
    <header
      className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 md:px-6 z-10 shrink-0"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        <button
          type="button"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="hidden md:inline-flex text-slate-500 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors min-h-11 min-w-11 items-center justify-center"
          aria-label="Toggle Menu"
        >
          <Menu size={22} />
        </button>
        {!user ? (
          <div className="space-y-1">
            <div className="skeleton-shimmer h-4 w-32 rounded bg-slate-200" />
            <div className="skeleton-shimmer h-3 w-20 rounded bg-slate-200" />
          </div>
        ) : (
          <div className="flex flex-col justify-center min-w-0">
            <span className="text-slate-800 font-bold text-sm sm:text-base leading-tight truncate">
              {societyName || user.society_name || 'Society Hub'}
            </span>
            {user.flat_number && (
              <span className="text-slate-500 text-xs font-medium leading-tight truncate">
                Flat {user.flat_number} ({user.block} Block)
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 md:gap-3" ref={notificationRef}>
        <button
          type="button"
          onClick={onOpenCommand}
          className="hidden md:flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-xl border border-slate-200"
          aria-label="Search pages"
        >
          <Search size={16} />
          <span>Search</span>
          <kbd className="text-[10px] font-semibold border border-slate-200 rounded px-1.5 py-0.5">⌘K</kbd>
        </button>

        <button
          type="button"
          onClick={() => setIsNotificationOpen(!isNotificationOpen)}
          className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors min-h-11 min-w-11 flex items-center justify-center"
          aria-label="Notifications"
        >
          <Bell size={20} />
          {notifications.some((n) => !n.is_read) && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
          )}
        </button>

        <NotificationDropdown
          notifications={notifications}
          isOpen={isNotificationOpen}
          onClose={() => setIsNotificationOpen(false)}
          onMarkAllRead={onMarkAllRead}
          onClearAll={onClearAll}
          onNotificationClick={onNotificationClick}
          onClearNotification={onClearNotification}
        />

        <button
          type="button"
          onClick={onOpenSettings}
          className="hidden md:flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l border-slate-200 min-h-11"
        >
          {!user ? (
            <div className="flex items-center gap-2">
              <div className="skeleton-shimmer w-8 h-8 rounded-full bg-slate-200" />
              <div className="hidden md:block space-y-1">
                <div className="skeleton-shimmer h-3 w-16 rounded bg-slate-200" />
                <div className="skeleton-shimmer h-2.5 w-10 rounded bg-slate-200" />
              </div>
            </div>
          ) : (
            <>
              <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-sm">
                {user.name ? user.name.slice(0, 2).toUpperCase() : 'SH'}
              </div>
              <div className="hidden md:block text-sm text-left">
                <p className="font-semibold text-slate-700 leading-tight">{user.name}</p>
                <p className="text-slate-500 text-xs capitalize">{user.role}</p>
              </div>
            </>
          )}
        </button>
      </div>
    </header>
  );
};

export default DashboardHeader;
