import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { calcRecipeTotals } from "@/utils/recipeCalculator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, Minus, Trash2, Search, X, Flame, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
          prep_time_minutes: r.prep_time_minutes || null,
        };
      })
      .filter(Boolean);
  }, [recipes, ingredients]);

  const categories = useMemo(() => [...new Set(menuItems.map((i) => i.category))], [menuItems]);

  const filtered = useMemo(() => menuItems.filter((item) => {
    const matchCat = !activeCategory || item.category === activeCategory;
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  }), [menuItems, activeCategory, search]);

  const addToCart = (item) => {
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.id === item.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 };
        return updated;
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev.map((c) => (c.id === id ? { ...c, quantity: c.quantity + delta } : c)).filter((c) => c.quantity > 0)
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

  // Group items by category for display
  const grouped = useMemo(() => {
    if (activeCategory || search) return { [activeCategory || "Resultados"]: filtered };
    return categories.reduce((acc, cat) => {
      const items = filtered.filter((i) => i.category === cat);
      if (items.length) acc[cat] = items;
      return acc;
    }, {});
  }, [filtered, categories, activeCategory, search]);

  return (
    <div className="min-h-screen bg-[#f9f5f0]">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-orange-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/30">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground leading-tight">Menú Online</h1>
              <p className="text-[10px] text-muted-foreground">Ordena y paga en línea</p>
            </div>
          </div>

          {/* Search – desktop */}
          <div className="hidden sm:flex flex-1 max-w-sm relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar platillos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9 bg-secondary/60 border-transparent focus:border-primary"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowCart(true)}
            className="relative flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-primary/90 active:scale-95 transition-all shadow-md shadow-primary/25"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">${cartTotal.toFixed(2)}</span>
            <span className="sm:hidden">Carrito</span>
            <AnimatePresence>
              {cartCount > 0 && (
                <motion.span
                  key="badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow"
                >
                  {cartCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </header>

      {/* ── HERO ── */}
      <div className="bg-gradient-to-br from-orange-500 to-amber-500 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-2 tracking-tight">¿Qué se te antoja hoy?</h2>
          <p className="text-orange-100 text-base mb-6">Ordena directo desde aquí y recoge listo.</p>
          {/* Search – mobile */}
          <div className="sm:hidden relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar platillos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white text-foreground border-none h-11"
            />
          </div>
        </div>
      </div>

      {/* ── CATEGORY PILLS ── */}
      <div className="sticky top-16 z-30 bg-white border-b border-orange-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex gap-2 overflow-x-auto py-3 scrollbar-none">
            <button
              onClick={() => setActiveCategory(null)}
              className={cn(
                "flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all",
                !activeCategory
                  ? "bg-primary text-white shadow-md shadow-primary/30"
                  : "bg-secondary text-secondary-foreground hover:bg-orange-50 hover:text-primary"
              )}
            >
              🍽️ Todo
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={cn(
                  "flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all",
                  activeCategory === cat
                    ? "bg-primary text-white shadow-md shadow-primary/30"
                    : "bg-secondary text-secondary-foreground hover:bg-orange-50 hover:text-primary"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── MENU ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">Sin resultados</p>
            <p className="text-sm">Intenta con otro término o categoría</p>
          </div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <section key={cat}>
              {!activeCategory && !search && (
                <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="w-1 h-6 rounded-full bg-primary inline-block" />
                  {cat}
                </h3>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.map((item) => (
                  <MenuCard key={item.id} item={item} cart={cart} addToCart={addToCart} updateQty={updateQty} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {/* Sticky checkout bar when cart has items */}
      <AnimatePresence>
        {cartCount > 0 && !showCart && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 inset-x-0 z-40 p-4 bg-white/95 backdrop-blur border-t border-orange-100 shadow-xl sm:hidden"
          >
            <button
              onClick={() => setShowCart(true)}
              className="w-full flex items-center justify-between bg-primary text-white px-5 py-3.5 rounded-xl font-semibold shadow-lg shadow-primary/30"
            >
              <span className="bg-white/20 rounded-lg px-2 py-0.5 text-sm">{cartCount} items</span>
              <span>Ver carrito</span>
              <span className="font-bold">${cartTotal.toFixed(2)}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CART DRAWER ── */}
      <AnimatePresence>
        {showCart && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowCart(false)}
            />
            <motion.div
              key="drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col"
            >
              {/* Drawer header */}
              <div className="px-5 py-4 border-b flex items-center justify-between bg-white">
                <div>
                  <h2 className="font-bold text-lg">Tu Orden</h2>
                  <p className="text-xs text-muted-foreground">{cartCount} {cartCount === 1 ? "artículo" : "artículos"}</p>
                </div>
                <button
                  onClick={() => setShowCart(false)}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-auto px-5 py-4 space-y-3">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                    <ShoppingCart className="w-14 h-14 opacity-20" />
                    <p className="font-medium">Tu carrito está vacío</p>
                    <button
                      onClick={() => setShowCart(false)}
                      className="text-primary text-sm font-semibold flex items-center gap-1"
                    >
                      Ver menú <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {cart.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 40 }}
                        className="flex items-center gap-3 bg-secondary/40 rounded-xl p-3"
                      >
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0 text-2xl">🍽️</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} c/u</p>
                          <p className="text-sm font-bold text-primary mt-0.5">${(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updateQty(item.id, -1)}
                            className="w-7 h-7 rounded-lg bg-white border border-border flex items-center justify-center hover:bg-destructive/10 hover:border-destructive transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQty(item.id, 1)}
                            className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>

              {/* Checkout footer */}
              {cart.length > 0 && (
                <div className="px-5 pt-4 pb-6 border-t bg-white space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>${cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base text-foreground">
                      <span>Total</span>
                      <span className="text-primary">${cartTotal.toFixed(2)}</span>
                    </div>
                  </div>
                  <Button
                    className="w-full h-12 text-base font-bold rounded-xl shadow-lg shadow-primary/30"
                    onClick={handleCheckout}
                    disabled={isCheckingOut}
                  >
                    {isCheckingOut ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Procesando...
                      </span>
                    ) : (
                      "Pagar ahora →"
                    )}
                  </Button>
                  <p className="text-[11px] text-center text-muted-foreground">
                    🔒 Pago seguro · Base44 Payments
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Card component ──
function MenuCard({ item, cart, addToCart, updateQty }) {
  const inCart = cart.find((c) => c.id === item.id);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 flex flex-col group"
    >
      {/* Image */}
      <div className="relative h-44 bg-orange-50 overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl select-none">🍽️</div>
        )}
        {/* Category pill */}
        <span className="absolute top-2.5 left-2.5 bg-black/50 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">
          {item.category}
        </span>
        {inCart && (
          <span className="absolute top-2.5 right-2.5 bg-primary text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow">
            {inCart.quantity} en carrito
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-foreground leading-tight mb-1">{item.name}</h3>
        {item.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2 flex-1">{item.description}</p>
        )}
        {item.prep_time_minutes && (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-3">
            <Clock className="w-3 h-3" /> {item.prep_time_minutes} min
          </p>
        )}

        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-xl font-extrabold text-primary">${item.price.toFixed(2)}</span>
          {inCart ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQty(item.id, -1)}
                className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center hover:bg-destructive/10 transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-bold text-base w-6 text-center">{inCart.quantity}</span>
              <button
                onClick={() => updateQty(item.id, 1)}
                className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => addToCart(item)}
              className="flex items-center gap-1.5 bg-primary text-white px-3.5 py-2 rounded-xl text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all shadow-md shadow-primary/20"
            >
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}