import React, { useState } from 'react';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../store';

export const SettingsTab: React.FC = () => {
  const { user, refreshUser } = useAuthStore();
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [paymentAddress, setPaymentAddress] = useState(user?.payment_address || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [settingsError, setSettingsError] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccess('');
    setSettingsError('');
    try {
      await authAPI.updateProfile({
        name: profileName,
        phone: profilePhone || undefined,
        payment_address: paymentAddress || undefined,
      });
      await refreshUser();
      setSettingsSuccess('Profile details updated successfully!');
    } catch {
      setSettingsError('Failed to update profile settings.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccess('');
    setSettingsError('');
    try {
      await authAPI.changePassword({ old_password: oldPassword, new_password: newPassword });
      setOldPassword('');
      setNewPassword('');
      setSettingsSuccess('Password changed successfully!');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setSettingsError(err.response?.data?.detail || 'Failed to rotate password.');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 font-sans">
      <div className="pb-4 border-b border-slate-100 mb-6">
        <h3 className="font-bold text-slate-800 text-lg">Settings &amp; Profile Settings</h3>
        <p className="text-slate-500 text-xs mt-1">
          Configure profile notifications, update contact info, or revolve passwords.
        </p>
      </div>

      {(settingsSuccess || settingsError) && (
        <div
          className={`p-3 rounded-lg text-xs font-semibold mb-6 ${
            settingsSuccess
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {settingsSuccess || settingsError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Update Information</h4>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Name</label>
            <input
              type="text"
              required
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
            <input
              type="text"
              value={profilePhone}
              onChange={(e) => setProfilePhone(e.target.value.replace(/\D/g, ''))}
              className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              UPI Address (Reimbursements Payout)
            </label>
            <input
              type="text"
              placeholder="e.g. name@okhdfcbank"
              value={paymentAddress}
              onChange={(e) => setPaymentAddress(e.target.value)}
              className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg text-xs transition-colors"
          >
            Save Profile Updates
          </button>
        </form>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Rotate Password</h4>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Old Password</label>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg text-xs transition-colors"
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default SettingsTab;
