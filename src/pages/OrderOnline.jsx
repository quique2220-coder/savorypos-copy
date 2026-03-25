import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { calcRecipeTotals } from "@/utils/recipeCalculator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, Minus, Search, X, Flame, ChevronRight, Clock, User } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function OrderOnline() {
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "", opted_in_sms: false, opted_in_email: false });
  const [orderType, setOrderType] = useState("pickup"); // "pickup" | "delivery"
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryStatus, setDeliveryStatus] = useState(null); // null | "checking" | "ok" | "out_of_range" | "disabled"
  const [deliveryDistanceMiles, setDeliveryDistanceMiles] = useState(null);

  // Always read fresh from localStorage - never stale state
  const getDeliverySettings = () => {
    try {
      const raw = localStorage.getItem("pos_settings");
      console.log("[delivery] pos_settings raw:", raw);
      const s = JSON.parse(raw || "{}");
      console.log("[delivery] delivery_enabled value:", s.delivery_enabled, typeof s.delivery_enabled);
      const result = {
        enabled: s.delivery_enabled === true || s.delivery_enabled === "true" || s.delivery_enabled === 1,
        lat: parseFloat(s.delivery_lat) || null,
        lng: parseFloat(s.delivery_lng) || null,
        radius: parseFloat(s.delivery_radius_miles) || 5,
        feePercent: parseFloat(s.delivery_fee_percent) || 40,
      };
      console.log("[delivery] parsed enabled:", result.enabled);
      return result;
    } catch (e) {
      console.error("[delivery] error parsing settings:", e);
      return { enabled: false, lat: null, lng: null, radius: 5, feePercent: 40 };
    }
  };

  const [deliverySettings, setDeliverySettings] = React.useState(getDeliverySettings);

  React.useEffect(() => {
    setDeliverySettings(getDeliverySettings());
  }, [showCart]);

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

  const cartSubtotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);
  const deliveryFee = orderType === "delivery" && deliveryStatus === "ok"
    ? Math.round(cartSubtotal * (deliverySettings.feePercent / 100) * 100) / 100
    : 0;
  const cartTotal = cartSubtotal + deliveryFee;

  // Haversine distance in miles
  function haversine(lat1, lng1, lat2, lng2) {
    const R = 3958.8;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  const checkDeliveryAddress = async (address) => {
    if (!deliverySettings.enabled) { setDeliveryStatus("disabled"); return; }
    if (!address.trim()) return;
    // If store coords not configured, allow delivery
    if (!deliverySettings.lat || !deliverySettings.lng || isNaN(deliverySettings.lat) || isNaN(deliverySettings.lng)) {
      setDeliveryStatus("ok");
      return;
    }
    setDeliveryStatus("checking");
    setDeliveryDistanceMiles(null);
    try {
      const encoded = encodeURIComponent(address);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`, {
        headers: { "Accept-Language": "es", "User-Agent": "POS-App/1.0" }
      });
      const data = await res.json();
      if (!data || data.length === 0) {
        setDeliveryStatus("address_not_found");
        return;
      }
      const clientLat = parseFloat(data[0].lat);
      const clientLng = parseFloat(data[0].lon);
      const dist = haversine(clientLat, clientLng, deliverySettings.lat, deliverySettings.lng);
      setDeliveryDistanceMiles(dist);
      setDeliveryStatus(dist <= deliverySettings.radius ? "ok" : "out_of_range");
    } catch {
      // On network error, allow delivery
      setDeliveryStatus("ok");
    }
  };

  const handleCheckout = async () => {
    if (!cart.length) return;
    if (orderType === "delivery" && deliveryStatus !== "ok") return;
    setIsCheckingOut(true);
    try {
      const items = cart.map((c) => ({
        name: c.name,
        quantity: c.quantity,
        price: c.price.toFixed(2),
      }));
      // Save cart + customer so confirmation/webhook can use it
      sessionStorage.setItem("pending_cart", JSON.stringify(items));
      sessionStorage.setItem("pending_customer", JSON.stringify(customer));
      const res = await base44.functions.invoke("create-checkout", { items, customer, orderType, deliveryFee, deliveryAddress });
      const redirectUrl = res?.data?.redirectUrl || res?.redirectUrl;
      if (redirectUrl) {
        window.location.href = redirectUrl;
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
          <h2 className="text-2xl sm:text-4xl font-extrabold mb-1 sm:mb-2 tracking-tight">¿Qué se te antoja hoy?</h2>
          <p className="text-orange-100 text-sm sm:text-base mb-4 sm:mb-6">Ordena directo desde aquí y recoge listo.</p>
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 sm:pb-8 space-y-8 sm:space-y-10">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
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
              <span className="font-bold">${cartSubtotal.toFixed(2)}</span>
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
                  {/* Order type */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground">Tipo de pedido</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { setOrderType("pickup"); setDeliveryStatus(null); }}
                        className={cn(
                          "py-2.5 rounded-xl text-sm font-semibold border transition-all",
                          orderType === "pickup"
                            ? "bg-primary text-white border-primary shadow-md"
                            : "bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/80"
                        )}
                      >
                        🛍️ Recoger en local
                      </button>
                      <button
                        onClick={() => {
                          const fresh = getDeliverySettings();
                          setDeliverySettings(fresh);
                          setOrderType("delivery");
                          if (!fresh.enabled) { setDeliveryStatus("disabled"); return; }
                          setDeliveryStatus(null);
                          setDeliveryDistanceMiles(null);
                        }}
                        className={cn(
                          "py-2.5 rounded-xl text-sm font-semibold border transition-all",
                          orderType === "delivery"
                            ? "bg-primary text-white border-primary shadow-md"
                            : "bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/80"
                        )}
                      >
                        🚗 Delivery
                      </button>
                    </div>

                    {/* Delivery address input */}
                    {orderType === "delivery" && deliveryStatus !== "disabled" && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Ingresa tu dirección completa..."
                            value={deliveryAddress}
                            onChange={(e) => {
                              setDeliveryAddress(e.target.value);
                              setDeliveryStatus(null);
                              setDeliveryDistanceMiles(null);
                            }}
                            className="h-9 text-sm flex-1"
                          />
                          <button
                            onClick={() => checkDeliveryAddress(deliveryAddress)}
                            disabled={!deliveryAddress.trim() || deliveryStatus === "checking"}
                            className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold disabled:opacity-40 hover:bg-primary/90 transition-colors flex-shrink-0"
                          >
                            {deliveryStatus === "checking" ? (
                              <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                            ) : "Verificar"}
                          </button>
                        </div>
                        {deliveryStatus === "checking" && (
                          <p className="text-xs text-muted-foreground bg-secondary rounded-lg px-3 py-2 flex items-center gap-1.5">
                            <span className="w-3 h-3 border-2 border-muted-foreground/40 border-t-muted-foreground rounded-full animate-spin inline-block" />
                            Verificando dirección...
                          </p>
                        )}
                        {deliveryStatus === "address_not_found" && (
                          <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                            ❌ No se encontró la dirección. Intenta ser más específico.
                          </p>
                        )}
                        {deliveryStatus === "out_of_range" && (
                          <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                            ❌ Tu dirección está fuera de la zona de entrega ({deliverySettings.radius} millas).
                            {deliveryDistanceMiles && ` Distancia: ${deliveryDistanceMiles.toFixed(1)} mi.`}
                          </p>
                        )}
                        {deliveryStatus === "ok" && (
                          <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                            ✅ Dirección dentro del área de entrega
                            {deliveryDistanceMiles && ` (${deliveryDistanceMiles.toFixed(1)} mi)`}
                            {` · +${deliverySettings.feePercent}% cargo`}
                          </p>
                        )}
                      </div>
                    )}

                    {orderType === "delivery" && deliveryStatus === "disabled" && (
                      <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                        ❌ Delivery no disponible en este momento.
                      </p>
                    )}
                  </div>

                  {/* Customer Info */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-primary" /> Tus datos (opcional)
                    </p>
                    <Input
                      placeholder="Nombre completo"
                      value={customer.name}
                      onChange={(e) => setCustomer(c => ({ ...c, name: e.target.value }))}
                      className="h-9 text-sm"
                    />
                    <Input
                      placeholder="Teléfono"
                      type="tel"
                      value={customer.phone}
                      onChange={(e) => setCustomer(c => ({ ...c, phone: e.target.value }))}
                      className="h-9 text-sm"
                    />
                    <Input
                      placeholder="Email"
                      type="email"
                      value={customer.email}
                      onChange={(e) => setCustomer(c => ({ ...c, email: e.target.value }))}
                      className="h-9 text-sm"
                    />
                    <div className="flex flex-col gap-1.5 pt-1">
                      <label className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Recibir promociones por SMS</span>
                        <Switch checked={customer.opted_in_sms} onCheckedChange={(v) => setCustomer(c => ({ ...c, opted_in_sms: v }))} />
                      </label>
                      <label className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Recibir promociones por Email</span>
                        <Switch checked={customer.opted_in_email} onCheckedChange={(v) => setCustomer(c => ({ ...c, opted_in_email: v }))} />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>${cartSubtotal.toFixed(2)}</span>
                    </div>
                    {deliveryFee > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Cargo delivery ({deliverySettings.feePercent}%)</span>
                        <span>+${deliveryFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base text-foreground">
                      <span>Total</span>
                      <span className="text-primary">${cartTotal.toFixed(2)}</span>
                    </div>
                  </div>
                  <Button
                    className="w-full h-12 text-base font-bold rounded-xl shadow-lg shadow-primary/30"
                    onClick={handleCheckout}
                    disabled={isCheckingOut || (orderType === "delivery" && deliveryStatus !== "ok")}
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
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 group"
    >
      {/* Mobile: horizontal layout. sm+: vertical layout */}
      <div className="flex sm:flex-col">
        {/* Image */}
        <div className="relative w-28 h-28 sm:w-full sm:h-44 flex-shrink-0 bg-orange-50 overflow-hidden">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl sm:text-5xl select-none">🍽️</div>
          )}
          {/* Category pill — only on sm+ */}
          <span className="hidden sm:inline-block absolute top-2.5 left-2.5 bg-black/50 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">
            {item.category}
          </span>
          {inCart && (
            <span className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 bg-primary text-white text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
              ×{inCart.quantity}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 flex flex-col flex-1 min-w-0">
          <h3 className="font-bold text-foreground leading-tight text-sm sm:text-base mb-0.5">{item.name}</h3>
          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-1 sm:mb-2">{item.description}</p>
          )}
          {item.prep_time_minutes && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1 sm:mb-3">
              <Clock className="w-3 h-3" /> {item.prep_time_minutes} min
            </p>
          )}

          <div className="flex items-center justify-between mt-auto pt-1 sm:pt-2">
            <span className="text-base sm:text-xl font-extrabold text-primary">${item.price.toFixed(2)}</span>
            {inCart ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => updateQty(item.id, -1)}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-secondary flex items-center justify-center hover:bg-destructive/10 transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="font-bold text-sm w-5 text-center">{inCart.quantity}</span>
                <button
                  onClick={() => updateQty(item.id, 1)}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => addToCart(item)}
                className="flex items-center gap-1 sm:gap-1.5 bg-primary text-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all shadow-md shadow-primary/20"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline sm:inline">Agregar</span>
                <span className="sm:hidden">+</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}