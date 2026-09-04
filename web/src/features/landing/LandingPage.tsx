import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import {
  Building2,
  CreditCard,
  Wrench,
  Bell,
  FileText,
  Users,
  Vote,
  Menu,
  X,
  PieChart
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Compute intelligent route targets and CTA labels based on auth & approval state
  const needsOnboarding = user?.role === 'resident' && !user?.is_fully_approved;

  const primaryTarget = !isAuthenticated || !user
    ? '/register'
    : needsOnboarding
    ? '/onboarding'
    : '/dashboard';

  const primaryLabel = !isAuthenticated || !user
    ? 'Register Housing Society'
    : needsOnboarding
    ? 'Complete Society Onboarding'
    : user.role === 'admin'
    ? 'Open Executive Dashboard'
    : 'Open Resident Dashboard';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-violet-600 selection:text-white">
      
      {/* ── 1. Header Navigation ── */}
      <header className="bg-white/90 border-b border-violet-100 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Brand Logo */}
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-sm bg-violet-600 flex items-center justify-center text-white shadow-sm">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">
                SocietyHub
              </span>
            </Link>

            {/* Header Right Actions */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated && user ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 font-mono">
                    {user.name} ({user.role})
                  </span>
                  <button
                    onClick={() => navigate(primaryTarget)}
                    className="px-4 py-2 rounded-sm bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm transition-colors cursor-pointer"
                  >
                    {needsOnboarding ? 'Complete Onboarding' : 'Go to Dashboard'}
                  </button>
                </div>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-violet-700 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 rounded-sm bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm transition-colors"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-violet-100 bg-white px-4 pt-2 pb-4 space-y-2">
            <div className="pt-2 flex flex-col gap-2">
              {isAuthenticated && user ? (
                <button
                  onClick={() => navigate(primaryTarget)}
                  className="w-full py-2 rounded-sm bg-violet-600 text-white font-medium text-sm cursor-pointer"
                >
                  {needsOnboarding ? 'Complete Onboarding' : 'Go to Dashboard'}
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="w-full py-2 text-center text-sm font-medium text-slate-700 bg-violet-50 rounded-sm border border-violet-200"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="w-full py-2 text-center text-sm font-medium text-white bg-violet-600 rounded-sm"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── 2. Hero Section ── */}
      <section className="py-20 md:py-28 border-b border-violet-100 bg-gradient-to-b from-violet-50/70 via-violet-50/20 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
            Unified Management Platform for Housing Societies
          </h1>

          <p className="text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            SocietyHub provides automated maintenance billing, Razorpay payment reconciliation, structured grievance helpdesk tracking, and verifiable financial ledgers for residential complexes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to={primaryTarget}
              className="w-full sm:w-auto px-6 py-3 rounded-sm bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm text-center transition-colors shadow-sm"
            >
              {primaryLabel}
            </Link>

            {isAuthenticated && user ? (
              <button
                onClick={() => logout()}
                className="w-full sm:w-auto px-6 py-3 rounded-sm bg-white hover:bg-violet-50 border border-violet-200 text-slate-800 font-medium text-sm text-center transition-colors cursor-pointer"
              >
                Sign Out ({user.name})
              </button>
            ) : (
              <Link
                to="/login"
                className="w-full sm:w-auto px-6 py-3 rounded-sm bg-white hover:bg-violet-50 border border-violet-200 text-slate-800 font-medium text-sm text-center transition-colors"
              >
                Sign In to Portal
              </Link>
            )}
          </div>

          {/* Technical Specifications Bar */}
          <div className="pt-10 border-t border-violet-100 max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs font-mono text-slate-600 text-left sm:text-center">
            <div className="p-3 bg-white border border-violet-100 rounded-sm">
              <span className="text-slate-900 font-bold block">Razorpay API Integration</span>
              <span className="text-slate-500">Automated Payment Webhooks</span>
            </div>
            <div className="p-3 bg-white border border-violet-100 rounded-sm">
              <span className="text-slate-900 font-bold block">RBAC Security Model</span>
              <span className="text-slate-500">Admin & Resident Roles</span>
            </div>
            <div className="p-3 bg-white border border-violet-100 rounded-sm">
              <span className="text-slate-900 font-bold block">SLA Maintenance Helpdesk</span>
              <span className="text-slate-500">Real-time Ticket Tracking</span>
            </div>
          </div>

        </div>
      </section>

      {/* ── 3. Core System Capabilities Grid ── */}
      <section className="py-16 md:py-24 border-b border-violet-100 bg-violet-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-3xl mb-12">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-violet-600 mb-2">Capabilities Overview</h2>
            <p className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Structured Operations for Housing Management
            </p>
          </div>

          {/* 4-Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="p-6 rounded-sm bg-white border border-violet-100 space-y-3 shadow-sm">
              <div className="w-9 h-9 rounded-sm bg-violet-100/80 border border-violet-200 flex items-center justify-center text-violet-700">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Automated Billing</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Recurring maintenance generation, custom flat category overrides, Razorpay payment verification, and automatic digital receipt issuance.
              </p>
            </div>

            <div className="p-6 rounded-sm bg-white border border-violet-100 space-y-3 shadow-sm">
              <div className="w-9 h-9 rounded-sm bg-violet-100/80 border border-violet-200 flex items-center justify-center text-violet-700">
                <Wrench className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Grievance Helpdesk</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Resident complaint logging with photo documentation, status stage tracking (Open, In Progress, Resolved), and comment audit trails.
              </p>
            </div>

            <div className="p-6 rounded-sm bg-white border border-violet-100 space-y-3 shadow-sm">
              <div className="w-9 h-9 rounded-sm bg-violet-100/80 border border-violet-200 flex items-center justify-center text-violet-700">
                <PieChart className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Financial Ledgers</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Society expense accounting, vendor document attachment, and committee approval workflows for resident payout reimbursements.
              </p>
            </div>

            <div className="p-6 rounded-sm bg-white border border-violet-100 space-y-3 shadow-sm">
              <div className="w-9 h-9 rounded-sm bg-violet-100/80 border border-violet-200 flex items-center justify-center text-violet-700">
                <Bell className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Notice Broadcasts</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Priority-weighted announcement dispatch (Normal, Important, Urgent), pinned notices, and attached PDF agenda downloads.
              </p>
            </div>

          </div>

          {/* Secondary 2-Column Technical Feature Block */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            
            <div className="p-6 rounded-sm bg-white border border-violet-100 flex items-start gap-4 shadow-sm">
              <div className="w-9 h-9 rounded-sm bg-violet-100/80 border border-violet-200 flex items-center justify-center text-violet-700 shrink-0 mt-1">
                <Vote className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Democratic Digital Voting & Resolutions</h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  Enforce timed voting windows for society resolutions, major capital expenditures, and AGM proposals with automated vote auditing.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-sm bg-white border border-violet-100 flex items-start gap-4 shadow-sm">
              <div className="w-9 h-9 rounded-sm bg-violet-100/80 border border-violet-200 flex items-center justify-center text-violet-700 shrink-0 mt-1">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Document Vault & Compliance Repository</h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  Centralized access to society bylaws, audit reports, share certificates, and flat transfer records with role-based view permissions.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── 4. Solutions Persona Matrix ── */}
      <section className="py-16 md:py-24 border-b border-violet-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-3xl mb-12">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-violet-600 mb-2">Role Specifications</h2>
            <p className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Operational Features by Stakeholder Role
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Persona 1: Management Committee */}
            <div className="p-6 rounded-sm bg-violet-50/40 border border-violet-100 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-violet-200/80">
                <div className="w-8 h-8 rounded-sm bg-violet-100 flex items-center justify-center text-violet-700">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">For Executive Committees & Admins</h3>
              </div>

              <ul className="space-y-2 text-xs text-slate-700 font-mono">
                <li className="flex items-start gap-2">
                  <span className="text-violet-600 font-bold">•</span>
                  <span>Batch invoice dispatch with custom flat amount overrides</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-600 font-bold">•</span>
                  <span>Automated Razorpay settlement logging & bank reconciliation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-600 font-bold">•</span>
                  <span>Resident registration approval queue with block & flat verification</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-600 font-bold">•</span>
                  <span>Vendor expense ledger with digital payout approval records</span>
                </li>
              </ul>
            </div>

            {/* Persona 2: Resident Owners & Tenants */}
            <div className="p-6 rounded-sm bg-violet-50/40 border border-violet-100 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-violet-200/80">
                <div className="w-8 h-8 rounded-sm bg-violet-100 flex items-center justify-center text-violet-700">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">For Resident Owners & Tenants</h3>
              </div>

              <ul className="space-y-2 text-xs text-slate-700 font-mono">
                <li className="flex items-start gap-2">
                  <span className="text-violet-600 font-bold">•</span>
                  <span>1-Click Razorpay UPI / Credit Card maintenance payment</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-600 font-bold">•</span>
                  <span>Instant PDF receipt generation with verifiable transaction IDs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-600 font-bold">•</span>
                  <span>Grievance ticket submission with photo attachments & technician updates</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-600 font-bold">•</span>
                  <span>Direct emergency contacts directory (Security, Electrical, Plumbing)</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      </section>

      {/* ── 5. Footer & Legal Compliance ── */}
      <footer className="bg-slate-950 text-slate-400 text-xs py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            
            {/* Column 1: System Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-sm bg-violet-600 flex items-center justify-center text-white font-bold text-xs">
                  S
                </div>
                <span className="text-sm font-bold text-white">SocietyHub Platform</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-mono">
                Enterprise infrastructure for residential society billing and governance.
              </p>
            </div>

            {/* Column 2: Quick Actions */}
            <div>
              <h5 className="font-mono font-bold text-white uppercase text-[11px] tracking-wider mb-3">Portal Links</h5>
              <ul className="space-y-2 font-mono">
                <li><Link to="/register" className="hover:text-white">Register Housing Society</Link></li>
                <li><Link to="/login" className="hover:text-white">Portal Sign In</Link></li>
              </ul>
            </div>

            {/* Column 3: Legal & Terms Compliance */}
            <div>
              <h5 className="font-mono font-bold text-white uppercase text-[11px] tracking-wider mb-3">Legal & Compliance</h5>
              <ul className="space-y-2 font-mono">
                <li><Link to="/terms-and-conditions" className="hover:text-white">Terms of Service</Link></li>
                <li><Link to="/privacy-policy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link to="/refund-policy" className="hover:text-white">Refund Policy</Link></li>
                <li><Link to="/shipping-policy" className="hover:text-white">Shipping & Delivery Policy</Link></li>
              </ul>
            </div>

            {/* Column 4: Technical Security */}
            <div>
              <h5 className="font-mono font-bold text-white uppercase text-[11px] tracking-wider mb-3">Security Specifications</h5>
              <p className="text-xs text-slate-400 font-mono leading-relaxed">
                All communications encrypted via SSL/TLS. Payment processing powered by Razorpay.
              </p>
              <div className="mt-2 text-[11px] font-mono text-violet-400">
                STATUS: 256-BIT ENCRYPTED
              </div>
            </div>

          </div>

          <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono text-slate-500">
            <p>© {new Date().getFullYear()} SocietyHub Operations Inc. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link to="/terms-and-conditions" className="hover:text-slate-300">Terms</Link>
              <Link to="/privacy-policy" className="hover:text-slate-300">Privacy</Link>
              <Link to="/refund-policy" className="hover:text-slate-300">Refunds</Link>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
