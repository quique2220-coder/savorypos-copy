import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

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
  const { data: settings = [] } = useQuery({
    queryKey: ['AppSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const currentPlan = settings[0]?.current_plan || 'growth';
  const features = PLAN_FEATURES[currentPlan] || PLAN_FEATURES.growth;

  return {
    currentPlan,
    canAccess: (group) => features[group] === true,
    hasFeature: (group) => features[group] === true,
  };
}