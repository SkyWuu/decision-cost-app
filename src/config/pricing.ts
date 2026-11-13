// 全站唯一的价格来源。单价一律是「美元 / 每百万 token」。
// 改价格只改这个文件；页面上的价格表、来源链接和查阅日期都从这里读。

export const PRICES_CHECKED_ON = '2026-11-13';

export interface PriceSource {
  label: string;
  url: string;
}

export const JEV = {
  vendor: 'TypeSafe',
  name: 'Jev',
  model: 'jev-1.14.0',
  inputPerM: 0.042,
  outputPerM: 0,
  /** 默认的每题上下文（state + 任意一道题）；超出要带长上下文请求头，单价不变。 */
  perQuestionContextTokens: 32_000,
  sources: [
    { label: 'TypeSafe · Models', url: 'https://docs.typesafe.ai/models.md' },
    { label: 'TypeSafe · OpenAPI', url: 'https://api.typesafe.ai/openapi.json' },
  ],
} as const;

export const OPENAI = {
  vendor: 'OpenAI',
  name: 'OpenAI Decisions',
  model: 'gpt-6-luna',
  uncachedInputPerM: 0.1,
  cachedInputPerM: 0.01,
  cacheWrite30mPerM: 0.125,
  outputPerM: 0,
  /** 可复用前缀（共享 input 的开头）至少要有这么多 token；questions 不计入。 */
  minCachePrefixTokens: 1024,
  sources: [
    { label: 'OpenAI · Decisions 指南', url: 'https://developers.openai.com/api/docs/guides/decisions' },
    { label: 'OpenAI · Pricing', url: 'https://developers.openai.com/api/docs/pricing' },
    { label: 'OpenAI · Prompt caching', url: 'https://developers.openai.com/api/docs/guides/prompt-caching' },
  ],
} as const;

export const GEMINI = {
  vendor: 'Google',
  name: 'Gemini Decisions',
  model: 'gemini-decision-1',
  /** 付费层价格；免费层不收费，但有用量限制。 */
  inputPerM: 0.1,
  outputPerM: 0,
  sources: [
    { label: 'Gemini · Decisions API', url: 'https://aistudio.google.com/docs/decisions-api' },
    { label: 'Gemini · Pricing', url: 'https://aistudio.google.com/docs/pricing#gemini-decision' },
  ],
} as const;

const PERPLEXITY_SOURCES: readonly PriceSource[] = [
  { label: 'Perplexity · Pricing', url: 'https://docs.perplexity.ai/docs/getting-started/pricing' },
  { label: 'Perplexity · Decisions quickstart', url: 'https://docs.perplexity.ai/docs/decisions/quickstart' },
];

export const PERPLEXITY_V13 = {
  vendor: 'Perplexity',
  name: 'Perplexity Decisions v1.3',
  model: 'pplx-decider-v1.3',
  inputPerM: 0.02,
  outputPerM: 0,
  sources: PERPLEXITY_SOURCES,
} as const;

export const PERPLEXITY_FLASH_V13 = {
  vendor: 'Perplexity',
  name: 'Perplexity Decisions Flash v1.3',
  model: 'pplx-decider-flash-v1.3',
  inputPerM: 0.01,
  outputPerM: 0,
  sources: PERPLEXITY_SOURCES,
} as const;

export interface DeepSeekTier {
  label: string;
  priceLabel: string;
  cacheHitPerM: number;
  cacheMissPerM: number;
  outputPerM: number;
}

export const DEEPSEEK_FLASH = {
  vendor: 'DeepSeek',
  name: 'DeepSeek Flash',
  model: 'deepseek-flash',
  modelVersion: 'DeepSeek-V4.1-Flash-1017',
  tiers: {
    peak: { label: '高峰时段', priceLabel: '高峰价', cacheHitPerM: 0.006, cacheMissPerM: 0.3, outputPerM: 1.2 },
    offPeak: { label: '空闲时段', priceLabel: '空闲价', cacheHitPerM: 0.003, cacheMissPerM: 0.15, outputPerM: 0.6 },
  } satisfies Record<'peak' | 'offPeak', DeepSeekTier>,
  peakHoursBeijing: '北京时间工作日（周一至周五，不含法定节假日）9:00–12:00、14:00–18:00',
  offPeakNote: '其余时间（含周末和法定节假日全天）按空闲价，是高峰价的一半',
  thinkingDefault: '默认开启思考模式，effort 默认为 high',
  disableThinkingParam: '"thinking": {"type": "disabled"}',
  cacheRules: [
    '上下文硬盘缓存对所有用户默认开启，不用改代码。',
    '价格表只有缓存命中、未命中和输出三项，没有单列的写入费或存储费（扣费规则：费用 = token 数 × 单价）。',
    '命中条件是完整匹配一个已落盘的「缓存前缀单元」。前缀单元在三种时机落盘：请求的输入结束位置和输出结束位置；系统检测到多次请求的公共前缀时；长输入按固定 token 间隔切分时。',
    '官方示例：先后发 A+B、A+C，这两次都不命中；之后系统把公共前缀 A 落盘，第三次发 A+D 才命中 A。',
    '文档没有写最小可缓存长度，也没有写固定间隔的具体 token 数。',
    '缓存是尽力而为，不保证 100% 命中。构建要几秒，不再使用后一般几小时到几天内清除。',
  ],
  sources: [
    { label: 'DeepSeek · 模型 & 价格', url: 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing/' },
    { label: 'DeepSeek · 上下文硬盘缓存', url: 'https://api-docs.deepseek.com/zh-cn/guides/kv_cache/' },
    { label: 'DeepSeek · 思考模式', url: 'https://api-docs.deepseek.com/zh-cn/guides/thinking_mode' },
  ],
} as const;
