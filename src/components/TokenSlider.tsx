import { useEffect, useId, useState } from 'react';
import { TOKEN_RANGE } from '../config/assumptions';
import { formatTokens } from '../format';
import { clampTokens } from '../urlState';

const STEPS = 1000;
const LOG_MIN = Math.log(TOKEN_RANGE.min);
const LOG_SPAN = Math.log(TOKEN_RANGE.max) - LOG_MIN;
const TICKS = [10, 100, 1_000, 10_000, 100_000];

function snap(v: number): number {
  if (v < 100) return Math.round(v);
  if (v < 1_000) return Math.round(v / 10) * 10;
  if (v < 10_000) return Math.round(v / 50) * 50;
  return Math.round(v / 500) * 500;
}

function positionToTokens(pos: number): number {
  return clampTokens(snap(Math.exp(LOG_MIN + (pos / STEPS) * LOG_SPAN)));
}

function tokensToPosition(tokens: number): number {
  return Math.round(((Math.log(clampTokens(tokens)) - LOG_MIN) / LOG_SPAN) * STEPS);
}

function tickLabel(n: number): string {
  return n >= 1000 ? `${n / 1000}K` : String(n);
}

interface Props {
  label: string;
  tag: string;
  tagTone: 'fixed' | 'varying';
  hint: string;
  value: number;
  onChange: (tokens: number) => void;
}

export function TokenSlider({ label, tag, tagTone, hint, value, onChange }: Props) {
  const id = useId();
  const [draft, setDraft] = useState(formatTokens(value));
  // 滑块位置单独保存：取整后的 token 数反推位置会让方向键卡在原地。
  const [pos, setPos] = useState(() => tokensToPosition(value));

  useEffect(() => {
    setDraft(formatTokens(value));
    setPos((p) => (positionToTokens(p) === value ? p : tokensToPosition(value)));
  }, [value]);

  const commitDraft = () => {
    const n = Number(draft.replace(/[,\s，]/g, ''));
    if (!Number.isFinite(n) || n <= 0) {
      setDraft(formatTokens(value));
      return;
    }
    const next = clampTokens(n);
    setDraft(formatTokens(next));
    onChange(next);
  };

  return (
    <div className="slider">
      <div className="slider-head">
        <label htmlFor={`${id}-range`} className="slider-label">
          {label}
          <span className={`tag tag-${tagTone}`}>{tag}</span>
        </label>
        <div className="slider-input">
          <input
            aria-label={`${label}（精确值）`}
            inputMode="numeric"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitDraft();
            }}
          />
          <span>token</span>
        </div>
      </div>
      <input
        id={`${id}-range`}
        type="range"
        min={0}
        max={STEPS}
        step={1}
        value={pos}
        aria-valuetext={`${formatTokens(value)} token`}
        style={{ ['--fill' as string]: `${(pos / STEPS) * 100}%` }}
        onChange={(e) => {
          const next = Number(e.target.value);
          setPos(next);
          onChange(positionToTokens(next));
        }}
      />
      <div className="ticks" aria-hidden="true">
        {TICKS.map((t) => (
          <span key={t} style={{ left: `${(tokensToPosition(t) / STEPS) * 100}%` }}>
            {tickLabel(t)}
          </span>
        ))}
      </div>
      <p className="slider-hint">{hint}</p>
    </div>
  );
}
