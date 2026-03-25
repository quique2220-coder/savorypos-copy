import React from 'react';
import { usePlanAccess } from '@/lib/usePlanAccess';
import { Card, CardContent } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function ProtectedRoute({ children, requiredGroup }) {
  const { canAccess } = usePlanAccess();

  if (!canAccess(requiredGroup)) {
    return (
      <div className="p-6 min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md border-amber-200 bg-amber-50">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="flex justify-center">
              <Lock className="w-12 h-12 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-amber-900">Función bloqueada</h2>
              <p className="text-sm text-amber-700 mt-2">Esta función no está disponible en tu plan actual.</p>
            </div>
            <Link to="/Settings">
              <Button className="w-full">Mejorar plan</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return children;
}