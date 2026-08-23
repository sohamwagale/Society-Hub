import React from 'react';

interface NotificationDropdownProps {
  notifications: any[];
  isOpen: boolean;
  onMarkAllRead: () => void;
  onClearAll: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  isOpen,
  onMarkAllRead,
  onClearAll
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
      <div className="max-h-60 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400">No new notifications</div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className={`p-3 border-b border-slate-50 text-xs ${n.is_read ? 'bg-white' : 'bg-indigo-50/20'}`}>
              <p className="font-bold text-slate-800">{n.title}</p>
              <p className="text-slate-500 mt-0.5">{n.body}</p>
              <p className="text-slate-400 mt-1 text-[10px]">{new Date(n.created_at).toLocaleDateString()}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;
