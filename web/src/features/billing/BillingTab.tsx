import React, { useState, useEffect } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import type { Bill, BillCreate, BillPayment, BillResidentStatus } from '../../types';
import { billsAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import CreateBillModal from './components/CreateBillModal';
import UploadReceiptModal from './components/UploadReceiptModal';
import PaymentSuccessModal from './components/PaymentSuccessModal';

export const BillingTab: React.FC = () => {
  const { user } = useAuthStore();
  const [bills, setBills] = useState<Bill[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<BillPayment[]>([]);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [complianceList, setComplianceList] = useState<BillResidentStatus[]>([]);
  const [loadingCompliance, setLoadingCompliance] = useState(false);

  // Modals & sub-state
  const [modalType, setModalType] = useState<string | null>(null);
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

  const loadBillingData = async () => {
    try {
      const [list, history] = await Promise.all([
        billsAPI.list(),
        billsAPI.paymentHistory()
      ]);
      setBills(list);
      setPaymentHistory(history);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, []);

  // Sync compliance list when selected bill changes
  useEffect(() => {
    if (selectedBillId) {
      setLoadingCompliance(true);
      billsAPI
        .getResidentStatus(selectedBillId)
        .then(setComplianceList)
        .catch(console.error)
        .finally(() => setLoadingCompliance(false));
    }
  }, [selectedBillId]);

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await billsAPI.create(newBill);
      setModalType(null);
      setNewBill({ title: '', description: '', amount: 0, due_date: '', bill_type: 'maintenance' });
      loadBillingData();
    } catch (e) {
      alert('Failed to generate bill cycle.');
    }
  };

  const handleDeleteBill = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this bill? This action is irreversible.')) return;
    try {
      await billsAPI.delete(id);
      loadBillingData();
    } catch (e) {
      alert('Failed to delete bill.');
    }
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
        handler: async (response: any) => {
          try {
            const payment = await billsAPI.verifyRazorpayPayment(bill.id, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setSuccessPaymentBill(bill);
            setSuccessPayment(payment);
            loadBillingData();
          } catch (e) {
            alert('Signature verification failed.');
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
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (e) {
      alert('Could not initialize payment order.');
    }
  };

  const handleUploadBillReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billReceiptFile || !uploadingReceiptBillId) return;
    try {
      const receipt = await billsAPI.pay({
        bill_id: uploadingReceiptBillId,
        amount: bills.find((b) => b.id === uploadingReceiptBillId)?.amount || 0,
        payment_method: 'Manual upload',
      });
      await billsAPI.uploadReceipt(receipt.id, billReceiptFile);
      alert('Payment receipt uploaded successfully!');
      setModalType(null);
      setBillReceiptFile(null);
      setUploadingReceiptBillId(null);
      loadBillingData();
    } catch (e) {
      alert('Failed to upload receipt.');
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
          <div className="flex gap-3">
            {user?.role === 'admin' && (
              <>
                <a
                  href={billsAPI.getExportReportUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <Download size={14} /> Export Report
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
              bills.map((bill) => {
                const paymentMatch = paymentHistory.find((p) => p.bill_id === bill.id);
                return (
                  <div
                    key={bill.id}
                    className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex flex-col justify-between relative group hover:border-slate-300 transition-all"
                  >
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
                            onClick={() => setSelectedBillId(bill.id)}
                            className="text-xs text-indigo-600 font-bold hover:underline"
                          >
                            View Resident Audits
                          </button>
                        ) : (
                          <>
                            {bill.payment_status !== 'paid' && (
                              <>
                                <button
                                  onClick={() => handleRazorpayCheckout(bill)}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded"
                                >
                                  Pay Online
                                </button>
                                <button
                                  onClick={() => {
                                    setUploadingReceiptBillId(bill.id);
                                    setModalType('receipt');
                                  }}
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
                                  onClick={() => {
                                    setUploadingReceiptBillId(bill.id);
                                    setModalType('receipt');
                                  }}
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
                          onClick={() => handleDeleteBill(bill.id)}
                          className="text-red-500 hover:text-red-700 p-1 text-xs flex items-center gap-1 font-semibold"
                        >
                          <Trash2 size={12} /> Remove Cycle
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {user?.role === 'admin' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Resident Audits</h4>
              {!selectedBillId ? (
                <p className="text-xs text-slate-400 leading-normal">
                  Select "View Resident Audits" on any billing card to audit payments.
                </p>
              ) : loadingCompliance ? (
                <div className="text-xs text-slate-500">Loading audit records...</div>
              ) : (
                <div className="space-y-3.5 max-h-[380px] overflow-y-auto">
                  <p className="text-xs text-slate-600 font-semibold mb-2">
                    Bill: {bills.find((b) => b.id === selectedBillId)?.title}
                  </p>
                  {complianceList.map((compliance) => (
                    <div
                      key={compliance.user_id}
                      className="flex justify-between items-center p-2.5 bg-slate-50 rounded border border-slate-100 text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{compliance.name}</p>
                        <p className="text-slate-500 text-[10px]">Flat {compliance.flat}</p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-block font-bold text-[10px] px-2 py-0.5 rounded ${
                            compliance.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {compliance.status}
                        </span>
                        {compliance.paid_at && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            {new Date(compliance.paid_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <CreateBillModal
        isOpen={modalType === 'bill'}
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
