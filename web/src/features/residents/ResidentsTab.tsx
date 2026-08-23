import React, { useState, useEffect } from 'react';
import { Search, Check, X } from 'lucide-react';
import type { ResidentInfo } from '../../types';
import { residentsAPI } from '../../services/api';
import { useAuthStore } from '../../store';

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
      setCommitteeRoleInput('');
      setActiveResidentId(null);
      loadResidents();
    } catch (e) {
      alert('Failed to update resident committee membership.');
    }
  };

  const filteredResidents = residents.filter(
    (res) =>
      res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
            placeholder="Search name, flat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs bg-white w-60 focus:outline-none"
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
              <th className="p-3.5 font-bold">Contact</th>
              {user?.role === 'admin' && <th className="p-3.5 font-bold text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="text-xs">
            {filteredResidents.map((res) => (
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
                <td className="p-3.5 text-slate-600">
                  <p>{res.email}</p>
                  <p className="text-[10px] text-slate-500">{res.phone || 'No phone number'}</p>
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
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={() => setActiveResidentId(null)}
                          className="bg-slate-100 text-slate-500 p-1 rounded hover:bg-slate-200"
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResidentsTab;
