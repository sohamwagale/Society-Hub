import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import Login from './features/auth/Login';
import Register from './features/auth/Register';
import Onboarding from './features/onboarding/Onboarding';
import ProtectedRoute from './features/auth/ProtectedRoute';
import GuestRoute from './features/auth/GuestRoute';
import RootGate from './features/auth/RootGate';
import TermsAndConditions from './features/legal/TermsAndConditions';
import PrivacyPolicy from './features/legal/PrivacyPolicy';
import RefundPolicy from './features/legal/RefundPolicy';
import ShippingPolicy from './features/legal/ShippingPolicy';
import { ToastContainer } from './components/Toast';
import { ConfirmContainer } from './components/ConfirmModal';
import OverviewTab from './features/dashboard/components/OverviewTab';
import AnnouncementsTab from './features/announcements/AnnouncementsTab';
import ResidentsTab from './features/residents/ResidentsTab';
import BillingTab from './features/billing/BillingTab';
import ComplaintsTab from './features/complaints/ComplaintsTab';
import DocumentsTab from './features/documents/DocumentsTab';
import ExpensesTab from './features/expenses/ExpensesTab';
import ReimbursementsTab from './features/reimbursements/ReimbursementsTab';
import PollsTab from './features/polls/PollsTab';
import EmergencyInfoTab from './features/emergency/EmergencyInfoTab';
import FlatsTab from './features/flats/FlatsTab';
import ApprovalsTab from './features/approvals/ApprovalsTab';
import ActivityLogTab from './features/activityLog/ActivityLogTab';
import SettingsTab from './features/settings/SettingsTab';

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ToastContainer />
      <ConfirmContainer />
      <Routes>
        <Route path="/" element={<RootGate />}>
          <Route index element={<OverviewTab />} />
          <Route path="announcements" element={<AnnouncementsTab />} />
          <Route path="residents" element={<ResidentsTab />} />
          <Route path="billing" element={<BillingTab />} />
          <Route path="complaints" element={<ComplaintsTab />} />
          <Route path="documents" element={<DocumentsTab />} />
          <Route path="expenses" element={<ExpensesTab />} />
          <Route path="reimbursements" element={<ReimbursementsTab />} />
          <Route path="polls" element={<PollsTab />} />
          <Route path="emergency" element={<EmergencyInfoTab />} />
          <Route path="flats" element={<FlatsTab />} />
          <Route path="approvals" element={<ApprovalsTab />} />
          <Route path="activity-log" element={<ActivityLogTab />} />
          <Route path="settings" element={<SettingsTab />} />
        </Route>
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/app" element={<Navigate to="/" replace />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/login"
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <Register />
            </GuestRoute>
          }
        />
        <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="/shipping-policy" element={<ShippingPolicy />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
