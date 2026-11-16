import { useEffect, useMemo, useState } from 'react';
import { Assumptions } from './components/Assumptions';
import { ModelPicker } from './components/ModelPicker';
import { PriceSwitch } from './components/PriceSwitch';
import { PriceTable } from './components/PriceTable';
import { QuestionCount } from './components/QuestionCount';
import { ResultRow } from './components/ResultRow';
import { Tip } from './components/Tip';
import { TokenSlider } from './components/TokenSlider';
import { DEFAULT_INPUTS, type FixedPart, type Inputs } from './config/assumptions';
import { PRICES_CHECKED_ON } from './config/pricing';
import { cheapest, computeAll, type SchemeId, type SchemeResult } from './costModel';
import { readInputsFromUrl, readVisibleFromUrl, toSearch } from './urlState';

const FIXED_OPTIONS: { value: FixedPart; title: string; desc: string }[] = [
  { value: 'question', title: 'question 不变', desc: 'state 在变。例：用同一套标准给每条新消息分流。' },
  { value: 'state', title: 'state 不变', desc: 'question 在变。例：对同一份材料问不同的问题。' },
];

export function App() {
  const [inputs, setInputs] = useState<Inputs>(() => readInputsFromUrl(window.location.search));
  const [visible, setVisible] = useState<SchemeId[]>(() => readVisibleFromUrl(window.location.search));
  const update = (patch: Partial<Inputs>) => setInputs((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    const timer = window.setTimeout(() => window.history.replaceState(null, '', toSearch(inputs, visible)), 300);
    return () => window.clearTimeout(timer);
  }, [inputs, visible]);

  const results = useMemo(() => computeAll(inputs), [inputs]);
  const shown = results.filter((r) => visible.includes(r.id));
  const winnerIds = new Set(cheapest(shown).map((w) => w.id));
  const minPerMillion = Math.min(...shown.map((r) => r.perMillion));
  const maxPerMillion = Math.max(...shown.map((r) => r.perMillion));
  const decisionRows = shown.filter((r) => r.group === 'decision');
  const deepseekRows = shown.filter((r) => r.group === 'deepseek');
  const stateFixed = inputs.fixedPart === 'state';

  const row = (r: SchemeResult) => (
    <ResultRow
      key={r.id}
      result={r}
      maxPerMillion={maxPerMillion}
      cheapestPerMillion={minPerMillion}
      isCheapest={winnerIds.has(r.id)}
      extra={
        r.id === 'deepseek' ? (
          <PriceSwitch value={inputs.deepseekTier} onChange={(deepseekTier) => update({ deepseekTier })} />
        ) : undefined
      }
    />
  );

  return (
    <div className="page">
      <div className="scenario-bar" role="group" aria-label="调用方式">
        <div className="pills" role="radiogroup" aria-label="哪部分在多次调用之间不变">
          {FIXED_OPTIONS.map((o) => (
            <Tip key={o.value} text={o.desc}>
              {(tipId) => (
                <label className={inputs.fixedPart === o.value ? 'pill active' : 'pill'}>
                  <input
                    type="radio"
                    name="fixed-part"
                    value={o.value}
                    checked={inputs.fixedPart === o.value}
                    aria-describedby={tipId}
                    onChange={() => update({ fixedPart: o.value })}
                  />
                  {o.title}
                </label>
              )}
            </Tip>
          ))}
        </div>
        <QuestionCount value={inputs.questionCount} onChange={(questionCount) => update({ questionCount })} />
      </div>

      <main className="layout">
        <section className="card controls" aria-label="输入">
          <TokenSlider
            label="state 的 token 数"
            tag={stateFixed ? '不变' : '在变'}
            tagTone={stateFixed ? 'fixed' : 'varying'}
            hint={stateFixed ? '每次调用都相同，例如同一份长文档。' : '每次调用都不同，例如一条待判断的消息。'}
            value={inputs.stateTokens}
            onChange={(stateTokens) => update({ stateTokens })}
          />
          <TokenSlider
            label="question 的 token 数"
            tag={stateFixed ? '在变' : '不变'}
            tagTone={stateFixed ? 'varying' : 'fixed'}
            hint={stateFixed ? '所有题目合计，每次调用都不同。' : '所有题目合计，每次调用都相同，例如消息质量标准。'}
            value={inputs.questionTokens}
            onChange={(questionTokens) => update({ questionTokens })}
          />
          <button type="button" className="reset" onClick={() => setInputs(DEFAULT_INPUTS)}>
            ↺ 恢复默认值
          </button>
        </section>

        <section className="card results" aria-label="结果">
          <div className="results-head">
            <span className="results-caption">缓存命中时的单次调用成本</span>
            <ModelPicker
              options={results.map((r) => ({ id: r.id, name: r.name, model: r.model }))}
              visible={visible}
              onChange={setVisible}
            />
          </div>

          {decisionRows.length > 0 && (
            <>
              <h3 className="group-title">Decision model</h3>
              <ul className="rows">{decisionRows.map(row)}</ul>
            </>
          )}
          {deepseekRows.length > 0 && (
            <>
              <h3 className="group-title">通用 LLM：吃满前缀缓存</h3>
              <ul className="rows">{deepseekRows.map(row)}</ul>
            </>
          )}

          <div className="legend" aria-hidden="true">
            <span>
              <i className="seg-cached" />
              缓存命中
            </span>
            <span>
              <i className="seg-uncached" />
              普通输入 / 未命中
            </span>
            <span>
              <i className="seg-output" />
              输出
            </span>
            <span className="legend-note">条形长度 = 每百万次调用的成本</span>
          </div>
        </section>
      </main>

      <section className="folds">
        <details className="fold">
          <summary>计算假设</summary>
          <Assumptions inputs={inputs} results={shown} />
        </details>
        <details className="fold">
          <summary>价格与来源 · 各家官方文档，查阅于 {PRICES_CHECKED_ON}</summary>
          <PriceTable />
        </details>
      </section>

      <footer className="footer">纯前端静态页面：不调用任何 API，不收集数据。价格可能变动，以各家官方页面为准。</footer>
    </div>
  );
}
