const priceFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 });

export function formatTokens(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/** 单价：$0.006、$0.30。 */
export function formatPrice(perM: number): string {
  return `$${priceFormat.format(perM)}`;
}

/** 按十进制四舍五入：先取 15 位有效数字去掉浮点误差，9.995 才会进成 10，不会像 toFixed 那样舍成 9.99。 */
function roundTo(n: number, digits: number): number {
  const scale = 10 ** digits;
  return Math.round(Number((n * scale).toPrecision(15))) / scale;
}

/** 每百万次调用的成本：不到 $1,000 保留两位小数（$0.20、$72.60），之后取整（$1,000、$30,610）。 */
export function formatPerMillion(usd: number): string {
  const cents = roundTo(usd, 2);
  if (cents < 1000) return `$${cents.toFixed(2)}`;
  return `$${roundTo(usd, 0).toLocaleString('en-US')}`;
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
