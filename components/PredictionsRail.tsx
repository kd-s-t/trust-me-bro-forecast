"use client";

import { Loader2, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PredictionCategory, PredictionItem } from "@/lib/predictions/catalog";
import { cn } from "@/lib/utils";

function PredictionItemRow({ item }: { item: PredictionItem }) {
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
      title={item.label}
      className={cn(
        "w-full cursor-not-allowed truncate rounded px-1 py-0.5 text-left text-[10px] leading-tight",
        "text-muted-foreground",
      )}
    >
      {item.label}
    </button>
  );
}

type CategoryBlockProps = {
  category: PredictionCategory;
  saving: boolean;
  onAddItem: (categoryId: string, label: string) => Promise<void>;
};

function CategoryBlock({ category, saving, onAddItem }: CategoryBlockProps) {
  const [addingItem, setAddingItem] = useState(false);
  const [itemLabel, setItemLabel] = useState("");

  async function onSubmitItem(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const label = itemLabel.trim();
    if (label === "") {
      return;
    }
    await onAddItem(category.id, label);
    setItemLabel("");
    setAddingItem(false);
  }

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-0.5 px-0.5">
        <p
          className="min-w-0 flex-1 truncate text-[9px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground"
          title={category.label}
        >
          {category.label}
        </p>
        <button
          type="button"
          className="shrink-0 cursor-pointer rounded p-0.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed"
          title="Add item"
          aria-label={`Add item to ${category.label}`}
          disabled={saving}
          onClick={() => {
            setAddingItem((v) => !v);
          }}
        >
          <Plus className="size-3" aria-hidden />
        </button>
      </div>

      {category.items.length > 0 ? (
        <ul className="space-y-0.5">
          {category.items.map((item) => (
            <li key={item.id}>
              <PredictionItemRow item={item} />
            </li>
          ))}
        </ul>
      ) : !addingItem ? (
        <p className="px-0.5 text-[9px] text-muted-foreground/70">No items yet</p>
      ) : null}

      {addingItem ? (
        <form onSubmit={(ev) => void onSubmitItem(ev)} className="space-y-1 px-0.5">
          <Input
            value={itemLabel}
            onChange={(ev) => {
              setItemLabel(ev.target.value);
            }}
            placeholder="e.g. BTC"
            className="h-6 text-[10px]"
            disabled={saving}
            autoFocus
            aria-label={`New item in ${category.label}`}
          />
          <div className="flex gap-1">
            <Button
              type="submit"
              size="sm"
              className="h-5 flex-1 px-1 text-[9px]"
              disabled={saving || itemLabel.trim() === ""}
            >
              Add
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-5 px-1 text-[9px]"
              disabled={saving}
              onClick={() => {
                setAddingItem(false);
                setItemLabel("");
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

export function PredictionsRail() {
  const [categories, setCategories] = useState<PredictionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [categoryLabel, setCategoryLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/predictions", { cache: "no-store" });
      const body = (await res.json()) as {
        categories?: PredictionCategory[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(body.error ?? `Failed to load (${String(res.status)})`);
      }
      setCategories(body.categories ?? []);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAddCategory(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const label = categoryLabel.trim();
    if (label === "") {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? `Failed to add (${String(res.status)})`);
      }
      setCategoryLabel("");
      setAddingCategory(false);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add category";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function onAddItem(categoryId: string, label: string): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/predictions/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, label }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? `Failed to add item (${String(res.status)})`);
      }
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add item";
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }

  return (
    <aside
      className="flex w-[7%] min-w-[3.5rem] shrink-0 flex-col self-stretch border-r border-border bg-muted/20"
      aria-label="Predictions"
    >
      <div className="shrink-0 space-y-1.5 border-b border-border px-1 py-2">
        {addingCategory ? (
          <form onSubmit={(ev) => void onAddCategory(ev)} className="space-y-1">
            <Input
              value={categoryLabel}
              onChange={(ev) => {
                setCategoryLabel(ev.target.value);
              }}
              placeholder="Category name"
              className="h-7 text-[10px]"
              disabled={saving}
              autoFocus
              aria-label="New category name"
            />
            <div className="flex gap-1">
              <Button
                type="submit"
                size="sm"
                className="h-6 flex-1 px-1 text-[9px]"
                disabled={saving || categoryLabel.trim() === ""}
              >
                {saving ? (
                  <Loader2 className="size-3 animate-spin" aria-hidden />
                ) : (
                  "Save"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-1 text-[9px]"
                disabled={saving}
                onClick={() => {
                  setAddingCategory(false);
                  setCategoryLabel("");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 w-full gap-1 px-1 text-[9px]"
            disabled={saving}
            onClick={() => {
              setAddingCategory(true);
            }}
          >
            <Plus className="size-3 shrink-0" aria-hidden />
            Add category
          </Button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1 py-2">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2
              className="size-4 animate-spin text-muted-foreground"
              aria-hidden
            />
          </div>
        ) : null}

        {error !== null && !loading ? (
          <p className="px-0.5 text-[9px] leading-tight text-destructive">{error}</p>
        ) : null}

        {!loading
          ? categories.map((cat) => (
              <CategoryBlock
                key={cat.id}
                category={cat}
                saving={saving}
                onAddItem={onAddItem}
              />
            ))
          : null}
      </div>
    </aside>
  );
}
