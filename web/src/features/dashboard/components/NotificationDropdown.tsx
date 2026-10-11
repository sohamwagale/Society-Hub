import React, { useEffect, useState, useRef } from 'react';
import { Bell, X } from 'lucide-react';
import type { Notification } from '../../../types';

interface NotificationDropdownProps {
  notifications: Notification[];
  isOpen: boolean;
  onClose: () => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onNotificationClick?: (notification: Notification) => void;
  onClearNotification?: (id: string) => void;
}

interface NotificationRowProps {
  notification: Notification;
  onClick: () => void;
  onClear: () => void;
}

const NotificationRow: React.FC<NotificationRowProps> = ({ notification: n, onClick, onClear }) => {
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);

  const handleStart = (clientX: number) => {
    touchStartX.current = clientX;
    setIsSwiping(true);
  };

  const handleMove = (clientX: number) => {
    if (!isSwiping) return;
    const diffX = clientX - touchStartX.current;
    if (diffX > 0) {
      setTranslateX(diffX);
    }
  };

  const handleEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);
    if (translateX > 75) {
      setTranslateX(300);
      setTimeout(() => {
        onClear();
      }, 150);
    } else {
      setTranslateX(0);
    }
  };

  return (
    <div className="relative overflow-hidden bg-red-50 text-red-600">
      <div className="absolute inset-0 flex items-center px-4 font-bold text-sm">
        <span>Cleared</span>
      </div>

      <div
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
        }}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        className={`p-3 cursor-pointer select-none relative bg-white flex items-start justify-between gap-2 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
          n.is_read ? 'bg-white' : 'bg-indigo-50/30'
        }`}
      >
        <div className="flex-1 pr-1" onClick={onClick}>
          <div className="flex items-center gap-1.5">
            <p className="font-bold text-slate-800 leading-tight text-sm">{n.title}</p>
            {!n.is_read && <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />}
          </div>
          <p className="text-slate-500 mt-1 leading-normal text-sm">{n.body}</p>
          <p className="text-slate-400 mt-1.5 text-xs">{new Date(n.created_at).toLocaleDateString()}</p>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="text-slate-400 hover:text-red-500 p-2 rounded-full hover:bg-slate-100 transition-colors shrink-0 min-h-11 min-w-11 flex items-center justify-center"
          title="Clear notification"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  isOpen,
  onClose,
  onMarkAllRead,
  onClearAll,
  onNotificationClick,
  onClearNotification,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'bill', label: 'Bills' },
    { id: 'complaint', label: 'Tickets' },
    { id: 'poll', label: 'Polls' },
  ];

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col">
        <div className="px-4 py-4 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-indigo-600" />
            <span className="font-bold text-slate-800 text-base">Notifications</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onMarkAllRead} className="text-sm text-indigo-600 font-semibold hover:underline">
              Read all
            </button>
            <button type="button" onClick={onClearAll} className="text-sm text-red-500 font-semibold hover:underline">
              Clear
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 min-h-11 min-w-11 flex items-center justify-center"
              aria-label="Close notifications"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <NotificationList
          notifications={notifications}
          filters={filters}
          onNotificationClick={onNotificationClick}
          onClearNotification={onClearNotification}
        />
      </aside>
    </div>
  );
};

const NotificationList: React.FC<{
  notifications: Notification[];
  filters: { id: string; label: string }[];
  onNotificationClick?: (notification: Notification) => void;
  onClearNotification?: (id: string) => void;
}> = ({ notifications, filters, onNotificationClick, onClearNotification }) => {
  const [filter, setFilter] = useState('all');
  const filtered =
    filter === 'all'
      ? notifications
      : notifications.filter((n) =>
          filter === 'bill'
            ? n.notification_type === 'bill' || n.notification_type === 'payment_reminder'
            : n.notification_type === filter
        );

  return (
    <>
      <div className="flex gap-2 px-4 py-3 border-b border-slate-100 overflow-x-auto">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap ${
              filter === item.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No notifications in this filter.</div>
        ) : (
          filtered.map((n) => (
            <NotificationRow
              key={n.id}
              notification={n}
              onClick={() => onNotificationClick && onNotificationClick(n)}
              onClear={() => onClearNotification && onClearNotification(n.id)}
            />
          ))
        )}
      </div>
    </>
  );
};

export default NotificationDropdown;
