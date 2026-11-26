import { useLayoutEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { REVEALS, type RevealPreset } from '../motion';
import { useReducedMotion } from '../hooks/useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** 信息层级预设；组件内不再手写一套 ease/duration */
  preset?: RevealPreset;
  /** 覆盖预设的局部参数，仅用于确有必要的情况 */
  y?: number;
  delay?: number;
  duration?: number;
  start?: string;
  /** 依次错开的子元素选择器（相对自身） */
  staggerSelector?: string;
  stagger?: number;
  /** 覆盖预设的遮罩揭示 */
  mask?: boolean;
}

/**
 * 通用滚动显现容器：只动 transform / opacity / clip-path / letter-spacing。
 * 不同 preset 对应不同位移、时长、起始点与错开节奏，避免全站同时淡入。
 */
export default function Reveal({
  children,
  className,
  preset = 'body',
  y,
  delay = 0,
  duration,
  start,
  staggerSelector,
  stagger,
  mask,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const spec = REVEALS[preset];
  /* 整页截图 / 静态验收用：?reveal=all 时跳过入场动画，内容直接可见。
     默认浏览不受影响，仍按滚动逐段揭示。 */
  const captureAll = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('reveal') === 'all';

  useLayoutEffect(() => {
    const el = ref.current;
    if (reduced || captureAll || !el) return;

    const offsetY = y ?? spec.y;
    const dur = duration ?? spec.duration;
    const st = start ?? spec.start;
    const staggerStep = stagger ?? spec.stagger;
    const useMask = mask ?? spec.mask ?? false;
    const targets = staggerSelector ? Array.from(el.querySelectorAll<HTMLElement>(staggerSelector)) : [el];
    if (!targets.length) return;

    const clearWillChange = () => { el.style.willChange = 'auto'; };
    const showImmediately = () => {
      gsap.set(targets, { opacity: 1, y: 0, clearProps: 'clipPath,letterSpacing' });
      clearWillChange();
    };

    let io: IntersectionObserver | null = null;
    let poll = 0;
    let visibleSince = 0;
    let settled = false;
    /* 首次计算样式时可能仍是动画前的 opacity:1，不能据此判定动画已完成并永久停轮询；
       要连续多次确认，且允许「曾显现又回滚」时立刻强制显示。 */
    let shownStreak = 0;
    let wasFullyVisible = false;

    /* 兜底节奏按真实动画总时长推导：先判断「停在起始状态」，再判断「动画卡住」。
       这样正常错开动画不被打断，ScrollTrigger / IO 失效时正文也不会永久隐藏。 */
    const maxStart = delay + (targets.length - 1) * staggerStep;
    const stuckAfter = Math.max(900, (maxStart + 0.15) * 1000);
    const doneAfter = Math.max(2600, (maxStart + dur + 0.25) * 1000);

    try {
      const ctx = gsap.context(() => {
        const from = {
          opacity: spec.fromOpacity,
          y: offsetY,
          ...(useMask ? { clipPath: 'inset(0% 0% 100% 0%)' } : {}),
          ...(spec.tracking ? { letterSpacing: spec.tracking[0] } : {}),
        };
        const to = {
          opacity: 1,
          y: 0,
          duration: dur,
          delay,
          ease: spec.ease,
          /* 一旦揭示就保持可见：避免刷新 / 回滚时把正文重新藏起来 */
          scrollTrigger: { trigger: el, start: st, toggleActions: 'play none none none' },
          onStart: () => {
            el.style.willChange = useMask ? 'transform, opacity, clip-path' : 'transform, opacity';
          },
          onComplete: clearWillChange,
          onReverseComplete: clearWillChange,
          ...(useMask ? { clipPath: 'inset(0% 0% 0% 0%)' } : {}),
          ...(spec.tracking ? { letterSpacing: spec.tracking[1] } : {}),
          ...(staggerSelector ? { stagger: staggerStep } : {}),
        };

        const tween = gsap.fromTo(targets, from, to);

        /* IntersectionObserver 只负责尽早打点；真正的可见性检查用轮询完成，
           避免 IO 回调在 3D / 视频占用主线程时迟到导致正文一直停在 opacity:0。 */
        io = new IntersectionObserver((entries) => {
          if (entries[0]?.isIntersecting) {
            if (!visibleSince) visibleSince = performance.now();
          } else {
            visibleSince = 0;
          }
        }, { threshold: 0.01 });
        io.observe(el);

        const checkVisibility = () => {
          if (settled) return;
          const rect = el.getBoundingClientRect();
          /* 与 reveal start 对齐：元素到达触发线之前不接管动画 */
          if (rect.top >= window.innerHeight * 0.84 || rect.bottom <= 0) {
            visibleSince = 0;
            return;
          }
          if (!visibleSince) visibleSince = performance.now();

          const opacities = targets.map(
            (target) => Number.parseFloat(window.getComputedStyle(target).opacity),
          );
          if (opacities.every((value) => value >= 0.85)) {
            wasFullyVisible = true;
            shownStreak += 1;
            if (shownStreak >= 3) {
              settled = true;
              window.clearInterval(poll);
            }
            return;
          }
          shownStreak = 0;

          /* 已经显现过又被回滚藏起来：立刻恢复，不再等动画 */
          if (wasFullyVisible) {
            settled = true;
            window.clearInterval(poll);
            tween.kill();
            showImmediately();
            return;
          }

          const elapsed = performance.now() - visibleSince;
          const stuckAtStart = opacities.every(
            (value) => value <= Math.max(spec.fromOpacity + 0.06, 0.3),
          );
          if ((elapsed >= stuckAfter && stuckAtStart) || elapsed >= doneAfter) {
            settled = true;
            window.clearInterval(poll);
            tween.kill();
            showImmediately();
          }
        };
        poll = window.setInterval(checkVisibility, 200);
        checkVisibility();
      }, ref);

      return () => {
        window.clearInterval(poll);
        io?.disconnect();
        ctx.revert();
        clearWillChange();
      };
    } catch {
      /* GSAP / ScrollTrigger 初始化异常：直接显示静态内容 */
      showImmediately();
      return () => {
        window.clearInterval(poll);
        io?.disconnect();
        clearWillChange();
      };
    }
  }, [reduced, captureAll, spec, y, delay, duration, start, staggerSelector, stagger, mask]);

  return <div ref={ref} className={className}>{children}</div>;
}
