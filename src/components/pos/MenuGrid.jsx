import React from "react";
import { cn } from "@/lib/utils";
import { Plus, FlameIcon } from "lucide-react";

export default function MenuGrid({ items, onAddItem }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onAddItem(item)}
          disabled={!item.is_available}
          className={cn(
            "group relative bg-card rounded-xl border border-border p-4 text-left transition-all duration-200",
            "hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5",
            "active:scale-[0.98]",
            !item.is_available && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Plus className="w-4 h-4 text-primary" />
          </div>
          {item.image_url && (
            <div className="w-full aspect-square rounded-lg overflow-hidden mb-3 bg-muted">
              <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" />
            </div>
          )}
          <h3 className="font-semibold text-sm text-foreground leading-tight">{item.name}</h3>
          {item.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.description}</p>
          )}
          <div className="flex items-center justify-between mt-2">
            <p className="text-base font-bold text-primary">${item.price?.toFixed(2)}</p>
            {item.calories > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] text-orange-500 font-medium">
                <FlameIcon className="w-3 h-3" />{item.calories}
              </span>
            )}
          </div>
          {item.tags?.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {item.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </button>
      ))}
      {items.length === 0 && (
        <div className="col-span-full py-16 text-center text-muted-foreground">
          No items found
        </div>
      )}
    </div>
  );
}