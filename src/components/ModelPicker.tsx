import { useEffect, useId, useRef, useState } from 'react';
import type { SchemeId } from '../costModel';

export interface PickerOption {
  id: SchemeId;
  name: string;
  model: string;
}

interface Props {
  options: PickerOption[];
  visible: SchemeId[];
  onChange: (ids: SchemeId[]) => void;
}

export function ModelPicker({ options, visible, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const toggle = (id: SchemeId) => {
    const next = visible.includes(id) ? visible.filter((v) => v !== id) : [...visible, id];
    if (next.length === 0) return;
    onChange(options.map((o) => o.id).filter((o) => next.includes(o)));
  };

  return (
    <div className="picker" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="picker-button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
      >
        显示模型 {visible.length}/{options.length}
        <span className="picker-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="picker-menu" id={menuId} role="group" aria-label="选择要显示的模型">
          {options.map((o) => {
            const checked = visible.includes(o.id);
            const isLast = checked && visible.length === 1;
            return (
              <label key={o.id} className={isLast ? 'picker-item disabled' : 'picker-item'}>
                <input type="checkbox" checked={checked} disabled={isLast} onChange={() => toggle(o.id)} />
                <span className="picker-name">{o.name}</span>
                <code className="picker-model">{o.model}</code>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
