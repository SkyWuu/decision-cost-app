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

  it('OpenAI 的 question 不能缓存，按 state + question 全价计', () => {
    expect(cost.openai).toBeCloseTo(3150 * 0.1, 9);
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

  it('只看默认显示的 Jev、OpenAI、Gemini、DeepSeek 时，最便宜的是 DeepSeek Flash', () => {
    const shown: SchemeId[] = ['jev', 'openai', 'gemini', 'deepseek'];
    const results = computeAll(DEFAULT_INPUTS).filter((r) => shown.includes(r.id));
    expect(cheapest(results).map((r) => r.id)).toEqual(['deepseek']);
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

describe('OpenAI 的 1,024 token 门槛只看不变的 state', () => {
  it('state 不变时，state 1,023 token 按全价，1,024 token 命中', () => {
    const openaiAt = (stateTokens: number) =>
      perMillionById({ fixedPart: 'state', stateTokens, questionTokens: 200 }).openai;
    expect(openaiAt(1023)).toBeCloseTo((1023 + 200) * 0.1, 9);
    expect(openaiAt(1024)).toBeCloseTo(1024 * 0.01 + 200 * 0.1, 9);
  });

  it('question 不变时，question 多长、题数多少都按全价，和 Gemini 相同', () => {
    for (const questionTokens of [1023, 1024, 20000, 100000]) {
      for (const questionCount of [1, 10, 100]) {
        const cost = perMillionById({ questionTokens, questionCount });
        expect(cost.openai).toBeCloseTo((150 + questionTokens) * 0.1, 9);
        expect(cost.openai).toBeCloseTo(cost.gemini, 9);
      }
    }
  });
});

describe('题数', () => {
  it('只影响 DeepSeek 的输出 token，不影响其他方案', () => {
    const cost = perMillionById({ questionCount: 10 });
    expect(cost.deepseek).toBeCloseTo((100 + 3000) * 0.006 + 160 * 0.3 + 50 * 1.2, 9);
    expect(cost.openai).toBeCloseTo(3150 * 0.1, 9);
    expect(cost.jev).toBeCloseTo(3150 * 0.042, 9);
  });
});

describe('Jev 长上下文提示', () => {
  const jevNotes = (overrides: Partial<Inputs>) =>
    computeAll({ ...DEFAULT_INPUTS, ...overrides }).find((r) => r.id === 'jev')!.notes;

  it('默认输入不提示', () => {
    expect(jevNotes({})).toEqual([]);
  });

  it('state 加全部题目超过每请求 64k 时提示，即使每题没超过 32k', () => {
    expect(jevNotes({ questionTokens: 100000, questionCount: 10 })).toEqual([
      '超过默认的上下文上限（每请求 64k），需要带长上下文请求头，单价不变。',
    ]);
  });

  it('只超过每题 32k 时只提每题', () => {
    expect(jevNotes({ stateTokens: 40000, questionTokens: 1000 })).toEqual([
      '超过默认的上下文上限（每题 32k），需要带长上下文请求头，单价不变。',
    ]);
  });

  it('两个上限都超过时一起提示', () => {
    expect(jevNotes({ stateTokens: 100000, questionTokens: 100000 })).toEqual([
      '超过默认的上下文上限（每请求 64k、每题 32k），需要带长上下文请求头，单价不变。',
    ]);
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
