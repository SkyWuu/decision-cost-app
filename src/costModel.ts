import {
  DEEPSEEK_FLASH,
  GEMINI,
  JEV,
  OPENAI,
  PERPLEXITY_FLASH_V13,
  PERPLEXITY_V13,
} from './config/pricing';
import { DEFAULT_ESTIMATES, type Estimates, type Inputs } from './config/assumptions';

export type LineKind = 'cached' | 'uncached' | 'output';

export interface CostLine {
  kind: LineKind;
  label: string;
  tokens: number;
  pricePerM: number;
  /** tokens × pricePerM，即这一项在每百万次调用里的美元成本。 */
  usdPerMillionCalls: number;
}

export type SchemeId = 'jev' | 'openai' | 'gemini' | 'pplx' | 'pplxFlash' | 'deepseek';

export interface SchemeResult {
  id: SchemeId;
  group: 'decision' | 'deepseek';
  name: string;
  /** 同一方案下选中的价格档，例如 DeepSeek 的「高峰价」。 */
  variant?: string;
  model: string;
  lines: CostLine[];
  perMillion: number;
  perCall: number;
  /** 一句话说明当前输入下有没有吃到缓存。 */
  tag: string;
  notes: string[];
}

type Draft = Omit<SchemeResult, 'perMillion' | 'perCall'>;

function line(kind: LineKind, label: string, tokens: number, pricePerM: number): CostLine {
  return { kind, label, tokens, pricePerM, usdPerMillionCalls: tokens * pricePerM };
}

function total(lines: CostLine[]): number {
  return lines.reduce((sum, l) => sum + l.usdPerMillionCalls, 0);
}

function finish(draft: Draft): SchemeResult {
  const perMillion = total(draft.lines);
  return { ...draft, perMillion, perCall: perMillion / 1e6 };
}

const fmt = (n: number) => n.toLocaleString('en-US');

export function partNames(inputs: Inputs) {
  const fixed = inputs.fixedPart;
  const varying = fixed === 'question' ? 'state' : 'question';
  return {
    fixed,
    varying,
    fixedTokens: fixed === 'question' ? inputs.questionTokens : inputs.stateTokens,
    varyingTokens: fixed === 'question' ? inputs.stateTokens : inputs.questionTokens,
  } as const;
}

export function deepseekOutputTokens(inputs: Inputs, est: Estimates = DEFAULT_ESTIMATES): number {
  return inputs.questionCount * est.deepseekOutputTokensPerQuestion;
}

const FULL_PRICE_TAG = '没有跨请求缓存，按全价';

function jev(inputs: Inputs): SchemeResult {
  const { stateTokens: s, questionTokens: q, questionCount: n } = inputs;
  const notes: string[] = [];
  if (s + q / n > JEV.perQuestionContextTokens) {
    notes.push('超过 Jev 默认的 32k 每题上下文，需要带长上下文请求头，单价不变。');
  }
  return finish({
    id: 'jev',
    group: 'decision',
    name: JEV.name,
    model: JEV.model,
    lines: [line('uncached', 'state + question', s + q, JEV.inputPerM)],
    tag: FULL_PRICE_TAG,
    notes,
  });
}

