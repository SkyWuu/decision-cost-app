import { useEffect, useState } from 'react';
import { QUESTION_COUNT_RANGE } from '../config/assumptions';
import { clampQuestionCount } from '../urlState';
import { Tip } from './Tip';

interface Props {
  value: number;
  onChange: (n: number) => void;
}

const HINT = `每次调用问几道题（${QUESTION_COUNT_RANGE.min}–${QUESTION_COUNT_RANGE.max}）。只影响 DeepSeek 的输出 token。`;

export function QuestionCount({ value, onChange }: Props) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const n = Number(draft.trim());
    if (!Number.isFinite(n) || draft.trim() === '') {
      setDraft(String(value));
      return;
    }
    const next = clampQuestionCount(n);
    setDraft(String(next));
    onChange(next);
  };

  return (
    <Tip text={HINT}>
      {(tipId) => (
        <div className="count">
          <span className="count-label">题数</span>
          <div className="stepper">
            <button
              type="button"
              aria-label="减少一道题"
              disabled={value <= QUESTION_COUNT_RANGE.min}
              onClick={() => onChange(clampQuestionCount(value - 1))}
            >
              −
            </button>
            <input
              aria-label="每次调用的题数"
              aria-describedby={tipId}
              inputMode="numeric"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
              }}
            />
            <button
              type="button"
              aria-label="增加一道题"
              disabled={value >= QUESTION_COUNT_RANGE.max}
              onClick={() => onChange(clampQuestionCount(value + 1))}
            >
              +
            </button>
          </div>
        </div>
      )}
    </Tip>
  );
}
