import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { getVisibleNavItems, getNavItem, getApprovalLabel } from '../navConfig';
import type { User } from '../../../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  user: User | null;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate, user }) => {
  const [query, setQuery] = useState('');

  const items = useMemo(() => {
    const list = [...getVisibleNavItems(user), getNavItem('settings')].map((item) =>
      item.id === 'approvals' ? { ...item, label: getApprovalLabel(user) } : item
    );
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (item) => item.label.toLowerCase().includes(q) || item.shortLabel.toLowerCase().includes(q)
    );
  }, [query, user]);

  useEffect(() => {
    if (!isOpen) setQuery('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/50 flex items-start justify-center pt-[15vh] px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 border-b border-slate-100">
          <Search size={16} className="text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Jump to a page…"
            className="w-full py-3 text-sm bg-transparent outline-none"
          />
          <kbd className="hidden sm:inline text-[10px] font-semibold text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">
            Esc
          </kbd>
        </div>
        <div className="max-h-72 overflow-y-auto py-2">
          {items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-400 text-center">No matching pages.</p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(item.path);
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-indigo-50 text-sm text-slate-700"
              >
                <item.icon size={16} className="text-indigo-600 shrink-0" />
                {item.label}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
