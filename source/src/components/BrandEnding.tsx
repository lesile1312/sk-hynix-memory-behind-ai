import { useLayoutEffect, useRef } from 'react';
import { ArrowUp } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Reveal from './Reveal';
import SectionLabel from './SectionLabel';
import { MEDIA } from '../config';
import { EASE, SCRUB } from '../motion';
import { useReducedMotion } from '../hooks/useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

/** 六段主叙事的收束标记，仅作章节索引，不新增导航项 */
const CHAPTERS = ['01', '02', '03', '04', '05', '06'] as const;

/** 06 BRAND ENDING — 回归纯黑，品牌信息与主题句克制收尾 */
export default function BrandEnding() {
  const ref = useRef<HTMLElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const beamRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const convergeRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    if (reduced || !ref.current) return;
    const ctx = gsap.context(() => {
      /* 远景视觉主体缓慢推进，形成镜头收束感 */
      gsap.fromTo('[data-ending-visual]', { scale: 1.08, opacity: 0.35 }, {
        scale: 1, opacity: 0.72, ease: EASE.linear,
        scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'center center', scrub: SCRUB.slow },
      });
      /* 背景由上一屏自然压暗 */
      gsap.fromTo(ref.current, { opacity: 0.86 }, {
        opacity: 1, ease: EASE.linear,
        scrollTrigger: { trigger: ref.current, start: 'top 95%', end: 'top 35%', scrub: SCRUB.tight },
      });
      gsap.fromTo(glowRef.current, { scale: 0.8, opacity: 0.15 }, {
        scale: 1.12, opacity: 0.5, ease: EASE.linear,
        scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom bottom', scrub: SCRUB.slow },
      });
      gsap.fromTo(beamRef.current, { scaleY: 0.45, opacity: 0.1 }, {
        scaleY: 1, opacity: 0.55, ease: EASE.linear,
        scrollTrigger: { trigger: ref.current, start: 'top 80%', end: 'center 45%', scrub: SCRUB.normal },
      });
      gsap.fromTo(markRef.current, { y: 16, opacity: 0.82 }, {
        y: 0, opacity: 1, ease: EASE.linear,
        scrollTrigger: { trigger: markRef.current, start: 'top 92%', end: 'top 55%', scrub: SCRUB.normal },
      });
      /* PART 07 Logo 由模糊到清晰，与品牌落款同步 */
      gsap.fromTo(logoRef.current, { filter: 'blur(12px)', opacity: 0 }, {
        filter: 'blur(0px)', opacity: 1, ease: EASE.cinematic,
        scrollTrigger: { trigger: markRef.current, start: 'top 90%', end: 'top 42%', scrub: SCRUB.normal },
      });
      /* PART 07 冰蓝光线横向收束：从中线向两侧退去，留下品牌标识 */
      gsap.fromTo(convergeRef.current, { scaleX: 1, opacity: 0.5 }, {
        scaleX: 0, opacity: 0, ease: EASE.camera,
        scrollTrigger: { trigger: markRef.current, start: 'top 96%', end: 'top 50%', scrub: SCRUB.normal },
      });
    }, ref);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section
      id="ending"
      ref={ref}
      className="ending-section relative flex flex-col items-center justify-center overflow-hidden text-center"
      style={{
        paddingTop: 'var(--section-y)',
        paddingBottom: 'calc(var(--section-y) + clamp(3rem, 5vw, 5rem))',
        paddingInline: 'var(--gutter)',
      }}
      aria-labelledby="ending-title"
      data-ending-section=""
    >
      {/* 顶部承接过渡 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40" aria-hidden="true"
           style={{ background: 'linear-gradient(to bottom, rgba(5,5,7,0.95), transparent)' }} />

      {/* 远景视觉主体：一颗chip在暗场中被光柱照亮，缓慢推进（视觉示意） */}
      <div data-ending-visual className="pointer-events-none absolute inset-0 overflow-hidden will-change-transform"
           aria-hidden="true">
        <img src={MEDIA.sceneHorizon} alt="" draggable={false}
             className="absolute inset-0 h-full w-full scale-[1.05] object-cover opacity-60" />
        <div className="absolute inset-0"
             style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 55%, transparent 0%, rgba(5,5,7,0.72) 58%, var(--void) 100%)' }} />
      </div>

      {/* 中央垂直光束：克制的收尾光感 */}
      <div ref={beamRef} className="pointer-events-none absolute left-1/2 top-0 h-full w-px origin-top -translate-x-1/2 will-change-transform"
           aria-hidden="true"
           style={{ background: 'linear-gradient(to bottom, transparent, rgba(156,203,235,0.32) 42%, rgba(156,203,235,0.05) 78%, transparent)' }} />
      {/* 冰蓝光晕：轻量装饰 */}
      <div ref={glowRef} className="pointer-events-none absolute left-1/2 top-1/2 h-[60vw] max-h-[780px] w-[60vw] max-w-[780px] -translate-x-1/2 -translate-y-1/2 rounded-full will-change-transform"
           aria-hidden="true"
           style={{ background: 'radial-gradient(circle, rgba(156,203,235,0.09) 0%, rgba(156,203,235,0.025) 38%, transparent 70%)' }} />

      <div className="relative mx-auto w-full max-w-5xl">
        <Reveal preset="label" className="flex justify-center">
          <SectionLabel no="06" en="BEYOND THE FUTURE" zh="品牌收尾" />
        </Reveal>

        <Reveal preset="title" delay={0.14} className="mt-[clamp(2.5rem,6vw,5rem)]">
          <h2 id="ending-title" className="font-display font-light leading-[0.98] text-paper"
              style={{ fontSize: 'var(--title-lg)' }}>
            BEYOND
            <br />
            <span className="italic text-ice">THE FUTURE.</span>
          </h2>
        </Reveal>

        <Reveal preset="cnTitle" delay={0.28} className="mt-[clamp(2rem,4vw,3.5rem)]">
          <h3 className="cn-title text-paper" style={{ fontSize: 'var(--title-md)' }}>
            AI 背后的<span className="text-ice">记忆。</span>
          </h3>
        </Reveal>

        <Reveal preset="body" delay={0.38} className="mt-[clamp(1.5rem,3vw,2.5rem)]">
          <p className="leading-[2.1] tracking-[0.1em] text-muted" style={{ fontSize: 'var(--body)' }}>
            让智能，拥有更强大的记忆。
          </p>
        </Reveal>

        {/* 章节收束索引：与前五段形成呼应，不改变导航结构 */}
        <Reveal preset="label" delay={0.48} className="mt-[clamp(2.5rem,5vw,4rem)] flex flex-col items-center gap-3">
          <div className="flex w-[clamp(9rem,22vw,16rem)] items-center gap-px" aria-hidden="true">
            {CHAPTERS.map((c, i) => (
              <span key={c} className={`h-px flex-1 ${i === CHAPTERS.length - 1 ? 'bg-ice/80' : 'bg-line'}`} />
            ))}
          </div>
          <span className="font-label text-[clamp(0.55rem,0.7vw,0.66rem)] tracking-[0.28em] text-muted/55">
            CHAPTER 06 / 06
          </span>
        </Reveal>

        <div ref={markRef} className="relative mt-[clamp(3rem,7vw,6rem)] flex flex-col items-center gap-6 will-change-transform">
          {/* PART 07 横向光线收束：两侧向中线汇聚后消失。外层定位，内层只做 scaleX */}
          <div className="pointer-events-none absolute inset-x-0 top-[-1.5rem] flex justify-center" aria-hidden="true">
            <div ref={convergeRef} className="h-px w-[min(80vw,52rem)] origin-center bg-gradient-to-r from-transparent via-ice/70 to-transparent will-change-transform"
                 style={{ transform: reduced ? 'scaleX(0)' : undefined }} />
          </div>
          <div className="hairline w-[clamp(3rem,8vw,7rem)]" aria-hidden="true" />
          {MEDIA.logo ? (
            <img ref={logoRef} src={MEDIA.logo} alt="SK hynix" className="h-9 w-auto sm:h-10"
                 style={{ filter: reduced ? 'none' : undefined, opacity: reduced ? 1 : undefined }} />
          ) : (
            /* 官方 Logo 素材缺失：只用标准字，不绘制仿制商标 */
            <span className="font-label text-[clamp(1rem,1.6vw,1.35rem)] font-medium tracking-[0.24em] text-paper">
              SK hynix
            </span>
          )}
          <span className="font-label text-[clamp(0.62rem,0.85vw,0.8rem)] tracking-[0.22em] text-silver/70">
            THE MEMORY <span className="italic text-ice">BEHIND AI.</span>
          </span>
        </div>
      </div>

      <footer className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-3 px-[var(--gutter)] pb-[clamp(1.25rem,2.5vw,2rem)] text-[clamp(0.55rem,0.7vw,0.68rem)] tracking-[0.16em] text-muted/50">
        <span>© 2026 SK hynix — 概念品牌体验</span>
        <span className="hidden md:inline">HBM · 高带宽内存</span>
        <a href="#hero" className="inline-flex items-center gap-2 text-muted/70 transition-colors duration-300 hover:text-ice"
           aria-label="返回页面顶部">
          返回顶部 <ArrowUp size={12} strokeWidth={1.4} aria-hidden="true" />
        </a>
      </footer>
    </section>
  );
}
