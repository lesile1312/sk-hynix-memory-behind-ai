import { useEffect, useRef } from 'react';

/** 顶部滚动进度指示条：rAF 驱动，只改 transform，不触发 React 状态更新 */
export default function ProgressBar() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let scheduled = false;
    const update = () => {
      scheduled = false;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (!scheduled) {
        scheduled = true;
        raf = requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-px bg-white/5">
      <div
        ref={barRef}
        className="h-full origin-left bg-gradient-to-r from-ice/25 via-ice/70 to-silver/90"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  );
}
