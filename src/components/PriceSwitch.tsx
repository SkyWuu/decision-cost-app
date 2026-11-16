import type { DeepSeekTierKey } from '../config/assumptions';
import { DEEPSEEK_FLASH } from '../config/pricing';

interface Props {
  value: DeepSeekTierKey;
  onChange: (tier: DeepSeekTierKey) => void;
}

export function PriceSwitch({ value, onChange }: Props) {
  const offPeak = value === 'offPeak';
  const { peak, offPeak: idle } = DEEPSEEK_FLASH.tiers;

  return (
    <span className="switch-wrap">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className={offPeak ? 'switch-side' : 'switch-side active'}
        onClick={() => onChange('peak')}
      >
        {peak.priceLabel}
      </button>
      <button
        type="button"
        role="switch"
        aria-checked={offPeak}
        aria-label="按空闲价计算 DeepSeek Flash"
        className={offPeak ? 'switch on' : 'switch'}
        onClick={() => onChange(offPeak ? 'peak' : 'offPeak')}
      >
        <span className="switch-thumb" />
      </button>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className={offPeak ? 'switch-side active' : 'switch-side'}
        onClick={() => onChange('offPeak')}
      >
        {idle.priceLabel}
      </button>
    </span>
  );
}
