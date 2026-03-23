import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { toast } from "sonner";
import CategoryBar from "@/components/pos/CategoryBar";
import MenuGrid from "@/components/pos/MenuGrid";
import Cart from "@/components/pos/Cart";

export default function POS() {
  const [cartItems, setCartItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => base44.entities.Recipe.list("-updated_date", 200),
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.InventoryItem.list(),
  });

  // Map active dish recipes to POS item format
  const menuItems = useMemo(() => 
    recipes
      .filter(r => r.recipe_type !== "subrecipe" && r.is_active !== false && r.sale_price > 0)
      .map(r => ({
        id: r.id,
        name: r.name,
        description: r.description || "",
        price: r.sale_price,
        image_url: r.image_url || null,
        is_available: true,
        calories: r.recipe_items ? null : null,
        category: r.category || "",
        tags: r.category ? [r.category] : [],
      })),
    [recipes]
  );

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
    setCartItems((prev) => {
      const existing = prev.findIndex((ci) => ci.menu_item_id === item.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing].quantity += 1;
        return updated;
      }
      return [...prev, { menu_item_id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
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

  const handleCheckout = async ({ paymentMethod, orderType, customerName, subtotal, tax, total }) => {
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
      total,
      payment_method: paymentMethod,
      order_type: orderType,
      customer_name: customerName,
      status: "completed",
    });
  };

  return (
    <div className="flex h-screen">
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
        />
      </div>
    </div>
  );
}