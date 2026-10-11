import React, { useState } from 'react';
import { User, Lock, Wallet, Shield, CheckCircle, AlertCircle, Building, Smartphone, Mail } from 'lucide-react';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import { SettingsSkeleton } from '../../components/skeleton';

export const SettingsTab: React.FC = () => {
  const { user, refreshUser } = useAuthStore();
  const [activeSection, setActiveSection] = useState<'profile' | 'security' | 'payout'>('profile');

  // Form states
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [paymentAddress, setPaymentAddress] = useState(user?.payment_address || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!user) {
    return <SettingsSkeleton />;
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccess('');
    setSettingsError('');
    setSubmitting(true);
    try {
      await authAPI.updateProfile({
        name: profileName,
        phone: profilePhone || undefined,
      });
      await refreshUser();
      setSettingsSuccess('Profile details updated successfully!');
    } catch {
      setSettingsError('Failed to update profile settings.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccess('');
    setSettingsError('');
    setSubmitting(true);
    try {
      await authAPI.updateProfile({
        payment_address: paymentAddress || undefined,
      });
      await refreshUser();
      setSettingsSuccess('UPI payout address updated successfully!');
    } catch {
      setSettingsError('Failed to update payout details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccess('');
    setSettingsError('');

    if (newPassword !== confirmPassword) {
      setSettingsError('New password and confirmation do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setSettingsError('New password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await authAPI.changePassword({ old_password: oldPassword, new_password: newPassword });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSettingsSuccess('Password changed successfully!');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setSettingsError(err.response?.data?.detail || 'Failed to update password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Account Settings</h2>
        <p className="text-slate-500 text-sm mt-1">
          Manage your personal profile, account security, and payout methods.
        </p>
      </div>

      {/* Segmented Section Navigation */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => {
            setActiveSection('profile');
            setSettingsSuccess('');
            setSettingsError('');
          }}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap min-h-11 ${
            activeSection === 'profile'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User size={16} /> Profile
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveSection('security');
            setSettingsSuccess('');
            setSettingsError('');
          }}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap min-h-11 ${
            activeSection === 'security'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Lock size={16} /> Security
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveSection('payout');
            setSettingsSuccess('');
            setSettingsError('');
          }}
          className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap min-h-11 ${
            activeSection === 'payout'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wallet size={16} /> Payout UPI
        </button>
      </div>

      {/* Notifications */}
      {settingsSuccess && (
        <div className="p-4 rounded-xl text-sm font-medium bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
          <CheckCircle size={18} className="text-emerald-600 shrink-0" />
          <span>{settingsSuccess}</span>
        </div>
      )}
      {settingsError && (
        <div className="p-4 rounded-xl text-sm font-medium bg-red-50 border border-red-200 text-red-800 flex items-center gap-2">
          <AlertCircle size={18} className="text-red-600 shrink-0" />
          <span>{settingsError}</span>
        </div>
      )}

      {/* Tab 1: Profile */}
      {activeSection === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 pb-3 border-b border-slate-100">
              Personal Information
            </h3>
            <form onSubmit={handleUpdateProfile} className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Your legal name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
                <div className="relative">
                  <Smartphone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value.replace(/\D/g, ''))}
                    className="block w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="10-digit mobile number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Email is tied to your primary login account.</p>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-xl text-sm min-h-11 shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Society Badge Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 h-fit">
            <h3 className="text-base font-bold text-slate-800 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Building size={18} className="text-indigo-600" /> Society Membership
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase">Role</span>
                <p className="font-bold text-slate-800 capitalize mt-0.5">{user.role}</p>
              </div>
              {user.flat_number && (
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase">Allocated Unit</span>
                  <p className="font-bold text-slate-800 mt-0.5">
                    Flat {user.flat_number} ({user.block} Block)
                  </p>
                </div>
              )}
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase">Verification Status</span>
                <div className="mt-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                    <CheckCircle size={12} /> Approved Resident
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Security */}
      {activeSection === 'security' && (
        <div className="max-w-xl bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Shield size={20} className="text-indigo-600" />
            <h3 className="text-base font-bold text-slate-800">Update Password</h3>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Current Password</label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="block w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter current password"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="block w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Minimum 6 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Re-enter new password"
              />
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-xl text-sm min-h-11 shadow-sm transition-colors disabled:opacity-50"
              >
                {submitting ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Payout UPI */}
      {activeSection === 'payout' && (
        <div className="max-w-xl bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Wallet size={20} className="text-indigo-600" />
            <h3 className="text-base font-bold text-slate-800">UPI Payout VPA</h3>
          </div>
          <p className="text-sm text-slate-600">
            Approved reimbursement requests will be credited to this UPI Virtual Payment Address by the treasurer.
          </p>
          <form onSubmit={handleUpdatePayout} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">UPI ID (VPA)</label>
              <input
                type="text"
                required
                placeholder="e.g. resident@okhdfcbank"
                value={paymentAddress}
                onChange={(e) => setPaymentAddress(e.target.value)}
                className="block w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-slate-400 mt-1.5">Ensure this VPA is active and linked to your bank account.</p>
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-xl text-sm min-h-11 shadow-sm transition-colors disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Payout UPI'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default SettingsTab;
