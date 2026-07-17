import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Shield, DollarSign, BarChart3 } from "lucide-react";
import AdminOverview from "@/components/admin/AdminOverview";
import QuickPriceEditor from "@/components/admin/QuickPriceEditor";
import Reports from "@/pages/Reports";

export default function AdminDashboard() {
  const [tab, setTab] = useState("overview");

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel del Dueño</h1>
          <p className="text-sm text-muted-foreground">
            Gestión completa del menú, precios y reportes financieros globales
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview" className="gap-1.5">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="prices" className="gap-1.5">
            <DollarSign className="w-4 h-4" />
            <span className="hidden sm:inline">Precios</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Reportes</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <AdminOverview />
        </TabsContent>

        <TabsContent value="prices" className="mt-6">
          <QuickPriceEditor />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <Reports />
        </TabsContent>
      </Tabs>
    </div>
  );
}