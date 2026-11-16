import { DEFAULT_ESTIMATES, type Inputs } from '../config/assumptions';
import { DEEPSEEK_FLASH } from '../config/pricing';
import { deepseekOutputTokens, partNames } from '../costModel';
import { formatTokens } from '../format';

interface Segment {
  kind: 'cached' | 'uncached';
  title: string;
  tokens: number;
}

export function PromptLayout({ inputs }: { inputs: Inputs }) {
  const est = DEFAULT_ESTIMATES;
  const { fixed, varying, fixedTokens, varyingTokens } = partNames(inputs);
  const prompt: Segment[] = [
    { kind: 'cached', title: '固定指令模板', tokens: est.deepseekTemplateTokens },
    { kind: 'cached', title: `${fixed}（不变）`, tokens: fixedTokens },
    { kind: 'uncached', title: `${varying}（变化）`, tokens: varyingTokens },
    { kind: 'uncached', title: '结尾标记', tokens: est.deepseekTailTokens },
  ];
  const fixedExample = fixed === 'question' ? '<所有题目和判断标准>' : '<不变的材料>';
  const varyingExample = varying === 'state' ? '<待判断的消息>' : '<本次的所有题目>';

  return (
    <div className="layout-diagram">
      <div className="segments" role="img" aria-label="DeepSeek Flash 请求结构示意">
        {prompt.map((s) => (
          <div key={s.title} className={`segment seg-${s.kind}`} style={{ flexGrow: Math.sqrt(s.tokens) }}>
            <span className="segment-title">{s.title}</span>
            <span className="segment-tokens">{formatTokens(s.tokens)}</span>
          </div>
        ))}
        <div className="segment-arrow" aria-hidden="true">
          →
        </div>
        <div className="segment seg-output segment-out">
          <span className="segment-title">输出</span>
          <span className="segment-tokens">≈{formatTokens(deepseekOutputTokens(inputs))}</span>
        </div>
      </div>
      <p className="diagram-caption">宽度只是示意，不按 token 数等比。青色段稳态下按缓存命中价计，紫色段按未命中价计。</p>
      <pre className="request">
        <code>{`{
  "model": "${DEEPSEEK_FLASH.model}",
  ${DEEPSEEK_FLASH.disableThinkingParam},
  "messages": [
    { "role": "system", "content": "<固定指令模板>\\n${fixedExample}" },
    { "role": "user", "content": "${varyingExample}" }
  ]
}`}</code>
      </pre>
    </div>
  );
}
