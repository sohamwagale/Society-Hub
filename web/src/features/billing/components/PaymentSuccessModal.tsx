import React from 'react';
import { CheckCircle2, Download } from 'lucide-react';
import type { Bill, BillPayment } from '../../../types';
import { billsAPI } from '../../../services/api';

interface PaymentSuccessModalProps {
  payment: BillPayment | null;
  bill: Bill | null;
  onClose: () => void;
  onUploadScreenshot: () => void;
}

export const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({
  payment,
  bill,
  onClose,
  onUploadScreenshot
}) => {
  if (!payment || !bill) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 w-full max-w-sm flex flex-col items-center text-center space-y-5 animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-lg border border-emerald-200/50">
          <CheckCircle2 size={44} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-2xl tracking-tight">Payment Successful!</h3>
          <p className="text-slate-500 text-xs mt-1">for {bill.title}</p>
        </div>
        <p className="text-3xl font-extrabold text-indigo-650 tracking-tight">
          ₹{Number(payment.amount).toLocaleString('en-IN')}
        </p>

        <div className="w-full bg-slate-50 border border-slate-150 rounded-2xl p-4 text-xs text-left space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Method</span>
            <span className="font-bold text-slate-700">Razorpay</span>
          </div>
          <div className="h-[1px] bg-slate-200"></div>
          <div className="flex justify-between">
            <span className="text-slate-400">Transaction Ref</span>
            <span className="font-bold text-slate-700 font-mono text-[10px] truncate max-w-[150px]">
              {payment.transaction_ref || '—'}
            </span>
          </div>
          <div className="h-[1px] bg-slate-200"></div>
          <div className="flex justify-between">
            <span className="text-slate-400">Paid At</span>
            <span className="font-bold text-slate-700">{new Date(payment.paid_at).toLocaleString()}</span>
          </div>
        </div>

        <div className="w-full space-y-2.5 pt-2">
          <a
            href={billsAPI.getReceiptUrl(payment.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex justify-center items-center gap-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
          >
            <Download size={14} /> Download Receipt (PDF)
          </a>
          <button
            onClick={onUploadScreenshot}
            className="w-full border border-slate-300 hover:bg-slate-50 text-slate-600 py-2.5 rounded-xl text-xs font-bold transition-colors"
          >
            Upload payment screenshot
          </button>
          <button onClick={onClose} className="text-xs text-indigo-600 font-bold hover:underline">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessModal;
