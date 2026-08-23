import React from 'react';
import {
  Building2, TrendingUp, Megaphone, Users, CreditCard,
  PenTool, FileText, DollarSign, HeartHandshake, BarChart3,
  PhoneCall, Home, ShieldAlert, Activity, Settings, LogOut
} from 'lucide-react';
import type { User } from '../../../types';

interface DashboardSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSidebarOpen: boolean;
  user: User | null;
  onLogout: () => void;
  onResetSelections: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activeTab,
  setActiveTab,
  isSidebarOpen,
  user,
  onLogout,
  onResetSelections
}) => {
  const navItems = [
    { id: 'dashboard', icon: TrendingUp, label: 'Dashboard' },
    { id: 'announcements', icon: Megaphone, label: 'Announcements' },
    { id: 'residents', icon: Users, label: 'Residents Directory' },
    { id: 'billing', icon: CreditCard, label: 'Bills & Payments' },
    { id: 'complaints', icon: PenTool, label: 'Helpdesk' },
    { id: 'documents', icon: FileText, label: 'Document Vault' },
    { id: 'expenses', icon: DollarSign, label: 'Society Expenses' },
    { id: 'reimbursements', icon: HeartHandshake, label: 'Reimbursements' },
    { id: 'polls', icon: BarChart3, label: 'Community Polls' },
    { id: 'emergency', icon: PhoneCall, label: 'Society Info Book' },
    ...(user?.role === 'admin' ? [
      { id: 'flats', icon: Home, label: 'Flat Management' },
      { id: 'approvals', icon: ShieldAlert, label: 'KYC Queue' },
      { id: 'activity-log', icon: Activity, label: 'Audit Logs' }
    ] : []),
  ];

  return (
    <aside className={`bg-indigo-900 text-white transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'} flex flex-col z-20`}>
      <div className="p-4 flex items-center gap-3 border-b border-indigo-800">
        <div className="bg-indigo-600 p-2 rounded-lg text-white">
          <Building2 size={24} />
        </div>
        {isSidebarOpen && <h1 className="font-bold text-xl tracking-tight">Society Hub</h1>}
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              onResetSelections();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              activeTab === item.id ? 'bg-indigo-800 text-white' : 'text-indigo-200 hover:bg-indigo-800/60 hover:text-white'
            }`}
          >
            <item.icon size={20} />
            {isSidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-indigo-800">
        <button
          onClick={() => setActiveTab('settings')}
          className="w-full flex items-center gap-3 px-3 py-2 text-indigo-200 hover:text-white transition-colors"
        >
          <Settings size={20} />
          {isSidebarOpen && <span className="text-sm">Settings</span>}
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-indigo-200 hover:text-white transition-colors mt-2"
        >
          <LogOut size={20} />
          {isSidebarOpen && <span className="text-sm">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
