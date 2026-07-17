import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from './AuthContext';

const PLAN_FEATURES = {
  starter: {
    // Operacional: POS, Órdenes, Menú, Inventario
    POS: true,
    Orders: true,
    Menu: true,
    Inventory: true,
    Ingredients: true,
    Recipes: true,
    // Finanzas
    Reports: false,
    Contabilidad: false,
    Proyecciones: false,
    // Costeo
    // (solo en Scale)
    // CRM
    CRM: false,
    // Online
    OrderOnline: false,
    OrderConfirmation: false,
  },
  growth: {
    // Operacional
    POS: true,
    Orders: true,
    Menu: true,
    Inventory: true,
    Ingredients: true,
    Recipes: true,
    // Finanzas: Reports, Contabilidad
    Reports: true,
    Contabilidad: true,
    Proyecciones: false,
    // Costeo
    // (solo en Scale)
    // CRM: Marketing + Reportes
    CRM: true,
    // Online: Menú online + Pedidos online (pickup)
    OrderOnline: true,
    OrderConfirmation: true,
  },
  scale: {
    // Operacional
    POS: true,
    Orders: true,
    Menu: true,
    Inventory: true,
    Ingredients: true,
    Recipes: true,
    // Finanzas
    Reports: true,
    Contabilidad: true,
    Proyecciones: true,
    // Costeo: recetas + ingredientes (todo)
    // CRM
    CRM: true,
    // Online + Delivery
    OrderOnline: true,
    OrderConfirmation: true,
  },
};

export function usePlanAccess() {
  const { user } = useAuth();
  
  const { data: accounts = [] } = useQuery({
    queryKey: ['Account', user?.email],
    queryFn: () => base44.entities.Account.filter({ email: user?.email }),
    enabled: !!user?.email,
  });

  const currentPlan = accounts[0]?.current_plan || 'starter';
  const features = PLAN_FEATURES[currentPlan] || PLAN_FEATURES.growth;

  // Role-based + plan-based access control
  // Employees (role === "user") can only access the POS terminal
  // Owner (role === "admin") has plan-based access to all modules
  const isEmployee = user?.role === "user";

  const canAccess = (group) => {
    // Employees: POS only
    if (isEmployee) {
      return group === "pos";
    }
    // Admin/owner: "pos" and "admin" groups always accessible
    if (group === "pos" || group === "admin") return true;

    // Plan-based access for other groups
    const groupMap = {
      'ops': ['POS', 'Orders', 'Menu', 'Inventory', 'Ingredients', 'Recipes'],
      'finance': ['Reports', 'Contabilidad', 'Proyecciones'],
      'costing': ['Ingredients', 'Recipes'],
      'crm': ['CRM'],
      'online': ['OrderOnline', 'OrderConfirmation'],
    };

    const modules = groupMap[group] || [group];
    return modules.some(mod => features[mod] === true);
  };

  return {
    currentPlan,
    canAccess,
    isEmployee,
    isOwner: !isEmployee,
    hasFeature: (module) => features[module] === true,
  };
}