import React from 'react';
import { Clock, LogOut } from 'lucide-react';
import type { User } from '../../../types';

interface PendingApprovalNoticeProps {
  user: User;
  onRefresh: () => void;
  onLogout: () => void;
}

export const PendingApprovalNotice: React.FC<PendingApprovalNoticeProps> = ({
  user,
  onRefresh,
  onLogout,
}) => {
  const getPendingMessage = () => {
    if (user.resident_type === 'owner_family' || user.resident_type === 'renter') {
      return 'Your request to join the flat has been registered. Please contact the primary flat owner to approve your account.';
    }
    if (user.resident_type === 'renter_family') {
      return 'Your request to join the flat has been registered. Please contact the primary tenant to approve your account.';
    }
    return 'Your request to join the society flat has been registered. Please contact the society committee administrator to approve your account.';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 border border-slate-200 shadow-md rounded-2xl sm:px-10 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-amber-100 text-amber-600 mb-6">
            <Clock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Verification Pending</h2>
          <p className="mt-3 text-sm text-slate-500 leading-relaxed">
            {getPendingMessage()}
          </p>
          <div className="mt-6 p-4 bg-slate-50 rounded-xl text-left text-xs text-slate-600 space-y-1.5 border border-slate-100">
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            {user.flat_number && <p><strong>Flat:</strong> Flat {user.flat_number} ({user.block} Block)</p>}
            {user.resident_type && <p><strong>Role:</strong> <span className="capitalize">{user.resident_type.replace('_', ' ')}</span></p>}
          </div>

          <div className="mt-8 space-y-3">
            <button
              onClick={onRefresh}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              Refresh Status
            </button>
            <button
              onClick={onLogout}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
