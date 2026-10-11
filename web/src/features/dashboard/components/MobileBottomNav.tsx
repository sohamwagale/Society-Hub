import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { getMobilePrimaryItems } from '../navConfig';
import type { User } from '../../../types';

interface MobileBottomNavProps {
  activePath: string;
  onNavigate: (path: string) => void;
  onMore: () => void;
  moreOpen: boolean;
  user: User | null;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activePath,
  onNavigate,
  onMore,
  moreOpen,
  user,
}) => {
  const items = getMobilePrimaryItems(user);

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-5 h-16">
        {items.map((item) => {
          const active = activePath === item.path;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.path)}
              className={`flex flex-col items-center justify-center gap-1 min-h-11 text-[11px] font-semibold ${
                active ? 'text-indigo-700' : 'text-slate-500'
              }`}
            >
              <item.icon size={20} />
              {item.shortLabel}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onMore}
          className={`flex flex-col items-center justify-center gap-1 min-h-11 text-[11px] font-semibold ${
            moreOpen ? 'text-indigo-700' : 'text-slate-500'
          }`}
        >
          <MoreHorizontal size={20} />
          More
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
