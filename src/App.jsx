import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import POS from './pages/POS';
import Menu from './pages/Menu';
import Orders from './pages/Orders';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Proyecciones from './pages/Proyecciones';
import Contabilidad from './pages/Contabilidad';
import CRM from './pages/CRM';
import Settings from './pages/Settings';
import Ingredients from './pages/Ingredients';
import Recipes from './pages/Recipes';
import VoiceAssistant from './pages/VoiceAssistant';
import OrderOnline from './pages/OrderOnline';
import OrderConfirmation from './pages/OrderConfirmation';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/POS" replace />} />
      <Route element={<Layout />}>
        <Route path="/POS" element={<ProtectedRoute requiredGroup="ops"><POS /></ProtectedRoute>} />
        <Route path="/Menu" element={<ProtectedRoute requiredGroup="ops"><Menu /></ProtectedRoute>} />
        <Route path="/Orders" element={<ProtectedRoute requiredGroup="ops"><Orders /></ProtectedRoute>} />
        <Route path="/Inventory" element={<ProtectedRoute requiredGroup="ops"><Inventory /></ProtectedRoute>} />
        <Route path="/Reports" element={<ProtectedRoute requiredGroup="finance"><Reports /></ProtectedRoute>} />
        <Route path="/Proyecciones" element={<ProtectedRoute requiredGroup="finance"><Proyecciones /></ProtectedRoute>} />
        <Route path="/Contabilidad" element={<ProtectedRoute requiredGroup="finance"><Contabilidad /></ProtectedRoute>} />
        <Route path="/CRM" element={<ProtectedRoute requiredGroup="crm"><CRM /></ProtectedRoute>} />
        <Route path="/Settings" element={<Settings />} />
        <Route path="/Ingredients" element={<ProtectedRoute requiredGroup="costing"><Ingredients /></ProtectedRoute>} />
        <Route path="/Recipes" element={<ProtectedRoute requiredGroup="costing"><Recipes /></ProtectedRoute>} />
        <Route path="/VoiceAssistant" element={<ProtectedRoute><VoiceAssistant /></ProtectedRoute>} />
      </Route>
      {/* Public pages - outside Layout */}
      <Route path="/OrderOnline" element={<OrderOnline />} />
      <Route path="/OrderConfirmation" element={<OrderConfirmation />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App