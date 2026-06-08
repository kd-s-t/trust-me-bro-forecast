import { createHmac } from "node:crypto";

export function binanceSign(queryString: string, apiSecret: string): string {
  return createHmac("sha256", apiSecret).update(queryString).digest("hex");
}
