import { getSql } from "./sql";

export type AutoTradeLockRow = {
  lock_key: string;
  order_id: string | null;
  side: string;
  price_usd: number;
  quantity: number | null;
  executed_at: Date;
};

export async function hasAutoTradeLock(lockKey: string): Promise<boolean> {
  const sql = getSql();
  const rows = (await sql`
    SELECT lock_key FROM binance_auto_trade_lock WHERE lock_key = ${lockKey}
  `) as { lock_key: string }[];
  return rows.length > 0;
}

export async function recordAutoTradeLock(
  lockKey: string,
  patch: {
    orderId: string | null;
    side: "BUY" | "SELL";
    priceUsd: number;
    quantity: number | null;
  },
): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO binance_auto_trade_lock (
      lock_key,
      order_id,
      side,
      price_usd,
      quantity
    ) VALUES (
      ${lockKey},
      ${patch.orderId},
      ${patch.side},
      ${patch.priceUsd},
      ${patch.quantity}
    )
    ON CONFLICT (lock_key) DO NOTHING
  `;
}
