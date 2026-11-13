// 价格以外的输入和估算值。官方没有给出、只能预估的 token 数都集中在这里。

export type FixedPart = 'question' | 'state';
export type DeepSeekTierKey = 'peak' | 'offPeak';

export interface Inputs {
  stateTokens: number;
  /** 所有题目合计的 token 数。 */
  questionTokens: number;
  questionCount: number;
  /** 多次调用之间不变的那一部分。 */
  fixedPart: FixedPart;
  deepseekTier: DeepSeekTierKey;
}

export interface Estimates {
  /** DeepSeek：放在最前面的固定指令模板（角色、任务、输出格式），稳态下按命中价计。 */
  deepseekTemplateTokens: number;
  /** DeepSeek：变化部分之后的分隔符和对话模板标记，按未命中价计。 */
  deepseekTailTokens: number;
  /** DeepSeek：关闭 thinking 后，每道题输出一个短标签加分隔或结束符的 token 数。 */
  deepseekOutputTokensPerQuestion: number;
}

/** 默认是消息分流场景：question（消息质量标准）约 3,000 token，state（一条消息）约 150 token。 */
export const DEFAULT_INPUTS: Inputs = {
  stateTokens: 150,
  questionTokens: 3000,
  questionCount: 1,
  fixedPart: 'question',
  deepseekTier: 'peak',
};

export const DEFAULT_ESTIMATES: Estimates = {
  deepseekTemplateTokens: 100,
  deepseekTailTokens: 10,
  deepseekOutputTokensPerQuestion: 5,
};

export const TOKEN_RANGE = { min: 10, max: 100_000 } as const;
export const QUESTION_COUNT_RANGE = { min: 1, max: 100 } as const;
