import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ShippingPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <Link to="/" className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-6">
          <ChevronLeft size={20} />
          <span>Back to Home</span>
        </Link>
        <h1 className="text-3xl font-bold text-slate-800 mb-6">Shipping Policy</h1>

        <div className="prose prose-slate max-w-none text-slate-600 space-y-4">
          <p className="text-lg font-medium">My Business does not ship goods.</p>
          <p>
            As our platform provides digital services and facilitation (such as society maintenance bill payments), we do not engage in the physical shipping, delivery, or logistics of any tangible goods or products.
          </p>
          <p>
            Therefore, no shipping policies, delivery timelines, or shipping charges apply to your use of our services.
          </p>
        </div>
      </div>
    </div>
  );
}
