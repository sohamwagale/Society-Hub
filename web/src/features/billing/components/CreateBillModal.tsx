import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import type { BillCreate, BillType, FlatAmountOverride } from '../../../types';
import SuccessTickOverlay from '../../../components/SuccessTickOverlay';
import { useFlatsQuery } from '../../../hooks/queries/useFlats';

interface CreateBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  newBill: BillCreate;
  setNewBill: React.Dispatch<React.SetStateAction<BillCreate>>;
  isSuccess?: boolean;
}

export const CreateBillModal: React.FC<CreateBillModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  newBill,
  setNewBill,
  isSuccess = false,
}) => {
  const { data: flats = [] } = useFlatsQuery();
  const [showOverrides, setShowOverrides] = useState(false);
  const [selectedFlatId, setSelectedFlatId] = useState('');
  const [overrideAmount, setOverrideAmount] = useState<number | ''>('');

  if (!isOpen) return null;

  const handleAddOverride = () => {
    if (!selectedFlatId || overrideAmount === '') return;
    const amountVal = parseFloat(String(overrideAmount));
    if (isNaN(amountVal)) return;

    const currentOverrides = newBill.flat_overrides || [];
    const filtered = currentOverrides.filter((o) => o.flat_id !== selectedFlatId);
    const updated: FlatAmountOverride[] = [...filtered, { flat_id: selectedFlatId, amount: amountVal }];
    
    setNewBill({ ...newBill, flat_overrides: updated });
    setSelectedFlatId('');
    setOverrideAmount('');
  };

  const handleRemoveOverride = (flatId: string) => {
    const currentOverrides = newBill.flat_overrides || [];
    const updated = currentOverrides.filter((o) => o.flat_id !== flatId);
    setNewBill({ ...newBill, flat_overrides: updated });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-lg space-y-4 relative overflow-hidden max-h-[90vh] flex flex-col"
      >
        <SuccessTickOverlay show={isSuccess} message="Bill Cycle Generated!" />

        <h3 className="font-bold text-slate-800 text-lg shrink-0">Generate Billing Cycle</h3>

        <div className="space-y-4 overflow-y-auto pr-1 flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Cycle Title</label>
            <input
              type="text"
              required
              value={newBill.title}
              onChange={(e) => setNewBill({ ...newBill, title: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              placeholder="Jan 2026 Maintenance"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
            <textarea
              value={newBill.description}
              onChange={(e) => setNewBill({ ...newBill, description: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              rows={2}
              placeholder="Description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Base Amount (₹)</label>
              <input
                type="number"
                required
                min="0"
                placeholder="0"
                value={newBill.amount || ''}
                onChange={(e) =>
                  setNewBill({
                    ...newBill,
                    amount: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
              <select
                value={newBill.bill_type}
                onChange={(e) => setNewBill({ ...newBill, bill_type: e.target.value as BillType })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="maintenance">Maintenance</option>
                <option value="extra">Extra Charge</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Due Date</label>
            <input
              type="date"
              required
              value={newBill.due_date}
              onChange={(e) => setNewBill({ ...newBill, due_date: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            />
          </div>

          {/* Custom Flat Prices (Optional) Accordion */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
            <button
              type="button"
              onClick={() => setShowOverrides(!showOverrides)}
              className="w-full p-3 text-left font-semibold text-xs text-slate-700 flex justify-between items-center bg-slate-100/70 hover:bg-slate-100 transition-colors"
            >
              <span>
                Custom Flat Prices (Optional){' '}
                {newBill.flat_overrides && newBill.flat_overrides.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-indigo-600 text-white rounded-full text-[10px]">
                    {newBill.flat_overrides.length}
                  </span>
                )}
              </span>
              {showOverrides ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showOverrides && (
              <div className="p-3 space-y-3">
                <p className="text-[11px] text-slate-500">
                  Specify custom price overrides for specific flats (e.g. penthouse rates or discounts).
                </p>

                <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center">
                  <select
                    value={selectedFlatId}
                    onChange={(e) => setSelectedFlatId(e.target.value)}
                    className="w-full sm:flex-1 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                  >
                    <option value="">Select Flat...</option>
                    {flats.map((f) => (
                      <option key={f.id} value={f.id}>
                        Flat {f.flat_number} ({f.block} Block)
                      </option>
                    ))}
                  </select>

                  <div className="flex gap-2 w-full sm:w-auto">
                    <input
                      type="number"
                      placeholder="Custom Price ₹"
                      min="0"
                      value={overrideAmount}
                      onChange={(e) => setOverrideAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="flex-1 sm:w-32 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />

                    <button
                      type="button"
                      onClick={handleAddOverride}
                      disabled={!selectedFlatId || overrideAmount === ''}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors shrink-0"
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>
                </div>

                {/* Overrides Table */}
                {newBill.flat_overrides && newBill.flat_overrides.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {newBill.flat_overrides.map((ov) => {
                      const flatObj = flats.find((f) => f.id === ov.flat_id);
                      return (
                        <div
                          key={ov.flat_id}
                          className="flex justify-between items-center p-2 bg-white rounded-lg border border-slate-200 text-xs"
                        >
                          <span className="font-semibold text-slate-700">
                            Flat {flatObj ? `${flatObj.flat_number} (${flatObj.block} Block)` : ov.flat_id}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-800">₹{ov.amount.toLocaleString()}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveOverride(ov.flat_id)}
                              className="text-red-500 hover:text-red-700 p-0.5"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2 shrink-0">
          <button
            type="submit"
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs transition-colors"
          >
            Generate
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 rounded-lg text-xs transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateBillModal;
