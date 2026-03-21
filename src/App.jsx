import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import Layout from './components/Layout';
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
        <Route path="/POS" element={<POS />} />
        <Route path="/Menu" element={<Menu />} />
        <Route path="/Orders" element={<Orders />} />
        <Route path="/Inventory" element={<Inventory />} />
        <Route path="/Reports" element={<Reports />} />
        <Route path="/Proyecciones" element={<Proyecciones />} />
        <Route path="/Contabilidad" element={<Contabilidad />} />
        <Route path="/CRM" element={<CRM />} />
        <Route path="/Settings" element={<Settings />} />
        <Route path="/Ingredients" element={<Ingredients />} />
        <Route path="/Recipes" element={<Recipes />} />
      </Route>
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