import type {
  PredictionCategory,
  PredictionItem,
} from "@/lib/predictions/catalog";
import { PREDICTION_CATALOG_SEED } from "@/lib/predictions/catalog";
import { slugFromLabel } from "@/lib/predictions/slug";
import { getSql } from "./sql";

type CategoryRow = {
  id: string;
  label: string;
  sort_order: number;
};

type ItemRow = {
  id: string;
  category_id: string;
  label: string;
  active: boolean;
  sort_order: number;
};

export async function seedPredictionCatalog(): Promise<void> {
  const sql = getSql();
  let order = 0;
  for (const cat of PREDICTION_CATALOG_SEED) {
    await sql`
      INSERT INTO prediction_categories (id, label, sort_order)
      VALUES (${cat.id}, ${cat.label}, ${order})
      ON CONFLICT (id) DO UPDATE SET
        label = EXCLUDED.label,
        sort_order = EXCLUDED.sort_order
    `;
    let itemOrder = 0;
    for (const item of cat.items) {
      await sql`
        INSERT INTO prediction_items (
          id,
          category_id,
          label,
          active,
          sort_order
        ) VALUES (
          ${item.id},
          ${cat.id},
          ${item.label},
          ${item.active === true},
          ${itemOrder}
        )
        ON CONFLICT (category_id, id) DO UPDATE SET
          label = EXCLUDED.label,
          active = EXCLUDED.active,
          sort_order = EXCLUDED.sort_order
      `;
      itemOrder += 1;
    }
    order += 1;
  }
}

export async function listPredictionCategories(): Promise<PredictionCategory[]> {
  const sql = getSql();
  const categories = (await sql`
    SELECT id, label, sort_order
    FROM prediction_categories
    ORDER BY sort_order ASC, label ASC
  `) as CategoryRow[];

  if (categories.length === 0) {
    return [];
  }

  const categoryIds = categories.map((c) => c.id);
  const items = (await sql`
    SELECT id, category_id, label, active, sort_order
    FROM prediction_items
    WHERE category_id IN ${sql(categoryIds)}
    ORDER BY sort_order ASC, label ASC
  `) as ItemRow[];

  const itemsByCategory = new Map<string, PredictionItem[]>();
  for (const row of items) {
    const list = itemsByCategory.get(row.category_id) ?? [];
    list.push({
      id: row.id,
      label: row.label,
      ...(row.active ? { active: true } : {}),
    });
    itemsByCategory.set(row.category_id, list);
  }

  return categories.map((c) => ({
    id: c.id,
    label: c.label,
    items: itemsByCategory.get(c.id) ?? [],
  }));
}

async function nextCategoryId(baseLabel: string): Promise<string> {
  const sql = getSql();
  const base = slugFromLabel(baseLabel);
  let candidate = base;
  let n = 2;
  for (;;) {
    const rows = (await sql`
      SELECT 1 FROM prediction_categories WHERE id = ${candidate} LIMIT 1
    `) as { "?column?": number }[];
    if (rows.length === 0) {
      return candidate;
    }
    candidate = `${base}-${String(n)}`;
    n += 1;
  }
}

async function nextItemId(
  categoryId: string,
  baseLabel: string,
): Promise<string> {
  const sql = getSql();
  const base = slugFromLabel(baseLabel);
  let candidate = base;
  let n = 2;
  for (;;) {
    const rows = (await sql`
      SELECT 1
      FROM prediction_items
      WHERE category_id = ${categoryId}
        AND id = ${candidate}
      LIMIT 1
    `) as { "?column?": number }[];
    if (rows.length === 0) {
      return candidate;
    }
    candidate = `${base}-${String(n)}`;
    n += 1;
  }
}

export async function createPredictionItem(
  categoryId: string,
  label: string,
): Promise<PredictionItem> {
  const trimmed = label.trim();
  if (trimmed === "") {
    throw new Error("Item label is required");
  }

  const sql = getSql();
  const catRows = (await sql`
    SELECT id FROM prediction_categories WHERE id = ${categoryId} LIMIT 1
  `) as { id: string }[];
  if (catRows[0] === undefined) {
    throw new Error("Category not found");
  }

  const id = await nextItemId(categoryId, trimmed);
  const rows = (await sql`
    SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
    FROM prediction_items
    WHERE category_id = ${categoryId}
  `) as { next_order: number }[];
  const sortOrder = Number(rows[0]?.next_order ?? 0);

  await sql`
    INSERT INTO prediction_items (
      id,
      category_id,
      label,
      active,
      sort_order
    ) VALUES (
      ${id},
      ${categoryId},
      ${trimmed},
      ${false},
      ${sortOrder}
    )
  `;

  return { id, label: trimmed };
}

export async function createPredictionCategory(
  label: string,
): Promise<PredictionCategory> {
  const trimmed = label.trim();
  if (trimmed === "") {
    throw new Error("Category label is required");
  }

  const sql = getSql();
  const id = await nextCategoryId(trimmed);
  const rows = (await sql`
    SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
    FROM prediction_categories
  `) as { next_order: number }[];
  const sortOrder = Number(rows[0]?.next_order ?? 0);

  await sql`
    INSERT INTO prediction_categories (id, label, sort_order)
    VALUES (${id}, ${trimmed}, ${sortOrder})
  `;

  return { id, label: trimmed, items: [] };
}
