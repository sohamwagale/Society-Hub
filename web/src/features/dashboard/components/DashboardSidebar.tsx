import React from 'react';
import { Building2, LogOut, Settings } from 'lucide-react';
import type { User } from '../../../types';
import { getApprovalLabel, getNavGroups, type TabId } from '../navConfig';

interface DashboardSidebarProps {
  activeTab: TabId;
  onNavigate: (path: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen?: (open: boolean) => void;
  isMdUp: boolean;
  user: User | null;
  onLogout: () => void;
  tabBadges?: Record<string, number>;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activeTab,
  onNavigate,
  isSidebarOpen,
  setIsSidebarOpen,
  isMdUp,
  user,
  onLogout,
  tabBadges = {},
}) => {
  const groups = getNavGroups(user);
  const isExpanded = isMdUp ? isSidebarOpen : true;

  const handleNavClick = (path: string) => {
    onNavigate(path);
    if (setIsSidebarOpen && !isMdUp) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <>
      {isSidebarOpen && !isMdUp && (
        <div
          onClick={() => setIsSidebarOpen && setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-30 md:hidden transition-opacity"
        />
      )}

      <aside
        className={`bg-indigo-900 text-white transition-all duration-300 flex flex-col z-40
          fixed md:static inset-y-0 left-0
          ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-20'}
        `}
      >
        <div className="p-4 flex items-center gap-3 border-b border-white/10 min-h-16">
          <div className="bg-white/15 p-2 rounded-lg text-white">
            <Building2 size={24} />
          </div>
          {isExpanded && <h1 className="font-bold text-xl tracking-tight">Society Hub</h1>}
        </div>

        <nav className="flex-1 py-4 px-3 space-y-4 overflow-y-auto">
          {groups.map((group) => (
            <div key={group.id}>
              {isExpanded && (
                <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-200/70">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const badgeCount = tabBadges[item.id] || 0;
                  const label = item.id === 'approvals' ? getApprovalLabel(user) : item.label;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      title={label}
                      onClick={() => handleNavClick(item.path)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 min-h-11 rounded-lg transition-colors relative ${
                        activeTab === item.id
                          ? 'bg-white/15 text-white font-medium shadow-xs'
                          : 'text-indigo-100/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <item.icon size={20} />
                        {badgeCount > 0 && !isExpanded && (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-[#22265E]">
                            {badgeCount > 9 ? '9+' : badgeCount}
                          </span>
                        )}
                      </div>
                      {isExpanded && (
                        <>
                          <span className="font-medium text-sm truncate flex-1 text-left">{label}</span>
                          {badgeCount > 0 && (
                            <span className="bg-rose-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full shadow-xs shrink-0">
                              {badgeCount > 99 ? '99+' : badgeCount}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-1">
          <button
            type="button"
            title="Settings"
            onClick={() => handleNavClick('/settings')}
            className="w-full flex items-center gap-3 px-3 py-2.5 min-h-11 text-indigo-100/80 hover:bg-white/10 hover:text-white transition-colors rounded-lg"
          >
            <Settings size={20} className="shrink-0" />
            {isExpanded && <span className="text-sm">Settings</span>}
          </button>
          <button
            type="button"
            title="Logout"
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 min-h-11 text-indigo-100/80 hover:bg-white/10 hover:text-white transition-colors rounded-lg"
          >
            <LogOut size={20} className="shrink-0" />
            {isExpanded && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default DashboardSidebar;
