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

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export async function seedPredictionCatalogForUser(
  username: string,
): Promise<void> {
  const sql = getSql();
  const user = normalizeUsername(username);
  let order = 0;
  for (const cat of PREDICTION_CATALOG_SEED) {
    await sql`
      INSERT INTO prediction_categories (username, id, label, sort_order)
      VALUES (${user}, ${cat.id}, ${cat.label}, ${order})
      ON CONFLICT (username, id) DO UPDATE SET
        label = EXCLUDED.label,
        sort_order = EXCLUDED.sort_order
    `;
    let itemOrder = 0;
    for (const item of cat.items) {
      await sql`
        INSERT INTO prediction_items (
          username,
          id,
          category_id,
          label,
          active,
          sort_order
        ) VALUES (
          ${user},
          ${item.id},
          ${cat.id},
          ${item.label},
          ${item.active === true},
          ${itemOrder}
        )
        ON CONFLICT (username, category_id, id) DO UPDATE SET
          label = EXCLUDED.label,
          active = EXCLUDED.active,
          sort_order = EXCLUDED.sort_order
      `;
      itemOrder += 1;
    }
    order += 1;
  }
}

export async function listPredictionCategories(
  username: string,
): Promise<PredictionCategory[]> {
  const sql = getSql();
  const user = normalizeUsername(username);
  const categories = (await sql`
    SELECT id, label, sort_order
    FROM prediction_categories
    WHERE username = ${user}
    ORDER BY sort_order ASC, label ASC
  `) as CategoryRow[];

  if (categories.length === 0) {
    return [];
  }

  const categoryIds = categories.map((c) => c.id);
  const items = (await sql`
    SELECT id, category_id, label, active, sort_order
    FROM prediction_items
    WHERE username = ${user}
      AND category_id IN ${sql(categoryIds)}
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

async function nextCategoryId(
  username: string,
  baseLabel: string,
): Promise<string> {
  const sql = getSql();
  const user = normalizeUsername(username);
  const base = slugFromLabel(baseLabel);
  let candidate = base;
  let n = 2;
  for (;;) {
    const rows = (await sql`
      SELECT 1
      FROM prediction_categories
      WHERE username = ${user}
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

async function nextItemId(
  username: string,
  categoryId: string,
  baseLabel: string,
): Promise<string> {
  const sql = getSql();
  const user = normalizeUsername(username);
  const base = slugFromLabel(baseLabel);
  let candidate = base;
  let n = 2;
  for (;;) {
    const rows = (await sql`
      SELECT 1
      FROM prediction_items
      WHERE username = ${user}
        AND category_id = ${categoryId}
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
  username: string,
  categoryId: string,
  label: string,
): Promise<PredictionItem> {
  const trimmed = label.trim();
  if (trimmed === "") {
    throw new Error("Item label is required");
  }

  const sql = getSql();
  const user = normalizeUsername(username);
  const catRows = (await sql`
    SELECT id
    FROM prediction_categories
    WHERE username = ${user}
      AND id = ${categoryId}
    LIMIT 1
  `) as { id: string }[];
  if (catRows[0] === undefined) {
    throw new Error("Category not found");
  }

  const id = await nextItemId(user, categoryId, trimmed);
  const rows = (await sql`
    SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
    FROM prediction_items
    WHERE username = ${user}
      AND category_id = ${categoryId}
  `) as { next_order: number }[];
  const sortOrder = Number(rows[0]?.next_order ?? 0);

  await sql`
    INSERT INTO prediction_items (
      username,
      id,
      category_id,
      label,
      active,
      sort_order
    ) VALUES (
      ${user},
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
  username: string,
  label: string,
): Promise<PredictionCategory> {
  const trimmed = label.trim();
  if (trimmed === "") {
    throw new Error("Category label is required");
  }

  const sql = getSql();
  const user = normalizeUsername(username);
  const id = await nextCategoryId(user, trimmed);
  const rows = (await sql`
    SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
    FROM prediction_categories
    WHERE username = ${user}
  `) as { next_order: number }[];
  const sortOrder = Number(rows[0]?.next_order ?? 0);

  await sql`
    INSERT INTO prediction_categories (username, id, label, sort_order)
    VALUES (${user}, ${id}, ${trimmed}, ${sortOrder})
  `;

  return { id, label: trimmed, items: [] };
}
