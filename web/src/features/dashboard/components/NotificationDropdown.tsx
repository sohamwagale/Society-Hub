import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';

interface NotificationDropdownProps {
  notifications: any[];
  isOpen: boolean;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onNotificationClick?: (notification: any) => void;
  onClearNotification?: (id: string) => void;
}

interface NotificationRowProps {
  notification: any;
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
      {/* Background action reveal */}
      <div className="absolute inset-0 flex items-center px-4 font-bold text-xs">
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
        className={`p-3 text-xs cursor-pointer select-none relative bg-white flex items-start justify-between gap-2 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
          n.is_read ? 'bg-white' : 'bg-indigo-50/30'
        }`}
      >
        <div className="flex-1 pr-1" onClick={onClick}>
          <div className="flex items-center gap-1.5">
            <p className="font-bold text-slate-800 leading-tight">{n.title}</p>
            {!n.is_read && <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />}
          </div>
          <p className="text-slate-500 mt-1 leading-normal">{n.body}</p>
          <p className="text-slate-400 mt-1.5 text-[10px]">{new Date(n.created_at).toLocaleDateString()}</p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="text-slate-400 hover:text-red-500 p-1 rounded-full hover:bg-slate-100 transition-colors shrink-0"
          title="Clear notification"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  isOpen,
  onMarkAllRead,
  onClearAll,
  onNotificationClick,
  onClearNotification
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2">
      <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <span className="font-bold text-slate-800 text-sm">Notifications</span>
        <div className="flex gap-2">
          <button onClick={onMarkAllRead} className="text-xs text-indigo-600 font-semibold hover:underline">
            Read All
          </button>
          <button onClick={onClearAll} className="text-xs text-red-500 font-semibold hover:underline">
            Clear
          </button>
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400">No notifications</div>
        ) : (
          notifications.map((n) => (
            <NotificationRow
              key={n.id}
              notification={n}
              onClick={() => onNotificationClick && onNotificationClick(n)}
              onClear={() => onClearNotification && onClearNotification(n.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;
