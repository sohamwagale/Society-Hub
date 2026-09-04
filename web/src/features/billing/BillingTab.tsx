import React, { useState, useEffect } from 'react';
import { Download, Plus } from 'lucide-react';
import type { Bill, BillCreate, BillPayment } from '../../types';
import { billsAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import CreateBillModal from './components/CreateBillModal';
import UploadReceiptModal from './components/UploadReceiptModal';
import PaymentSuccessModal from './components/PaymentSuccessModal';
import CustomFlatPricesModal from './components/CustomFlatPricesModal';
import { BillCard } from './components/BillCard';
import { FlatAuditPanel } from './components/FlatAuditPanel';
import { toast } from '../../components/Toast';
import { confirmDialog } from '../../components/ConfirmModal';
import {
  useBillsQuery,
  usePaymentHistoryQuery,
  useBillResidentStatusQuery,
  useCreateBillMutation,
  useDeleteBillMutation,
  usePayBillMutation,
} from '../../hooks/queries/useBills';

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export const BillingTab: React.FC = () => {
  const { user } = useAuthStore();
  const { data: bills = [] } = useBillsQuery();
  const { data: paymentHistory = [] } = usePaymentHistoryQuery();
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const { data: complianceList = [], isLoading: loadingCompliance } = useBillResidentStatusQuery(selectedBillId);

  const createBillMutation = useCreateBillMutation();
  const deleteBillMutation = useDeleteBillMutation();
  const payBillMutation = usePayBillMutation();

  // Modals & sub-state
  const [modalType, setModalType] = useState<string | null>(null);
  const [customPricesBill, setCustomPricesBill] = useState<Bill | null>(null);
  const [isCreateBillSuccess, setIsCreateBillSuccess] = useState(false);
  const [newBill, setNewBill] = useState<BillCreate>({
    title: '',
    description: '',
    amount: 0,
    due_date: '',
    bill_type: 'maintenance'
  });
  const [billReceiptFile, setBillReceiptFile] = useState<File | null>(null);
  const [uploadingReceiptBillId, setUploadingReceiptBillId] = useState<string | null>(null);
  const [successPayment, setSuccessPayment] = useState<BillPayment | null>(null);
  const [successPaymentBill, setSuccessPaymentBill] = useState<Bill | null>(null);

  // Dynamically inject Razorpay Web Checkout script
  useEffect(() => {
    if (typeof window !== 'undefined' && !document.getElementById('razorpay-checkout-script')) {
      const script = document.createElement('script');
      script.id = 'razorpay-checkout-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBillMutation.mutateAsync(newBill);
      setIsCreateBillSuccess(true);
      toast.success('Billing cycle generated successfully!');
      setTimeout(() => {
        setIsCreateBillSuccess(false);
        setModalType(null);
        setNewBill({ title: '', description: '', amount: 0, due_date: '', bill_type: 'maintenance' });
      }, 1000);
    } catch {
      toast.error('Failed to generate bill cycle.');
    }
  };

  const handleDeleteBill = (id: string) => {
    confirmDialog({
      title: 'Delete Billing Cycle?',
      message: 'Are you sure you want to delete this bill? This action is irreversible.',
      confirmText: 'Delete Bill',
      onConfirm: async () => {
        try {
          await deleteBillMutation.mutateAsync(id);
          toast.success('Bill deleted!');
        } catch {
          toast.error('Failed to delete bill.');
        }
      },
    });
  };

  const handleRazorpayCheckout = async (bill: Bill) => {
    try {
      const order = await billsAPI.createRazorpayOrder(bill.id);
      const options = {
        key: order.key_id,
        amount: order.amount_paise,
        currency: order.currency,
        name: 'Society Hub',
        description: bill.title,
        order_id: order.razorpay_order_id,
        handler: async (response: RazorpayResponse) => {
          try {
            const payment = await billsAPI.verifyRazorpayPayment(bill.id, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setSuccessPaymentBill(bill);
            setSuccessPayment(payment);
            toast.success('Payment verified successfully!');
          } catch {
            toast.error('Signature verification failed.');
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone || '',
        },
        theme: {
          color: '#4F46E5',
        },
      };
      const rzp = new (window as unknown as { Razorpay: new (options: unknown) => { open: () => void } }).Razorpay(options);
      rzp.open();
    } catch {
      toast.error('Could not initialize payment order.');
    }
  };

  const handleUploadBillReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billReceiptFile || !uploadingReceiptBillId) return;
    try {
      const receipt = await payBillMutation.mutateAsync({
        bill_id: uploadingReceiptBillId,
        amount: bills.find((b) => b.id === uploadingReceiptBillId)?.amount || 0,
        payment_method: 'Manual upload',
      });
      await billsAPI.uploadReceipt(receipt.id, billReceiptFile);
      toast.success('Payment receipt uploaded successfully!');
      setModalType(null);
      setBillReceiptFile(null);
      setUploadingReceiptBillId(null);
    } catch {
      toast.error('Failed to upload receipt.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Billing &amp; Maintenance Dues</h3>
            <p className="text-slate-500 text-xs mt-1">Review active billing cycles, pay online, or audit compliance.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {user?.role === 'admin' && (
              <>
                <a
                  href={billsAPI.getExportReportUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-slate-300 bg-white hover:bg-slate-50 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <Download size={14} /> PDF Report
                </a>
                <a
                  href={billsAPI.getExportDuesCsvUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-slate-300 bg-white hover:bg-slate-50 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <Download size={14} /> Unpaid Dues (CSV)
                </a>
                <a
                  href={billsAPI.getExportPaymentsCsvUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-slate-300 bg-white hover:bg-slate-50 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <Download size={14} /> Receipts (CSV)
                </a>
                <button
                  onClick={() => setModalType('bill')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Plus size={16} /> New Billing Cycle
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Billing Cycles</h4>
            {bills.length === 0 ? (
              <p className="text-slate-400 text-sm py-8 text-center">No billing cycles defined.</p>
            ) : (
              bills.map((bill) => (
                <BillCard
                  key={bill.id}
                  bill={bill}
                  user={user}
                  paymentMatch={paymentHistory.find((p) => p.bill_id === bill.id)}
                  onSelectAudit={setSelectedBillId}
                  onRazorpayCheckout={handleRazorpayCheckout}
                  onOpenReceiptUpload={(billId) => {
                    setUploadingReceiptBillId(billId);
                    setModalType('receipt');
                  }}
                  onDeleteBill={handleDeleteBill}
                  onOpenCustomPrices={(b) => setCustomPricesBill(b)}
                />
              ))
            )}
          </div>

          {user?.role === 'admin' && (
            <FlatAuditPanel
              selectedBillId={selectedBillId}
              bills={bills}
              complianceList={complianceList}
              loadingCompliance={loadingCompliance}
            />
          )}
        </div>
      </div>

      <CreateBillModal
        isOpen={modalType === 'bill'}
        isSuccess={isCreateBillSuccess}
        onClose={() => setModalType(null)}
        onSubmit={handleCreateBill}
        newBill={newBill}
        setNewBill={setNewBill}
      />

      <UploadReceiptModal
        isOpen={modalType === 'receipt'}
        onClose={() => setModalType(null)}
        onSubmit={handleUploadBillReceipt}
        setBillReceiptFile={setBillReceiptFile}
      />

      <CustomFlatPricesModal
        isOpen={!!customPricesBill}
        onClose={() => setCustomPricesBill(null)}
        bill={customPricesBill}
      />

      <PaymentSuccessModal
        payment={successPayment}
        bill={successPaymentBill}
        onClose={() => {
          setSuccessPayment(null);
          setSuccessPaymentBill(null);
        }}
        onUploadScreenshot={() => {
          if (successPaymentBill) {
            setUploadingReceiptBillId(successPaymentBill.id);
          }
          setSuccessPayment(null);
          setSuccessPaymentBill(null);
          setModalType('receipt');
        }}
      />
    </div>
  );
};

export default BillingTab;
