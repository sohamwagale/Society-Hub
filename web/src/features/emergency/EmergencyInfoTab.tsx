import React from 'react';
import { useAuthStore } from '../../store';
import { useEmergencyInfo } from './hooks/useEmergencyInfo';
import { SocietyInfoGrid } from './components/SocietyInfoGrid';
import { EmergencyContactsBook } from './components/EmergencyContactsBook';
import { EmergencyModalsManager } from './components/EmergencyModalsManager';

export const EmergencyInfoTab: React.FC = () => {
  const { user } = useAuthStore();
  const infoState = useEmergencyInfo();

  return (
    <div className="space-y-6">
      {/* Statutory credentials */}
      <SocietyInfoGrid
        societyInfo={infoState.societyInfo}
        user={user}
        onOpenAdd={() => infoState.setModalType('add_info')}
        onOpenEdit={infoState.openEditSocietyInfoModal}
        onDeleteInfo={infoState.handleDeleteSocietyInfo}
      />

      {/* Emergency Contact booklet */}
      <EmergencyContactsBook
        emergencyContacts={infoState.emergencyContacts}
        user={user}
        onOpenAddModal={infoState.openAddEmergencyModal}
        onEditContact={infoState.handleEditEmergencyClick}
        onDeleteContact={infoState.handleDeleteEmergency}
      />

      {/* Modals Manager */}
      <EmergencyModalsManager
        modalType={infoState.modalType}
        setModalType={infoState.setModalType}
        isEmergSuccess={infoState.isEmergSuccess}
        setEditingContact={infoState.setEditingContact}
        emergName={infoState.emergName}
        setEmergName={infoState.setEmergName}
        emergPhone={infoState.emergPhone}
        setEmergPhone={infoState.setEmergPhone}
        emergRole={infoState.emergRole}
        setEmergRole={infoState.setEmergRole}
        editInfoKey={infoState.editInfoKey}
        editInfoValue={infoState.editInfoValue}
        setEditInfoValue={infoState.setEditInfoValue}
        newInfoKey={infoState.newInfoKey}
        setNewInfoKey={infoState.setNewInfoKey}
        newInfoValue={infoState.newInfoValue}
        setNewInfoValue={infoState.setNewInfoValue}
        onAddEmergency={infoState.handleAddEmergency}
        onUpdateEmergency={infoState.handleUpdateEmergency}
        onUpdateSocietyInfo={infoState.handleUpdateSocietyInfo}
        onAddSocietyInfo={infoState.handleAddSocietyInfo}
      />
    </div>
  );
};

export default EmergencyInfoTab;
