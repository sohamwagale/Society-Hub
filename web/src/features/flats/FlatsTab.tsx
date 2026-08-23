import React, { useState, useEffect } from 'react';
import { Clock, Check, X, Search, Plus } from 'lucide-react';
import type { Flat, PendingUser, ResidentInfo } from '../../types';
import { flatsAPI, residentsAPI, onboardingAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import CreateFlatModal from './components/CreateFlatModal';
import AssignResidentModal from './components/AssignResidentModal';

export const FlatsTab: React.FC = () => {
  const { user } = useAuthStore();
  const [flats, setFlats] = useState<Flat[]>([]);
  const [residents, setResidents] = useState<ResidentInfo[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingUser[]>([]);
  const [flatSearch, setFlatSearch] = useState('');

  // Modals & sub-state
  const [modalType, setModalType] = useState<string | null>(null);
  const [newFlatNumber, setNewFlatNumber] = useState('');
  const [newFlatBlock, setNewFlatBlock] = useState('');
  const [newFlatFloor, setNewFlatFloor] = useState('');
  const [selectedFlatForAssign, setSelectedFlatForAssign] = useState<Flat | null>(null);
  const [residentAssignSearch, setResidentAssignSearch] = useState('');

  const loadData = async () => {
    try {
      const [resFlats, resList, queue] = await Promise.all([
        flatsAPI.list(),
        residentsAPI.list(),
        user?.role === 'admin' ? onboardingAPI.pendingApprovals() : Promise.resolve([])
      ]);
      setFlats(resFlats.sort((a, b) => a.flat_number.localeCompare(b.flat_number)));
      setResidents(resList);
      setPendingApprovals(queue);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleApprovePendingUser = async (id: string, approve: boolean) => {
    try {
      await onboardingAPI.approve(id, approve);
      alert(approve ? 'User approved!' : 'Application rejected.');
      loadData();
    } catch (e) {
      alert('Verification decision failed.');
    }
  };

  const handleCreateFlatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlatNumber || !newFlatBlock || !newFlatFloor) return;
    try {
      await flatsAPI.create({ flat_number: newFlatNumber, block: newFlatBlock, floor: newFlatFloor });
      setModalType(null);
      setNewFlatNumber('');
      setNewFlatBlock('');
      setNewFlatFloor('');
      loadData();
    } catch (e) {
      alert('Failed to register flat.');
    }
  };

  const handleAssignResident = async (residentId: string) => {
    if (!selectedFlatForAssign) return;
    try {
      await flatsAPI.assignUser(residentId, selectedFlatForAssign.id);
      alert('Resident linked successfully!');
      setModalType(null);
      setSelectedFlatForAssign(null);
      setResidentAssignSearch('');
      loadData();
    } catch (e) {
      alert('Failed to assign resident.');
    }
  };

  const handleVacateFlat = async (flat: Flat) => {
    const resident = residents.find((r) => r.flat_id === flat.id);
    if (!resident) return;
    if (!window.confirm(`Are you sure you want to vacate ${resident.name} from Flat ${flat.flat_number}?`)) return;
    try {
      await flatsAPI.assignUser(resident.id, null);
      alert('Flat vacated successfully!');
      loadData();
    } catch (e) {
      alert('Failed to vacate flat.');
    }
  };

  const filteredFlats = flats.filter(
    (f) =>
      f.flat_number.toLowerCase().includes(flatSearch.toLowerCase()) ||
      f.block.toLowerCase().includes(flatSearch.toLowerCase())
  );

  const getResidentForFlat = (flatId: string) => residents.find((r) => r.flat_id === flatId);

  if (user?.role !== 'admin') return null;

  return (
    <div className="space-y-6">
      {/* Pending validation requests (KYC queue inline!) */}
      {pendingApprovals.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-amber-800 font-bold mb-4">
            <Clock size={20} />
            <span>Stakeholder Verification Required ({pendingApprovals.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingApprovals.map((req) => (
              <div key={req.id} className="bg-white p-4 rounded-lg border border-amber-100 text-xs space-y-2 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{req.name}</p>
                    <p className="text-slate-500">{req.email}</p>
                  </div>
                  <span className="bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded uppercase text-[10px]">
                    {req.resident_type?.replace('_', ' ')}
                  </span>
                </div>
                <p>
                  <strong>Proposed Flat:</strong> Flat {req.flat_number} ({req.block} Block, Floor {req.floor})
                </p>
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleApprovePendingUser(req.id, true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded text-[10px] flex items-center gap-1"
                  >
                    <Check size={12} /> Approve
                  </button>
                  <button
                    onClick={() => handleApprovePendingUser(req.id, false)}
                    className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-1.5 rounded border border-red-200 text-[10px] flex items-center gap-1"
                  >
                    <X size={12} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flat registry list */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 font-sans">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Physical Units Inventory</h3>
            <p className="text-slate-500 text-xs mt-1">
              Manage physical society apartments and assign verified resident occupants.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Filter flat number/block..."
                value={flatSearch}
                onChange={(e) => setFlatSearch(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs bg-white w-60 focus:outline-none"
              />
            </div>
            <button
              onClick={() => setModalType('create_flat')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus size={16} /> Add Flat Asset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFlats.map((flat) => {
            const resident = getResidentForFlat(flat.id);
            return (
              <div
                key={flat.id}
                className="p-4 bg-slate-50 border border-slate-100 hover:border-slate-300 rounded-xl flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center font-bold text-base border border-indigo-100">
                    {flat.flat_number}
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                      Block {flat.block} • Floor {flat.floor}
                    </p>
                    {resident ? (
                      <p className="text-emerald-700 font-bold text-xs mt-0.5">{resident.name}</p>
                    ) : (
                      <p className="text-red-500 font-bold text-[10px] mt-0.5">Vacant / Unassigned</p>
                    )}
                  </div>
                </div>

                <div>
                  {resident ? (
                    <button
                      onClick={() => handleVacateFlat(flat)}
                      className="border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1.5 rounded transition-colors"
                    >
                      Vacate
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedFlatForAssign(flat);
                        setModalType('assign_flat');
                      }}
                      className="border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1.5 rounded transition-colors"
                    >
                      Assign
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <CreateFlatModal
        isOpen={modalType === 'create_flat'}
        onClose={() => setModalType(null)}
        onSubmit={handleCreateFlatSubmit}
        newFlatNumber={newFlatNumber}
        setNewFlatNumber={setNewFlatNumber}
        newFlatBlock={newFlatBlock}
        setNewFlatBlock={setNewFlatBlock}
        newFlatFloor={newFlatFloor}
        setNewFlatFloor={setNewFlatFloor}
      />

      <AssignResidentModal
        isOpen={modalType === 'assign_flat'}
        onClose={() => setModalType(null)}
        selectedFlat={selectedFlatForAssign}
        residents={residents}
        residentAssignSearch={residentAssignSearch}
        setResidentAssignSearch={setResidentAssignSearch}
        onAssignResident={handleAssignResident}
      />
    </div>
  );
};

export default FlatsTab;
