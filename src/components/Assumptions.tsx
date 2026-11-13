import { DEFAULT_ESTIMATES, type Inputs } from '../config/assumptions';
import { OPENAI } from '../config/pricing';
import { fullName, type CostLine, type SchemeResult } from '../costModel';
import { formatPerMillion, formatPrice, formatTokens } from '../format';
import { PromptLayout } from './PromptLayout';

function kindLabel(kind: CostLine['kind'], group: SchemeResult['group']): string {
  if (kind === 'cached') return '缓存命中';
  if (kind === 'output') return '输出';
  return group === 'deepseek' ? '未命中' : '普通输入';
}

export function Assumptions({ inputs, results }: { inputs: Inputs; results: SchemeResult[] }) {
  const est = DEFAULT_ESTIMATES;
  const notes = results.flatMap((r) => r.notes.map((n) => `${fullName(r)}：${n}`));

  return (
    <div className="fine">
      <h4>通用口径</h4>
      <ul>
        <li>只算缓存已经命中之后的稳态单次成本。首次调用、缓存过期或没有命中时会更贵。</li>
        <li>
          每次调用处理一个 state 和 {inputs.questionCount} 道题，question 的 token 数是这些题合计的。不把多条 state
          攒进同一次请求。
        </li>
        <li>同一段内容在各家按相同的 token 数计算。各家 tokenizer 不同，实际以各家返回的 usage 为准。</li>
        <li>decision model 每道题额外的格式 token，官方没有公布，没有计入。</li>
        <li>只比较价格，不比较准确率和延迟。</li>
      </ul>

      <h4>各方案按最省钱的合法写法计算</h4>
      <ul>
        <li>
          Jev、Perplexity：state 和所有题放进同一次请求，state 只计一次（Perplexity 用 v1.3 系列）。官方没有公布跨请求缓存，按全价计。Jev
          超过默认的每请求 64k 或每题 32k 上下文时要带长上下文请求头，单价不变。
        </li>
        <li>Gemini：官方明确不支持缓存，跨请求重复的内容全额计费。按付费层价格计；免费层不收费，但有用量限制。</li>
        <li>
          OpenAI：question 一律不能缓存，只有共享 input 开头的 state 能命中。question 不变时 state 每次都变，没有可命中的前缀，按全价计。state
          不变时把 state 放进 input，用默认的隐式断点；state 不足 {formatTokens(OPENAI.minCachePrefixTokens)} token
          时按全价计，不用填充文本凑数。缓存至少保留 30 分钟；首次调用或过期后那一次，前缀按写入价{' '}
          {formatPrice(OPENAI.cacheWrite30mPerM)}/M 计。命中不保证。不含数据驻留的 10% 加价。
        </li>
        <li>
          DeepSeek Flash：请求依次是固定指令模板（约 {est.deepseekTemplateTokens} token）、不变的部分、变化的部分。前两段在稳态下按命中价计；变化的部分和它后面约{' '}
          {est.deepseekTailTokens} token 的结尾格式标记按未命中价计。关闭 thinking（默认开启）；所有题合并成一次调用，每题只输出一个短标签，输出按每题约{' '}
          {est.deepseekOutputTokensPerQuestion} token 估算，这一项只能预估。同一段前缀要先被两次请求共享、落盘之后才会命中，即第 3 次调用起。
        </li>
      </ul>
      <PromptLayout inputs={inputs} />

      <h4>当前输入的计算明细（只列正在显示的模型，金额按每百万次调用计）</h4>
      <div className="table-wrap">
        <table className="detail-table">
          <thead>
            <tr>
              <th>方案</th>
              <th>计费项</th>
              <th className="num">token</th>
              <th className="num">单价 / M</th>
              <th className="num">每百万次</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) =>
              r.lines.map((l, i) => (
                <tr key={`${r.id}-${l.label}`} className={i === 0 ? 'group-start' : undefined}>
                  {i === 0 && <td rowSpan={r.lines.length}>{fullName(r)}</td>}
                  <td>
                    <span className={`dot seg-${l.kind}`} aria-hidden="true" />
                    {kindLabel(l.kind, r.group)} · {l.label}
                  </td>
                  <td className="num">{formatTokens(l.tokens)}</td>
                  <td className="num">{formatPrice(l.pricePerM)}</td>
                  <td className="num">{formatPerMillion(l.usdPerMillionCalls)}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
      {notes.length > 0 && (
        <ul>
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
