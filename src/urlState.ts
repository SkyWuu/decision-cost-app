import { DEFAULT_INPUTS, QUESTION_COUNT_RANGE, TOKEN_RANGE, type Inputs } from './config/assumptions';
import type { SchemeId } from './costModel';

export const ALL_SCHEMES: readonly SchemeId[] = ['jev', 'openai', 'gemini', 'pplx', 'pplxFlash', 'deepseek'];
export const DEFAULT_VISIBLE: readonly SchemeId[] = ['jev', 'openai', 'gemini', 'deepseek'];

function clamp(n: number, range: { min: number; max: number }): number {
  if (!Number.isFinite(n)) return range.min;
  return Math.min(range.max, Math.max(range.min, Math.round(n)));
}

export const clampTokens = (n: number) => clamp(n, TOKEN_RANGE);
export const clampQuestionCount = (n: number) => clamp(n, QUESTION_COUNT_RANGE);

function readNumber(params: URLSearchParams, key: string, fallback: number, clampFn: (n: number) => number): number {
  const raw = params.get(key);
  if (raw === null || raw.trim() === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? clampFn(n) : fallback;
}

export function readInputsFromUrl(search: string): Inputs {
  const params = new URLSearchParams(search);
  const fixed = params.get('fixed');
  const dsf = params.get('dsf');
  return {
    stateTokens: readNumber(params, 'state', DEFAULT_INPUTS.stateTokens, clampTokens),
    questionTokens: readNumber(params, 'question', DEFAULT_INPUTS.questionTokens, clampTokens),
    questionCount: readNumber(params, 'n', DEFAULT_INPUTS.questionCount, clampQuestionCount),
    fixedPart: fixed === 'state' || fixed === 'question' ? fixed : DEFAULT_INPUTS.fixedPart,
    deepseekTier: dsf === 'peak' || dsf === 'offPeak' ? dsf : DEFAULT_INPUTS.deepseekTier,
  };
}

export function readVisibleFromUrl(search: string): SchemeId[] {
  const raw = new URLSearchParams(search).get('show');
  const requested = new Set((raw ?? '').split(','));
  const visible = ALL_SCHEMES.filter((id) => requested.has(id));
  return visible.length > 0 ? visible : [...DEFAULT_VISIBLE];
}

export function toSearch(inputs: Inputs, visible: readonly SchemeId[]): string {
  const params = new URLSearchParams({
    state: String(inputs.stateTokens),
    question: String(inputs.questionTokens),
    n: String(inputs.questionCount),
    fixed: inputs.fixedPart,
    dsf: inputs.deepseekTier,
    show: visible.join(','),
  });
  return `?${params.toString()}`;
}
