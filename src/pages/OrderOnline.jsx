import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { calcRecipeTotals } from "@/utils/recipeCalculator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Plus, Minus, Trash2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function OrderOnline() {
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes-public"],
    queryFn: () => base44.entities.Recipe.list("-updated_date", 200),
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ["ingredients-public"],
    queryFn: () => base44.entities.Ingredient.list("-updated_date", 500),
  });

  const menuItems = useMemo(() => {
    const ingMap = Object.fromEntries(ingredients.map((i) => [i.id, i]));
    return recipes
      .filter((r) => r.recipe_type !== "subrecipe" && r.is_active !== false)
      .map((r) => {
        const totals = calcRecipeTotals(r, ingMap);
        const price = totals.suggestedPrice > 0 ? totals.suggestedPrice : r.sale_price;
        if (!price || price <= 0) return null;
        return {
          id: r.id,
          name: r.name,
          description: r.description || "",
          price,
          image_url: r.image_url || null,
          category: r.category || "General",
        };
      })
      .filter(Boolean);
  }, [recipes, ingredients]);

  const categories = useMemo(() => {
    return [...new Set(menuItems.map((i) => i.category))];
  }, [menuItems]);

  const filtered = menuItems.filter((item) => {
    const matchCat = !activeCategory || item.category === activeCategory;
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const addToCart = (item) => {
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.id === item.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx].quantity += 1;
        return updated;
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((c) => (c.id === id ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const handleCheckout = async () => {
    if (!cart.length) return;
    setIsCheckingOut(true);
    try {
      const items = cart.map((c) => ({
        name: c.name,
        quantity: c.quantity,
        price: c.price.toFixed(2),
      }));
      const res = await base44.functions.invoke("create-checkout", { items });
      if (res?.redirectUrl) {
        window.location.href = res.redirectUrl;
      } else {
        alert("Error al iniciar el pago. Intenta de nuevo.");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      alert("Error al iniciar el pago: " + err.message);
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">🍽️ Ordenar en Línea</h1>
            <p className="text-xs text-muted-foreground">Elige tus platillos y paga en línea</p>
          </div>
          <button
            onClick={() => setShowCart(true)}
            className="relative flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>${cartTotal.toFixed(2)}</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar platillos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
              !activeCategory
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            Todo
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const inCart = cart.find((c) => c.id === item.id);
            return (
              <div
                key={item.id}
                className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
              >
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-40 object-cover"
                  />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold text-foreground">{item.name}</h3>
                    <Badge variant="secondary" className="ml-2 shrink-0">{item.category}</Badge>
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-lg font-bold text-primary">${item.price.toFixed(2)}</span>
                    {inCart ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQty(item.id, -1)}
                          className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-sm w-5 text-center">{inCart.quantity}</span>
                        <button
                          onClick={() => updateQty(item.id, 1)}
                          className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(item)}
                        className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Agregar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg">No hay platillos disponibles</p>
          </div>
        )}
      </div>

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowCart(false)} />
          <div className="w-full max-w-sm bg-card shadow-2xl flex flex-col">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-lg">Tu Orden</h2>
              <button onClick={() => setShowCart(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-auto px-5 py-4 space-y-3">
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Tu carrito está vacío</p>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} c/u</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQty(item.id, -1)}
                        className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-semibold w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        className="w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-sm font-bold w-16 text-right">${(item.price * item.quantity).toFixed(2)}</p>
                    <button onClick={() => updateQty(item.id, -item.quantity)}>
                      <Trash2 className="w-4 h-4 text-destructive/60 hover:text-destructive" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="px-5 py-4 border-t border-border space-y-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">${cartTotal.toFixed(2)}</span>
                </div>
                <Button
                  className="w-full h-12 text-base font-bold"
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                >
                  {isCheckingOut ? "Redirigiendo..." : "Pagar ahora →"}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Pago seguro procesado por Base44 Payments
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}