import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <Link to="/" className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-6">
          <ChevronLeft size={20} />
          <span>Back to Home</span>
        </Link>
        <h1 className="text-3xl font-bold text-slate-800 mb-6">Cancellation & Refund Policy</h1>

        <div className="prose prose-slate max-w-none text-slate-600 space-y-4">
          <p className="text-lg font-medium">My Business does not support returns or refunds.</p>
          <p>
            All transactions and payments made through our platform are final. We do not offer any refunds, returns, or cancellations for any services or goods once the transaction has been completed.
          </p>
          <p>
            If you have any questions or concerns that need to be addressed before making a payment, please contact our support team. Once a payment is successful, it cannot be reversed.
          </p>
        </div>
      </div>
    </div>
  );
}
