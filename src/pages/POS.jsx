import React, { useState, useMemo } from "react";
import OnlineOrderAlert from "@/components/pos/OnlineOrderAlert";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { toast } from "sonner";
import CategoryBar from "@/components/pos/CategoryBar";
import MenuGrid from "@/components/pos/MenuGrid";
import Cart from "@/components/pos/Cart";
import ToppingSelector from "@/components/pos/ToppingSelector";
import { calcRecipeTotals } from "@/utils/recipeCalculator";
import { getConversionFactor } from "@/utils/units";
import { postSaleEntry } from "@/utils/accountingSync";

export default function POS() {
  const [cartItems, setCartItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [search, setSearch] = useState("");
  const [toppingItem, setToppingItem] = useState(null);
  const queryClient = useQueryClient();

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => base44.entities.Recipe.list("-updated_date", 200),
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.InventoryItem.list(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-updated_date", 500),
  });

  const { data: coupons = [] } = useQuery({
    queryKey: ["coupons"],
    queryFn: () => base44.entities.Coupon.list(),
  });

  const { data: pendingOrders = [], refetch: refetchOrders } = useQuery({
    queryKey: ["orders-pending-online"],
    queryFn: () => base44.entities.Order.filter({ status: "pending", order_source: "online" }),
    refetchInterval: 15000,
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: ["ingredients"],
    queryFn: () => base44.entities.Ingredient.list("-updated_date", 500),
  });

  // Map active dish recipes to POS item format
  const menuItems = useMemo(() => {
    const ingMap = Object.fromEntries(ingredients.map(i => [i.id, i]));
    return recipes
      .filter(r => r.recipe_type !== "subrecipe" && r.is_active !== false)
      .map(r => {
        const totals = calcRecipeTotals(r, ingMap);
        // Use suggestedPrice if recipe has ingredients, otherwise fall back to sale_price
        const price = totals.suggestedPrice > 0 ? totals.suggestedPrice : r.sale_price;
        if (price <= 0) return null;
        return {
          id: r.id,
          name: r.name,
          description: r.description || "",
          price,
          image_url: r.image_url || null,
          is_available: true,
          category: r.category || "",
          tags: r.category ? [r.category] : [],
          available_toppings: r.available_toppings || [],
        };
      })
      .filter(Boolean);
  }, [recipes, ingredients]);

  // Build category list from recipe categories
  const categories = useMemo(() => {
    const cats = [...new Set(recipes.filter(r => r.category).map(r => r.category))];
    return cats.map((c, i) => ({ id: c, name: c }));
  }, [recipes]);

  const createOrder = useMutation({
    mutationFn: (order) => base44.entities.Order.create(order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setCartItems([]);
      toast.success("¡Orden completada!");
    },
  });

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = !activeCategory || item.category === activeCategory;
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddItem = (item) => {
    // If item has available toppings, open selector modal
    if (item.available_toppings?.length > 0) {
      setToppingItem(item);
      return;
    }
    setCartItems((prev) => {
      const existing = prev.findIndex((ci) => ci.menu_item_id === item.id && !ci.toppings?.length);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing].quantity += 1;
        return updated;
      }
      return [...prev, { menu_item_id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const handleConfirmToppings = (item, selectedToppings) => {
    const toppingsTotal = selectedToppings.reduce((sum, t) => sum + (t.price || 0), 0);
    const unitPrice = item.price + toppingsTotal;
    setCartItems((prev) => {
      // Group only if same item + same toppings
      const existing = prev.findIndex((ci) =>
        ci.menu_item_id === item.id &&
        JSON.stringify(ci.toppings || []) === JSON.stringify(selectedToppings)
      );
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing].quantity += 1;
        return updated;
      }
      return [...prev, {
        menu_item_id: item.id,
        name: item.name,
        price: unitPrice,
        base_price: item.price,
        quantity: 1,
        toppings: selectedToppings,
      }];
    });
    setToppingItem(null);
  };

  const handleUpdateQty = (index, qty) => {
    if (qty < 1) return handleRemove(index);
    setCartItems((prev) => {
      const updated = [...prev];
      updated[index].quantity = qty;
      return updated;
    });
  };

  const handleRemove = (index) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCheckout = async (checkoutData) => {
    const { paymentMethod, orderType, orderSource, customerName, subtotal, tax, tip, total, discountAmount, appliedCoupon } = checkoutData;

    // Calcular costo total de los items vendidos para COGS
    const ingMap = Object.fromEntries(ingredients.map(i => [i.id, i]));
    const costOfGoods = cartItems.reduce((sum, cartItem) => {
      const recipe = recipes.find(r => r.id === cartItem.menu_item_id);
      if (!recipe) return sum;
      const totals = calcRecipeTotals(recipe, ingMap);
      return sum + (totals.foodCostPerServing || 0) * cartItem.quantity;
    }, 0);
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const orderItems = cartItems.map((item) => ({
      ...item,
      subtotal: item.price * item.quantity,
    }));

    await createOrder.mutateAsync({
      order_number: orderNumber,
      items: orderItems,
      subtotal,
      tax,
      tip: tip || 0,
      total,
      payment_method: paymentMethod,
      order_type: orderType,
      order_source: orderSource || "in_person",
      customer_name: customerName,
      notes: [
        orderSource !== "in_person" ? `Fuente: ${orderSource}` : "",
        appliedCoupon ? `Cupón: ${appliedCoupon.code} -$${discountAmount?.toFixed(2)}` : "",
      ].filter(Boolean).join(" | ") || undefined,
      status: "completed",
    });

    // Sincronizar con Contabilidad
    await postSaleEntry({ orderNumber, total, tax, subtotal, paymentMethod, costOfGoods, tip: tip || 0 });
    queryClient.invalidateQueries({ queryKey: ["JournalEntry"] });

    // CRM: crear o actualizar cliente
    const { customer, pointsToEarn } = checkoutData || {};
    if (customer) {
      if (customer.id) {
        // Cliente existente: sumar puntos, visita, gasto
        await base44.entities.Customer.update(customer.id, {
          loyalty_points: (customer.loyalty_points || 0) + (pointsToEarn || 0),
          visit_count: (customer.visit_count || 0) + 1,
          total_spent: (customer.total_spent || 0) + checkoutData.total,
          last_visit: new Date().toISOString().split("T")[0],
        });
      } else if (customer.name && customer.name !== "Guest") {
        // Nuevo cliente: crear en CRM
        await base44.entities.Customer.create({
          name: customer.name,
          phone: customer.phone || "",
          email: customer.email || "",
          loyalty_points: pointsToEarn || 0,
          visit_count: 1,
          total_spent: checkoutData.total,
          last_visit: new Date().toISOString().split("T")[0],
          status: "active",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    }

    // Marcar cupón como usado
    if (appliedCoupon?.id) {
      await base44.entities.Coupon.update(appliedCoupon.id, {
        times_used: (appliedCoupon.times_used || 0) + 1,
      });
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
    }

    // Descontar inventario por cada platillo vendido
    for (const cartItem of cartItems) {
      const recipe = recipes.find(r => r.id === cartItem.menu_item_id);
      if (!recipe?.recipe_items?.length) continue;

      for (const ri of recipe.recipe_items) {
        if (!ri.ingredient_id) continue;
        const invItem = inventory.find(inv => inv.ingredient_id === ri.ingredient_id);
        if (!invItem) continue;

        // Convert recipe unit → inventory unit if needed
        const recipeUnit = ri.unit || invItem.unit;
        const invUnit = invItem.unit;
        const factor = getConversionFactor(recipeUnit, invUnit) ?? 1;
        const consumed = (ri.quantity || 0) * cartItem.quantity * factor;
        const newStock = Math.max(0, (invItem.current_stock || 0) - consumed);
        await base44.entities.InventoryItem.update(invItem.id, { current_stock: newStock });
      }
    }

    queryClient.invalidateQueries({ queryKey: ["inventory"] });

    // Enviar email de confirmación si el cliente tiene correo
    const emailTarget = checkoutData.customer?.email;
    if (emailTarget) {
      const itemsList = orderItems
        .map(i => `• ${i.name} x${i.quantity} — $${(i.price * i.quantity).toFixed(2)}`)
        .join("\n");
      const pointsMsg = checkoutData.pointsToEarn
        ? `\n🎯 Ganaste ${checkoutData.pointsToEarn} puntos de lealtad. Total acumulado: ${(checkoutData.customer.loyalty_points || 0) + checkoutData.pointsToEarn} pts.\n`
        : "";
      await base44.integrations.Core.SendEmail({
        to: emailTarget,
        subject: `✅ Order Confirmed / Orden Confirmada — ${orderNumber}`,
        body: `Hello / Hola ${checkoutData.customer.name || ""},

──────────────────────────────
🇺🇸 ENGLISH
──────────────────────────────
Thank you for your purchase! Here is your order summary:

${itemsList}

Subtotal: $${subtotal?.toFixed(2)}
Tax: $${tax?.toFixed(2)}${appliedCoupon ? `\nDiscount (${appliedCoupon.code}): -$${discountAmount?.toFixed(2)}` : ""}
Total: $${total?.toFixed(2)}${checkoutData.pointsToEarn ? `\n\n🎯 You earned ${checkoutData.pointsToEarn} loyalty points! Total balance: ${(checkoutData.customer.loyalty_points || 0) + checkoutData.pointsToEarn} pts.` : ""}

We hope to see you again soon!

──────────────────────────────
🇲🇽 ESPAÑOL
──────────────────────────────
¡Gracias por tu compra! Aquí el resumen de tu orden:

${itemsList}

Subtotal: $${subtotal?.toFixed(2)}
Impuesto: $${tax?.toFixed(2)}${appliedCoupon ? `\nDescuento (${appliedCoupon.code}): -$${discountAmount?.toFixed(2)}` : ""}
Total: $${total?.toFixed(2)}${checkoutData.pointsToEarn ? `\n\n🎯 ¡Ganaste ${checkoutData.pointsToEarn} puntos de lealtad! Saldo total: ${(checkoutData.customer.loyalty_points || 0) + checkoutData.pointsToEarn} pts.` : ""}

¡Esperamos verte muy pronto!`,
      });
    }
  };

  return (
    <div className="flex h-screen">
      <OnlineOrderAlert orders={pendingOrders} onAccepted={refetchOrders} />
      {/* Left: Menu */}
      <div className="flex-1 flex flex-col p-5 overflow-hidden">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search menu items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-card"
          />
        </div>

        {/* Categories */}
        <div className="mb-4">
          <CategoryBar categories={categories} activeCategory={activeCategory} onSelect={(id) => setActiveCategory(activeCategory === id ? null : id)} />
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto pr-1">
          <MenuGrid items={filteredItems} onAddItem={handleAddItem} />
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-[340px] lg:w-[380px] shrink-0">
        <Cart
          items={cartItems}
          onUpdateQty={handleUpdateQty}
          onRemove={handleRemove}
          onCheckout={handleCheckout}
          isProcessing={createOrder.isPending}
          customers={customers}
          coupons={coupons}
        />
      </div>

      <ToppingSelector
        item={toppingItem}
        open={!!toppingItem}
        onClose={() => setToppingItem(null)}
        onConfirm={handleConfirmToppings}
      />
    </div>
  );
}