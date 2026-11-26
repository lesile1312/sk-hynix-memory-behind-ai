import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import AmbientDust from './AmbientDust';
import Reveal from './Reveal';
import SectionLabel from './SectionLabel';
import { MEDIA } from '../config';
import { EASE, SCRUB } from '../motion';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useMotionProfile } from '../hooks/useMotionProfile';

gsap.registerPlugin(ScrollTrigger);

/** 三个定性维度 —— 不编造任何未经核实的技术参数 */
const PILLARS = [
  {
    no: '01',
    en: 'THROUGHPUT',
    zh: '更高吞吐',
    desc: '让海量模型参数在计算单元之间持续流动。',
    tag: 'CONTINUOUS FLOW / 持续流动',
  },
  {
    no: '02',
    en: 'LATENCY',
    zh: '更低延迟',
    desc: '缩短数据等待的时间，让每一次推理更贴近实时。',
    tag: 'CLOSER TO REALTIME / 贴近实时',
  },
  {
    no: '03',
    en: 'DENSITY',
    zh: '更高密度',
    desc: '在有限的物理空间中，承载不断增长的智能需求。',
    tag: 'MORE IN LESS / 以小承载',
  },
] as const;

/** 统一 9s 周期，三条数据流只错开相位，不各跑各的速度 */
const LINES = [
  { top: '24%', delay: '0s' },
  { top: '48%', delay: '3s' },
  { top: '72%', delay: '6s' },
] as const;

/** 叙事链：从芯片技术过渡到基础设施，不使用数字化指标 */
const CHAIN = [
  { label: 'HBM', sub: '芯片技术', pos: 2 },
  { label: 'MEMORY SYSTEM', sub: '存储系统', pos: 50 },
  { label: 'AI INFRASTRUCTURE', sub: '智能基础设施', pos: 98 },
] as const;

