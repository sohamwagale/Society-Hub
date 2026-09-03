import React, { useState, useEffect } from 'react';
import { Search, Check, X, PhoneCall, Mail } from 'lucide-react';
import type { ResidentInfo } from '../../types';
import { residentsAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import { toast } from '../../components/Toast';

export const ResidentsTab: React.FC = () => {
  const { user } = useAuthStore();
  const [residents, setResidents] = useState<ResidentInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [committeeRoleInput, setCommitteeRoleInput] = useState('');
  const [activeResidentId, setActiveResidentId] = useState<string | null>(null);

  const loadResidents = async () => {
    try {
      const res = await residentsAPI.list();
      setResidents(res);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadResidents();
  }, []);

  const handleSetCommittee = async (id: string, isCommittee: boolean) => {
    try {
      await residentsAPI.setCommittee(id, isCommittee, isCommittee ? committeeRoleInput : undefined);
      toast.success(isCommittee ? 'Committee member appointed!' : 'Committee status revoked.');
      setCommitteeRoleInput('');
      setActiveResidentId(null);
      loadResidents();
    } catch (e) {
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

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">Residents Registry</h3>
          <p className="text-slate-500 text-xs mt-1">Look up or search other verified society residents.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search name, flat, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs bg-white w-64 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 bg-slate-50/50">
              <th className="p-3.5 font-bold">Resident</th>
              <th className="p-3.5 font-bold">Flat Mapping</th>
              <th className="p-3.5 font-bold">Board Role</th>
              <th className="p-3.5 font-bold">Email Address</th>
              <th className="p-3.5 font-bold">One-Tap Call</th>
              {user?.role === 'admin' && <th className="p-3.5 font-bold text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="text-xs">
            {filteredResidents.length === 0 ? (
              <tr>
                <td colSpan={user?.role === 'admin' ? 6 : 5} className="text-center py-8 text-slate-400">
                  No matching residents found.
                </td>
              </tr>
            ) : (
              filteredResidents.map((res) => (
                <tr key={res.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="p-3.5">
                    <p className="font-bold text-slate-800">{res.name}</p>
                    <p className="text-slate-500 text-[10px] capitalize">{res.role}</p>
                  </td>
                  <td className="p-3.5 font-medium text-slate-700">
                    {res.flat_number ? `Flat ${res.flat_number} (${res.block} Block)` : 'Unassigned'}
                  </td>
                  <td className="p-3.5 font-medium">
                    {res.is_committee ? (
                      <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        {res.committee_role || 'Committee'}
                      </span>
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
                  </td>
                  <td className="p-3.5">
                    <a
                      href={`mailto:${res.email}`}
                      className="inline-flex items-center gap-1.5 text-slate-700 hover:text-indigo-600 font-medium transition-colors hover:underline"
                    >
                      <Mail size={14} className="text-slate-400 shrink-0" />
                      <span>{res.email}</span>
                    </a>
                  </td>
                  <td className="p-3.5">
                    {res.phone ? (
                      <a
                        href={`tel:${res.phone}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 text-indigo-700 font-semibold rounded-lg transition-colors"
                        title={`Call ${res.name}`}
                      >
                        <PhoneCall size={13} className="shrink-0" />
                        <span>{res.phone}</span>
                      </a>
                    ) : (
                      <span className="text-slate-400 text-[11px] italic">Not Provided</span>
                    )}
                  </td>
                  {user?.role === 'admin' && (
                    <td className="p-3.5 text-right">
                      {activeResidentId === res.id ? (
                        <div className="flex gap-2 justify-end items-center">
                          <input
                            type="text"
                            placeholder="Role e.g. Secretary"
                            value={committeeRoleInput}
                            onChange={(e) => setCommitteeRoleInput(e.target.value)}
                            className="border border-slate-300 rounded px-2 py-1 text-[10px] bg-white focus:outline-none"
                          />
                          <button
                            onClick={() => handleSetCommittee(res.id, true)}
                            className="bg-indigo-600 text-white p-1 rounded hover:bg-indigo-700"
                            title="Confirm Board Role"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={() => setActiveResidentId(null)}
                            className="bg-slate-100 text-slate-500 p-1 rounded hover:bg-slate-200"
                            title="Cancel"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-end">
                          {res.is_committee ? (
                            <button
                              onClick={() => handleSetCommittee(res.id, false)}
                              className="text-xs text-red-500 font-semibold hover:underline"
                            >
                              Remove Board
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setActiveResidentId(res.id);
                                setCommitteeRoleInput('');
                              }}
                              className="text-xs text-indigo-600 font-semibold hover:underline"
                            >
                              Promote Board
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResidentsTab;
