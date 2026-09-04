import React from 'react';
import type { Bill, BillResidentStatus } from '../../../types';

interface FlatAuditPanelProps {
  selectedBillId: string | null;
  bills: Bill[];
  complianceList: BillResidentStatus[];
  loadingCompliance: boolean;
}

export const FlatAuditPanel: React.FC<FlatAuditPanelProps> = ({
  selectedBillId,
  bills,
  complianceList,
  loadingCompliance,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Flat Payment Audits</h4>
      {!selectedBillId ? (
        <p className="text-xs text-slate-400 leading-normal">
          Select "View Flat Audits" on any billing card to audit flat compliance.
        </p>
      ) : loadingCompliance ? (
        <div className="text-xs text-slate-500">Loading audit records...</div>
      ) : (
        <div className="space-y-3.5 max-h-[380px] overflow-y-auto">
          <p className="text-xs text-slate-600 font-semibold mb-2">
            Bill: {bills.find((b) => b.id === selectedBillId)?.title}
          </p>
          {complianceList.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4">No flat payment records for this cycle yet.</p>
          ) : (
            complianceList.map((compliance) => (
              <div
                key={compliance.user_id}
                className="flex justify-between items-center p-2.5 bg-slate-50 rounded border border-slate-100 text-xs"
              >
                <div>
                  <p className="font-bold text-slate-800">Flat {compliance.flat}</p>
                  <p className="text-slate-500 text-[10px]">
                    {compliance.name && compliance.name !== 'Vacant / Unassigned'
                      ? `Paid by: ${compliance.name}`
                      : 'Vacant / Unassigned'}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block font-bold text-[10px] px-2 py-0.5 rounded ${
                      compliance.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {compliance.status}
                  </span>
                  {compliance.paid_at && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      Paid on {new Date(compliance.paid_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
