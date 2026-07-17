import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserPlus, Mail, Loader2, Shield, Lock } from "lucide-react";
import { toast } from "sonner";

export default function UserManagement() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviting, setInviting] = useState(false);

  const isAdmin = user?.role === "admin";

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['Users'],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail.trim(), inviteRole);
      toast.success(`Invitación enviada a ${inviteEmail}`);
      setInviteEmail("");
      qc.invalidateQueries({ queryKey: ['Users'] });
    } catch (e) {
      toast.error(`Error: ${e.message}`);
    } finally {
      setInviting(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" /> Gestión de Usuarios
        </CardTitle>
        <p className="text-xs text-muted-foreground">Cada restaurante se registra con su propio correo y ve únicamente su información</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Data isolation guarantee */}
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
          <Lock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="text-xs font-medium text-emerald-700">
            Aislamiento garantizado — cada usuario ve solo sus propias ventas, recetas, inventario y reportes
          </span>
        </div>

        {/* Invite form */}
        <div className="flex flex-col sm:flex-row gap-3 p-3 rounded-lg bg-muted/30 border border-border">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Invitar nuevo usuario por correo</Label>
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="nuevo@restaurante.com"
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Rol</Label>
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuario</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} size="sm" className="gap-2">
              {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              Invitar
            </Button>
          </div>
        </div>

        {/* User list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No hay usuarios registrados</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {users.length} {users.length === 1 ? "usuario registrado" : "usuarios registrados"}
            </p>
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                    {(u.full_name || u.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.full_name || "Sin nombre"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3" /> {u.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {u.id === user?.id && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">Tú</Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={u.role === "admin"
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "bg-muted text-muted-foreground"}
                  >
                    {u.role === "admin" ? <><Shield className="w-3 h-3 mr-1" />Admin</> : "Usuario"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}