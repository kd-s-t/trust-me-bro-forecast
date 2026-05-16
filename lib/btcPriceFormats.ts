const usdNumber = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const phpCompact = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 2,
});

function formatBtcQuantity(n: number): string {
  return n.toFixed(8).replace(/\.?0+$/, "");
}

export function tooltipAmountLines(
  btcAmount: number,
  usdPerBtc: number,
  pesoPerUsd: number,
): string[] {
  const usdVal = btcAmount * usdPerBtc;
  const phpVal = usdVal * pesoPerUsd;
  const btcVal = usdVal / usdPerBtc;
  return [
    `USD ${usdNumber.format(usdVal)}`,
    `PHP ${phpCompact.format(phpVal)}`,
    `BTC ${formatBtcQuantity(btcVal)}`,
  ];
}
