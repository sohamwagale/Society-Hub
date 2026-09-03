import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { societyAPI, onboardingAPI } from '../../services/api';
import type { Society, SocietyFlatSummary, CreateSocietyFlat } from '../../types';
import { Building2, LogOut, Clock, Home, Landmark } from 'lucide-react';

export const Onboarding: React.FC = () => {
  const { user, logout, refreshUser } = useAuthStore();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'select' | 'join' | 'create'>('select');
  const [societies, setSocieties] = useState<Society[]>([]);
  const [loadingSocieties, setLoadingSocieties] = useState(false);

  // Join State
  const [selectedSocietyId, setSelectedSocietyId] = useState('');
  const [flats, setFlats] = useState<SocietyFlatSummary[]>([]);
  const [loadingFlats, setLoadingFlats] = useState(false);
  const [selectedFlatId, setSelectedFlatId] = useState('');
  const [residentType, setResidentType] = useState('owner');
  const [aadhar, setAadhar] = useState('');
  const [pan, setPan] = useState('');
  const [submittingJoin, setSubmittingJoin] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Create State
  const [newSocietyName, setNewSocietyName] = useState('');
  const [newSocietyAddress, setNewSocietyAddress] = useState('');
  const [blocksList, setBlocksList] = useState<string[]>(['A', 'B']);
  const [floorsCount, setFloorsCount] = useState(4);
  const [flatsPerFloor, setFlatsPerFloor] = useState(4);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    if (user?.is_fully_approved) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (mode === 'join') {
      setLoadingSocieties(true);
      societyAPI.listSocieties()
        .then(setSocieties)
        .catch(console.error)
        .finally(() => setLoadingSocieties(false));
    }
  }, [mode]);

  useEffect(() => {
    if (selectedSocietyId) {
      setLoadingFlats(true);
      societyAPI.listFlatsForSociety(selectedSocietyId)
        .then(setFlats)
        .catch(console.error)
        .finally(() => setLoadingFlats(false));
    } else {
      setFlats([]);
    }
  }, [selectedSocietyId]);

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSocietyId || !selectedFlatId) {
      setJoinError('Please select a society and flat.');
      return;
    }
    setSubmittingJoin(true);
    setJoinError('');
    try {
      await onboardingAPI.joinSociety({
        society_id: selectedSocietyId,
        flat_id: selectedFlatId,
        resident_type: residentType,
        aadhar_number: aadhar || undefined,
        pan_number: pan || undefined,
      });
      await refreshUser();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      setJoinError(errorObj.response?.data?.detail || 'Failed to join society.');
    } finally {
      setSubmittingJoin(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSocietyName.trim()) {
      setCreateError('Society name is required.');
      return;
    }
    setSubmittingCreate(true);
    setCreateError('');

    // Generate flats list based on blocks, floors and flats per floor
    const generatedFlats: CreateSocietyFlat[] = [];
    blocksList.forEach(block => {
      for (let floor = 1; floor <= floorsCount; floor++) {
        for (let flatNum = 1; flatNum <= flatsPerFloor; flatNum++) {
          const flatLabel = `${floor}${flatNum.toString().padStart(2, '0')}`;
          generatedFlats.push({
            block,
            floor: String(floor),
            flat_number: flatLabel
          });
        }
      }
    });

    try {
      await onboardingAPI.createSociety({
        society_name: newSocietyName,
        society_address: newSocietyAddress || undefined,
        flats: generatedFlats,
      });
      await refreshUser();
      navigate('/');
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      setCreateError(errorObj.response?.data?.detail || 'Failed to create society.');
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // If user is pending approval
  if (user?.society_id && !user.is_fully_approved) {
    const getPendingMessage = () => {
      if (user.resident_type === 'owner_family' || user.resident_type === 'renter') {
        return 'Your request to join the flat has been registered. Please contact the primary flat owner to approve your account.';
      }
      if (user.resident_type === 'renter_family') {
        return 'Your request to join the flat has been registered. Please contact the primary tenant to approve your account.';
      }
      return 'Your request to join the society flat has been registered. Please contact the society committee administrator to approve your account.';
    };

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 border border-slate-200 shadow-md rounded-2xl sm:px-10 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-amber-100 text-amber-600 mb-6">
              <Clock size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Verification Pending</h2>
            <p className="mt-3 text-sm text-slate-500 leading-relaxed">
              {getPendingMessage()}
            </p>
            <div className="mt-6 p-4 bg-slate-50 rounded-xl text-left text-xs text-slate-600 space-y-1.5 border border-slate-100">
              <p><strong>Name:</strong> {user.name}</p>
              <p><strong>Email:</strong> {user.email}</p>
              {user.flat_number && <p><strong>Flat:</strong> Flat {user.flat_number} ({user.block} Block)</p>}
              {user.resident_type && <p><strong>Role:</strong> <span className="capitalize">{user.resident_type.replace('_', ' ')}</span></p>}
            </div>

            <div className="mt-8 space-y-3">
              <button
                onClick={() => refreshUser()}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Refresh Status
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="absolute top-4 right-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 transition-colors"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="bg-indigo-600 p-3 rounded-2xl inline-flex text-white shadow-md mb-4">
          <Building2 size={36} />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Onboarding</h2>
        <p className="mt-2 text-sm text-slate-500">Let's set up your living unit configuration.</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-4 border border-slate-200 shadow-md rounded-2xl sm:px-10">
          {mode === 'select' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-800 text-center mb-6">Select Onboarding Action</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setMode('join')}
                  className="flex flex-col items-center p-6 border-2 border-slate-100 hover:border-indigo-600 rounded-2xl text-center transition-all bg-slate-50 hover:bg-indigo-50/20 group"
                >
                  <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors mb-4">
                    <Home size={28} />
                  </div>
                  <span className="font-bold text-slate-800 text-base">Join Flat</span>
                  <span className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Request access to a flat in an existing residential society.
                  </span>
                </button>

                <button
                  onClick={() => setMode('create')}
                  className="flex flex-col items-center p-6 border-2 border-slate-100 hover:border-indigo-600 rounded-2xl text-center transition-all bg-slate-50 hover:bg-indigo-50/20 group"
                >
                  <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors mb-4">
                    <Landmark size={28} />
                  </div>
                  <span className="font-bold text-slate-800 text-base">Create Society</span>
                  <span className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Set up a new society database and auto-generate its unit list.
                  </span>
                </button>
              </div>
            </div>
          )}

          {mode === 'join' && (
            <form onSubmit={handleJoinSubmit} className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800">Join a Resident Unit</h3>
                <button
                  type="button"
                  onClick={() => setMode('select')}
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

              {/* Society Selection */}
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

              {/* Flat Selection */}
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

              {/* Resident Type */}
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

              {/* Identity fields */}
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
          )}

          {mode === 'create' && (
            <form onSubmit={handleCreateSubmit} className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800">Configure New Society</h3>
                <button
                  type="button"
                  onClick={() => setMode('select')}
                  className="text-xs text-indigo-600 font-semibold hover:underline"
                >
                  Back
                </button>
              </div>

              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Society Name</label>
                <input
                  type="text"
                  required
                  value={newSocietyName}
                  onChange={(e) => setNewSocietyName(e.target.value)}
                  placeholder="e.g. Marvel Heights Co-op Society"
                  className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Address</label>
                <textarea
                  value={newSocietyAddress}
                  onChange={(e) => setNewSocietyAddress(e.target.value)}
                  placeholder="Full physical address"
                  rows={2}
                  className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-4">
                <h4 className="text-sm font-bold text-slate-800">Unit Generator Settings</h4>
                <p className="text-xs text-slate-500">
                  We will automatically populate the database with flats according to the configuration below.
                </p>

                {/* Blocks List */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Blocks / Wings (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={blocksList.join(', ')}
                    onChange={(e) => setBlocksList(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder="A, B, C"
                    className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Floors per Block</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={floorsCount || ''}
                      onChange={(e) => setFloorsCount(e.target.value === '' ? 1 : Math.max(1, parseInt(e.target.value) || 1))}
                      className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Flats per Floor</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={flatsPerFloor || ''}
                      onChange={(e) => setFlatsPerFloor(e.target.value === '' ? 1 : Math.max(1, parseInt(e.target.value) || 1))}
                      className="block w-full border border-slate-300 rounded-lg px-3 py-2 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-500">
                  This will generate a total of <strong className="text-indigo-600 font-bold">{blocksList.length * floorsCount * flatsPerFloor} flats</strong>. 
                  (e.g., A-101 to {blocksList[blocksList.length - 1] || 'A'}-{floorsCount}{flatsPerFloor.toString().padStart(2, '0')})
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={submittingCreate || blocksList.length === 0}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {submittingCreate ? 'Generating society units...' : 'Deploy Society'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
