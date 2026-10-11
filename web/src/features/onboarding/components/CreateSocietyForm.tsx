import React from 'react';

interface CreateSocietyFormProps {
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
  createError: string;
  newSocietyName: string;
  setNewSocietyName: (name: string) => void;
  newSocietyAddress: string;
  setNewSocietyAddress: (address: string) => void;
  blocksList: string[];
  setBlocksList: (blocks: string[]) => void;
  floorsCount: number;
  setFloorsCount: (count: number) => void;
  flatsPerFloor: number;
  setFlatsPerFloor: (count: number) => void;
  submittingCreate: boolean;
}

export const CreateSocietyForm: React.FC<CreateSocietyFormProps> = ({
  onBack,
  onSubmit,
  createError,
  newSocietyName,
  setNewSocietyName,
  newSocietyAddress,
  setNewSocietyAddress,
  blocksList,
  setBlocksList,
  floorsCount,
  setFloorsCount,
  flatsPerFloor,
  setFlatsPerFloor,
  submittingCreate,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <h3 className="text-lg font-bold text-slate-800">Configure New Society</h3>
        <button
          type="button"
          onClick={onBack}
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
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Floors per Block
            </label>

            <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
              <button
                type="button"
                disabled={floorsCount <= 1}
                onClick={() => setFloorsCount(Math.max(1, floorsCount - 1))}
                className="px-3 py-2 bg-slate-50 hover:bg-slate-100 disabled:opacity-40"
              >
                −
              </button>

              <input
                type="number"
                min={1}
                max={50}
                step={1}
                value={floorsCount}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "") return;

                  const n = Number(value);
                  if (Number.isInteger(n) && n >= 1 && n <= 50) {
                    setFloorsCount(n);
                  }
                }}
                className="w-full min-w-0 text-center py-2 text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />

              <button
                type="button"
                disabled={floorsCount >= 50}
                onClick={() => setFloorsCount(Math.min(50, floorsCount + 1))}
                className="px-3 py-2 bg-slate-50 hover:bg-slate-100 disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Flats per Floor
            </label>

            <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
              <button
                type="button"
                disabled={flatsPerFloor <= 1}
                onClick={() => setFlatsPerFloor(Math.max(1, flatsPerFloor - 1))}
                className="px-3 py-2 bg-slate-50 hover:bg-slate-100 disabled:opacity-40"
              >
                −
              </button>

              <input
                type="number"
                min={1}
                max={20}
                step={1}
                value={flatsPerFloor}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "") return;

                  const n = Number(value);
                  if (Number.isInteger(n) && n >= 1 && n <= 20) {
                    setFlatsPerFloor(n);
                  }
                }}
                className="w-full min-w-0 text-center py-2 text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />

              <button
                type="button"
                disabled={flatsPerFloor >= 20}
                onClick={() => setFlatsPerFloor(Math.min(20, flatsPerFloor + 1))}
                className="px-3 py-2 bg-slate-50 hover:bg-slate-100 disabled:opacity-40"
              >
                +
              </button>
            </div>
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
  );
};
