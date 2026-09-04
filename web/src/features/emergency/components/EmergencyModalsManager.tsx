import React from 'react';
import type { EmergencyContact } from '../../../types';
import AddEmergencyModal from './AddEmergencyModal';
import EditEmergencyModal from './EditEmergencyModal';
import EditSocietyInfoModal from './EditSocietyInfoModal';
import AddSocietyInfoModal from './AddSocietyInfoModal';

interface EmergencyModalsManagerProps {
  modalType: string | null;
  setModalType: (type: string | null) => void;
  isEmergSuccess: boolean;
  setEditingContact: (contact: EmergencyContact | null) => void;
  emergName: string;
  setEmergName: (name: string) => void;
  emergPhone: string;
  setEmergPhone: (phone: string) => void;
  emergRole: string;
  setEmergRole: (role: string) => void;
  editInfoKey: string;
  editInfoValue: string;
  setEditInfoValue: (val: string) => void;
  newInfoKey: string;
  setNewInfoKey: (key: string) => void;
  newInfoValue: string;
  setNewInfoValue: (val: string) => void;
  onAddEmergency: (e: React.FormEvent) => void;
  onUpdateEmergency: (e: React.FormEvent) => void;
  onUpdateSocietyInfo: (e: React.FormEvent) => void;
  onAddSocietyInfo: (e: React.FormEvent) => void;
}

export const EmergencyModalsManager: React.FC<EmergencyModalsManagerProps> = ({
  modalType,
  setModalType,
  isEmergSuccess,
  setEditingContact,
  emergName,
  setEmergName,
  emergPhone,
  setEmergPhone,
  emergRole,
  setEmergRole,
  editInfoKey,
  editInfoValue,
  setEditInfoValue,
  newInfoKey,
  setNewInfoKey,
  newInfoValue,
  setNewInfoValue,
  onAddEmergency,
  onUpdateEmergency,
  onUpdateSocietyInfo,
  onAddSocietyInfo,
}) => {
  return (
    <>
      <AddEmergencyModal
        isOpen={modalType === 'emergency'}
        isSuccess={isEmergSuccess}
        onClose={() => setModalType(null)}
        onSubmit={onAddEmergency}
        emergName={emergName}
        setEmergName={setEmergName}
        emergPhone={emergPhone}
        setEmergPhone={setEmergPhone}
        emergRole={emergRole}
        setEmergRole={setEmergRole}
      />

      <EditEmergencyModal
        isOpen={modalType === 'edit_emergency'}
        isSuccess={isEmergSuccess}
        onClose={() => {
          setModalType(null);
          setEditingContact(null);
        }}
        onSubmit={onUpdateEmergency}
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
        onSubmit={onUpdateSocietyInfo}
        editInfoKey={editInfoKey}
        editInfoValue={editInfoValue}
        setEditInfoValue={setEditInfoValue}
      />

      <AddSocietyInfoModal
        isOpen={modalType === 'add_info'}
        onClose={() => setModalType(null)}
        onSubmit={onAddSocietyInfo}
        newInfoKey={newInfoKey}
        setNewInfoKey={setNewInfoKey}
        newInfoValue={newInfoValue}
        setNewInfoValue={setNewInfoValue}
      />
    </>
  );
};
