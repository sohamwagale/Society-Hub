import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, Tag } from 'lucide-react';
import type { Bill, FlatAmountOverride } from '../../../types';
import { useFlatsQuery } from '../../../hooks/queries/useFlats';
import {
  useBillFlatOverridesQuery,
  useUpdateFlatOverridesMutation,
} from '../../../hooks/queries/useBills';
import { toast } from '../../../components/Toast';

interface CustomFlatPricesModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill | null;
}

export const CustomFlatPricesModal: React.FC<CustomFlatPricesModalProps> = ({
  isOpen,
  onClose,
  bill,
}) => {
  const { data: flats = [] } = useFlatsQuery();
  const { data: serverOverrides = [], isLoading } = useBillFlatOverridesQuery(bill ? bill.id : null);
  const updateOverridesMutation = useUpdateFlatOverridesMutation();

  const [overrides, setOverrides] = useState<FlatAmountOverride[]>([]);
  const [selectedFlatId, setSelectedFlatId] = useState('');
  const [overrideAmount, setOverrideAmount] = useState<number | ''>('');

  useEffect(() => {
    if (serverOverrides) {
      setOverrides(serverOverrides.map((o) => ({ flat_id: o.flat_id, amount: o.amount })));
    }
  }, [serverOverrides]);

  if (!isOpen || !bill) return null;

  const handleAddOverride = () => {
    if (!selectedFlatId || overrideAmount === '') return;
    const amountVal = parseFloat(String(overrideAmount));
    if (isNaN(amountVal)) return;

    const filtered = overrides.filter((o) => o.flat_id !== selectedFlatId);
    setOverrides([...filtered, { flat_id: selectedFlatId, amount: amountVal }]);
    setSelectedFlatId('');
    setOverrideAmount('');
  };

  const handleRemoveOverride = (flatId: string) => {
    setOverrides(overrides.filter((o) => o.flat_id !== flatId));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateOverridesMutation.mutateAsync({
        id: bill.id,
        overrides,
      });
      toast.success('Custom flat prices saved!');
      onClose();
    } catch {
      toast.error('Failed to update custom flat prices.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-lg space-y-4 relative overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Tag size={18} className="text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-lg">Custom Flat Prices</h3>
            </div>
            <p className="text-slate-500 text-xs mt-1">
              Bill: <strong className="text-slate-700">{bill.title}</strong> (Base: ₹{bill.amount.toLocaleString()})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto pr-1 flex-1">
          <p className="text-xs text-slate-600">
            Override the base bill amount for specific flats in this society. Flats without overrides will pay the base amount (₹{bill.amount.toLocaleString()}).
          </p>

          <div className="flex gap-2 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
            <select
              value={selectedFlatId}
              onChange={(e) => setSelectedFlatId(e.target.value)}
              className="flex-1 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
            >
              <option value="">Select Flat...</option>
              {flats.map((f) => (
                <option key={f.id} value={f.id}>
                  Flat {f.flat_number} ({f.block} Block)
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Custom Price ₹"
              min="0"
              value={overrideAmount}
              onChange={(e) => setOverrideAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
              className="w-32 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />

            <button
              type="button"
              onClick={handleAddOverride}
              disabled={!selectedFlatId || overrideAmount === ''}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
            >
              <Plus size={14} /> Add
            </button>
          </div>

          {isLoading ? (
            <p className="text-center text-xs text-slate-400 py-6">Loading custom prices...</p>
          ) : overrides.length === 0 ? (
            <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl text-xs">
              No custom flat prices defined for this bill yet. All flats pay base amount (₹{bill.amount.toLocaleString()}).
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Configured Overrides ({overrides.length})
              </h4>
              <div className="space-y-1.5">
                {overrides.map((ov) => {
                  const flatObj = flats.find((f) => f.id === ov.flat_id);
                  return (
                    <div
                      key={ov.flat_id}
                      className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-800">
                          Flat {flatObj ? `${flatObj.flat_number} (${flatObj.block} Block)` : ov.flat_id}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Base: ₹{bill.amount.toLocaleString()} → Override: ₹{ov.amount.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                          ₹{ov.amount.toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOverride(ov.flat_id)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Remove custom price"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2 shrink-0">
          <button
            type="submit"
            disabled={updateOverridesMutation.isPending}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs transition-colors"
          >
            {updateOverridesMutation.isPending ? 'Saving...' : 'Save Custom Prices'}
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

export default CustomFlatPricesModal;
