import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const PLAN_FEATURES = {
  starter: {
    ops: true,
    finance: false,
    costing: false,
    crm: false,
    online: true,
  },
  growth: {
    ops: true,
    finance: true,
    costing: false,
    crm: true,
    online: true,
  },
  scale: {
    ops: true,
    finance: true,
    costing: true,
    crm: true,
    online: true,
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