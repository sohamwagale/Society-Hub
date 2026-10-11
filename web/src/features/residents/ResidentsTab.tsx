import React, { useState } from 'react';
import { Search, Check, X, PhoneCall, Mail, Users } from 'lucide-react';
import { useAuthStore } from '../../store';
import { toast } from '../../components/Toast';
import { useResidentsQuery, useSetCommitteeMutation } from '../../hooks/queries/useResidents';
import { ResidentsSkeleton } from '../../components/skeleton';
import EmptyState from '../../components/ui/EmptyState';
import type { ResidentInfo } from '../../types';

export const ResidentsTab: React.FC = () => {
  const { user } = useAuthStore();
  const { data: residents = [], isLoading } = useResidentsQuery();
  const setCommitteeMutation = useSetCommitteeMutation();

  const [searchQuery, setSearchQuery] = useState('');
  const [committeeRoleInput, setCommitteeRoleInput] = useState('');
  const [activeResidentId, setActiveResidentId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSetCommittee = async (id: string, isCommittee: boolean) => {
    try {
      await setCommitteeMutation.mutateAsync({
        userId: id,
        isCommittee,
        role: isCommittee ? committeeRoleInput : undefined,
      });
      toast.success(isCommittee ? 'Committee member appointed!' : 'Committee status revoked.');
      setCommitteeRoleInput('');
      setActiveResidentId(null);
    } catch {
      toast.error('Failed to update resident committee membership.');
    }
  };

  const filteredResidents = residents.filter(
    (res) =>
      res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (res.email && res.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (res.phone && res.phone.includes(searchQuery)) ||
      (res.flat_number && res.flat_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (res.block && res.block.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selected = filteredResidents.find((r) => r.id === selectedId) || null;

  if (isLoading && residents.length === 0) {
    return <ResidentsSkeleton />;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 mb-6">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">Residents</h3>
          <p className="text-slate-500 text-sm mt-1">Look up verified society residents.</p>
        </div>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search name, flat, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm bg-white w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-11"
          />
        </div>
      </div>

      {filteredResidents.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No matching residents"
          description="Try another name, flat, or email, or wait until more members are approved."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="md:hidden space-y-3">
              {filteredResidents.map((res) => (
                <ResidentCard
                  key={res.id}
                  res={res}
                  selected={selectedId === res.id}
                  onSelect={() => setSelectedId(res.id)}
                />
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 z-10">
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <th className="p-3.5 font-bold">Resident</th>
                    <th className="p-3.5 font-bold">Flat</th>
                    <th className="p-3.5 font-bold">Board role</th>
                    <th className="p-3.5 font-bold">Email</th>
                    <th className="p-3.5 font-bold">Call</th>
                    {user?.role === 'admin' && <th className="p-3.5 font-bold text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredResidents.map((res) => (
                    <tr
                      key={res.id}
                      onClick={() => setSelectedId(res.id)}
                      className={`border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer ${
                        selectedId === res.id ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      <td className="p-3.5">
                        <p className="font-bold text-slate-800">{res.name}</p>
                        <p className="text-slate-500 text-xs capitalize">{res.role}</p>
                      </td>
                      <td className="p-3.5 font-medium text-slate-700">
                        {res.flat_number ? `Flat ${res.flat_number} (${res.block} Block)` : 'Unassigned'}
                      </td>
                      <td className="p-3.5 font-medium">
                        {res.is_committee ? (
                          <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold">
                            {res.committee_role || 'Committee'}
                          </span>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <a
                          href={`mailto:${res.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-slate-700 hover:text-indigo-600 font-medium hover:underline"
                        >
                          <Mail size={14} className="text-slate-400 shrink-0" />
                          <span>{res.email}</span>
                        </a>
                      </td>
                      <td className="p-3.5">
                        {res.phone ? (
                          <a
                            href={`tel:${res.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 px-2.5 py-2 min-h-11 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 text-indigo-700 font-semibold rounded-xl"
                          >
                            <PhoneCall size={13} className="shrink-0" />
                            <span>{res.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Not provided</span>
                        )}
                      </td>
                      {user?.role === 'admin' && (
                        <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <CommitteeActions
                            res={res}
                            activeResidentId={activeResidentId}
                            committeeRoleInput={committeeRoleInput}
                            setCommitteeRoleInput={setCommitteeRoleInput}
                            setActiveResidentId={setActiveResidentId}
                            handleSetCommittee={handleSetCommittee}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="hidden lg:block bg-slate-50 border border-slate-200 rounded-2xl p-5 min-h-[280px]">
            {!selected ? (
              <p className="text-sm text-slate-400 text-center py-16">Select a resident to view their profile.</p>
            ) : (
              <div className="space-y-3 text-sm">
                <h4 className="font-bold text-slate-800 text-lg">{selected.name}</h4>
                <p className="text-slate-500 capitalize">{selected.role}</p>
                <p>{selected.flat_number ? `Flat ${selected.flat_number} (${selected.block} Block)` : 'Unassigned'}</p>
                {selected.email && (
                  <a href={`mailto:${selected.email}`} className="block text-indigo-600 font-semibold">
                    {selected.email}
                  </a>
                )}
                {selected.phone && (
                  <a
                    href={`tel:${selected.phone}`}
                    className="inline-flex items-center gap-2 min-h-11 px-3 rounded-xl bg-indigo-600 text-white font-semibold"
                  >
                    <PhoneCall size={16} /> Call
                  </a>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
};

const ResidentCard: React.FC<{ res: ResidentInfo; selected: boolean; onSelect: () => void }> = ({
  res,
  selected,
  onSelect,
}) => (
  <button
    type="button"
    onClick={onSelect}
    className={`w-full text-left p-4 rounded-2xl border ${
      selected ? 'border-indigo-500 bg-indigo-50/40' : 'border-slate-200 bg-slate-50'
    }`}
  >
    <p className="font-bold text-slate-800">{res.name}</p>
    <p className="text-sm text-slate-500 mt-1">
      {res.flat_number ? `Flat ${res.flat_number} (${res.block} Block)` : 'Unassigned'}
    </p>
    <div className="flex gap-2 mt-3">
      {res.phone && (
        <a
          href={`tel:${res.phone}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-11 bg-indigo-600 text-white text-sm font-semibold rounded-xl"
        >
          <PhoneCall size={14} /> Call
        </a>
      )}
      {res.email && (
        <a
          href={`mailto:${res.email}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-11 border border-slate-300 text-sm font-semibold rounded-xl"
        >
          <Mail size={14} /> Email
        </a>
      )}
    </div>
  </button>
);

const CommitteeActions: React.FC<{
  res: ResidentInfo;
  activeResidentId: string | null;
  committeeRoleInput: string;
  setCommitteeRoleInput: (v: string) => void;
  setActiveResidentId: (v: string | null) => void;
  handleSetCommittee: (id: string, isCommittee: boolean) => void;
}> = ({
  res,
  activeResidentId,
  committeeRoleInput,
  setCommitteeRoleInput,
  setActiveResidentId,
  handleSetCommittee,
}) => {
  if (activeResidentId === res.id) {
    return (
      <div className="flex gap-2 justify-end items-center">
        <input
          type="text"
          placeholder="Role e.g. Secretary"
          value={committeeRoleInput}
          onChange={(e) => setCommitteeRoleInput(e.target.value)}
          className="border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none min-h-11"
        />
        <button
          type="button"
          onClick={() => handleSetCommittee(res.id, true)}
          className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 min-h-11 min-w-11"
        >
          <Check size={14} />
        </button>
        <button
          type="button"
          onClick={() => setActiveResidentId(null)}
          className="bg-slate-100 text-slate-500 p-2 rounded-lg hover:bg-slate-200 min-h-11 min-w-11"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2 justify-end opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
      {res.is_committee ? (
        <button
          type="button"
          onClick={() => handleSetCommittee(res.id, false)}
          className="text-sm text-red-500 font-semibold hover:underline"
        >
          Remove board
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            setActiveResidentId(res.id);
            setCommitteeRoleInput('');
          }}
          className="text-sm text-indigo-600 font-semibold hover:underline"
        >
          Promote board
        </button>
      )}
    </div>
  );
};

export default ResidentsTab;
