import React from 'react';
import { PhoneCall, Pencil, Trash2 } from 'lucide-react';
import type { EmergencyContact, User } from '../../../types';

interface EmergencyContactCardProps {
  contact: EmergencyContact;
  user: User | null;
  onEdit: (contact: EmergencyContact) => void;
  onDelete: (id: string) => void;
}

export const EmergencyContactCard: React.FC<EmergencyContactCardProps> = ({
  contact,
  user,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center hover:border-slate-300 transition-all">
      <div>
        <p className="font-bold text-slate-800 text-base">{contact.name}</p>
        <p className="text-slate-500 text-xs capitalize mt-0.5">{contact.role}</p>
        <p className="text-indigo-600 font-semibold text-sm mt-2">{contact.phone}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <a
          href={`tel:${contact.phone}`}
          className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 p-2.5 rounded-full transition-colors"
          title="Call Contact"
        >
          <PhoneCall size={18} />
        </a>
        {user?.role === 'admin' && (
          <>
            <button
              onClick={() => onEdit(contact)}
              title="Edit Contact"
              className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-full transition-colors"
            >
              <Pencil size={18} />
            </button>
            <button
              onClick={() => onDelete(contact.id)}
              title="Delete Contact"
              className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
            >
              <Trash2 size={18} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
