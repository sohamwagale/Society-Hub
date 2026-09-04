import React, { useState } from 'react';
import { ShieldCheck, RefreshCw, Filter, ChevronLeft, ChevronRight, Activity, Download } from 'lucide-react';
import { activityLogAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import { useActivityLogsQuery } from '../../hooks/queries/useActivityLogs';

export const ActivityLogTab: React.FC = () => {
  const { user } = useAuthStore();
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [page, setPage] = useState(0);
  const limit = 20;

  const {
    data: logs = [],
    isLoading: loading,
    isFetching,
    refetch,
  } = useActivityLogsQuery(page * limit, limit, selectedEntity || undefined);


  if (user?.role !== 'admin') {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center font-sans">
        <p className="text-slate-500 text-sm">Access Restricted. Administrative privileges required.</p>
      </div>
    );
  }

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getEntityBadgeColor = (entity?: string | null) => {
    switch (entity?.toLowerCase()) {
      case 'billing':
      case 'bill':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'expense':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'reimbursement':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 font-sans space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-indigo-600" size={22} />
            <h3 className="font-bold text-slate-800 text-lg">System Audit & Activity Logs</h3>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Track system-wide administrative actions, resident updates, and audit trails.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Entity Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
            <Filter size={14} className="text-slate-400" />
            <select
              value={selectedEntity}
              onChange={(e) => {
                setSelectedEntity(e.target.value);
                setPage(0);
              }}
              className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="">All</option>
              <option value="billing">Billing</option>
              <option value="expense">Expenses</option>
              <option value="reimbursement">Reimbursements</option>
            </select>
          </div>

          <a
            href={activityLogAPI.getExportCsvUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-lg transition-colors"
          >
            <Download size={14} />
            Export CSV
          </a>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg transition-colors"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Logs Table / List */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[550px] text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider bg-slate-50/50">
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">User</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Entity</th>
              <th className="py-3 px-4">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="animate-spin text-indigo-600" size={18} />
                    <span>Loading audit records...</span>
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  <Activity size={32} className="mx-auto mb-2 text-slate-300" />
                  <p>No activity log entries found.</p>
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                    {formatTimestamp(log.created_at)}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                    {log.user_name}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-700">
                    {log.action}
                  </td>
                  <td className="py-3.5 px-4">
                    {log.entity_type ? (
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${getEntityBadgeColor(
                          log.entity_type
                        )}`}
                      >
                        {log.entity_type.toUpperCase()}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                    {log.details || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-500">
        <span>Page {page + 1}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={logs.length < limit || loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogTab;
