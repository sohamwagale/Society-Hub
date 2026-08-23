import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import type { PendingUser } from '../../types';
import { onboardingAPI } from '../../services/api';
import { useAuthStore } from '../../store';

export const ApprovalsTab: React.FC = () => {
  const { user } = useAuthStore();
  const [pendingApprovals, setPendingApprovals] = useState<PendingUser[]>([]);

  const loadApprovals = async () => {
    try {
      const queue = await onboardingAPI.pendingApprovals();
      setPendingApprovals(queue);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadApprovals();
    }
  }, [user]);

  const handleApprovePendingUser = async (id: string, approve: boolean) => {
    try {
      await onboardingAPI.approve(id, approve);
      alert(approve ? 'User approved!' : 'Application rejected.');
      loadApprovals();
    } catch (e) {
      alert('Verification decision failed.');
    }
  };

  if (user?.role !== 'admin') return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 font-sans">
      <div className="pb-4 border-b border-slate-100 mb-6">
        <h3 className="font-bold text-slate-800 text-lg">Onboarding Verification Desk</h3>
        <p className="text-slate-500 text-xs mt-1">
          Review pending resident flat assignments and approve/reject profiles.
        </p>
      </div>

      <div className="space-y-4">
        {pendingApprovals.length === 0 ? (
          <p className="text-center text-slate-400 py-12 text-sm">
            Waiting room is empty. No pending onboarding registrations.
          </p>
        ) : (
          pendingApprovals.map((req) => (
            <div
              key={req.id}
              className="p-5 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col md:flex-row justify-between md:items-center gap-4"
            >
              <div className="space-y-1.5 text-xs text-slate-600">
                <h4 className="font-bold text-slate-800 text-base">{req.name}</h4>
                <p>
                  <strong>Email:</strong> {req.email}
                </p>
                <p>
                  <strong>Phone:</strong> {req.phone || 'Not provided'}
                </p>
                <p>
                  <strong>Desired flat:</strong> Flat {req.flat_number} ({req.block} Block, Floor {req.floor})
                </p>
                <p>
                  <strong>Occupancy Type:</strong>{' '}
                  <span className="capitalize">{req.resident_type?.replace('_', ' ')}</span>
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleApprovePendingUser(req.id, true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg text-xs transition-colors flex items-center gap-1"
                >
                  <Check size={14} /> Verify &amp; Admit
                </button>
                <button
                  onClick={() => handleApprovePendingUser(req.id, false)}
                  className="border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2 px-4 rounded-lg text-xs transition-colors flex items-center gap-1"
                >
                  <X size={14} /> Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ApprovalsTab;
