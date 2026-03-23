import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, Star, X, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CustomerLookup({ customers = [], selectedCustomer, onSelect, onClear }) {
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);

  const results = query.trim().length >= 2
    ? customers.filter(c =>
        c.name?.toLowerCase().includes(query.toLowerCase()) ||
        c.phone?.includes(query) ||
        c.email?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : [];

  const handleSelect = (c) => {
    onSelect(c);
    setQuery("");
    setShowResults(false);
  };

  const handleGuest = () => {
    onSelect({ id: null, name: query || "Guest", phone: "", email: "", loyalty_points: 0, visit_count: 0 });
    setQuery("");
    setShowResults(false);
  };

  if (selectedCustomer) {
    return (
      <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
        <User className="w-3.5 h-3.5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-primary truncate">{selectedCustomer.name}</p>
          {selectedCustomer.id && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Star className="w-2.5 h-2.5 text-amber-500" />
              {selectedCustomer.loyalty_points || 0} pts · {selectedCustomer.visit_count || 0} visitas
            </p>
          )}
        </div>
        <button onClick={onClear} className="text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente (nombre, tel, email)..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
          onFocus={() => setShowResults(true)}
          className="h-8 text-xs pl-8"
        />
      </div>

      {showResults && query.trim().length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {results.map(c => (
            <button
              key={c.id}
              onClick={() => handleSelect(c)}
              className="w-full text-left px-3 py-2 hover:bg-muted/60 text-xs border-b border-border/50 last:border-0"
            >
              <p className="font-medium">{c.name}</p>
              <p className="text-muted-foreground flex items-center gap-2">
                {c.phone && <span>{c.phone}</span>}
                <span className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5 text-amber-500" />{c.loyalty_points || 0} pts</span>
              </p>
            </button>
          ))}
          <button
            onClick={handleGuest}
            className="w-full text-left px-3 py-2 hover:bg-muted/60 text-xs flex items-center gap-2 text-primary"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {results.length === 0 ? `Crear "${query}"` : `Agregar como nuevo: "${query}"`}
          </button>
        </div>
      )}
    </div>
  );
}