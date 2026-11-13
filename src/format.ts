const priceFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 });

export function formatTokens(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/** 单价：$0.006、$0.30。 */
export function formatPrice(perM: number): string {
  return `$${priceFormat.format(perM)}`;
}

/** 每百万次调用的成本。 */
export function formatPerMillion(usd: number): string {
  if (usd >= 1000) return `$${Math.round(usd).toLocaleString('en-US')}`;
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  return `$${Number(usd.toPrecision(3))}`;
}

/** 单次调用的成本，保留三位有效数字并写成小数：$0.0000315。 */
export function formatPerCall(usd: number): string {
  if (usd <= 0) return '$0';
  const digits = Math.max(2, 2 - Math.floor(Math.log10(usd)));
  return `$${usd.toFixed(digits)}`;
}

export function formatRatio(ratio: number): string {
  if (ratio < 10) return `${ratio.toFixed(1)} 倍`;
  return `${Math.round(ratio)} 倍`;
}
