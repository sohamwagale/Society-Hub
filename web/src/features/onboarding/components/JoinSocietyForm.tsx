import React from 'react';
import type { Society, SocietyFlatSummary } from '../../../types';

interface JoinSocietyFormProps {
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
  joinError: string;
  loadingSocieties: boolean;
  societies: Society[];
  selectedSocietyId: string;
  setSelectedSocietyId: (id: string) => void;
  loadingFlats: boolean;
  flats: SocietyFlatSummary[];
  selectedFlatId: string;
  setSelectedFlatId: (id: string) => void;
  residentType: string;
  setResidentType: (type: string) => void;
  aadhar: string;
  setAadhar: (aadhar: string) => void;
  pan: string;
  setPan: (pan: string) => void;
  submittingJoin: boolean;
}

export const JoinSocietyForm: React.FC<JoinSocietyFormProps> = ({
  onBack,
  onSubmit,
  joinError,
  loadingSocieties,
  societies,
  selectedSocietyId,
  setSelectedSocietyId,
  loadingFlats,
  flats,
  selectedFlatId,
  setSelectedFlatId,
  residentType,
  setResidentType,
  aadhar,
  setAadhar,
  pan,
  setPan,
  submittingJoin,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <h3 className="text-lg font-bold text-slate-800">Join a Resident Unit</h3>
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-indigo-600 font-semibold hover:underline"
        >
          Back
        </button>
      </div>

      {joinError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {joinError}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Society Name</label>
        <select
          disabled={loadingSocieties}
          value={selectedSocietyId}
          onChange={(e) => setSelectedSocietyId(e.target.value)}
          className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">-- Select Society --</option>
          {societies.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {selectedSocietyId && (
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Select Flat</label>
          {loadingFlats ? (
            <div className="text-xs text-slate-500">Loading society flats...</div>
          ) : (
            <select
              value={selectedFlatId}
              onChange={(e) => setSelectedFlatId(e.target.value)}
              className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">-- Select Flat Number --</option>
              {flats.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.block} Block - Flat {f.flat_number} (Floor {f.floor})
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Resident Type</label>
        <select
          value={residentType}
          onChange={(e) => setResidentType(e.target.value)}
          className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="owner">Owner</option>
          <option value="owner_family">Owner Family Member</option>
          <option value="renter">Tenant (Renter)</option>
          <option value="renter_family">Tenant Family Member</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Aadhar Number{residentType === 'owner' ? '' : ' (Optional)'}
          </label>
          <input
            type="text"
            maxLength={12}
            value={aadhar}
            onChange={(e) => setAadhar(e.target.value.replace(/\D/g, ''))}
            placeholder="12-digit Aadhar"
            className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            PAN Card Number{residentType === 'owner' ? '' : ' (Optional)'}
          </label>
          <input
            type="text"
            maxLength={10}
            value={pan}
            onChange={(e) => setPan(e.target.value.toUpperCase())}
            placeholder="ABCDE1234F"
            className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={submittingJoin || !selectedFlatId}
          className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {submittingJoin ? 'Submitting request...' : 'Submit Joining Application'}
        </button>
      </div>
    </form>
  );
};
