import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Store, Shield, Check, Loader2, Calendar, Lock } from "lucide-react";
import { toast } from "sonner";

const PLAN_LABELS = {
  starter: { name: "Starter", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  growth: { name: "Growth", color: "bg-amber-100 text-amber-700 border-amber-200" },
  scale: { name: "Scale", color: "bg-red-100 text-red-700 border-red-200" },
};

export default function AccountProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [businessName, setBusinessName] = useState("");
  const [editing, setEditing] = useState(false);

  const { data: account, isLoading } = useQuery({
    queryKey: ['Account', user?.email],
    queryFn: async () => {
      const list = await base44.entities.Account.filter({ email: user?.email });
      if (list && list.length > 0) {
        setBusinessName(list[0].business_name || "");
      }
      return list || [];
    },
    enabled: !!user?.email,
  });

  // Auto-set default business name for new users
  useEffect(() => {
    if (!isLoading && (!account || account.length === 0) && !businessName && user?.full_name) {
      setBusinessName(`${user.full_name}'s Restaurant`);
    }
  }, [isLoading, account, businessName, user]);

  const hasAccount = account && account.length > 0;
  const currentPlan = hasAccount ? account[0].current_plan : "starter";
  const plan = PLAN_LABELS[currentPlan] || PLAN_LABELS.starter;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (hasAccount) {
        await base44.entities.Account.update(account[0].id, { business_name: businessName });
      } else {
        await base44.entities.Account.create({
          username: user?.email || "user",
          email: user?.email || "",
          business_name: businessName || "Mi Restaurante",
          current_plan: "starter",
          is_active: true,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['Account', user?.email] });
      toast.success("Cuenta actualizada");
      setEditing(false);
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <User className="w-4 h-4 text-primary" /> Mi Cuenta
        </CardTitle>
        <p className="text-xs text-muted-foreground">Gestiona tu información de negocio — tu cuenta es privada e independiente</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Privacy indicator */}
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
          <Shield className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="text-xs font-medium text-emerald-700">
            Cuenta privada y aislada — tus ventas, recetas, inventario y reportes no se comparten con otros usuarios
          </span>
        </div>

        {/* User identity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Titular</Label>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{user?.full_name || "Usuario"}</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Email de acceso</Label>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium truncate">{user?.email || "—"}</span>
            </div>
          </div>
        </div>

        {/* Business name + plan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nombre del negocio</Label>
            {editing ? (
              <div className="flex gap-2">
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Mi Restaurante"
                  className="h-8"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || !businessName.trim()}
                >
                  {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Store className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium truncate">{businessName || "Sin nombre"}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="flex-shrink-0">
                  Editar
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Plan y estado</Label>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={plan.color}>{plan.name}</Badge>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                <Lock className="w-3 h-3 mr-1" /> Activa
              </Badge>
              {hasAccount && account[0].plan_expires_at && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {account[0].plan_expires_at}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* New user onboarding hint */}
        {!hasAccount && (
          <div className="px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs text-primary font-medium">
              👋 ¡Bienvenido! Edita el nombre de tu negocio para crear tu cuenta privada. Todos tus datos estarán aislados y seguros.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}