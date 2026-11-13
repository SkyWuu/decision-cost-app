import { describe, expect, it } from 'vitest';
import { formatPerMillion } from './format';

describe('formatPerMillion', () => {
  it('不到 $1 也保留两位小数', () => {
    expect(formatPerMillion(0.2)).toBe('$0.20');
    expect(formatPerMillion(0.84)).toBe('$0.84');
    expect(formatPerMillion(0.333)).toBe('$0.33');
  });

  it('按十进制四舍五入，不受二进制表示影响', () => {
    expect(formatPerMillion(9.995)).toBe('$10.00');
    expect(formatPerMillion(1.005)).toBe('$1.01');
    expect(formatPerMillion(132.29999999999998)).toBe('$132.30');
  });

  it('舍到分之后够 $1,000 就取整并加千分位', () => {
    expect(formatPerMillion(999.994)).toBe('$999.99');
    expect(formatPerMillion(999.995)).toBe('$1,000');
    expect(formatPerMillion(999.999)).toBe('$1,000');
    expect(formatPerMillion(1000.495)).toBe('$1,000');
    expect(formatPerMillion(30609.6)).toBe('$30,610');
  });
});
