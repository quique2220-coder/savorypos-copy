import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { 
  Monitor, UtensilsCrossed, Package, BarChart3, 
  ClipboardList, ChevronLeft, ChevronRight, Flame,
  BookOpen, TrendingUp, Users, Settings2, FlaskConical, ChefHat, Globe, Mic, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/AuthContext";
import { usePlanAccess } from "@/lib/usePlanAccess";

const navItems = [
  { path: "/POS", label: "POS Terminal", icon: Monitor, group: "pos" },
  { path: "/Menu", label: "Menu", icon: UtensilsCrossed, group: "ops" },
  { path: "/Orders", label: "Orders", icon: ClipboardList, group: "ops" },
  { path: "/Inventory", label: "Inventory", icon: Package, group: "ops" },
  { path: "/Reports", label: "Reports", icon: BarChart3, group: "finance" },
  { path: "/Proyecciones", label: "Proyecciones", icon: TrendingUp, group: "finance" },
  { path: "/Contabilidad", label: "Contabilidad", icon: BookOpen, group: "finance" },
  { path: "/Ingredients", label: "Ingredientes", icon: FlaskConical, group: "costing" },
  { path: "/Recipes", label: "Platillos", icon: ChefHat, group: "costing" },
  { path: "/VoiceAssistant", label: "🤖 Asistente IA", icon: Mic, group: "costing" },
  { path: "/CRM", label: "CRM + Marketing", icon: Users, group: "crm" },
  { path: "/Admin", label: "Panel del Dueño", icon: Shield, group: "admin" },
  { path: "/Settings", label: "Settings", icon: Settings2, group: "admin" },
  { path: "/OrderOnline", label: "Menú Online", icon: Globe, group: "online", external: true },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const { canAccess, isEmployee } = usePlanAccess();

  const renderLinks = (group) => navItems
    .filter(i => i.group === group && canAccess(i.group))
    .map((item) => {
      const isActive = location.pathname === item.path;
      
      return (
        <Link
          key={item.path}
          to={item.path}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
            isActive 
              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20" 
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <item.icon className={cn("w-5 h-5 shrink-0", isActive && "drop-shadow-sm")} />
          {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
        </Link>
      );
    });

  const hasVisibleLinks = (group) => navItems.some(i => i.group === group && canAccess(i.group));

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 shrink-0",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-base font-bold text-sidebar-primary-foreground tracking-tight">FoodPOS</h1>
              <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest">Point of Sale</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {/* POS — always visible (both roles) */}
          {!collapsed && <p className="px-3 text-[10px] uppercase tracking-widest text-sidebar-foreground/40 mb-1">Ventas</p>}
          {renderLinks("pos")}
          {hasVisibleLinks("ops") && <div className="h-3" />}
          {hasVisibleLinks("ops") && !collapsed && <p className="px-3 text-[10px] uppercase tracking-widest text-sidebar-foreground/40 mb-1">Operaciones</p>}
          {renderLinks("ops")}
          {hasVisibleLinks("finance") && <div className="h-3" />}
          {hasVisibleLinks("finance") && !collapsed && <p className="px-3 text-[10px] uppercase tracking-widest text-sidebar-foreground/40 mb-1">Finanzas</p>}
          {renderLinks("finance")}
          {hasVisibleLinks("costing") && <div className="h-3" />}
          {hasVisibleLinks("costing") && !collapsed && <p className="px-3 text-[10px] uppercase tracking-widest text-sidebar-foreground/40 mb-1">Costeo</p>}
          {renderLinks("costing")}
          {hasVisibleLinks("crm") && <div className="h-3" />}
          {hasVisibleLinks("crm") && !collapsed && <p className="px-3 text-[10px] uppercase tracking-widest text-sidebar-foreground/40 mb-1">CRM</p>}
          {renderLinks("crm")}
          {hasVisibleLinks("admin") && <div className="h-3" />}
          {hasVisibleLinks("admin") && !collapsed && <p className="px-3 text-[10px] uppercase tracking-widest text-sidebar-foreground/40 mb-1">Administración</p>}
          {renderLinks("admin")}
          {canAccess("online") && <div className="h-3" />}
          {canAccess("online") && !collapsed && <p className="px-3 text-[10px] uppercase tracking-widest text-sidebar-foreground/40 mb-1">Online</p>}
          {canAccess("online") && (
            <a
              href="/OrderOnline"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Globe className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="text-sm font-medium truncate">Menú Online ↗</span>}
            </a>
          )}
        </nav>

        {/* Role badge */}
        {!collapsed && (
          <div className="px-3 py-2 border-t border-sidebar-border">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-sidebar-accent/50">
              <div className="w-7 h-7 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-xs font-bold text-sidebar-primary shrink-0">
                {(user?.full_name || user?.email || "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.full_name || "Usuario"}</p>
                <Badge variant="outline" className={cn(
                  "text-[10px] px-1.5 py-0 h-4",
                  isEmployee
                    ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
                    : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                )}>
                  {isEmployee ? "Empleado" : "Dueño"}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Collapse */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-12 border-t border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}