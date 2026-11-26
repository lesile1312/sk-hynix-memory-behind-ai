import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronDown } from 'lucide-react';
import HeroVideo from './HeroVideo';
import AmbientDust from './AmbientDust';
import { MEDIA } from '../config';
import { DUR, EASE, SCRUB } from '../motion';
import { useReducedMotion } from '../hooks/useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

/** 桌面 / 移动端两档运镜幅度：移动端降低缩放、裁切与圆角，避免主体被切 */
const MOTION = {
  desktop: { midScale: 1.02, endScale: 1.06, midRadius: 18, endRadius: 28 },
  mobile: { midScale: 1.01, endScale: 1.03, midRadius: 12, endRadius: 18 },
} as const;

interface MotionConfig {
  midScale: number;
  endScale: number;
  midRadius: number;
  endRadius: number;
}

/**
 * 01 HERO — 电影级 Sticky 首屏（PHASE 03）
 * 外层 220svh 提供滚动行程；内层 sticky 铺满视口。
 * 滚动进度经 ScrollTrigger(rAF) 映射到 transform / opacity / border-radius：
 *   - 视频画框 scale 1 → 1.02 → 1.06，圆角 0 → 18 → 28px，形成悬浮画面
 *   - 不再逐帧动画 clip-path：全屏 clip-path 会强制每帧重绘，是首屏卡顿来源之一
 *   - 标题分层淡出，阴影渐显
 *   - 末段黑色覆盖层渐入，与 INTRODUCTION 无缝衔接
 */