function openai(inputs: Inputs, est: Estimates): SchemeResult {
  const { stateTokens: s, questionTokens: q, fixedPart, questionCount: n } = inputs;
  const min = OPENAI.minCachePrefixTokens;
  const base = { id: 'openai', group: 'decision', name: OPENAI.name, model: OPENAI.model } as const;
  const fullPrice = [line('uncached', 'state + question', s + q, OPENAI.uncachedInputPerM)];
  const belowThreshold = (part: string): SchemeResult =>
    finish({
      ...base,
      lines: fullPrice,
      tag: `不变的 ${part} 不足 ${fmt(min)} token，不能缓存，按全价`,
      notes: [],
    });

  if (fixedPart === 'question') {
    if (q < min) return belowThreshold('question');
    const residual = n * est.openaiResidualQuestionTokens;
    const moved = [
      line('cached', 'question 的固定标准（挪进 input 前缀）', q, OPENAI.cachedInputPerM),
      line('uncached', `state + 短题干 ${fmt(residual)} token`, s + residual, OPENAI.uncachedInputPerM),
    ];
    if (total(moved) >= total(fullPrice)) {
      return finish({
        ...base,
        lines: fullPrice,
        tag: '短题干太多，挪进 input 反而更贵，按全价',
        notes: [],
      });
    }
    return finish({
      ...base,
      lines: moved,
      tag: `固定标准挪进 input 前缀，命中 ${fmt(q)} token`,
      notes: [],
    });
  }

  if (s < min) return belowThreshold('state');
  return finish({
    ...base,
    lines: [
      line('cached', 'state（input 前缀）', s, OPENAI.cachedInputPerM),
      line('uncached', 'question（questions 不进缓存）', q, OPENAI.uncachedInputPerM),
    ],
    tag: `state 在 input 前缀，命中 ${fmt(s)} token`,
    notes: [],
  });
}

function gemini(inputs: Inputs): SchemeResult {
  return finish({
    id: 'gemini',
    group: 'decision',
    name: GEMINI.name,
    model: GEMINI.model,
    lines: [line('uncached', 'state + question', inputs.stateTokens + inputs.questionTokens, GEMINI.inputPerM)],
    tag: '官方不支持缓存，按全价',
    notes: [],
  });
}

function perplexity(inputs: Inputs, flash: boolean): SchemeResult {
  const p = flash ? PERPLEXITY_FLASH_V13 : PERPLEXITY_V13;
  return finish({
    id: flash ? 'pplxFlash' : 'pplx',
    group: 'decision',
    name: p.name,
    model: p.model,
    lines: [line('uncached', 'state + question', inputs.stateTokens + inputs.questionTokens, p.inputPerM)],
    tag: FULL_PRICE_TAG,
    notes: [],
  });
}

function deepseek(inputs: Inputs, est: Estimates): SchemeResult {
  const tier = DEEPSEEK_FLASH.tiers[inputs.deepseekTier];
  const { fixed, varying, fixedTokens, varyingTokens } = partNames(inputs);
  const cachedTokens = est.deepseekTemplateTokens + fixedTokens;
  const outputTokens = deepseekOutputTokens(inputs, est);
  return finish({
    id: 'deepseek',
    group: 'deepseek',
    name: DEEPSEEK_FLASH.name,
    variant: tier.priceLabel,
    model: DEEPSEEK_FLASH.model,
    lines: [
      line('cached', `指令模板 + ${fixed}（前缀命中）`, cachedTokens, tier.cacheHitPerM),
      line('uncached', `${varying} + 结尾标记`, varyingTokens + est.deepseekTailTokens, tier.cacheMissPerM),
      line('output', '输出短标签（估算）', outputTokens, tier.outputPerM),
    ],
    tag: `前缀命中 ${fmt(cachedTokens)} token，输出约 ${fmt(outputTokens)} token（估算）`,
    notes: [],
  });
}

export function computeAll(inputs: Inputs, est: Estimates = DEFAULT_ESTIMATES): SchemeResult[] {
  return [
    jev(inputs),
    openai(inputs, est),
    gemini(inputs),
    perplexity(inputs, false),
    perplexity(inputs, true),
    deepseek(inputs, est),
  ];
}

/** 成本最低的方案；并列时全部返回。 */
export function cheapest(results: SchemeResult[]): SchemeResult[] {
  if (results.length === 0) return [];
  const min = Math.min(...results.map((r) => r.perMillion));
  return results.filter((r) => r.perMillion - min <= Math.max(1e-9, min * 1e-9));
}

export function fullName(result: SchemeResult): string {
  return result.variant ? `${result.name}（${result.variant}）` : result.name;
}
