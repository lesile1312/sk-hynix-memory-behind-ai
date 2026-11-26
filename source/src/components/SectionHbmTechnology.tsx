import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Reveal from './Reveal';
import SectionLabel from './SectionLabel';
import HbmShowcase from './HbmShowcase';
import { EASE, SCRUB } from '../motion';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useMotionProfile } from '../hooks/useMotionProfile';

gsap.registerPlugin(ScrollTrigger);

const SPECS = [
  { no: '01', en: 'HIGH BANDWIDTH', zh: '更高带宽', desc: '以更宽的数据通道，承载人工智能的海量数据吞吐。' },
  { no: '02', en: 'STACKED ARCHITECTURE', zh: '垂直堆叠', desc: '多层存储晶粒垂直互联，在有限面积中凝聚更高容量。' },
  { no: '03', en: 'ADVANCED PACKAGING', zh: '先进封装', desc: '精密互联与封装工艺，让性能、功耗与稳定性彼此平衡。' },
] as const;

/**
 * 03 HBM TECHNOLOGY —— 技术叙事 + 可交互 3D 封装
 *
 * 版面：左 4 栏叙事 / 中 5 栏 3D 舞台 / 右 3 栏 Selected Structure。
 * 3D 场景单独分包，滚动到本节附近才开始加载。
 */
export default function SectionHbmTechnology() {
  const ref = useRef<HTMLElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { parallaxScale } = useMotionProfile();

  useLayoutEffect(() => {
    if (reduced || !ref.current) return;
    const ctx = gsap.context(() => {
      /* 背景描边字视差 */
      gsap.fromTo(wordRef.current, { y: 80 * parallaxScale }, {
        y: -60 * parallaxScale,
        ease: EASE.linear,
        scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: SCRUB.slow },
      });
    }, ref);
    return () => ctx.revert();
  }, [reduced, parallaxScale]);

  return (
    <section
      id="technology"
      ref={ref}
      className="relative overflow-hidden"
      style={{ paddingBlock: 'var(--section-y)', paddingInline: 'var(--gutter)' }}
      aria-labelledby="technology-title"
    >
      <div ref={wordRef} aria-hidden="true"
           className="outline-word font-display pointer-events-none absolute -left-[3%] top-[12%] select-none leading-none"
           style={{ fontSize: 'clamp(8rem, 25vw, 22rem)' }}>
        HBM
      </div>

      <div className="relative mx-auto w-full max-w-[1500px]">
        <div className="grid gap-[clamp(2.5rem,5vw,5rem)] lg:grid-cols-12">
          {/* 左：标题与叙事 */}
          <div className="lg:col-span-4">
            <Reveal preset="label">
              <SectionLabel no="04" en="BEYOND MEMORY" zh="HBM 高带宽内存" />
            </Reveal>
            <Reveal preset="title" delay={0.1} className="mt-[clamp(2rem,5vw,4rem)]">
              <h2 id="technology-title" className="font-display font-light leading-[0.98] text-paper"
                  style={{ fontSize: 'var(--title-lg)' }}>
                BEYOND
                <br />
                <span className="italic text-ice">MEMORY.</span>
              </h2>
            </Reveal>
            <Reveal preset="cnTitle" delay={0.26} className="mt-[clamp(2rem,4vw,3rem)]">
              <h3 className="cn-title text-paper" style={{ fontSize: 'var(--title-md)' }}>
                不止于存储，<br />不止于极限。
              </h3>
            </Reveal>
            <Reveal preset="body" delay={0.38} staggerSelector="[data-segment]"
                    className="mt-[clamp(1.5rem,3vw,2.5rem)]">
              <p className="max-w-md leading-[2.1] text-muted" style={{ fontSize: 'var(--body)' }}>
                <span data-segment className="block">当模型规模持续扩张，数据搬运的速度决定了智能前进的步伐。</span>
                <span data-segment className="block mt-3">HBM 以垂直堆叠与先进封装，重新定义存储与算力之间的距离。</span>
              </p>
            </Reveal>
            <Reveal preset="body" delay={0.44} className="mt-4">
              <p className="max-w-md text-[0.75rem] leading-[1.9] text-muted/60">
                直接点击模型上的任意一层，查看它的名称、作用与在封装中的位置。
              </p>
            </Reveal>
            <Reveal preset="card" delay={0.5} className="mt-[clamp(2rem,4vw,3rem)]">
              <a href="#infrastructure" className="btn-line" data-magnetic>
                继续了解 AI 基础设施 <span aria-hidden="true">↗</span>
              </a>
            </Reveal>
          </div>

          {/* 中 + 右：3D 舞台与结构说明 */}
          <div className="lg:col-span-8">
            <Reveal preset="stage" delay={0.18}>
              <HbmShowcase reduced={reduced} />
            </Reveal>
          </div>
        </div>

        {/* 底部三项要点 */}
        <Reveal preset="card" delay={0.2} staggerSelector="[data-spec]" className="mt-[clamp(3rem,6vw,5rem)]">
          <ul className="grid border-t border-line md:grid-cols-3">
            {SPECS.map((s) => (
              <li key={s.no} data-spec
                  className="group grid grid-cols-[2.2rem_1fr] gap-3 border-b border-line py-5 transition-colors duration-300 hover:border-ice/40 md:border-r md:px-5 md:last:border-r-0 md:py-6">
                <span className="font-label pt-1 text-[clamp(0.6rem,0.75vw,0.7rem)] tracking-[0.2em] text-silver/50 transition-colors duration-300 group-hover:text-ice">
                  {s.no}
                </span>
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="font-label text-[clamp(0.78rem,1vw,0.92rem)] tracking-[0.18em] text-paper">{s.zh}</h3>
                    <span className="tech-tag font-label text-[clamp(0.52rem,0.66vw,0.62rem)] tracking-[0.22em] text-ice/60">{s.en}</span>
                  </div>
                  <p className="mt-2 max-w-[92%] leading-[1.9] text-muted" style={{ fontSize: 'var(--body)' }}>{s.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