export default function Hero() {
  const outerRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const blackoutRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const rimRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const captureAll = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('reveal') === 'all';

  /* PART 03 品牌开场：Logo 由模糊到清晰 → 标题分行遮罩 → 芯片暗中显现 → 辅助 → 提示
     时序遵循 Cinematic 档（整体约 2.2s），但任何一步失败都不会让内容永久隐藏。 */
  useLayoutEffect(() => {
    if (reduced || captureAll) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: EASE.out } });
      /* Logo reveal：轻微模糊 + 低透明度 → 清晰 */
      tl.fromTo('[data-hero="logo"]', { opacity: 0, filter: 'blur(12px)', scale: 1.06 },
          { opacity: 1, filter: 'blur(0px)', scale: 1, duration: 1.25, ease: EASE.cinematic }, 0.05)
        /* 芯片从暗部显现：视频画框只做 opacity / transform，不改视频素材 */
        .fromTo(stageRef.current, { opacity: 0.15, scale: 0.985, rotateX: 2.2 },
          { opacity: 1, scale: 1, rotateX: 0, duration: 2.1, ease: EASE.cinematic }, 0)
        /* 金属边缘轮廓光扫过一次 */
        .fromTo(rimRef.current, { opacity: 0 }, { opacity: 0.85, duration: 0.9, ease: EASE.soft }, 0.85)
        .to(rimRef.current, { opacity: 0.12, duration: 1.1, ease: EASE.soft }, 1.75)
        .fromTo('[data-hero="label"]', { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: DUR.label, ease: EASE.soft }, 0.5)
        /* 两行标题分别遮罩揭示：内层 span 从下方推入，行框裁切 */
        .fromTo('[data-hero="line-inner"]', { yPercent: 112 },
          { yPercent: 0, duration: 1.3, stagger: 0.18, ease: EASE.cinematic }, 0.55)
        .fromTo('[data-hero="line"]', { opacity: 0 },
          { opacity: 1, duration: 0.5, stagger: 0.18, ease: EASE.linear }, 0.55)
        .fromTo('[data-hero="sub"]', { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: DUR.body, ease: EASE.soft }, 1.3)
        .fromTo('[data-hero="aux"]', { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: DUR.body, ease: EASE.soft }, 1.5)
        .fromTo('[data-hero="hint"]', { opacity: 0 },
          { opacity: 1, duration: DUR.label }, 1.8);

      /* 兜底：软件渲染 / 后台标签页下 rAF 可能被节流，开场动画停在遮罩里会藏住标题。
         超时后强制所有开场元素到位，宁可少一帧动画也不能让正文不可见。 */
      const failSafe = window.setTimeout(() => {
        tl.progress(1);
      }, 4200);
      return () => window.clearTimeout(failSafe);
    }, outerRef);
    return () => ctx.revert();
  }, [reduced, captureAll]);

  /* 滚动驱动运镜：GSAP ticker 使用 requestAnimationFrame，不在 scroll 事件里批量改 DOM */
  useLayoutEffect(() => {
    if (reduced) return;
    const outer = outerRef.current;
    if (!outer) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      const build = (m: MotionConfig) => {
        const stage = stageRef.current;
        const shadow = shadowRef.current;
        const title = titleRef.current;
        const blackout = blackoutRef.current;
        const backdrop = backdropRef.current;
        if (!stage || !shadow || !title || !blackout) return;

        /* 不覆盖开场动画写入的 scale / opacity；滚动段从当前值继续推进 */
        gsap.set(stage, { borderRadius: 0 });
        gsap.set(shadow, { opacity: 0 });
        gsap.set(blackout, { opacity: 0 });

        const tl = gsap.timeline({
          defaults: { ease: EASE.linear },
          scrollTrigger: { trigger: outer, start: 'top top', end: 'bottom bottom', scrub: SCRUB.tight },
        });

        /* 第一段：轻推 2%，圆角 18px */
        tl.to(stage, {
          scale: m.midScale,
          borderRadius: m.midRadius,
          duration: 0.5,
        }, 0)
          /* 第二段：推进至 6%，圆角 28px */
          .to(stage, {
            scale: m.endScale,
            borderRadius: m.endRadius,
            duration: 0.5,
          }, 0.5)
          /* 标题平滑退场 */
          .to(title, { opacity: 0, y: -48, duration: 0.58 }, 0.02)
          /* 背景亮度与层次随镜头推进平滑变化（只动 opacity，不重排） */
          .to(backdrop, { opacity: 0.55, duration: 0.7 }, 0.05)
          /* 悬浮阴影随画框浮现 */
          .to(shadow, { opacity: 0.85, duration: 0.55 }, 0.2)
          /* 末段黑幕覆盖，衔接下一章节的纯黑背景 */
          .to(blackout, { opacity: 1, duration: 0.24 }, 0.76);
      };

      mm.add('(min-width: 769px)', () => build(MOTION.desktop));
      mm.add('(max-width: 768px)', () => build(MOTION.mobile));
      return () => mm.revert();
    }, outer);

    return () => ctx.revert();
  }, [reduced]);

  return (
    <section
      id="hero"
      ref={outerRef}
      className="relative hero-scroll"
      aria-label="THE MEMORY BEHIND AI"
    >
      <div className="sticky top-0 hero-stage overflow-hidden">
        {/* 氛围背板：视频透明区域透出电影级环境，不展示任何绿幕 */}
        <div ref={backdropRef} className="absolute inset-0 will-change-transform" aria-hidden="true">
          <img src={MEDIA.backdrop} alt="" draggable={false}
               className="h-full w-full scale-[1.06] object-cover"
               style={{ filter: 'blur(7px) brightness(0.32) saturate(0.9)' }} />
          <div className="absolute inset-0"
               style={{ background: 'radial-gradient(115% 85% at 68% 42%, rgba(5,5,7,0.12) 0%, rgba(5,5,7,0.74) 68%, var(--void) 100%)' }} />
          <AmbientDust />
        </div>

        {/* 悬浮阴影：滚动时从收缩画框后方浮现 */}
        <div ref={shadowRef} data-hero-shadow="" className="pointer-events-none absolute inset-[3%] will-change-transform"
             aria-hidden="true"
             style={{ boxShadow: '0 45px 140px 40px rgba(0,0,0,0.92)', opacity: 0 }} />

        {/* 视频画框：scale / border-radius / clip-path 三段式运镜 */}
        <div ref={stageRef} data-hero-stage="" className="absolute inset-0 will-change-transform"
             style={{ transformOrigin: 'center center' }}>
          <HeroVideo className="absolute inset-0" />

          {/* 金属边缘轮廓光：开场扫过一次，之后保留极弱余晖（纯 CSS 渐变，不额外渲染） */}
          <div ref={rimRef} className="pointer-events-none absolute inset-0" aria-hidden="true"
               style={{
                 opacity: reduced || captureAll ? 0.12 : 0,
                 boxShadow: 'inset 0 0 1px 1px rgba(156,203,235,0.55), inset 0 0 60px 2px rgba(156,203,235,0.1)',
                 background: 'linear-gradient(105deg, transparent 38%, rgba(156,203,235,0.06) 50%, transparent 62%)',
               }} />

          {/* 底部渐变蒙版：与后续纯黑自然融合 */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[38vh]" aria-hidden="true"
               style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(5,5,7,0.55) 46%, var(--void) 100%)' }} />
          {/* 轻微 Vignette 暗角 */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true"
               style={{ background: 'radial-gradient(ellipse 82% 78% at 50% 44%, transparent 42%, rgba(5,5,7,0.62) 100%)' }} />
          {/* 极弱胶片颗粒 */}
          <div className="film-grain pointer-events-none absolute inset-0" aria-hidden="true" />
        </div>

        {/* 可读性渐变（文字层之上不遮挡） */}
        <div className="pointer-events-none absolute inset-0 z-[5]" aria-hidden="true"
             style={{ background: 'linear-gradient(to top, rgba(5,5,7,0.86) 0%, rgba(5,5,7,0.44) 20%, rgba(5,5,7,0.08) 44%, transparent 62%)' }} />

        {/* 文字层：独立于视频画框，只做 opacity / transform */}
        <div ref={titleRef} data-hero-title="" className="relative z-10 mt-auto w-full will-change-transform"
             style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                      paddingInline: 'var(--gutter)', paddingBottom: 'clamp(5rem, 12vh, 9rem)' }}>
          <div data-hero="logo" className="mb-[clamp(0.9rem,1.8vw,1.4rem)] flex items-center gap-3"
               style={{ opacity: reduced || captureAll ? 1 : 0 }}>
            {MEDIA.logo ? (
              <img src={MEDIA.logo} alt="SK hynix" className="h-5 w-auto sm:h-6" draggable={false} />
            ) : (
              <span className="font-label text-sm tracking-[0.2em] text-silver/80">SK hynix</span>
            )}
            <span className="h-px w-6 bg-ice/40" aria-hidden="true" />
          </div>

          <div data-hero="label" className="mb-[clamp(1rem,2.5vw,2rem)] flex items-center gap-4"
               style={{ opacity: reduced || captureAll ? 1 : 0 }}>
            <span className="font-label text-[clamp(0.6rem,0.75vw,0.7rem)] tracking-[0.3em] text-silver/70">01</span>
            <span className="h-px w-10 bg-line" aria-hidden="true" />
            <span className="eyebrow">THE MEMORY BEHIND AI</span>
          </div>

          <h1 className="font-display font-light leading-[0.92]"
              style={{ fontSize: 'var(--title-xl)', letterSpacing: '-0.01em',
                       textShadow: '0 2px 30px rgba(5,5,7,0.92), 0 1px 8px rgba(5,5,7,0.7)' }}>
            <span data-hero="line" className="line-mask text-paper" style={{ opacity: reduced || captureAll ? 1 : 0 }}>
              <span data-hero="line-inner" style={{ transform: reduced || captureAll ? 'none' : undefined }}>THE MEMORY</span>
            </span>
            <span data-hero="line" className="line-mask italic text-silver" style={{ opacity: reduced || captureAll ? 1 : 0 }}>
              <span data-hero="line-inner" style={{ transform: reduced || captureAll ? 'none' : undefined }}>BEHIND AI.</span>
            </span>
          </h1>

          <p data-hero="sub" className="cn-title mt-[clamp(1rem,2vw,1.75rem)] text-paper"
             style={{ fontSize: 'clamp(1.35rem, 5.6vw, 3.25rem)', opacity: reduced || captureAll ? 1 : 0 }}>
            让智能，拥有更强大的记忆。
          </p>

          <div data-hero="aux" className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2"
               style={{ opacity: reduced || captureAll ? 1 : 0 }}>
            <span className="font-label text-[clamp(0.6rem,0.8vw,0.76rem)] tracking-[0.22em] text-ice/85">
              POWERING THE NEXT GENERATION OF INTELLIGENCE.
            </span>
            <span className="text-muted" style={{ fontSize: 'var(--body)', letterSpacing: '0.1em' }}>
              驱动下一代人工智能的核心存储技术。
            </span>
          </div>
        </div>

        {/* 底部滚动提示 */}
        <div data-hero="hint"
             className="absolute bottom-[clamp(1.5rem,5vh,3rem)] right-0 z-10 hidden flex-col items-end gap-3 md:flex"
             style={{ right: 'var(--gutter)', opacity: reduced || captureAll ? 1 : 0 }}>
          <span className="font-label text-[clamp(0.6rem,0.75vw,0.7rem)] tracking-[0.28em] text-muted">
            SCROLL TO EXPLORE · 向下探索
          </span>
          <span className="h-12 w-px bg-gradient-to-b from-line to-transparent" aria-hidden="true" />
          <ChevronDown className="scroll-drift h-4 w-4 text-ice" strokeWidth={1.5} aria-hidden="true" />
        </div>

        {/* 末段黑幕：覆盖首屏，让下一章节从纯黑无痕接续 */}
        <div ref={blackoutRef} data-hero-blackout="" className="pointer-events-none absolute inset-0 z-20 bg-void"
             style={{ opacity: reduced ? 0 : 0 }} aria-hidden="true" />
      </div>
    </section>
  );
}
