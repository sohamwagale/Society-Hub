import React, { useState } from 'react';
import { ShieldCheck, RefreshCw, Filter, ChevronLeft, ChevronRight, Activity, Download } from 'lucide-react';
import { activityLogAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import { useActivityLogsQuery } from '../../hooks/queries/useActivityLogs';
import { ActivityLogSkeleton } from '../../components/skeleton';
import EmptyState from '../../components/ui/EmptyState';

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

  if (loading && logs.length === 0) {
    return <ActivityLogSkeleton />;
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

      {/* Empty State */}
      {!loading && logs.length === 0 && (
        <EmptyState
          icon={Activity}
          title="No activity log entries found"
          description={
            selectedEntity
              ? `No logs match the "${selectedEntity}" filter. Try switching back to All.`
              : 'System-wide administrative actions and resident events will appear here.'
          }
          action={
            selectedEntity ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedEntity('');
                  setPage(0);
                }}
                className="bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-xl min-h-11"
              >
                Clear filter
              </button>
            ) : undefined
          }
        />
      )}

      {/* Logs Content */}
      {logs.length > 0 && (
        <>
          {/* Mobile Card List */}
          <div className="md:hidden space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-slate-800">{log.user_name}</span>
                  {log.entity_type && (
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-bold border shrink-0 ${getEntityBadgeColor(
                        log.entity_type
                      )}`}
                    >
                      {log.entity_type.toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="font-medium text-slate-700">{log.action}</p>
                {log.details && (
                  <p className="text-xs text-slate-500 bg-white p-2.5 rounded-xl border border-slate-200/70">
                    {log.details}
                  </p>
                )}
                <p className="text-xs text-slate-400 text-right pt-1">
                  {formatTimestamp(log.created_at)}
                </p>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-xs tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap text-xs">
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
                          className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${getEntityBadgeColor(
                            log.entity_type
                          )}`}
                        >
                          {log.entity_type.toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-sm truncate text-xs">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

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
