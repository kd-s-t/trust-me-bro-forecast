"use client";

import { Sparkles } from "lucide-react";
import {
  PREDICTION_CATALOG,
  type PredictionItem as CatalogItem,
} from "@/lib/predictions/catalog";
import { cn } from "@/lib/utils";

function PredictionItem({ item }: { item: CatalogItem }) {
  if (item.active === true) {
    return (
      <span
        className={cn(
          "flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[10px] font-semibold leading-tight",
          "bg-primary/10 text-primary",
        )}
        title={`${item.label} — active`}
        aria-current="page"
      >
        <span className="size-1 shrink-0 rounded-full bg-primary" aria-hidden />
        {item.label}
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled
      title={`${item.label} — coming soon`}
      className={cn(
        "w-full cursor-not-allowed truncate rounded px-1 py-0.5 text-left text-[10px] leading-tight",
        "text-muted-foreground/80 opacity-60",
      )}
    >
      {item.label}
    </button>
  );
}

export function PredictionsRail() {
  return (
    <aside
      className="flex w-[7%] min-w-[3.5rem] shrink-0 flex-col self-stretch border-r border-border bg-muted/20"
      aria-label="Predictions"
    >
      <div className="shrink-0 border-b border-border px-1 py-2 text-center">
        <Sparkles
          className="mx-auto size-3.5 text-muted-foreground/70"
          aria-hidden
        />
        <p className="mt-1 text-[9px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground">
          Soon
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1 py-2">
        {PREDICTION_CATALOG.map((cat) => (
          <div key={cat.id} className="space-y-0.5">
            <p
              className="truncate px-0.5 text-[9px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground"
              title={cat.label}
            >
              {cat.label}
            </p>
            <ul className="space-y-0.5">
              {cat.items.map((item) => (
                <li key={item.id}>
                  <PredictionItem item={item} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
