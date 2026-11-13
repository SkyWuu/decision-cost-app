import {
  DEEPSEEK_FLASH,
  GEMINI,
  JEV,
  OPENAI,
  PERPLEXITY_FLASH_V13,
  PERPLEXITY_V13,
  PRICES_CHECKED_ON,
  type PriceSource,
} from '../config/pricing';
import { formatPrice, formatTokens } from '../format';

interface Row {
  name: string;
  model: string;
  input: string;
  cached: string;
  output: string;
  cache: string;
  sources: readonly PriceSource[];
}

const { offPeak, peak } = DEEPSEEK_FLASH.tiers;
const deepseekModel = `${DEEPSEEK_FLASH.model}（${DEEPSEEK_FLASH.modelVersion}）`;

const ROWS: Row[] = [
  {
    name: JEV.name,
    model: JEV.model,
    input: formatPrice(JEV.inputPerM),
    cached: '未公开',
    output: '免费',
    cache: '文档没有提到跨请求缓存，usage 里也没有缓存字段。',
    sources: JEV.sources,
  },
  {
    name: OPENAI.name,
    model: OPENAI.model,
    input: formatPrice(OPENAI.uncachedInputPerM),
    cached: `${formatPrice(OPENAI.cachedInputPerM)}（写入 ${formatPrice(OPENAI.cacheWrite30mPerM)}）`,
    output: '不收费',
    cache: `只缓存共享 input 的前缀，至少 ${formatTokens(OPENAI.minCachePrefixTokens)} token；questions 不进缓存。支持显式断点，缓存至少保留 30 分钟。`,
    sources: OPENAI.sources,
  },
  {
    name: GEMINI.name,
    model: GEMINI.model,
    input: `${formatPrice(GEMINI.inputPerM)}（付费层）`,
    cached: '不支持',
    output: '不收费',
    cache: '官方明确不支持 context caching，跨请求重复的输入全额计费。',
    sources: GEMINI.sources,
  },
  {
    name: PERPLEXITY_V13.name,
    model: PERPLEXITY_V13.model,
    input: formatPrice(PERPLEXITY_V13.inputPerM),
    cached: '未公开',
    output: '免费',
    cache: '文档没有提到跨请求缓存；同一请求内 state 只计一次。',
    sources: PERPLEXITY_V13.sources,
  },
  {
    name: PERPLEXITY_FLASH_V13.name,
    model: PERPLEXITY_FLASH_V13.model,
    input: formatPrice(PERPLEXITY_FLASH_V13.inputPerM),
    cached: '未公开',
    output: '免费',
    cache: '同上。',
    sources: PERPLEXITY_FLASH_V13.sources,
  },
  {
    name: `${DEEPSEEK_FLASH.name}（${peak.priceLabel}）`,
    model: deepseekModel,
    input: formatPrice(peak.cacheMissPerM),
    cached: formatPrice(peak.cacheHitPerM),
    output: formatPrice(peak.outputPerM),
    cache: `高峰时段：${DEEPSEEK_FLASH.peakHoursBeijing}。`,
    sources: DEEPSEEK_FLASH.sources,
  },
  {
    name: `${DEEPSEEK_FLASH.name}（${offPeak.priceLabel}）`,
    model: deepseekModel,
    input: formatPrice(offPeak.cacheMissPerM),
    cached: formatPrice(offPeak.cacheHitPerM),
    output: formatPrice(offPeak.outputPerM),
    cache: `${DEEPSEEK_FLASH.offPeakNote}。`,
    sources: DEEPSEEK_FLASH.sources,
  },
];

export function PriceTable() {
  return (
    <div className="fine">
      <div className="table-wrap">
        <table className="price-table">
          <thead>
            <tr>
              <th>方案</th>
              <th>输入（未命中）</th>
              <th>缓存命中</th>
              <th>输出</th>
              <th>缓存规则</th>
              <th>来源</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.name}>
                <td>
                  <div className="pt-name">{r.name}</div>
                  <code className="pt-model">{r.model}</code>
                </td>
                <td className="num">{r.input}</td>
                <td className="num">{r.cached}</td>
                <td className="num">{r.output}</td>
                <td className="pt-cache">{r.cache}</td>
                <td className="pt-sources">
                  {r.sources.map((s) => (
                    <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.label}
                    </a>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        单位：美元 / 每百万 token。全部价格于 {PRICES_CHECKED_ON} 在各家官方文档查阅，之后可能变动，以官方页面为准。
      </p>
      <h4>DeepSeek Flash 的缓存和 thinking（官方文档）</h4>
      <ul>
        {DEEPSEEK_FLASH.cacheRules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
        <li>
          {DEEPSEEK_FLASH.model} {DEEPSEEK_FLASH.thinkingDefault}；OpenAI 格式的请求里传 <code>{DEEPSEEK_FLASH.disableThinkingParam}</code>{' '}
          关闭。
        </li>
      </ul>
    </div>
  );
}
