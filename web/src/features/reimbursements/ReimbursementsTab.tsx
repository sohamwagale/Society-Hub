import React, { useState, useEffect } from 'react';
import { Plus, HeartHandshake, X, Paperclip } from 'lucide-react';
import type { ReimbursementRequest } from '../../types';
import { reimbursementsAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import CreateReimbursementModal from './components/CreateReimbursementModal';

export const ReimbursementsTab: React.FC = () => {
  const { user } = useAuthStore();
  const [reimbursements, setReimbursements] = useState<ReimbursementRequest[]>([]);
  const [selectedReimbursement, setSelectedReimbursement] = useState<ReimbursementRequest | null>(null);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [reimbTitle, setReimbTitle] = useState('');
  const [reimbDesc, setReimbDesc] = useState('');
  const [reimbAmount, setReimbAmount] = useState(0);
  const [reimbDate, setReimbDate] = useState('');
  const [reimbCategory, setReimbCategory] = useState<string>('plumbing');
  const [reimbFile, setReimbFile] = useState<File | null>(null);

  // Review & Payout state
  const [reimbApprovalAmount, setReimbApprovalAmount] = useState(0);
  const [reimbAdminNotes, setReimbAdminNotes] = useState('');
  const [reimbPayMethod, setReimbPayMethod] = useState('UPI');
  const [reimbPayRef, setReimbPayRef] = useState('');

  const loadReimbursements = async () => {
    try {
      const list = await reimbursementsAPI.list();
      setReimbursements(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadReimbursements();
  }, []);

  const handleRaiseReimbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const req = await reimbursementsAPI.create({
        title: reimbTitle,
        description: reimbDesc,
        amount: reimbAmount,
        expense_date: reimbDate,
        category: reimbCategory as any,
      });

      if (reimbFile) {
        await reimbursementsAPI.uploadReceipt(req.id, reimbFile);
      }

      alert('Claim submitted successfully!');
      setIsCreateModalOpen(false);
      setReimbTitle('');
      setReimbDesc('');
      setReimbAmount(0);
      setReimbDate('');
      setReimbFile(null);
      loadReimbursements();
    } catch (e) {
      alert('Failed to submit reimbursement request.');
    }
  };

  const handleReviewReimbursement = async (status: 'approved' | 'rejected') => {
    if (!selectedReimbursement) return;
    try {
      const updated = await reimbursementsAPI.review(selectedReimbursement.id, {
        status,
        approved_amount: status === 'approved' ? reimbApprovalAmount : 0,
        admin_notes: reimbAdminNotes || undefined,
      });
      setSelectedReimbursement(updated);
      setReimbAdminNotes('');
      loadReimbursements();
    } catch (e) {
      alert('Review submission failed.');
    }
  };

  const handleClearReimbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReimbursement) return;
    try {
      const updated = await reimbursementsAPI.markPaid(selectedReimbursement.id, {
        amount: selectedReimbursement.approved_amount || selectedReimbursement.amount,
        payment_method: reimbPayMethod,
        transaction_ref: reimbPayRef || undefined,
        payment_date: new Date().toISOString().split('T')[0],
      });
      setSelectedReimbursement(updated);
      setReimbPayRef('');
      loadReimbursements();
    } catch (e) {
      alert('Failed to mark claim as cleared.');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">Expense Reimbursements</h3>
          <p className="text-slate-500 text-xs mt-1">
            Claim personal funds spent on society utility tasks, or review resident requests.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <Plus size={16} /> File Claim
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {reimbursements.length === 0 ? (
            <p className="text-slate-400 text-sm py-12 text-center">No reimbursement claims filed.</p>
          ) : (
            reimbursements.map((r) => (
              <div
                key={r.id}
                onClick={() => {
                  setSelectedReimbursement(r);
                  setReimbApprovalAmount(r.amount);
                }}
                className={`p-4 border rounded-xl cursor-pointer transition-all ${
                  selectedReimbursement?.id === r.id
                    ? 'border-indigo-600 bg-indigo-50/10'
                    : 'border-slate-200 bg-slate-50/30 hover:border-slate-350'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded uppercase">
                      {r.category}
                    </span>
                    <h4 className="font-bold text-slate-800 text-base mt-2">{r.title}</h4>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-800">₹{r.amount.toLocaleString()}</p>
                    <span
                      className={`inline-block mt-2 text-[9px] font-bold px-2 py-0.5 rounded capitalize ${
                        r.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : r.status === 'approved'
                          ? 'bg-blue-100 text-blue-700'
                          : r.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {r.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <p className="text-slate-500 text-xs mt-2 line-clamp-1">{r.description}</p>
                <p className="text-[10px] text-slate-400 mt-3 text-right">
                  Submitted on {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm h-[520px] flex flex-col justify-between overflow-y-auto">
          {!selectedReimbursement ? (
            <div className="text-center py-20">
              <HeartHandshake size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-xs text-slate-400 font-medium">
                Select a reimbursement claim to view invoice files or process review decisions.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-start pb-3 border-b border-slate-200">
                <div>
                  <span className="text-[9px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded uppercase">
                    {selectedReimbursement.category}
                  </span>
                  <h4 className="font-bold text-slate-800 text-base mt-2">{selectedReimbursement.title}</h4>
                </div>
                <button onClick={() => setSelectedReimbursement(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <div className="text-xs text-slate-700 space-y-2">
                <p>
                  <strong>Description:</strong> {selectedReimbursement.description}
                </p>
                <p>
                  <strong>Spend Date:</strong> {new Date(selectedReimbursement.expense_date).toLocaleDateString()}
                </p>
                <p>
                  <strong>Requested Sum:</strong> ₹{selectedReimbursement.amount.toLocaleString()}
                </p>
                {selectedReimbursement.approved_amount !== undefined && (
                  <p>
                    <strong>Approved Sum:</strong> ₹{selectedReimbursement.approved_amount.toLocaleString()}
                  </p>
                )}
                <p>
                  <strong>Recipient Address:</strong>{' '}
                  <span className="font-mono text-[10px]">
                    {selectedReimbursement.payment_address || 'Unspecified'}
                  </span>
                </p>
              </div>

              {selectedReimbursement.receipt_path && (
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Receipt Invoice Link</p>
                  <a
                    href={reimbursementsAPI.getReceiptUrl(selectedReimbursement.receipt_path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <Paperclip size={12} /> Download Invoice Receipt
                  </a>
                </div>
              )}

              {user?.role === 'admin' && selectedReimbursement.status === 'submitted' && (
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs space-y-3 pt-3">
                  <p className="font-bold text-indigo-800">Claim Evaluation</p>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Approved Amount (₹)</label>
                    <input
                      type="number"
                      value={reimbApprovalAmount}
                      onChange={(e) => setReimbApprovalAmount(parseInt(e.target.value) || 0)}
                      className="w-full border border-slate-300 rounded p-1 text-xs bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Admin Notes</label>
                    <textarea
                      value={reimbAdminNotes}
                      onChange={(e) => setReimbAdminNotes(e.target.value)}
                      className="w-full border border-slate-300 rounded p-1 text-xs bg-white focus:outline-none"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReviewReimbursement('approved')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-3 rounded text-[10px]"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReviewReimbursement('rejected')}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded text-[10px]"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {user?.role === 'admin' && selectedReimbursement.status === 'approved' && (
                <form
                  onSubmit={handleClearReimbursement}
                  className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs space-y-3"
                >
                  <p className="font-bold text-indigo-800">Clear Payment</p>
                  <p className="text-[10px] text-slate-500">
                    Payee UPI: <code>{selectedReimbursement.payment_address || 'Check profile address'}</code>
                  </p>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Payment Method</label>
                    <select
                      value={reimbPayMethod}
                      onChange={(e) => setReimbPayMethod(e.target.value)}
                      className="w-full border border-slate-300 rounded p-1 bg-white text-xs"
                    >
                      <option value="UPI">UPI Transfer</option>
                      <option value="Bank Transfer">Bank Transfer IMPS</option>
                      <option value="Cash">Cash Handout</option>
                      <option value="Cheque">Cheque Clear</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Ref Hash / Tx ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={reimbPayRef}
                      onChange={(e) => setReimbPayRef(e.target.value)}
                      placeholder="UPI Txn Reference ID"
                      className="w-full border border-slate-300 rounded p-1 text-xs bg-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 w-full rounded text-[10px]"
                  >
                    Mark Cleared / Paid
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      <CreateReimbursementModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleRaiseReimbursement}
        reimbTitle={reimbTitle}
        setReimbTitle={setReimbTitle}
        reimbDesc={reimbDesc}
        setReimbDesc={setReimbDesc}
        reimbAmount={reimbAmount}
        setReimbAmount={setReimbAmount}
        reimbDate={reimbDate}
        setReimbDate={setReimbDate}
        reimbCategory={reimbCategory}
        setReimbCategory={setReimbCategory}
        setReimbFile={setReimbFile}
      />
    </div>
  );
};

export default ReimbursementsTab;
