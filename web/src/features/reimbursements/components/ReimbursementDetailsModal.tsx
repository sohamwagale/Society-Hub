import React, { useState, useEffect } from 'react';
import { X, Paperclip, CheckCircle, XCircle, DollarSign, User, Calendar, CreditCard } from 'lucide-react';
import type { ReimbursementRequest } from '../../../types';
import { reimbursementsAPI } from '../../../services/api';

interface ReimbursementDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reimbursement: ReimbursementRequest | null;
  userRole?: string;
  onReview: (reimbId: string, status: 'approved' | 'rejected', approvedAmount?: number, notes?: string) => Promise<void>;
  onClearPayment: (reimbId: string, amount: number, method: string, ref?: string) => Promise<void>;
}

export const ReimbursementDetailsModal: React.FC<ReimbursementDetailsModalProps> = ({
  isOpen,
  onClose,
  reimbursement,
  userRole,
  onReview,
  onClearPayment,
}) => {
  const [approvedAmount, setApprovedAmount] = useState<number>(0);
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [payMethod, setPayMethod] = useState<string>('UPI');
  const [payRef, setPayRef] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (reimbursement) {
      setApprovedAmount(reimbursement.approved_amount ?? reimbursement.amount);
      setAdminNotes(reimbursement.admin_notes || '');
      setPayMethod('UPI');
      setPayRef('');
      setIsSubmitting(false);
    }
  }, [reimbursement]);

  if (!isOpen || !reimbursement) return null;

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await onReview(reimbursement.id, 'approved', approvedAmount, adminNotes);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      await onReview(reimbursement.id, 'rejected', 0, adminNotes);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onClearPayment(
        reimbursement.id,
        reimbursement.approved_amount || reimbursement.amount,
        payMethod,
        payRef
      );
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-start p-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded uppercase">
              {reimbursement.category}
            </span>
            <h3 className="font-bold text-slate-800 text-lg mt-1">{reimbursement.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Key Stats Grid */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Amount Claimed</p>
              <p className="text-lg font-bold text-slate-800">₹{reimbursement.amount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Current Status</p>
              <span
                className={`inline-block mt-0.5 text-xs font-bold px-2.5 py-0.5 rounded capitalize ${
                  reimbursement.status === 'paid'
                    ? 'bg-emerald-100 text-emerald-700'
                    : reimbursement.status === 'approved'
                    ? 'bg-blue-100 text-blue-700'
                    : reimbursement.status === 'rejected'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {reimbursement.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2.5 text-xs text-slate-700">
            <div>
              <strong className="block text-slate-500 text-[10px] uppercase font-bold mb-0.5">Description / Justification</strong>
              <p className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-800 leading-relaxed">
                {reimbursement.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <strong className="block text-slate-500 text-[10px] uppercase font-bold">Spend Date</strong>
                <p className="text-slate-800 font-medium">{new Date(reimbursement.expense_date).toLocaleDateString()}</p>
              </div>
              <div>
                <strong className="block text-slate-500 text-[10px] uppercase font-bold">Date Submitted</strong>
                <p className="text-slate-800 font-medium">{new Date(reimbursement.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="pt-1">
              <strong className="block text-slate-500 text-[10px] uppercase font-bold mb-1">Payee Payment UPI / Phone</strong>
              <span className="font-mono text-xs bg-indigo-50 border border-indigo-100 text-indigo-800 font-bold px-2.5 py-1 rounded-lg inline-block">
                {reimbursement.payment_address || 'Not Provided'}
              </span>
            </div>

            {reimbursement.admin_notes && (
              <div className="pt-1">
                <strong className="block text-slate-500 text-[10px] uppercase font-bold mb-1">Admin Feedback / Notes</strong>
                <p className="bg-amber-50 border border-amber-200 text-amber-900 p-2.5 rounded-lg">
                  {reimbursement.admin_notes}
                </p>
              </div>
            )}

            {/* Receipt invoice download */}
            {reimbursement.receipt_path && (
              <div className="pt-2">
                <strong className="block text-slate-500 text-[10px] uppercase font-bold mb-1.5">Attached Receipt Invoice</strong>
                <a
                  href={reimbursementsAPI.getReceiptUrl(reimbursement.receipt_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold rounded-xl text-xs transition-colors"
                >
                  <Paperclip size={16} /> View / Download Invoice File
                </a>
              </div>
            )}
          </div>

          {/* Admin Decision Section */}
          {userRole === 'admin' && reimbursement.status === 'submitted' && (
            <div className="mt-4 p-4 bg-slate-50 border border-indigo-100 rounded-xl text-xs space-y-3 pt-3">
              <h4 className="font-bold text-indigo-900 text-sm">Admin Review Decision</h4>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Approved Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={approvedAmount || ''}
                  onChange={(e) => setApprovedAmount(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Admin Notes / Reason</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Optional remarks for resident..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleApprove}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <CheckCircle size={15} /> Approve Claim
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleReject}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <XCircle size={15} /> Reject Claim
                </button>
              </div>
            </div>
          )}

          {userRole === 'admin' && reimbursement.status === 'approved' && (
            <form onSubmit={handleClearSubmit} className="mt-4 p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs space-y-3">
              <h4 className="font-bold text-indigo-900 text-sm">Disburse Payout & Settle Claim</h4>
              <p className="text-[11px] text-slate-600">
                Payee UPI / Coordinate: <code className="bg-white px-1.5 py-0.5 rounded font-mono text-indigo-700 font-bold">{reimbursement.payment_address || 'Not Provided'}</code>
              </p>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-xs"
                >
                  <option value="UPI">UPI Transfer</option>
                  <option value="Bank Transfer">Bank Transfer IMPS</option>
                  <option value="Cash">Cash Handout</option>
                  <option value="Cheque">Cheque Clear</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Transaction Ref / Ref Hash (Optional)</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="UPI Txn Reference ID"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2 w-full rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle size={15} /> Mark Paid & Disburse
              </button>
            </form>
          )}

          {reimbursement.status === 'paid' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle size={18} className="text-emerald-600 shrink-0" />
              <span>This reimbursement has been fully settled and recorded as a society expense.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReimbursementDetailsModal;
