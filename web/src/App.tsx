import { useState } from 'react';
import {
  Building2, Users, FileText, CreditCard, PenTool,
  Settings, LogOut, Bell, Search, TrendingUp,
  AlertCircle, CheckCircle2, ChevronRight, Menu
} from 'lucide-react';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Mock Data
  const stats = [
    { label: 'Total Collection', value: '₹4,25,000', trend: '+12%', icon: TrendingUp, color: 'text-emerald-600' },
    { label: 'Pending Dues', value: '₹45,200', trend: '-5%', icon: AlertCircle, color: 'text-amber-500' },
    { label: 'Active Complaints', value: '12', trend: '+2', icon: PenTool, color: 'text-indigo-600' },
    { label: 'Occupied Flats', value: '142', trend: '95%', icon: Building2, color: 'text-blue-600' }
  ];

  const recentTransactions = [
    { id: 'TRX-1012', resident: 'Rahul Verma', flat: 'A-101', amount: '₹2,500', status: 'Paid', date: 'Today, 10:30 AM' },
    { id: 'TRX-1013', resident: 'Priya Singh', flat: 'B-204', amount: '₹3,200', status: 'Pending', date: 'Yesterday' },
    { id: 'TRX-1014', resident: 'Amit Kumar', flat: 'C-305', amount: '₹2,500', status: 'Paid', date: 'Feb 25, 2026' },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className={`bg-indigo-900 text-white transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'} flex flex-col`}>
        <div className="p-4 flex items-center gap-3 border-b border-indigo-800">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Building2 size={24} />
          </div>
          {isSidebarOpen && <h1 className="font-bold text-xl tracking-tight">Society Hub</h1>}
        </div>

        <nav className="flex-1 py-6 px-3 space-y-2">
          {[
            { id: 'dashboard', icon: TrendingUp, label: 'Dashboard' },
            { id: 'residents', icon: Users, label: 'Residents Directory' },
            { id: 'billing', icon: CreditCard, label: 'Billing & Payments' },
            { id: 'complaints', icon: PenTool, label: 'Helpdesk' },
            { id: 'documents', icon: FileText, label: 'Documents' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${activeTab === item.id ? 'bg-indigo-800 text-white' : 'text-indigo-200 hover:bg-indigo-800/50 hover:text-white'
                }`}
            >
              <item.icon size={20} />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-indigo-800">
          <button className="w-full flex items-center gap-3 px-3 py-2 text-indigo-200 hover:text-white transition-colors">
            <Settings size={20} />
            {isSidebarOpen && <span>Settings</span>}
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-indigo-200 hover:text-white transition-colors mt-2">
            <LogOut size={20} />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-500 hover:text-slate-700">
              <Menu size={24} />
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search residents, flats, or bills..."
                className="pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-lg text-sm w-64 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-sm">
                SA
              </div>
              <div className="hidden md:block text-sm">
                <p className="font-semibold text-slate-700">Society Admin</p>
                <p className="text-slate-500 text-xs text-left">Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">

            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Overview</h2>
                <p className="text-slate-500 text-sm mt-1">Manage your society's operations and billing.</p>
              </div>
              <button
                onClick={() => alert("Creating Razorpay Order Intent...")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors shadow-sm"
              >
                + Generate Bills
              </button>
            </div>

            {activeTab === 'dashboard' && (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {stats.map((stat, i) => (
                    <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-2 rounded-lg bg-slate-50 ${stat.color}`}>
                          <stat.icon size={24} />
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${stat.trend.startsWith('+') ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                          {stat.trend}
                        </span>
                      </div>
                      <h3 className="text-slate-500 text-sm font-medium">{stat.label}</h3>
                      <p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Recent Transactions */}
                  <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                      <h3 className="font-semibold text-slate-800">Recent Bill Payments</h3>
                      <button
                        onClick={() => setActiveTab('billing')}
                        className="text-indigo-600 text-sm font-medium hover:text-indigo-800 flex items-center"
                      >
                        View All <ChevronRight size={16} />
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-white border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                            <th className="p-4 font-semibold">Resident</th>
                            <th className="p-4 font-semibold">Amount</th>
                            <th className="p-4 font-semibold">Status</th>
                            <th className="p-4 font-semibold">Date</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {recentTransactions.map((trx, i) => (
                            <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                              <td className="p-4">
                                <p className="font-medium text-slate-800">{trx.resident}</p>
                                <p className="text-slate-500 text-xs">Flat {trx.flat} • {trx.id}</p>
                              </td>
                              <td className="p-4 font-medium text-slate-700">{trx.amount}</td>
                              <td className="p-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${trx.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                  }`}>
                                  {trx.status === 'Paid' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                  {trx.status}
                                </span>
                              </td>
                              <td className="p-4 text-slate-500">{trx.date}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Legal & Payments Context */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-800 text-lg mb-4">Secure Payment Hub</h3>
                      <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                        Society Hub integrates the <strong>Razorpay Payment Gateway</strong>.
                        When administrators generate society maintenance bills, residents use the app to securely checkout using UPI, Cards, or Netbanking.
                      </p>
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-6 tracking-tight">
                        <p className="text-xs text-slate-500 font-semibold uppercase mb-2">Required Legal Links</p>
                        <div className="space-y-2 text-sm text-indigo-600 font-medium">
                          <a href="#" onClick={(e) => { e.preventDefault(); alert("Privacy Policy Document"); }} className="flex items-center gap-2 hover:underline"><ChevronRight size={14} /> Privacy Policy</a>
                          <a href="#" onClick={(e) => { e.preventDefault(); alert("Terms & Conditions Document"); }} className="flex items-center gap-2 hover:underline"><ChevronRight size={14} /> Terms & Conditions</a>
                          <a href="#" onClick={(e) => { e.preventDefault(); alert("Cancellation & Refunds Document"); }} className="flex items-center gap-2 hover:underline"><ChevronRight size={14} /> Cancellation & Refunds</a>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200 text-center">
                      <p className="text-xs text-slate-400 font-medium tracking-wide">SECURED BY RAZORPAY</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'residents' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex items-center justify-center h-96">
                <div className="text-center">
                  <Users size={48} className="mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700">Resident Directory</h3>
                  <p className="text-slate-500 mt-2">This feature is available in the full web platform.</p>
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-semibold text-slate-800 text-lg">All Bill Payments</h3>
                  <div className="flex gap-2">
                    <input type="month" defaultValue="2026-02" className="border border-slate-300 rounded px-3 py-1 text-sm bg-white" />
                  </div>
                </div>
                <div className="p-6">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                        <th className="pb-3 font-semibold">Resident</th>
                        <th className="pb-3 font-semibold">Amount</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold">Date</th>
                        <th className="pb-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {recentTransactions.map((trx, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="py-4">
                            <p className="font-medium text-slate-800">{trx.resident}</p>
                            <p className="text-slate-500 text-xs">Flat {trx.flat} • {trx.id}</p>
                          </td>
                          <td className="py-4 font-medium text-slate-700">{trx.amount}</td>
                          <td className="py-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${trx.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                              {trx.status === 'Paid' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                              {trx.status}
                            </span>
                          </td>
                          <td className="py-4 text-slate-500">{trx.date}</td>
                          <td className="py-4 text-right">
                            <button
                              onClick={() => alert(`Viewing details for ${trx.id}`)}
                              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'complaints' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex items-center justify-center h-96">
                <div className="text-center">
                  <PenTool size={48} className="mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700">Helpdesk</h3>
                  <p className="text-slate-500 mt-2">Manage maintenance requests from the community.</p>
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex items-center justify-center h-96">
                <div className="text-center">
                  <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700">Documents</h3>
                  <p className="text-slate-500 mt-2">Securely store society rules, meeting minutes, and legal docs.</p>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
