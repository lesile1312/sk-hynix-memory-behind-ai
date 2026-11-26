import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Reveal from './Reveal';
import SectionLabel from './SectionLabel';
import { MEDIA } from '../config';
import { EASE, SCRUB } from '../motion';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useMotionProfile } from '../hooks/useMotionProfile';

gsap.registerPlugin(ScrollTrigger);

/** 横向技术叙事：计算 → 存储 → 带宽 → 智能，用信号线连接，不写任何数字指标 */
const CHAIN = [
  { en: 'COMPUTE', zh: '计算', note: '算力的起点' },
  { en: 'MEMORY', zh: '存储', note: '数据的居所' },
  { en: 'BANDWIDTH', zh: '带宽', note: '流动的通道' },
  { en: 'INTELLIGENCE', zh: '智能', note: '最终的结果' },
] as const;

/** 02 INTRODUCTION — 智能时代的底层力量（标题 + 宽幅视觉 + 技术叙事链） */
export default function SectionIntro() {
  const ref = useRef<HTMLElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const imageMaskRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const railFillRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { parallaxScale } = useMotionProfile();

  useLayoutEffect(() => {
    if (reduced || !ref.current) return;
    const ctx = gsap.context(() => {
      /* 背景描边英文随滚动视差；移动端幅度减半 */
      gsap.fromTo(wordRef.current, { y: 90 * parallaxScale }, {
        y: -60 * parallaxScale,
        ease: EASE.linear,
        scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: SCRUB.slow },
      });
      /* PART 04 网格极轻微漂移：只动 transform，移动端已由 motionProfile 减半 */
      gsap.fromTo(gridRef.current, { y: -22 * parallaxScale, x: 8 * parallaxScale }, {
        y: 22 * parallaxScale, x: -8 * parallaxScale, ease: EASE.linear,
        scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: SCRUB.slow },
      });
      /* 宽幅视觉：遮罩揭示 + 缓慢推进 + 视差 + 透明度渐变 */
      gsap.fromTo(imageMaskRef.current, { clipPath: 'inset(14% 0% 0% 0%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', ease: EASE.image,
        scrollTrigger: { trigger: imageMaskRef.current, start: 'top 92%', end: 'top 52%', scrub: SCRUB.normal },
      });
      gsap.fromTo(imageRef.current, { scale: 1.1, yPercent: -3, opacity: 0.55 }, {
        scale: 1, yPercent: 3, opacity: 1, ease: EASE.linear,
        scrollTrigger: { trigger: imageRef.current, start: 'top bottom', end: 'bottom top', scrub: SCRUB.normal },
      });
      /* PART 04 技术线路：底层 rail 展开 + 冰蓝进度线逐段延伸 */
      gsap.fromTo(railRef.current, { scaleX: 0.55, opacity: 0.25 }, {
        scaleX: 1, opacity: 1, ease: EASE.linear,
        scrollTrigger: { trigger: railRef.current, start: 'top 90%', end: 'top 42%', scrub: SCRUB.normal },
      });
      gsap.fromTo(railFillRef.current, { scaleX: 0 }, {
        scaleX: 1, ease: EASE.line,
        scrollTrigger: { trigger: railRef.current, start: 'top 88%', end: 'top 40%', scrub: SCRUB.normal },
      });
      /* 四个节点依次点亮：用同一滚动进度，stagger 造成逐段到位 */
      gsap.fromTo('[data-chain-node]', { opacity: 0.2 }, {
        opacity: 1, stagger: 0.16, ease: EASE.line,
        scrollTrigger: { trigger: railRef.current, start: 'top 88%', end: 'top 38%', scrub: SCRUB.normal },
      });
    }, ref);
    return () => ctx.revert();
  }, [reduced, parallaxScale]);

  return (
    <section id="introduction" ref={ref} className="relative overflow-hidden"
             style={{ paddingBlock: 'var(--section-y)', paddingInline: 'var(--gutter)' }}>
      {/* 背景描边大字：排版装饰，偏右上 */}
      <div ref={wordRef} aria-hidden="true"
           className="outline-word font-display pointer-events-none absolute -right-[4%] top-[4%] select-none leading-none"
           style={{ fontSize: 'clamp(7rem, 22vw, 20rem)' }}>
        INTEL
      </div>
      {/* PART 04 网格漂移层：独立 transform，不与内容争抢属性 */}
      <div ref={gridRef} className="tech-grid pointer-events-none absolute -inset-[8%] opacity-40" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-[1500px]">
        {/* ---------- 上：标题 + 中文主题（非对称双栏） ---------- */}
        <div className="grid gap-[clamp(2rem,5vw,5rem)] lg:grid-cols-12">
          <div className="lg:col-span-6">
            <Reveal preset="label">
              <SectionLabel no="03" en="THE FOUNDATION OF INTELLIGENCE" zh="智能时代的底层力量" />
            </Reveal>
            <Reveal preset="title" delay={0.12} className="mt-[clamp(2rem,5vw,4rem)]">
              <h2 className="font-display font-light leading-[0.98] text-paper"
                  style={{ fontSize: 'clamp(2.5rem, 4.2vw, 4.2rem)' }}>
                <span className="block whitespace-nowrap">THE FOUNDATION</span>
                <br />
                <span className="block whitespace-nowrap italic text-ice">OF INTELLIGENCE.</span>
              </h2>
            </Reveal>
            <Reveal preset="rule" delay={0.42} className="mt-[clamp(2rem,4vw,3rem)]">
              <div className="hairline w-[clamp(3rem,8vw,8rem)]" aria-hidden="true" />
            </Reveal>
          </div>

          <div className="lg:col-span-5 lg:col-start-8 lg:pt-[clamp(4rem,10vw,10rem)]">
            <Reveal preset="cnTitle" delay={0.24}>
              <h3 className="cn-title whitespace-nowrap text-paper" style={{ fontSize: 'clamp(1.5rem, 3.1vw, 2.6rem)' }}>
                智能时代的底层力量。
              </h3>
            </Reveal>
            <Reveal preset="body" delay={0.36} staggerSelector="[data-segment]"
                    className="mt-[clamp(1.5rem,3vw,2.5rem)]">
              <p className="max-w-xl leading-[2.1] text-muted" style={{ fontSize: 'var(--body)' }}>
                <span data-segment className="block">每一次人工智能的突破，</span>
                <span data-segment className="block">都离不开高速数据处理与先进内存技术的支撑。</span>
              </p>
            </Reveal>
            <Reveal preset="label" delay={0.5} className="mt-[clamp(2rem,4vw,3.5rem)]">
              <div className="flex items-center gap-4">
                <span className="h-px w-12 bg-line" aria-hidden="true" />
                <span className="tech-tag font-label text-[clamp(0.6rem,0.75vw,0.7rem)] tracking-[0.28em] text-silver/70">
                  MEMORY · SPEED · FUTURE
                </span>
              </div>
            </Reveal>
          </div>
        </div>

        {/* ---------- 中：宽幅视觉（数据中心远景 / 视觉示意） ---------- */}
        <Reveal preset="stage" delay={0.2} className="mt-[clamp(3rem,7vw,6rem)]">
          <figure className="stage-frame relative aspect-[16/8] w-full overflow-hidden sm:aspect-[16/7]">
            <div ref={imageMaskRef} className="img-parallax absolute inset-0" style={{ clipPath: reduced ? 'none' : undefined }}>
              <img ref={imageRef} src={MEDIA.sceneDataCenter} alt="AI 数据中心机柜走廊的宽幅视觉示意"
                   draggable={false}
                   className="absolute inset-0 h-full w-full object-cover will-change-transform" />
            </div>
            {/* 冷色渐变 + 暗角，让图片融入深色章节 */}
            <div className="pointer-events-none absolute inset-0"
                 style={{ background: 'linear-gradient(to top, rgba(5,5,7,0.82) 0%, rgba(5,5,7,0.12) 42%, rgba(5,5,7,0.28) 100%)' }}
                 aria-hidden="true" />
            <div className="pointer-events-none absolute inset-0"
                 style={{ background: 'radial-gradient(ellipse 78% 80% at 50% 50%, transparent 40%, rgba(5,5,7,0.7) 100%)' }}
                 aria-hidden="true" />
            <div className="film-grain pointer-events-none absolute inset-0" aria-hidden="true" />
            <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-[clamp(1rem,2.5vw,2rem)]">
              <span className="font-label text-[clamp(0.6rem,0.78vw,0.72rem)] tracking-[0.2em] text-paper/85">
                WHERE INTELLIGENCE LIVES · 智能发生的地方
              </span>
              <span className="hidden font-label text-[clamp(0.52rem,0.66vw,0.62rem)] tracking-[0.16em] text-muted/70 sm:block">
                VISUAL CONCEPT · 视觉示意
              </span>
            </figcaption>
          </figure>
        </Reveal>

        {/* ---------- 下：COMPUTE → MEMORY → BANDWIDTH → INTELLIGENCE 叙事链 ---------- */}
        <Reveal preset="label" delay={0.1} className="mt-[clamp(3.5rem,7vw,6rem)]">
          <div className="mb-[clamp(2rem,4vw,3rem)] flex items-center gap-4">
            <span className="eyebrow">FROM SILICON TO INTELLIGENCE</span>
            <span className="h-px flex-1 bg-line" aria-hidden="true" />
            <span className="tech-tag text-[0.7rem] tracking-[0.18em] text-muted">从硅片到智能</span>
          </div>
        </Reveal>

        <div ref={railRef} className="relative mx-auto mt-8 h-px w-full origin-left will-change-transform"
             aria-hidden="true">
          <div className="h-px w-full bg-line" />
          <div ref={railFillRef} data-rail-fill className="absolute inset-x-0 top-0 h-px origin-left bg-ice/70 will-change-transform"
               style={{ transform: reduced ? 'scaleX(1)' : 'scaleX(0)' }} />
          <div className="signal-sweep absolute inset-x-0 top-0 h-px" />
          {CHAIN.map((c, i) => {
            const pos = (i / (CHAIN.length - 1)) * 100;
            const shift = i === 0 ? 'translateX(0)' : i === CHAIN.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)';
            return (
              <div key={c.en} data-chain-node className="absolute top-0" style={{ left: `${pos}%`, opacity: reduced ? 1 : undefined }}>
                <span className="absolute -top-[3px] left-0 h-[7px] w-[7px] -translate-x-1/2 rounded-full bg-ice/85" />
                <span style={{ transform: shift }}
                      className="absolute left-0 top-5 whitespace-nowrap text-center font-label text-[clamp(0.6rem,0.78vw,0.74rem)] tracking-[0.18em] text-paper/90">
                  {c.en}
                </span>
                <span style={{ transform: shift }}
                      className="absolute left-0 top-[2.5rem] whitespace-nowrap text-center text-[clamp(0.68rem,0.86vw,0.8rem)] text-ice/80">
                  {c.zh}
                </span>
                <span style={{ transform: shift }}
                      className="absolute left-0 top-[4rem] hidden whitespace-nowrap text-center text-[clamp(0.58rem,0.72vw,0.68rem)] text-muted/70 sm:block">
                  {c.note}
                </span>
              </div>
            );
          })}
        </div>
        {/* 叙事链的移动端点位需要高度占位，桌面端由绝对定位撑开 */}
        <div className="h-[7rem] sm:h-[6rem]" aria-hidden="true" />

        <Reveal preset="body" delay={0.2} className="mx-auto mt-[clamp(1rem,2vw,2rem)] max-w-2xl text-center">
          <p className="leading-[2] text-muted" style={{ fontSize: 'var(--body)' }}>
            计算提出需求，存储承接数据，带宽决定流动的速度——<br className="hidden sm:block" />
            三者共同托起智能的每一次前进。
          </p>
        </Reveal>
      </div>
    </section>
  );
}
