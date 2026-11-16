import type { ReactNode } from 'react';
import type { SchemeResult } from '../costModel';
import { formatPerCall, formatPerMillion, formatRatio } from '../format';

interface Props {
  result: SchemeResult;
  maxPerMillion: number;
  cheapestPerMillion: number;
  isCheapest: boolean;
  /** 放在名称后面的控件，例如 DeepSeek 的价格开关。 */
  extra?: ReactNode;
}

export function ResultRow({ result, maxPerMillion, cheapestPerMillion, isCheapest, extra }: Props) {
  const width = maxPerMillion > 0 ? (result.perMillion / maxPerMillion) * 100 : 0;
  const ratio = result.perMillion / cheapestPerMillion;

  return (
    <li className={isCheapest ? 'row row-best' : 'row'}>
      <div className="row-top">
        <div className="row-id">
          <div className="row-name">
            {result.name}
            {extra}
            {isCheapest && <span className="badge-best">最便宜</span>}
          </div>
          <div className="row-meta">
            <code>{result.model}</code>
            <span className="row-tag">{result.tag}</span>
          </div>
        </div>
        <div className="row-cost">
          <div className="row-million">
            {formatPerMillion(result.perMillion)}
            <span> / 百万次</span>
          </div>
          <div className="row-call">
            单次 {formatPerCall(result.perCall)}
            {!isCheapest && <span className="row-ratio">· 最便宜的 {formatRatio(ratio)}</span>}
          </div>
        </div>
      </div>
      <div className="bar-track" aria-hidden="true">
        <div className="bar" style={{ width: `${Math.max(width, 0.6)}%` }}>
          {result.lines
            .filter((l) => l.usdPerMillionCalls > 0)
            .map((l) => (
              <span key={l.label} className={`seg seg-${l.kind}`} style={{ flexGrow: l.usdPerMillionCalls }} />
            ))}
        </div>
      </div>
    </li>
  );
}
