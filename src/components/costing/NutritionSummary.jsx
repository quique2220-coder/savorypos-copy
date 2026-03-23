import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function NutritionSummary({ totals, servings = 1, allergens = [] }) {
  const [selectedServing, setSelectedServing] = useState("1");
  
  const servingNum = parseInt(selectedServing) || 1;
  
  const nutritionPerServing = {
    calories: (totals?.totalCalories || 0) / servingNum,
    protein: (totals?.totalProtein || 0) / servingNum,
    carbs: (totals?.totalCarbs || 0) / servingNum,
    fat: (totals?.totalFat || 0) / servingNum,
    sodium: (totals?.totalSodium || 0) / servingNum,
  };

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm">Información Nutricional (por {selectedServing})</CardTitle>
        <Select value={selectedServing} onValueChange={setSelectedServing}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: Math.min(servings, 8) }, (_, i) => i + 1).map(n => (
              <SelectItem key={n} value={String(n)}>
                {n} {n === 1 ? 'porción' : 'porciones'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Calorías (kcal)</p>
            <p className="text-lg font-bold text-primary">{nutritionPerServing.calories.toFixed(0)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Proteína (g)</p>
            <p className="text-lg font-bold">{nutritionPerServing.protein.toFixed(1)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Carbos (g)</p>
            <p className="text-lg font-bold">{nutritionPerServing.carbs.toFixed(1)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Grasa (g)</p>
            <p className="text-lg font-bold">{nutritionPerServing.fat.toFixed(1)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Sodio (mg)</p>
            <p className="text-lg font-bold">{nutritionPerServing.sodium.toFixed(0)}</p>
          </div>
        </div>

        {allergens && allergens.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Alérgenos</p>
            <div className="flex flex-wrap gap-1">
              {allergens.map(allergen => (
                <Badge key={allergen} variant="outline" className="text-xs">
                  {allergen}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}