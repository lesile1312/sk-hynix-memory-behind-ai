import { useEffect, useRef, useState } from 'react';

/**
 * 全站指针微交互（PART 09）
 * - 自定义光标：仅桌面且支持 hover 的精确指针设备启用；触摸设备保持原生操作
 * - 光标层 pointer-events: none，永不遮挡按钮或影响点击区域
 * - 磁吸按钮：仅对标记 data-magnetic 的元素生效，最大位移 6px，离开即弹性归位
 * - 全程只改 transform / opacity，单个 rAF，不触发 React 每帧重渲染
 */
export default function PointerFX() {
  const [enabled, setEnabled] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const wide = window.matchMedia('(min-width: 769px)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    /* 三重门槛：精确指针 + 桌面宽度 + 正常动效；触摸与窄屏保持原生操作 */
    const sync = () => setEnabled(fine.matches && wide.matches && !reduced.matches);
    sync();
    fine.addEventListener('change', sync);
    wide.addEventListener('change', sync);
    reduced.addEventListener('change', sync);
    return () => {
      fine.removeEventListener('change', sync);
      wide.removeEventListener('change', sync);
      reduced.removeEventListener('change', sync);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.setAttribute('data-custom-cursor', 'on');

    let raf = 0;
    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const dot = { x: mouse.x, y: mouse.y };
    const ring = { x: mouse.x, y: mouse.y };
    let hovering = false;
    let magnetEl: HTMLElement | null = null;

    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      const target = e.target as HTMLElement | null;
      const interactive = target?.closest('a, button, [data-cursor="focus"], input, select, textarea');
      hovering = !!interactive;

      /* 磁吸：只对显式标记的元素生效 */
      const next = (target?.closest('[data-magnetic]') as HTMLElement | null) ?? null;
      if (magnetEl && magnetEl !== next) {
        magnetEl.style.transform = '';
        magnetEl = null;
      }
      if (next) {
        const r = next.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        next.style.transform = `translate(${dx * 0.16}px, ${dy * 0.16}px)`;
        magnetEl = next;
      }
    };
    const onLeave = () => {
      hovering = false;
      if (magnetEl) { magnetEl.style.transform = ''; magnetEl = null; }
    };
    const onDown = () => { document.documentElement.setAttribute('data-cursor-state', 'down'); };
    const onUp = () => { document.documentElement.setAttribute('data-cursor-state', ''); };

    const tick = () => {
      dot.x += (mouse.x - dot.x) * 0.42;
      ring.x += (mouse.x - ring.x) * 0.16;
      ring.y += (mouse.y - ring.y) * 0.16;
      dot.y += (mouse.y - dot.y) * 0.42;
      if (dotRef.current) dotRef.current.style.transform = `translate3d(${dot.x}px, ${dot.y}px, 0) translate(-50%, -50%)`;
      if (ringRef.current) ringRef.current.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      if (magnetEl) magnetEl.style.transform = '';
      document.documentElement.removeAttribute('data-custom-cursor');
      document.documentElement.removeAttribute('data-cursor-state');
    };
  }, [enabled]);

  /* 悬停态通过属性驱动 CSS，避免在 rAF 里反复写 class */
  useEffect(() => {
    if (!enabled) return;
    const set = (on: boolean) => document.documentElement.setAttribute('data-cursor-hover', on ? 'on' : '');
    const enter = (e: PointerEvent) => set(!!(e.target as HTMLElement)?.closest?.('a, button, [data-cursor="focus"]'));
    const leave = (e: PointerEvent) => {
      if (!(e.relatedTarget as HTMLElement)?.closest?.('a, button, [data-cursor="focus"]')) set(false);
    };
    document.addEventListener('pointerover', enter);
    document.addEventListener('pointerout', leave);
    return () => {
      document.removeEventListener('pointerover', enter);
      document.removeEventListener('pointerout', leave);
      document.documentElement.removeAttribute('data-cursor-hover');
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div className="cursor-layer" aria-hidden="true">
      <div ref={ringRef} className="cursor-ring" />
      <div ref={dotRef} className="cursor-dot" />
    </div>
  );
}
