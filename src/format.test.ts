import { describe, expect, it } from 'vitest';
import { DEFAULT_INPUTS } from './config/assumptions';
import { computeAll } from './costModel';
import { formatPerCall, formatPerMillion } from './format';

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

describe('formatPerCall', () => {
  it('按十进制四舍五入保留三位有效数字', () => {
    expect(formatPerCall(150.5 / 1e6)).toBe('$0.000151');
    expect(formatPerCall(72.6 / 1e6)).toBe('$0.0000726');
    expect(formatPerCall(0.2 / 1e6)).toBe('$0.000000200');
    expect(formatPerCall(30609.6 / 1e6)).toBe('$0.0306');
  });

  it('进位到下一个数量级时仍是三位有效数字', () => {
    expect(formatPerCall(0.0009995)).toBe('$0.00100');
    expect(formatPerCall(999.995 / 1e6)).toBe('$0.00100');
  });

  it('零显示为 $0', () => {
    expect(formatPerCall(0)).toBe('$0');
  });

  it('OpenAI $150.50 / 百万次时显示单次 $0.000151', () => {
    const openai = computeAll({ ...DEFAULT_INPUTS, questionTokens: 1355 }).find((r) => r.id === 'openai')!;
    expect(formatPerMillion(openai.perMillion)).toBe('$150.50');
    expect(formatPerCall(openai.perCall)).toBe('$0.000151');
  });
});
