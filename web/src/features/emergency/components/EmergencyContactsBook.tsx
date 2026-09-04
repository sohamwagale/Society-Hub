import React from 'react';
import { Plus } from 'lucide-react';
import type { EmergencyContact, User } from '../../../types';
import { EmergencyContactCard } from './EmergencyContactCard';

interface EmergencyContactsBookProps {
  emergencyContacts: EmergencyContact[];
  user: User | null;
  onOpenAddModal: () => void;
  onEditContact: (contact: EmergencyContact) => void;
  onDeleteContact: (id: string) => void;
}

export const EmergencyContactsBook: React.FC<EmergencyContactsBookProps> = ({
  emergencyContacts,
  user,
  onOpenAddModal,
  onEditContact,
  onDeleteContact,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 font-sans">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">One-Tap Emergency Contacts Book</h3>
          <p className="text-slate-500 text-xs mt-1">
            Access security guards, local emergency departments, plumbers, and support.
          </p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={onOpenAddModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Plus size={16} /> Add Contact
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {emergencyContacts.length === 0 ? (
          <p className="col-span-full text-slate-400 text-sm text-center py-12">No emergency entries.</p>
        ) : (
          emergencyContacts.map((c) => (
            <EmergencyContactCard
              key={c.id}
              contact={c}
              user={user}
              onEdit={onEditContact}
              onDelete={onDeleteContact}
            />
          ))
        )}
      </div>
    </div>
  );
};
