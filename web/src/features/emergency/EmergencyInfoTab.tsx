import React, { useState, useEffect } from 'react';
import { Plus, PhoneCall, Trash2 } from 'lucide-react';
import type { EmergencyContact } from '../../types';
import { societyAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import AddEmergencyModal from './components/AddEmergencyModal';
import EditSocietyInfoModal from './components/EditSocietyInfoModal';
import AddSocietyInfoModal from './components/AddSocietyInfoModal';

export const EmergencyInfoTab: React.FC = () => {
  const { user } = useAuthStore();
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [societyInfo, setSocietyInfo] = useState<any[]>([]);

  // Modals state
  const [modalType, setModalType] = useState<string | null>(null);
  const [emergName, setEmergName] = useState('');
  const [emergPhone, setEmergPhone] = useState('');
  const [emergRole, setEmergRole] = useState('');
  const [editInfoKey, setEditInfoKey] = useState('');
  const [editInfoValue, setEditInfoValue] = useState('');
  const [newInfoKey, setNewInfoKey] = useState('');
  const [newInfoValue, setNewInfoValue] = useState('');

  const loadData = async () => {
    try {
      const [contacts, info] = await Promise.all([
        societyAPI.getEmergencyContacts(),
        societyAPI.getInfo()
      ]);
      setEmergencyContacts(contacts);
      setSocietyInfo(info);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await societyAPI.createEmergencyContact({ name: emergName, phone: emergPhone, role: emergRole });
      setModalType(null);
      setEmergName('');
      setEmergPhone('');
      setEmergRole('');
      loadData();
    } catch (e) {
      alert('Failed to add contact.');
    }
  };

  const handleDeleteEmergency = async (id: string) => {
    if (!window.confirm('Delete emergency contact?')) return;
    try {
      await societyAPI.deleteEmergencyContact(id);
      loadData();
    } catch (e) {
      alert('Failed to remove contact.');
    }
  };

  const handleUpdateSocietyInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editInfoValue) return;
    try {
      await societyAPI.updateInfo(editInfoKey, editInfoValue);
      setModalType(null);
      setEditInfoKey('');
      setEditInfoValue('');
      loadData();
    } catch (e) {
      alert('Failed to update parameter.');
    }
  };

  const handleAddSocietyInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInfoKey || !newInfoValue) return;
    try {
      const formattedKey = newInfoKey.trim().toLowerCase().replace(/\s+/g, '_');
      await societyAPI.updateInfo(formattedKey, newInfoValue);
      setModalType(null);
      setNewInfoKey('');
      setNewInfoValue('');
      loadData();
    } catch (e) {
      alert('Failed to add custom attribute.');
    }
  };

  const formatKey = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-6">
      {/* Statutory credentials */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 font-sans">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Society Credentials Notice</h3>
            <p className="text-slate-500 text-xs mt-1">
              Review legal, statutory, and configuration settings of the society.
            </p>
          </div>
          {user?.role === 'admin' && (
            <button
              onClick={() => setModalType('add_info')}
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
                <button
                  onClick={() => {
                    setEditInfoKey(item.key);
                    setEditInfoValue(item.value);
                    setModalType('edit_info');
                  }}
                  className="absolute top-2.5 right-2.5 p-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] text-indigo-600 font-bold transition-all opacity-0 group-hover:opacity-100"
                >
                  Edit
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Emergency Contact booklet */}
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
              onClick={() => setModalType('emergency')}
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
              <div
                key={c.id}
                className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center hover:border-slate-300 transition-all"
              >
                <div>
                  <p className="font-bold text-slate-800 text-base">{c.name}</p>
                  <p className="text-slate-500 text-xs capitalize mt-0.5">{c.role}</p>
                  <p className="text-indigo-600 font-semibold text-sm mt-2">{c.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${c.phone}`}
                    className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 p-2.5 rounded-full transition-colors"
                  >
                    <PhoneCall size={18} />
                  </a>
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => handleDeleteEmergency(c.id)}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-full"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AddEmergencyModal
        isOpen={modalType === 'emergency'}
        onClose={() => setModalType(null)}
        onSubmit={handleAddEmergency}
        emergName={emergName}
        setEmergName={setEmergName}
        emergPhone={emergPhone}
        setEmergPhone={setEmergPhone}
        emergRole={emergRole}
        setEmergRole={setEmergRole}
      />

      <EditSocietyInfoModal
        isOpen={modalType === 'edit_info'}
        onClose={() => setModalType(null)}
        onSubmit={handleUpdateSocietyInfo}
        editInfoKey={editInfoKey}
        editInfoValue={editInfoValue}
        setEditInfoValue={setEditInfoValue}
      />

      <AddSocietyInfoModal
        isOpen={modalType === 'add_info'}
        onClose={() => setModalType(null)}
        onSubmit={handleAddSocietyInfo}
        newInfoKey={newInfoKey}
        setNewInfoKey={setNewInfoKey}
        newInfoValue={newInfoValue}
        setNewInfoValue={setNewInfoValue}
      />
    </div>
  );
};

export default EmergencyInfoTab;
