import { describe, expect, it } from 'vitest';
import { cheapest, computeAll, fullName, type SchemeId } from './costModel';
import { DEFAULT_INPUTS, type Inputs } from './config/assumptions';

function perMillionById(overrides: Partial<Inputs> = {}) {
  const inputs = { ...DEFAULT_INPUTS, ...overrides };
  return Object.fromEntries(computeAll(inputs).map((r) => [r.id, r.perMillion])) as Record<SchemeId, number>;
}

describe('默认输入：question 3,000 不变，state 150 在变，1 道题', () => {
  const cost = perMillionById();

  it('Jev、Gemini、Perplexity 按 state + question 全价计', () => {
    expect(cost.jev).toBeCloseTo(3150 * 0.042, 9);
    expect(cost.gemini).toBeCloseTo(3150 * 0.1, 9);
    expect(cost.pplx).toBeCloseTo(3150 * 0.02, 9);
    expect(cost.pplxFlash).toBeCloseTo(3150 * 0.01, 9);
  });

  it('OpenAI 把标准挪进 input 前缀后命中缓存', () => {
    expect(cost.openai).toBeCloseTo(3000 * 0.01 + (150 + 30) * 0.1, 9);
  });

  it('DeepSeek Flash 默认按高峰价：前缀命中，state 和结尾标记未命中，另加输出', () => {
    expect(cost.deepseek).toBeCloseTo((100 + 3000) * 0.006 + (150 + 10) * 0.3 + 5 * 1.2, 9);
  });

  it('空闲价正好是高峰价的一半', () => {
    const offPeak = perMillionById({ deepseekTier: 'offPeak' });
    expect(offPeak.deepseek).toBeCloseTo((100 + 3000) * 0.003 + (150 + 10) * 0.15 + 5 * 0.6, 9);
    expect(offPeak.deepseek * 2).toBeCloseTo(cost.deepseek, 9);
  });

  it('单次成本是每百万次成本除以一百万', () => {
    for (const r of computeAll(DEFAULT_INPUTS)) {
      expect(r.perCall * 1e6).toBeCloseTo(r.perMillion, 9);
    }
  });

  it('六个方案里最便宜的是 Perplexity Flash v1.3；只有一行 DeepSeek', () => {
    const results = computeAll(DEFAULT_INPUTS);
    expect(results.filter((r) => r.group === 'deepseek')).toHaveLength(1);
    expect(cheapest(results).map((r) => r.id)).toEqual(['pplxFlash']);
  });

  it('只看默认显示的 Jev、OpenAI、Gemini、DeepSeek 时，最便宜的是 OpenAI', () => {
    const shown: SchemeId[] = ['jev', 'openai', 'gemini', 'deepseek'];
    const results = computeAll(DEFAULT_INPUTS).filter((r) => shown.includes(r.id));
    expect(cheapest(results).map((r) => r.id)).toEqual(['openai']);
  });

  it('DeepSeek 的全名带上当前价格档', () => {
    const dsf = computeAll({ ...DEFAULT_INPUTS, deepseekTier: 'offPeak' }).find((r) => r.id === 'deepseek')!;
    expect(fullName(dsf)).toBe('DeepSeek Flash（空闲价）');
  });
});

describe('"最便宜"按当前选中的 DeepSeek 价格比较', () => {
  const winner = (overrides: Partial<Inputs>) =>
    cheapest(computeAll({ ...DEFAULT_INPUTS, ...overrides })).map((r) => r.id);

  it('question 20,000 token 时，两种价格下 DeepSeek 都最便宜', () => {
    expect(winner({ questionTokens: 20000, deepseekTier: 'peak' })).toEqual(['deepseek']);
    expect(winner({ questionTokens: 20000, deepseekTier: 'offPeak' })).toEqual(['deepseek']);
  });

  it('question 6,000 token 时，只有空闲价下 DeepSeek 最便宜', () => {
    expect(winner({ questionTokens: 6000, deepseekTier: 'offPeak' })).toEqual(['deepseek']);
    expect(winner({ questionTokens: 6000, deepseekTier: 'peak' })).toEqual(['pplxFlash']);
  });
});

describe('state 不变、question 在变', () => {
  it('state 不足 1,024 token 时 OpenAI 不能缓存', () => {
    const cost = perMillionById({ fixedPart: 'state' });
    expect(cost.openai).toBeCloseTo(3150 * 0.1, 9);
    expect(cost.deepseek).toBeCloseTo((100 + 150) * 0.006 + (3000 + 10) * 0.3 + 5 * 1.2, 9);
  });

  it('state 达到 1,024 token 后 OpenAI 命中 state 前缀', () => {
    const cost = perMillionById({ fixedPart: 'state', stateTokens: 20000, questionTokens: 200 });
    expect(cost.openai).toBeCloseTo(20000 * 0.01 + 200 * 0.1, 9);
    expect(cost.deepseek).toBeCloseTo((100 + 20000) * 0.006 + (200 + 10) * 0.3 + 5 * 1.2, 9);
  });
});

describe('OpenAI 的 1,024 token 门槛', () => {
  it('question 1,023 token 时全价，1,024 token 时命中', () => {
    expect(perMillionById({ questionTokens: 1023 }).openai).toBeCloseTo((150 + 1023) * 0.1, 9);
    expect(perMillionById({ questionTokens: 1024 }).openai).toBeCloseTo(1024 * 0.01 + 180 * 0.1, 9);
  });
});

describe('题数', () => {
  it('影响 DeepSeek 的输出 token 和 OpenAI 的短题干，不影响其他方案', () => {
    const cost = perMillionById({ questionCount: 10 });
    expect(cost.deepseek).toBeCloseTo((100 + 3000) * 0.006 + 160 * 0.3 + 50 * 1.2, 9);
    expect(cost.openai).toBeCloseTo(3000 * 0.01 + (150 + 300) * 0.1, 9);
    expect(cost.jev).toBeCloseTo(3150 * 0.042, 9);
  });

  it('短题干多到挪动不划算时，OpenAI 回到全价', () => {
    const cost = perMillionById({ questionTokens: 1100, questionCount: 40 });
    expect(cost.openai).toBeCloseTo((150 + 1100) * 0.1, 9);
  });
});

describe('cheapest', () => {
  it('并列时都返回', () => {
    const results = computeAll(DEFAULT_INPUTS).map((r) => ({ ...r, perMillion: 1 }));
    expect(cheapest(results)).toHaveLength(results.length);
  });

  it('空列表返回空', () => {
    expect(cheapest([])).toEqual([]);
  });
});
