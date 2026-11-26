import type { CSSProperties } from 'react';

/** 固定的微弱环境微粒：只提供空间纵深，移动端与 reduced-motion 下由 CSS 隐藏 */
const SPECKS = [
  { left: 8, top: 24, dur: 22, delay: 0 },
  { left: 17, top: 68, dur: 26, delay: 4 },
  { left: 26, top: 38, dur: 19, delay: 9 },
  { left: 34, top: 79, dur: 24, delay: 2 },
  { left: 43, top: 18, dur: 27, delay: 12 },
  { left: 51, top: 57, dur: 21, delay: 6 },
  { left: 59, top: 31, dur: 25, delay: 15 },
  { left: 68, top: 72, dur: 20, delay: 3 },
  { left: 76, top: 44, dur: 28, delay: 10 },
  { left: 84, top: 21, dur: 23, delay: 7 },
  { left: 91, top: 62, dur: 26, delay: 13 },
  { left: 96, top: 36, dur: 24, delay: 5 },
] as const;

export default function AmbientDust({ className = '' }: { className?: string }) {
  return (
    <div className={`ambient-dust ${className}`} aria-hidden="true">
      {SPECKS.map((p, i) => (
        <i
          key={i}
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            '--dust-duration': `${p.dur}s`,
            '--dust-delay': `${p.delay}s`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}
