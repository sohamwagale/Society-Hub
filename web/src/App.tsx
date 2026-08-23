import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './features/dashboard/Dashboard';
import Login from './features/auth/Login';
import Register from './features/auth/Register';
import Onboarding from './features/onboarding/Onboarding';
import ProtectedRoute from './features/auth/ProtectedRoute';
import TermsAndConditions from './features/legal/TermsAndConditions';
import PrivacyPolicy from './features/legal/PrivacyPolicy';
import RefundPolicy from './features/legal/RefundPolicy';
import ShippingPolicy from './features/legal/ShippingPolicy';

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/onboarding" element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        } />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="/shipping-policy" element={<ShippingPolicy />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
