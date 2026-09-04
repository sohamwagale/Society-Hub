import React from 'react';
import { Download, Trash2 } from 'lucide-react';
import type { Bill, BillPayment, User } from '../../../types';
import { billsAPI } from '../../../services/api';

interface BillCardProps {
  bill: Bill;
  user: User | null;
  paymentMatch?: BillPayment;
  onSelectAudit: (billId: string) => void;
  onRazorpayCheckout: (bill: Bill) => void;
  onOpenReceiptUpload: (billId: string) => void;
  onDeleteBill: (billId: string) => void;
}

export const BillCard: React.FC<BillCardProps> = ({
  bill,
  user,
  paymentMatch,
  onSelectAudit,
  onRazorpayCheckout,
  onOpenReceiptUpload,
  onDeleteBill,
}) => {
  return (
    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex flex-col justify-between relative group hover:border-slate-300 transition-all">
      <div className="flex justify-between items-start">
        <div>
          <h5 className="font-bold text-slate-800 text-base">{bill.title}</h5>
          <p className="text-slate-500 text-xs mt-1">
            {bill.description || 'Routine society maintenance charge.'}
          </p>
          <div className="mt-3 flex gap-4 text-xs text-slate-500">
            <p>
              <strong>Type:</strong> <span className="capitalize">{bill.bill_type}</span>
            </p>
            <p>
              <strong>Due:</strong> {new Date(bill.due_date).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-slate-800">₹{bill.amount.toLocaleString()}</p>
          <span
            className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded ${
              bill.payment_status === 'paid'
                ? 'bg-emerald-100 text-emerald-700'
                : bill.payment_status === 'overdue'
                ? 'bg-red-100 text-red-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {bill.payment_status || 'Due'}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-200/50 flex justify-between items-center">
        <div className="flex gap-2">
          {user?.role === 'admin' ? (
            <button
              onClick={() => onSelectAudit(bill.id)}
              className="text-xs text-indigo-600 font-bold hover:underline"
            >
              View Flat Audits
            </button>
          ) : (
            <>
              {bill.payment_status !== 'paid' && (
                <>
                  <button
                    onClick={() => onRazorpayCheckout(bill)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded"
                  >
                    Pay Online
                  </button>
                  <button
                    onClick={() => onOpenReceiptUpload(bill.id)}
                    className="border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded"
                  >
                    Upload Receipt
                  </button>
                </>
              )}
              {bill.payment_status === 'paid' && paymentMatch && (
                <div className="flex gap-2 items-center">
                  <a
                    href={billsAPI.getReceiptUrl(paymentMatch.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1"
                  >
                    <Download size={12} /> Receipt (PDF)
                  </a>
                  <button
                    onClick={() => onOpenReceiptUpload(bill.id)}
                    className="border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded"
                  >
                    Upload Screenshot
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => onDeleteBill(bill.id)}
            className="text-red-500 hover:text-red-700 p-1 text-xs flex items-center gap-1 font-semibold"
          >
            <Trash2 size={12} /> Remove Cycle
          </button>
        )}
      </div>
    </div>
  );
};
