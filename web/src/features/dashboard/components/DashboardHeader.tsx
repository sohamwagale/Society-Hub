import React, { useRef, useEffect } from 'react';
import { Menu, Bell } from 'lucide-react';
import type { User } from '../../../types';
import NotificationDropdown from './NotificationDropdown';

interface DashboardHeaderProps {
  user: User | null;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  notifications: any[];
  isNotificationOpen: boolean;
  setIsNotificationOpen: (open: boolean) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  user,
  isSidebarOpen,
  setIsSidebarOpen,
  notifications,
  isNotificationOpen,
  setIsNotificationOpen,
  onMarkAllRead,
  onClearAll
}) => {
  const notificationRef = useRef<HTMLDivElement>(null);

  // Auto-close notification dropdown when clicking outside
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
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 md:px-6 z-10">
      <div className="flex items-center gap-3 md:gap-4">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="text-slate-500 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Toggle Menu"
        >
          <Menu size={22} />
        </button>
        <div className="text-slate-700 font-medium text-xs sm:text-sm truncate max-w-[150px] sm:max-w-none">
          {user?.flat_number ? `Flat ${user.flat_number} (${user.block} Block)` : 'Management System'}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Notifications Dropdown Container */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
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
            onMarkAllRead={onMarkAllRead}
            onClearAll={onClearAll}
          />
        </div>

        <div className="flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l border-slate-200">
          <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'SH'}
          </div>
          <div className="hidden md:block text-sm">
            <p className="font-semibold text-slate-700 leading-tight">{user?.name}</p>
            <p className="text-slate-500 text-xs text-left capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

//Nothing

export default DashboardHeader;
