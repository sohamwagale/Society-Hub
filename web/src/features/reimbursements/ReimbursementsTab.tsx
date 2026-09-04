import React, { useState } from 'react';
import { Plus, Eye } from 'lucide-react';
import type { ReimbursementRequest, ReimbursementCategory } from '../../types';
import { reimbursementsAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import CreateReimbursementModal from './components/CreateReimbursementModal';
import ReimbursementDetailsModal from './components/ReimbursementDetailsModal';
import { toast } from '../../components/Toast';
import {
  useReimbursementsQuery,
  useCreateReimbursementMutation,
  useReviewReimbursementMutation,
  useMarkReimbursementPaidMutation,
} from '../../hooks/queries/useReimbursements';

export const ReimbursementsTab: React.FC = () => {
  const { user } = useAuthStore();
  const { data: reimbursements = [] } = useReimbursementsQuery();
  const createReimbursementMutation = useCreateReimbursementMutation();
  const reviewReimbursementMutation = useReviewReimbursementMutation();
  const markPaidMutation = useMarkReimbursementPaidMutation();

  const [selectedReimbursement, setSelectedReimbursement] = useState<ReimbursementRequest | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateSuccess, setIsCreateSuccess] = useState(false);
  const [reimbTitle, setReimbTitle] = useState('');
  const [reimbDesc, setReimbDesc] = useState('');
  const [reimbAmount, setReimbAmount] = useState(0);
  const [reimbDate, setReimbDate] = useState('');
  const [reimbCategory, setReimbCategory] = useState<string>('plumbing');
  const [reimbPaymentAddress, setReimbPaymentAddress] = useState('');
  const [reimbFile, setReimbFile] = useState<File | null>(null);

  const handleRaiseReimbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role === 'admin') {
      toast.warning('Society administrators cannot file reimbursement claims.');
      return;
    }
    try {
      const req = await createReimbursementMutation.mutateAsync({
        title: reimbTitle,
        description: reimbDesc,
        amount: reimbAmount,
        expense_date: reimbDate,
        category: reimbCategory as ReimbursementCategory,
        payment_address: reimbPaymentAddress || undefined,
      });

      if (reimbFile) {
        await reimbursementsAPI.uploadReceipt(req.id, reimbFile);
      }

      setIsCreateSuccess(true);
      toast.success('Claim submitted successfully!');
      setTimeout(() => {
        setIsCreateSuccess(false);
        setIsCreateModalOpen(false);
        setReimbTitle('');
        setReimbDesc('');
        setReimbAmount(0);
        setReimbDate('');
        setReimbPaymentAddress('');
        setReimbFile(null);
      }, 1000);
    } catch {
      toast.error('Failed to submit reimbursement request.');
    }
  };

  const handleReviewModal = async (
    reimbId: string,
    status: 'approved' | 'rejected',
    approvedAmount?: number,
    notes?: string
  ) => {
    try {
      const updated = await reviewReimbursementMutation.mutateAsync({
        id: reimbId,
        updates: {
          status,
          approved_amount: status === 'approved' ? (approvedAmount || 0) : 0,
          admin_notes: notes || undefined,
        },
      });
      setSelectedReimbursement(updated);
      toast.success(`Claim ${status}!`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail || 'Review submission failed.');
      throw e;
    }
  };

  const handleClearModal = async (
    reimbId: string,
    amount: number,
    method: string,
    ref?: string
  ) => {
    try {
      await markPaidMutation.mutateAsync({
        id: reimbId,
        payment: {
          amount,
          payment_method: method,
          transaction_ref: ref || undefined,
          payment_date: new Date().toISOString().split('T')[0],
        },
      });
      setIsDetailsModalOpen(false);
      setSelectedReimbursement(null);
      toast.success('Payout marked paid & cleared!');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail || 'Failed to mark claim as cleared.');
      throw e;
    }
  };

  const handleQuickReview = async (targetReq: ReimbursementRequest, status: 'approved' | 'rejected') => {
    try {
      const updated = await reviewReimbursementMutation.mutateAsync({
        id: targetReq.id,
        updates: {
          status,
          approved_amount: status === 'approved' ? targetReq.amount : 0,
        },
      });
      setSelectedReimbursement(updated);
      toast.success(`Claim ${status}!`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail || 'Review submission failed.');
    }
  };

  const openDetailsModal = (r: ReimbursementRequest) => {
    setSelectedReimbursement(r);
    setIsDetailsModalOpen(true);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">Expense Reimbursements</h3>
          <p className="text-slate-500 text-xs mt-1">
            {user?.role === 'admin'
              ? 'Review resident reimbursement requests and process approvals or clear payouts.'
              : 'Claim personal funds spent on society utility tasks.'}
          </p>
        </div>
        {user?.role !== 'admin' && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Plus size={16} /> File Claim
          </button>
        )}
      </div>

      {reimbursements.length === 0 ? (
        <p className="text-slate-400 text-sm py-12 text-center">No reimbursement claims filed.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reimbursements.map((r) => (
            <div
              key={r.id}
              onClick={() => openDetailsModal(r)}
              className="p-5 border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md rounded-xl transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded uppercase">
                    {r.category}
                  </span>
                  <div className="text-right">
                    <p className="font-bold text-slate-800 text-base">₹{r.amount.toLocaleString()}</p>
                    <span
                      className={`inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded capitalize ${
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
                <h4 className="font-bold text-slate-800 text-base mt-2">{r.title}</h4>
                <p className="text-slate-500 text-xs mt-2 line-clamp-2">{r.description}</p>
              </div>

              <div>
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400">
                  <span>Spend Date: {new Date(r.expense_date).toLocaleDateString()}</span>
                  <span>Submitted: {new Date(r.created_at).toLocaleDateString()}</span>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-2">
                    {user?.role === 'admin' && r.status === 'submitted' && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickReview(r, 'approved');
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1 rounded transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickReview(r, 'rejected');
                          }}
                          className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold px-3 py-1 rounded transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {user?.role === 'admin' && r.status === 'approved' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetailsModal(r);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1 rounded transition-colors"
                      >
                        Clear Payout (₹{(r.approved_amount || r.amount).toLocaleString()})
                      </button>
                    )}
                    {r.status === 'paid' && (
                      <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                        ✓ Settled & Expensed
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDetailsModal(r);
                    }}
                    className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Eye size={14} /> View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateReimbursementModal
        isOpen={isCreateModalOpen}
        isSuccess={isCreateSuccess}
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
        reimbPaymentAddress={reimbPaymentAddress}
        setReimbPaymentAddress={setReimbPaymentAddress}
        setReimbFile={setReimbFile}
      />

      <ReimbursementDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        reimbursement={selectedReimbursement}
        userRole={user?.role}
        onReview={handleReviewModal}
        onClearPayment={handleClearModal}
      />
    </div>
  );
};

export default ReimbursementsTab;
