import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import SectionLabel from './SectionLabel';
import Reveal from './Reveal';
import { useReducedMotion } from '../hooks/useReducedMotion';

/* 物理与 WebGL 包体较大，进入本区段才加载，不进入首屏包 */
const Lanyard = lazy(() => import('./lanyard/Lanyard'));

const base = import.meta.env.BASE_URL;
/* 静态工牌画面：与真实渲染同源截图，首帧前先顶上，避免长时间空白 */
const BADGE_STILL = `${base}lanyard/lanyard-placeholder.webp`;

/** 目前正在学习和实践的四个方向（英文用衬线斜体强调，对应参考图的编辑式排版） */
const FOCUS = [
  { en: 'Development', detail: 'Python、C/C++、React、TypeScript' },
  { en: 'AI & Technology', detail: '人工智能应用、AI 工具与技术探索' },
  { en: 'Data & Systems', detail: 'SQL、数据库、数据分析与信息系统' },
  { en: 'Product Thinking', detail: '产品设计、需求分析、交互体验与项目管理' },
] as const;

function hasWebGL() {
  if (typeof document === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * 个人介绍页 —— 位于首屏视频之后（2026-11-26 由站点末尾上移）。
 * 桌面左右分栏：左 70% 编辑式个人介绍 / 右 30% React Bits 官方 Lanyard 工牌悬挂装饰；
 * 移动端自然纵向排列。工牌不占整屏、不遮挡文字、不改物理、不改视频区。
 */
export default function ProfileExperience() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [webgl] = useState(hasWebGL);
  const reduced = useReducedMotion();
  const handleReady = useCallback(() => setReady(true), []);

  /* 兜底：3D 首帧在软件渲染 / 慢设备上可能迟到数秒，避免静态图与 3D 工牌长时间重影 */
  useEffect(() => {
    if (!webgl) return;
    const t = setTimeout(() => setTimedOut(true), 3500);
    return () => clearTimeout(t);
  }, [webgl]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    /* 首屏若已接近该区段，直接置为活动，避免等待回调造成空画布 */
    const box = el.getBoundingClientRect();
    if (box.top < window.innerHeight + 160 && box.bottom > -160) setActive(true);
    const io = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { rootMargin: '160px 0px 160px 0px', threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="profile" className="relative overflow-hidden border-t border-line bg-void px-[clamp(1.25rem,6vw,7.5rem)] py-[clamp(4rem,8vw,7rem)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-6%] top-[4%] h-[60vw] max-h-[860px] w-[60vw] max-w-[860px] rounded-full opacity-60"
        style={{ background: 'radial-gradient(circle, rgba(156,203,235,0.07), rgba(5,5,7,0) 66%)' }}
      />
      <div className="pointer-events-none absolute inset-0 tech-grid opacity-[0.22]" aria-hidden="true" />

      <div className="relative mx-auto max-w-[1440px]">
        <div className="grid items-start gap-[clamp(2.5rem,5vw,5rem)] lg:grid-cols-[7fr_3fr]">
          {/* ---------- 左 70%：编辑式个人介绍 ---------- */}
          <div className="min-w-0">
            <Reveal preset="label"><SectionLabel no="02" en="ABOUT ME" zh="关于我" /></Reveal>

            {/* 英文主标题：衬线 + 斜体强调，两行排版更从容 */}
            <Reveal preset="title" mask className="mt-[clamp(1.4rem,2.6vw,2.4rem)]">
              <h2 className="font-display font-light leading-[0.98] text-paper"
                  style={{ fontSize: 'clamp(2.8rem,5.2vw,5rem)' }}>
                <span className="block">Hello, I'm</span>
                <span className="block italic text-ice">LUO CAN.</span>
              </h2>
            </Reveal>

            {/* 中文姓名：与英文标题拉开层级，字号收敛 */}
            <Reveal preset="cnTitle" className="mt-[clamp(1rem,1.8vw,1.6rem)]">
              <p className="cn-title text-[clamp(1.4rem,2.4vw,2.1rem)] tracking-[0.06em] text-paper/95">
                你好，我是罗灿<span className="text-ice">。</span>
              </p>
            </Reveal>

            {/* 身份与领域：编辑式分行，领域用衬线斜体 */}
            <Reveal preset="label" className="mt-[clamp(1.2rem,2.2vw,1.8rem)]">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <span className="border border-ice/35 bg-ice/[0.06] px-3 py-1.5 font-label text-[clamp(0.62rem,0.8vw,0.74rem)] tracking-[0.14em] text-ice">
                  西南大学 · 大三本科生
                </span>
                <span className="font-display italic text-[clamp(1rem,1.5vw,1.35rem)] tracking-[0.02em] text-silver">
                  Technology · Product · Finance
                </span>
              </div>
            </Reveal>

            <Reveal preset="rule" delay={0.3} className="mt-[clamp(1.6rem,3vw,2.4rem)]">
              <div className="hairline w-[clamp(3rem,8vw,7rem)]" aria-hidden="true" />
            </Reveal>

            {/* 正文：两段，舒展行距（参考图的呼吸感） */}
            <Reveal preset="body" className="mt-[clamp(1.6rem,3vw,2.4rem)] max-w-[820px] space-y-6" staggerSelector="[data-segment]" stagger={0.12}>
              <p data-segment className="text-[clamp(0.95rem,1.15vw,1.08rem)] leading-[2.15] text-muted">
                我是一名对计算机技术、人工智能和产品创新充满兴趣的本科生。
                我喜欢从实际问题出发，将技术构想转化为可以运行、可以体验的产品。
                从前端开发、后端服务到数据处理，我持续探索软件开发与 AI 技术的结合，
                也享受从 0 到 1 完成项目的过程。
              </p>
            </Reveal>

            {/* 理念引言：技术观与记忆观，精制引用块 */}
            <Reveal preset="body" className="mt-[clamp(2rem,3.4vw,2.8rem)] max-w-[820px]">
              <blockquote className="relative border-l border-ice/40 pl-[clamp(1rem,2vw,1.6rem)]">
                <span className="pointer-events-none absolute -left-[0.55rem] -top-2 font-display text-[2.2rem] leading-none text-ice/25"
                      aria-hidden="true">“</span>
                <p className="cn-title text-[clamp(1rem,1.3vw,1.15rem)] leading-[2] text-paper/90">
                  相信好的技术应该像一段安静的电影：结构精密、节奏克制，
                  最后让人忘记它有多复杂，只记得它带来了什么。
                </p>
                <p className="cn-title mt-3 leading-[2] text-muted">
                  记忆不是存储，而是选择什么值得留下——这也是我理解技术与创作的方式。
                </p>
              </blockquote>
            </Reveal>

            {/* 目前学习与实践：小标题 + bullet 列表，英文衬线斜体做视觉锚点 */}
            <Reveal preset="label" className="mt-[clamp(2.2rem,3.6vw,3rem)]">
              <div className="mb-5 flex items-center gap-4">
                <span className="eyebrow">CURRENTLY LEARNING &amp; PRACTICING</span>
                <span className="h-px flex-1 bg-line" />
                <span className="tech-tag text-[0.7rem] tracking-[0.18em] text-muted">正在学习与实践</span>
              </div>
            </Reveal>
            <Reveal preset="body" className="max-w-[860px]" staggerSelector="[data-focus]" stagger={0.1}>
              <ul className="space-y-0">
                {FOCUS.map((f) => (
                  <li key={f.en} data-focus
                      className="group flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line/70 py-[clamp(0.85rem,1.6vw,1.2rem)] transition-colors duration-300 hover:border-ice/40">
                    <span className="focus-dot h-1 w-1 shrink-0 translate-y-[-0.15em] rounded-full bg-ice/70" aria-hidden="true" />
                    <span className="font-display italic text-[clamp(1.2rem,1.9vw,1.7rem)] leading-tight text-paper transition-colors duration-300 group-hover:text-ice">
                      {f.en}
                    </span>
                    <span className="font-label text-[0.9rem] text-ice/45" aria-hidden="true">—</span>
                    <span className="text-[clamp(0.88rem,1.05vw,0.98rem)] leading-[1.9] text-muted">{f.detail}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            {/* 信念句 + 英文落款（衬线斜体，作为整页收束） */}
            <Reveal preset="body" className="mt-[clamp(2.2rem,4vw,3.2rem)] border-l border-ice/30 pl-[clamp(1rem,2vw,1.5rem)]">
              <p className="text-[clamp(0.98rem,1.2vw,1.1rem)] leading-[2] text-paper/90">
                我相信，技术的价值不只在于实现功能，更在于解决真实问题。
              </p>
              <p className="mt-4 font-display italic text-[clamp(1.1rem,1.7vw,1.5rem)] tracking-[0.01em] text-ice">
                Stay curious. Keep building.
              </p>
            </Reveal>
          </div>

          {/* ---------- 右 30%：React Bits 官方 Lanyard 工牌（悬挂装饰，适当放大） ---------- */}
          <div>
            <div ref={wrapRef} className="relative mx-auto w-full max-w-[350px] lg:sticky lg:top-[12vh]">
              {/* PART 08 工牌从上方自然进入悬挂状态：只作用于显示容器，Lanyard 物理实现一行未改 */}
              <div className={reduced ? '' : 'badge-enter'}>
              <Reveal preset="stage">
                <div className="stage-frame relative h-[clamp(440px,64vh,620px)] w-full">
                  <span className="stage-corner left-0 top-0" aria-hidden="true" />
                  <span className="stage-corner right-0 top-0" aria-hidden="true" />
                  <span className="stage-corner bottom-0 left-0" aria-hidden="true" />
                  <span className="stage-corner bottom-0 right-0" aria-hidden="true" />
                  <div className="badge-stage-glow pointer-events-none absolute inset-0" aria-hidden="true" />
                  <span
                    className="pointer-events-none absolute inset-x-[18%] bottom-[15%] h-px bg-gradient-to-r from-transparent via-ice/20 to-transparent"
                    aria-hidden="true"
                  />

                  {/* 静态画面先顶住：WebGL 不可用时作为最终画面，可用时在首帧后淡出 */}
                  <img
                    src={BADGE_STILL}
                    alt={webgl ? '' : '个人身份卡（静态）'}
                    aria-hidden={webgl ? true : undefined}
                    className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                      webgl && (ready || timedOut) ? 'opacity-0' : 'opacity-100'
                    }`}
                    style={{
                      maskImage: 'radial-gradient(closest-side, #000 82%, transparent 100%)',
                      WebkitMaskImage: 'radial-gradient(closest-side, #000 82%, transparent 100%)',
                    }}
                  />

                  {webgl && (
                    <Suspense fallback={null}>
                      <Lanyard active={active} onReady={handleReady} />
                    </Suspense>
                  )}

                  {webgl && !ready && !timedOut && (
                    <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap font-label text-[0.55rem] tracking-[0.28em] text-ice/40">
                      RAPIER · 正在载入 3D 工牌
                    </span>
                  )}
                </div>
              </Reveal>

              <div className="mt-4 flex items-center justify-center gap-3">
                <span className="h-px w-6 bg-ice/35" aria-hidden="true" />
                <span className="font-label text-[0.56rem] tracking-[0.2em] text-muted">RAPIER PHYSICS · LANYARD</span>
                <span className="h-px w-6 bg-ice/35" aria-hidden="true" />
              </div>
              <p className="mt-2 text-center font-display italic text-[0.8rem] tracking-[0.02em] text-ice/70">
                Drag to interact · 拖拽摆动
              </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
