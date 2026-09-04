import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { SocietyInfoItem, User } from '../../../types';

interface SocietyInfoGridProps {
  societyInfo: SocietyInfoItem[];
  user: User | null;
  onOpenAdd: () => void;
  onOpenEdit: (item: SocietyInfoItem) => void;
  onDeleteInfo: (key: string) => void;
}

export const SocietyInfoGrid: React.FC<SocietyInfoGridProps> = ({
  societyInfo,
  user,
  onOpenAdd,
  onOpenEdit,
  onDeleteInfo,
}) => {
  const formatKey = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 mb-6">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">Society Credentials Notice</h3>
          <p className="text-slate-500 text-xs mt-1">
            Review legal, statutory, and configuration settings of the society.
          </p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={onOpenAdd}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1"
          >
            <Plus size={14} /> Add Parameter
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {societyInfo.map((item) => (
          <div key={item.key} className="p-4 bg-slate-50 border border-slate-100 rounded-xl relative group">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{formatKey(item.key)}</p>
            <p className="text-slate-800 font-semibold text-sm mt-1">{item.value}</p>
            {user?.role === 'admin' && (
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  onClick={() => onOpenEdit(item)}
                  className="px-1.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] text-indigo-600 font-bold transition-all"
                  title="Edit parameter"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDeleteInfo(item.key)}
                  className="p-1 bg-white hover:bg-red-50 border border-slate-200 rounded text-red-500 hover:text-red-600 transition-all"
                  title="Delete parameter"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
