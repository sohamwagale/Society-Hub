import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BarChart3,
  CreditCard,
  DollarSign,
  FileText,
  HeartHandshake,
  Home,
  Megaphone,
  PenTool,
  PhoneCall,
  Settings,
  ShieldAlert,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { User } from '../../types';

export type TabId =
  | 'dashboard'
  | 'announcements'
  | 'residents'
  | 'billing'
  | 'complaints'
  | 'documents'
  | 'expenses'
  | 'reimbursements'
  | 'polls'
  | 'emergency'
  | 'flats'
  | 'approvals'
  | 'activity-log'
  | 'settings';

export interface NavItem {
  id: TabId;
  icon: LucideIcon;
  label: string;
  shortLabel: string;
  path: string;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export const TAB_PATHS: Record<TabId, string> = {
  dashboard: '/',
  announcements: '/announcements',
  residents: '/residents',
  billing: '/billing',
  complaints: '/complaints',
  documents: '/documents',
  expenses: '/expenses',
  reimbursements: '/reimbursements',
  polls: '/polls',
  emergency: '/emergency',
  flats: '/flats',
  approvals: '/approvals',
  'activity-log': '/activity-log',
  settings: '/settings',
};

export const NOTIF_TYPE_TO_PATH: Record<string, string> = {
  bill: TAB_PATHS.billing,
  payment_reminder: TAB_PATHS.billing,
  complaint: TAB_PATHS.complaints,
  reimbursement: TAB_PATHS.reimbursements,
  poll: TAB_PATHS.polls,
  general: TAB_PATHS.announcements,
};

const ALL_ITEMS: NavItem[] = [
  { id: 'dashboard', icon: TrendingUp, label: 'Dashboard', shortLabel: 'Home', path: TAB_PATHS.dashboard },
  { id: 'announcements', icon: Megaphone, label: 'Announcements', shortLabel: 'Notices', path: TAB_PATHS.announcements },
  { id: 'residents', icon: Users, label: 'Residents', shortLabel: 'People', path: TAB_PATHS.residents },
  { id: 'billing', icon: CreditCard, label: 'Bills & Payments', shortLabel: 'Bills', path: TAB_PATHS.billing },
  { id: 'complaints', icon: PenTool, label: 'Helpdesk', shortLabel: 'Helpdesk', path: TAB_PATHS.complaints },
  { id: 'documents', icon: FileText, label: 'Document Vault', shortLabel: 'Docs', path: TAB_PATHS.documents },
  { id: 'expenses', icon: DollarSign, label: 'Society Expenses', shortLabel: 'Expenses', path: TAB_PATHS.expenses },
  { id: 'reimbursements', icon: HeartHandshake, label: 'Reimbursements', shortLabel: 'Payouts', path: TAB_PATHS.reimbursements },
  { id: 'polls', icon: BarChart3, label: 'Community Polls', shortLabel: 'Polls', path: TAB_PATHS.polls },
  { id: 'emergency', icon: PhoneCall, label: 'Society Info', shortLabel: 'Info', path: TAB_PATHS.emergency },
  { id: 'flats', icon: Home, label: 'Flat Management', shortLabel: 'Flats', path: TAB_PATHS.flats },
  { id: 'approvals', icon: ShieldAlert, label: 'Approvals', shortLabel: 'Approvals', path: TAB_PATHS.approvals },
  { id: 'activity-log', icon: Activity, label: 'Audit Logs', shortLabel: 'Logs', path: TAB_PATHS['activity-log'] },
  { id: 'settings', icon: Settings, label: 'Settings', shortLabel: 'Settings', path: TAB_PATHS.settings },
];

function canAccess(id: TabId, user: User | null): boolean {
  if (id === 'flats' || id === 'activity-log') return user?.role === 'admin';
  if (id === 'approvals') {
    return user?.role === 'admin' || user?.resident_type === 'owner' || user?.resident_type === 'renter';
  }
  return true;
}

export function getNavItem(id: TabId): NavItem {
  return ALL_ITEMS.find((item) => item.id === id)!;
}

export function getVisibleNavItems(user: User | null): NavItem[] {
  return ALL_ITEMS.filter((item) => item.id !== 'settings' && canAccess(item.id, user));
}

export function getNavGroups(user: User | null): NavGroup[] {
  const visible = new Set(getVisibleNavItems(user).map((item) => item.id));
  const pick = (ids: TabId[]) => ids.map(getNavItem).filter((item) => visible.has(item.id));

  const groups: NavGroup[] = [
    { id: 'home', label: 'Home', items: pick(['dashboard']) },
    {
      id: 'living',
      label: 'Living',
      items: pick(['announcements', 'residents', 'complaints', 'documents', 'emergency', 'polls']),
    },
    { id: 'money', label: 'Money', items: pick(['billing', 'expenses', 'reimbursements']) },
    { id: 'admin', label: 'Admin', items: pick(['flats', 'approvals', 'activity-log']) },
  ];

  return groups.filter((group) => group.items.length > 0);
}

export function getMobilePrimaryItems(user: User | null): NavItem[] {
  return ['dashboard', 'billing', 'complaints', 'announcements']
    .map((id) => getNavItem(id as TabId))
    .filter((item) => canAccess(item.id, user));
}

export function pathToTab(pathname: string): TabId {
  if (pathname === '/' || pathname === '') return 'dashboard';
  const match = ALL_ITEMS.find((item) => item.path === pathname);
  return match?.id ?? 'dashboard';
}

export function getApprovalLabel(user: User | null): string {
  return user?.role === 'admin' ? 'KYC Queue' : 'Member Approvals';
}
