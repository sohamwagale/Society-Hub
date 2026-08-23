import React from 'react';
import { Search, X } from 'lucide-react';
import type { Flat, ResidentInfo } from '../../../types';

interface AssignResidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFlat: Flat | null;
  residents: ResidentInfo[];
  residentAssignSearch: string;
  setResidentAssignSearch: (val: string) => void;
  onAssignResident: (residentId: string) => void;
}

export const AssignResidentModal: React.FC<AssignResidentModalProps> = ({
  isOpen,
  onClose,
  selectedFlat,
  residents,
  residentAssignSearch,
  setResidentAssignSearch,
  onAssignResident
}) => {
  if (!isOpen || !selectedFlat) return null;

  const filteredAssignResidents = residents.filter(
    (res) =>
      res.name.toLowerCase().includes(residentAssignSearch.toLowerCase()) ||
      res.email.toLowerCase().includes(residentAssignSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md flex flex-col h-[400px]">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-4">
          <h3 className="font-bold text-slate-800 text-lg">Locate Occupant for {selectedFlat.flat_number}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Search name or email..."
            value={residentAssignSearch}
            onChange={(e) => setResidentAssignSearch(e.target.value)}
            className="pl-9 pr-4 py-1.5 border border-slate-300 rounded-lg text-xs bg-white w-full focus:outline-none"
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredAssignResidents.map((res) => (
            <div
              key={res.id}
              onClick={() => onAssignResident(res.id)}
              className="flex items-center gap-3 p-2 bg-slate-50 hover:bg-indigo-50/20 border border-slate-150 rounded-lg cursor-pointer text-xs"
            >
              <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                {res.name.slice(0, 2)}
              </div>
              <div>
                <p className="font-bold text-slate-800">{res.name}</p>
                <p className="text-slate-500 text-[10px]">{res.email}</p>
              </div>
              {res.flat_id && res.flat_id !== selectedFlat.id && (
                <span className="ml-auto text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold">
                  Occupied
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AssignResidentModal;