/** 05 AI INFRASTRUCTURE — 从内存技术升至 AI 基础设施叙事 */
export default function AiInfrastructure() {
  const ref = useRef<HTMLElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const outlineRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { parallaxScale } = useMotionProfile();

  useLayoutEffect(() => {
    if (reduced || !ref.current) return;
    const ctx = gsap.context(() => {
      /* 主体缓慢上移，与背景描边大字形成反向视差；移动端幅度减半 */
      gsap.fromTo(coreRef.current, { y: 46 * parallaxScale }, {
        y: -34 * parallaxScale,
        ease: EASE.linear,
        scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: SCRUB.normal },
      });
      gsap.fromTo(outlineRef.current, { y: -26 * parallaxScale }, {
        y: 38 * parallaxScale,
        ease: EASE.linear,
        scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: SCRUB.slow },
      });
      /* PART 06 场景缓慢镜头推进：双幅视觉整体轻微 scale，制造从芯片到机房的过渡感 */
      gsap.fromTo(sceneRef.current, { scale: 1.035, opacity: 0.82 }, {
        scale: 1, opacity: 1, ease: EASE.image,
        scrollTrigger: { trigger: sceneRef.current, start: 'top bottom', end: 'top 35%', scrub: SCRUB.slow },
      });
      /* 叙事链随进入视口展开 */
      gsap.fromTo(railRef.current, { scaleX: 0.68, opacity: 0.3 }, {
        scaleX: 1, opacity: 1, ease: EASE.linear,
        scrollTrigger: { trigger: railRef.current, start: 'top 88%', end: 'top 45%', scrub: SCRUB.normal },
      });
      gsap.fromTo('[data-infra-node]', { opacity: 0.25 }, {
        opacity: 1, stagger: 0.16, ease: EASE.line,
        scrollTrigger: { trigger: railRef.current, start: 'top 88%', end: 'top 42%', scrub: SCRUB.normal },
      });
    }, ref);
    return () => ctx.revert();
  }, [reduced, parallaxScale]);

  return (
    <section
      id="infrastructure"
      ref={ref}
      className="relative overflow-hidden"
      style={{ paddingBlock: 'var(--section-y)', paddingInline: 'var(--gutter)' }}
      aria-labelledby="infrastructure-title"
      data-infra-section=""
    >
      {/* 背景描边大字：排版装饰，不是参数或结构示意 */}
      <div ref={outlineRef} className="outline-word pointer-events-none absolute inset-x-0 top-[6%] select-none overflow-hidden will-change-transform"
           aria-hidden="true">
        <div className="whitespace-nowrap text-center font-display font-light uppercase leading-none"
             style={{ fontSize: 'clamp(4.5rem, 16vw, 16rem)', letterSpacing: '0.02em' }}>
          INFRASTRUCTURE
        </div>
      </div>

      {/* 空间层：网格 + 数据流 + 暗角 + 极弱微粒 */}
      <div className="tech-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      {LINES.map((l) => (
        <div key={l.top} aria-hidden="true" className="pointer-events-none absolute inset-x-0 h-px"
             style={{ top: l.top }}>
          <div className="line-flow h-px w-full" style={{ animationDelay: l.delay }} />
          {/* PART 06 冰蓝数据粒子沿线移动，三条错开相位 */}
          <div className="data-particle" style={{ top: -1, animationDelay: l.delay }} />
          <div className="data-particle" style={{ top: -1, animationDelay: l.delay, animationDuration: '8.5s' }} />
        </div>
      ))}
      <AmbientDust />
      <div className="pointer-events-none absolute inset-0" aria-hidden="true"
           style={{ background: 'radial-gradient(85% 65% at 50% 45%, transparent 22%, rgba(5,5,7,0.9) 100%)' }} />

      <div ref={coreRef} className="relative mx-auto w-full max-w-[1500px] will-change-transform">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal preset="label" className="flex justify-center">
            <SectionLabel no="05" en="POWERING THE AI ERA" zh="AI 基础设施" />
          </Reveal>
          <Reveal preset="title" delay={0.12} className="mt-[clamp(2rem,5vw,4rem)]">
            <h2 id="infrastructure-title" className="font-display font-light leading-[0.98] text-paper"
                style={{ fontSize: 'var(--title-lg)' }}>
              POWERING
              <br />
              <span className="italic text-ice">THE AI ERA.</span>
            </h2>
          </Reveal>
          <Reveal preset="cnTitle" delay={0.24} className="mt-[clamp(2rem,4vw,3rem)]">
            <h3 className="cn-title text-paper" style={{ fontSize: 'var(--title-md)' }}>
              存储，是智能的基石。
            </h3>
          </Reveal>
          <Reveal preset="body" delay={0.36} staggerSelector="[data-segment]"
                  className="mt-[clamp(1.5rem,3vw,2.5rem)]">
            <p className="mx-auto max-w-2xl leading-[2.1] text-muted" style={{ fontSize: 'var(--body)' }}>
              <span data-segment className="block">从数据中心到边缘设备，每一次人工智能的突破，</span>
              <span data-segment className="block">都离不开高速、稳定且持续进化的内存技术。</span>
            </p>
          </Reveal>
        </div>

        {/* 叙事链：HBM → 存储系统 → AI 基础设施 */}
        <div ref={railRef} className="relative mx-auto mt-[clamp(3rem,6vw,5rem)] h-px w-full max-w-3xl origin-left will-change-transform"
             aria-hidden="true">
          <div className="h-px w-full bg-line" />
          <div className="signal-sweep absolute inset-x-0 top-0 h-px" />
          {CHAIN.map((c, i) => {
            /* 两端标签向内对齐，避免移动端被裁切 */
            const shift = i === 0 ? 'translateX(0)' : i === CHAIN.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)';
            return (
              <div key={c.label} data-infra-node className="absolute top-0" style={{ left: `${c.pos}%`, opacity: reduced ? 1 : undefined }}>
                <span className={`absolute -top-[3px] left-0 h-[7px] w-[7px] -translate-x-1/2 rounded-full ${i === CHAIN.length - 1 ? 'bg-ice' : 'bg-silver/55'}`} />
                <span style={{ transform: shift }}
                      className="absolute left-0 top-4 whitespace-nowrap text-center font-label text-[clamp(0.58rem,0.75vw,0.72rem)] tracking-[0.18em] text-silver/85">
                  {c.label}
                </span>
                <span style={{ transform: shift }}
                      className="absolute left-0 top-[2.1rem] whitespace-nowrap text-center text-[clamp(0.62rem,0.8vw,0.74rem)] tracking-[0.1em] text-muted/70">
                  {c.sub}
                </span>
              </div>
            );
          })}
        </div>

        {/* 双幅场景视觉：服务器内部 + 芯片微距，尺寸对比形成叙事节奏（视觉示意） */}
        <div ref={sceneRef} className="mx-auto mt-[clamp(3.5rem,7vw,6rem)] grid max-w-6xl gap-[clamp(1rem,2.5vw,2rem)] will-change-transform md:grid-cols-5">
          <Reveal preset="stage" className="md:col-span-3">
            <figure className="stage-frame relative aspect-[16/10] w-full overflow-hidden">
              <img src={MEDIA.sceneServer} alt="AI 服务器内部计算与存储模组的视觉示意" draggable={false}
                   className="absolute inset-0 h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-0"
                   style={{ background: 'linear-gradient(to top, rgba(5,5,7,0.7), transparent 55%)' }} aria-hidden="true" />
              <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 p-[clamp(0.9rem,2vw,1.5rem)]">
                <span className="font-label text-[clamp(0.58rem,0.72vw,0.68rem)] tracking-[0.18em] text-paper/85">
                  COMPUTE & MEMORY · 计算与存储
                </span>
              </figcaption>
            </figure>
          </Reveal>
          <Reveal preset="stage" delay={0.12} className="md:col-span-2">
            <figure className="stage-frame relative aspect-[16/10] h-full w-full overflow-hidden md:aspect-auto md:min-h-full">
              <img src={MEDIA.sceneChipMacro} alt="高带宽内存芯片微距的视觉示意" draggable={false}
                   className="absolute inset-0 h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-0"
                   style={{ background: 'linear-gradient(to top, rgba(5,5,7,0.7), transparent 55%)' }} aria-hidden="true" />
              <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 p-[clamp(0.9rem,2vw,1.5rem)]">
                <span className="font-label text-[clamp(0.58rem,0.72vw,0.68rem)] tracking-[0.18em] text-paper/85">
                  SILICON LEVEL · 硅片之上
                </span>
              </figcaption>
            </figure>
          </Reveal>
        </div>
        <Reveal preset="rule" className="mx-auto mt-4 max-w-6xl text-right">
          <span className="font-label text-[clamp(0.5rem,0.64vw,0.6rem)] tracking-[0.16em] text-muted/50">
            VISUAL CONCEPT · 场景视觉示意，不代表真实产品或机房
          </span>
        </Reveal>

        {/* 三根支撑柱：信息与装饰分层，悬停只做轻微反馈 */}
        <div className="mx-auto mt-[clamp(4rem,8vw,7rem)] grid max-w-6xl gap-px border border-line bg-[rgba(255,255,255,0.06)] md:grid-cols-3">
          {PILLARS.map((p, i) => (
            <Reveal key={p.no} preset="card" delay={0.14 + i * 0.1} className="h-full">
              <article
                className="edge-light group flex h-full flex-col bg-void px-[clamp(1.25rem,3vw,2.5rem)] py-[clamp(1.75rem,4vw,3rem)] transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-[rgba(156,203,235,0.04)]"
                onPointerMove={(e) => {
                  if (e.pointerType !== 'mouse') return;
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
                  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
                }}
              >
                <div className="flex items-start justify-between">
                  <span className="font-label text-[clamp(0.6rem,0.75vw,0.7rem)] tracking-[0.24em] text-silver/50 transition-colors duration-300 group-hover:text-ice">
                    {p.no} / 03
                  </span>
                  {/* PART 06 低频指示灯：错开周期，避免规律闪烁 */}
                  <span className="h-1 w-1 rounded-full bg-ice/60 breathe" style={{ animationDelay: `${i * 2.3}s`, animationDuration: `${7 + i * 1.4}s` }} aria-hidden="true" />
                </div>

                <div className="mt-[clamp(2rem,4vw,3rem)]">
                  <h4 className="font-display font-light italic text-paper"
                      style={{ fontSize: 'clamp(1.8rem,3.4vw,3rem)' }}>
                    {p.en}
                  </h4>
                  <p className="cn-title mt-3 text-paper" style={{ fontSize: 'clamp(1rem,1.5vw,1.25rem)' }}>{p.zh}</p>
                </div>

                <p className="mt-5 max-w-sm leading-[1.9] text-muted" style={{ fontSize: 'var(--body)' }}>{p.desc}</p>

                <div className="mt-auto pt-[clamp(2rem,4vw,3rem)]">
                  <div className="h-px w-full origin-left scale-x-0 bg-ice/50 transition-transform duration-300 group-hover:scale-x-100" aria-hidden="true" />
                  <span className="tech-tag mt-4 block font-label text-[clamp(0.55rem,0.7vw,0.66rem)] tracking-[0.18em] text-muted/45">
                    {p.tag}
                  </span>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal preset="rule" delay={0.3} className="mt-[clamp(2rem,4vw,3rem)] flex justify-center">
          <div className="hairline w-[clamp(3rem,8vw,7rem)]" aria-hidden="true" />
        </Reveal>
      </div>
    </section>
  );
}
