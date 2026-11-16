import { useId, type ReactNode } from 'react';

interface Props {
  text: string;
  /** 拿到气泡的 id，挂到里面可聚焦元素的 aria-describedby 上。 */
  children: (tipId: string) => ReactNode;
}

/** 悬停或键盘聚焦时显示说明气泡。 */
export function Tip({ text, children }: Props) {
  const id = useId();
  return (
    <span className="tip">
      {children(id)}
      <span role="tooltip" id={id} className="tip-bubble">
        {text}
      </span>
    </span>
  );
}
