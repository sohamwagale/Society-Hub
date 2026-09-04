import { useState, useEffect } from 'react';
import type { EmergencyContact, SocietyInfoItem } from '../../../types';
import { societyAPI } from '../../../services/api';
import { toast } from '../../../components/Toast';
import { confirmDialog } from '../../../components/ConfirmModal';

export function useEmergencyInfo() {
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [societyInfo, setSocietyInfo] = useState<SocietyInfoItem[]>([]);

  // Modals state
  const [modalType, setModalType] = useState<string | null>(null);
  const [isEmergSuccess, setIsEmergSuccess] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);

  // Form states
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
        societyAPI.getInfo(),
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
      setIsEmergSuccess(true);
      toast.success('Emergency contact added!');
      setTimeout(() => {
        setIsEmergSuccess(false);
        setModalType(null);
        setEmergName('');
        setEmergPhone('');
        setEmergRole('');
        loadData();
      }, 1000);
    } catch {
      toast.error('Failed to add contact.');
    }
  };

  const handleEditEmergencyClick = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setEmergName(contact.name);
    setEmergPhone(contact.phone);
    setEmergRole(contact.role);
    setModalType('edit_emergency');
  };

  const handleUpdateEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;
    try {
      await societyAPI.updateEmergencyContact(editingContact.id, {
        name: emergName,
        phone: emergPhone,
        role: emergRole,
      });
      setIsEmergSuccess(true);
      toast.success('Contact updated successfully!');
      setTimeout(() => {
        setIsEmergSuccess(false);
        setModalType(null);
        setEditingContact(null);
        setEmergName('');
        setEmergPhone('');
        setEmergRole('');
        loadData();
      }, 1000);
    } catch {
      toast.error('Failed to update contact.');
    }
  };

  const handleDeleteEmergency = (id: string) => {
    confirmDialog({
      title: 'Delete Emergency Contact?',
      message: 'This emergency contact entry will be permanently removed.',
      confirmText: 'Delete Contact',
      onConfirm: async () => {
        try {
          await societyAPI.deleteEmergencyContact(id);
          toast.success('Contact removed!');
          loadData();
        } catch {
          toast.error('Failed to remove contact.');
        }
      },
    });
  };

  const handleDeleteSocietyInfo = (key: string) => {
    const formatKeyLabel = (k: string) => k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    confirmDialog({
      title: 'Delete Credential Parameter?',
      message: `Are you sure you want to delete "${formatKeyLabel(key)}"?`,
      confirmText: 'Delete Parameter',
      onConfirm: async () => {
        try {
          await societyAPI.deleteInfo(key);
          toast.success('Parameter removed!');
          loadData();
        } catch {
          toast.error('Failed to remove parameter.');
        }
      },
    });
  };

  const handleUpdateSocietyInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editInfoValue) return;
    try {
      await societyAPI.updateInfo(editInfoKey, editInfoValue);
      toast.success('Parameter updated!');
      setModalType(null);
      setEditInfoKey('');
      setEditInfoValue('');
      loadData();
    } catch {
      toast.error('Failed to update parameter.');
    }
  };

  const handleAddSocietyInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInfoKey || !newInfoValue) return;
    try {
      const formattedKey = newInfoKey.trim().toLowerCase().replace(/\s+/g, '_');
      await societyAPI.updateInfo(formattedKey, newInfoValue);
      toast.success('Parameter added!');
      setModalType(null);
      setNewInfoKey('');
      setNewInfoValue('');
      loadData();
    } catch {
      toast.error('Failed to add custom attribute.');
    }
  };

  const openAddEmergencyModal = () => {
    setEmergName('');
    setEmergPhone('');
    setEmergRole('');
    setModalType('emergency');
  };

  const openEditSocietyInfoModal = (item: SocietyInfoItem) => {
    setEditInfoKey(item.key);
    setEditInfoValue(item.value);
    setModalType('edit_info');
  };

  return {
    emergencyContacts,
    societyInfo,
    modalType,
    setModalType,
    isEmergSuccess,
    editingContact,
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
    handleAddEmergency,
    handleEditEmergencyClick,
    handleUpdateEmergency,
    handleDeleteEmergency,
    handleDeleteSocietyInfo,
    handleUpdateSocietyInfo,
    handleAddSocietyInfo,
    openAddEmergencyModal,
    openEditSocietyInfoModal,
  };
}
