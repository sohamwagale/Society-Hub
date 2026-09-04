import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { societyAPI, onboardingAPI } from '../../services/api';
import type { Society, SocietyFlatSummary, CreateSocietyFlat } from '../../types';
import { Building2, LogOut, Home, Landmark } from 'lucide-react';
import { PendingApprovalNotice } from './components/PendingApprovalNotice';
import { JoinSocietyForm } from './components/JoinSocietyForm';
import { CreateSocietyForm } from './components/CreateSocietyForm';

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
      navigate('/dashboard');
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
    return (
      <PendingApprovalNotice
        user={user}
        onRefresh={refreshUser}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8 px-4 sm:py-12 sm:px-6 lg:px-8 font-sans">
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
            <JoinSocietyForm
              onBack={() => setMode('select')}
              onSubmit={handleJoinSubmit}
              joinError={joinError}
              loadingSocieties={loadingSocieties}
              societies={societies}
              selectedSocietyId={selectedSocietyId}
              setSelectedSocietyId={setSelectedSocietyId}
              loadingFlats={loadingFlats}
              flats={flats}
              selectedFlatId={selectedFlatId}
              setSelectedFlatId={setSelectedFlatId}
              residentType={residentType}
              setResidentType={setResidentType}
              aadhar={aadhar}
              setAadhar={setAadhar}
              pan={pan}
              setPan={setPan}
              submittingJoin={submittingJoin}
            />
          )}

          {mode === 'create' && (
            <CreateSocietyForm
              onBack={() => setMode('select')}
              onSubmit={handleCreateSubmit}
              createError={createError}
              newSocietyName={newSocietyName}
              setNewSocietyName={setNewSocietyName}
              newSocietyAddress={newSocietyAddress}
              setNewSocietyAddress={setNewSocietyAddress}
              blocksList={blocksList}
              setBlocksList={setBlocksList}
              floorsCount={floorsCount}
              setFloorsCount={setFloorsCount}
              flatsPerFloor={flatsPerFloor}
              setFlatsPerFloor={setFlatsPerFloor}
              submittingCreate={submittingCreate}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
