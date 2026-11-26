/**
 * HBM 芯片展示模块（03 技术页右半部）
 *
 * 左侧不再放静态图，而是一块可交互的 3D 舞台；右侧是 Selected Structure 说明。
 * 3D 场景用 React.lazy 单独分包，且只有滚动到本节附近才开始下载 three.js，
 * 不拖累首屏。
 */
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { STRUCTURES, STRUCTURE_MAP, type StructureId } from './hbm/model';
import type { ViewMode } from './hbm/HbmPrecisionScene';

/* 精细工程展示场景：程序化 DRAM/TSV/微凸点 + 保留 GLB 基板质感 */
const HbmScene = lazy(() => import('./hbm/HbmPrecisionScene'));

const MODES: { id: ViewMode; zh: string; en: string }[] = [
  { id: 'full', zh: '完整视图', en: 'ASSEMBLED' },
  { id: 'explode', zh: '爆炸视图', en: 'EXPLODE' },
  { id: 'section', zh: '结构剖面', en: 'SECTION' },
  { id: 'micro', zh: '微观视图', en: 'DETAIL' },
];

/* PART 05：SCAN 是叠加在任意视角上的纯视觉模式，不改变模型结构或视角 */
const SCAN_NOTE = '扫描线为可视化示意，不代表真实检测过程';

/** 仅当本节接近视口时才挂载 3D */
function useNearView(ref: React.RefObject<HTMLElement>, margin = '300px') {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin, near]);
  return near;
}

/** 离开视口就停渲染，省电也省帧（起始为 true：先渲染出首帧，再交给观察器判断） */
function useActive(ref: React.RefObject<HTMLElement>) {
  const [active, setActive] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => setActive(entries[0]?.isIntersecting ?? false), {
      threshold: 0.01,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return active;
}

export default function HbmShowcase({ reduced }: { reduced: boolean }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const near = useNearView(stageRef);
  const active = useActive(stageRef);
  const [mode, setMode] = useState<ViewMode>('full');
  const [focus, setFocus] = useState<StructureId | null>(null);
  const [ready, setReady] = useState(false);
  const [scan, setScan] = useState(false);

  /* 兜底：即使首帧回调没来（离屏、上下文丢失），也不要一直卡着加载圈 */
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 4000);
    return () => clearTimeout(t);
  }, []);

  const selected = focus ? STRUCTURE_MAP[focus] : STRUCTURE_MAP.dram;

  const onSelect = useCallback((id: StructureId) => {
    setFocus(id);
    setMode((m) => (m === 'section' || m === 'micro' ? 'full' : m));
  }, []);
  const onClear = useCallback(() => setFocus(null), []);

  const reset = () => {
    setFocus(null);
    setMode('full');
    setScan(false);
  };

  const hint = useMemo(
    () => (scan ? SCAN_NOTE : mode === 'section' ? '剖面沿纵向切开的半边封装' : mode === 'micro' ? '镜头推近层间微凸点区域' : '拖拽旋转 · 滚轮缩放'),
    [mode, scan],
  );

  return (
    <div className="grid gap-[clamp(1.5rem,3vw,2.5rem)] lg:grid-cols-8">
      {/* ---------------- 3D 舞台 ---------------- */}
      <div className="lg:col-span-5">
        <div ref={stageRef} className="stage-frame relative aspect-square w-full overflow-hidden sm:aspect-[6/5]">
          <span className="stage-corner left-3 top-3 border-l border-t" aria-hidden="true" />
          <span className="stage-corner right-3 top-3 border-r border-t" aria-hidden="true" />
          <span className="stage-corner bottom-3 left-3 border-b border-l" aria-hidden="true" />
          <span className="stage-corner bottom-3 right-3 border-b border-r" aria-hidden="true" />

          <div className="tech-grid pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="hbm-stage-glow pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="hbm-ruler pointer-events-none absolute bottom-24 right-2 top-16 hidden w-[3px] opacity-50 sm:block" aria-hidden="true" />

          {/* 画布 */}
          <div className="absolute inset-0">
            {near && (
              <Suspense fallback={null}>
                <HbmScene
                  mode={mode}
                  focus={focus}
                  onSelect={onSelect}
                  onClearFocus={onClear}
                  active={active}
                  reduced={reduced}
                  scan={scan}
                  onReady={() => setReady(true)}
                  className="!absolute inset-0"
                />
              </Suspense>
            )}
          </div>

          {/* 加载态：不出现空白框 */}
          <div
            className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-700 ${
              ready ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <div className="text-center">
              <span className="mx-auto block h-10 w-10 animate-spin rounded-full border border-ice/25 border-t-ice/80" />
              <span className="mt-4 block font-label text-[0.6rem] tracking-[0.3em] text-muted/70">BUILDING PACKAGE</span>
            </div>
          </div>

          {/* 顶部标号 */}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-[clamp(0.9rem,2vw,1.5rem)] pt-[clamp(0.9rem,2vw,1.5rem)]">
            <span className="tech-tag font-label text-[clamp(0.55rem,0.7vw,0.66rem)] tracking-[0.24em] text-silver/60">
              FIG. 03 — HBM PACKAGE
            </span>
            <div className="pointer-events-auto flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${scan ? 'bg-ice scan-active' : 'bg-ice breathe'}`} aria-hidden="true" />
              <span className="font-label text-[0.55rem] tracking-[0.2em] text-muted/60">{scan ? 'SCAN' : mode.toUpperCase()}</span>
              {/* PART 05 SCAN：纯视觉结构扫描，不改变模型或视角 */}
              <button
                type="button"
                aria-pressed={scan}
                onClick={() => setScan((v) => !v)}
                className={`flex items-center gap-1 border px-1.5 py-1 font-label text-[0.5rem] tracking-[0.16em] transition-colors duration-300 ${
                  scan ? 'border-ice/55 bg-ice/10 text-ice' : 'border-line/70 text-silver/55 hover:border-ice/50 hover:text-ice'
                }`}
              >
                SCAN <span aria-hidden="true">⌁</span>
              </button>
              <button
                type="button"
                onClick={reset}
                className="flex items-center gap-1 border border-line/70 px-1.5 py-1 font-label text-[0.5rem] tracking-[0.16em] text-silver/55 transition-colors duration-300 hover:border-ice/50 hover:text-ice"
              >
                RESET <span aria-hidden="true">↺</span>
              </button>
            </div>
          </div>

        </div>

        {/* 视角控制：独立放在舞台下方，不遮挡模型 */}
        <div className="mt-2 grid grid-cols-4 gap-1 border border-line/70 bg-white/[0.015] px-[clamp(0.4rem,1vw,0.75rem)] py-2">
          {MODES.map((m) => {
            const on = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setMode(m.id);
                  if (m.id === 'micro') setFocus('bump');
                  else if (m.id === 'full' || m.id === 'explode') setFocus(null);
                }}
                className={`hbm-mode flex min-w-0 flex-col items-center justify-center gap-0.5 border px-1 py-1.5 transition-colors duration-300 ${
                  on
                    ? 'border-ice/45 bg-ice/[0.1] text-ice'
                    : 'border-line/80 bg-white/[0.015] text-silver/65 hover:border-ice/35 hover:text-ice'
                }`}
              >
                <span className="font-label text-[0.5rem] tracking-[0.12em] sm:text-[0.54rem]">{m.en}</span>
                <span className={`text-[0.56rem] tracking-[0.04em] sm:text-[0.6rem] ${on ? 'text-ice/80' : 'text-muted/75'}`}>
                  {m.zh}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-2 text-center text-[0.56rem] tracking-[0.14em] text-muted/55">
          <span className="sm:hidden">拖拽旋转 · 双指缩放</span>
          <span className="hidden sm:inline">{hint}</span>
        </p>
        <p className="mt-1 text-center text-[0.56rem] leading-relaxed tracking-[0.1em] text-muted/45">
          高精度 PBR 模型 · 用于封装结构示意，非 SK hynix 实际产品模型或实测尺寸
        </p>
      </div>

      {/* ---------------- Selected Structure ---------------- */}
      <aside className="lg:col-span-3">
        <div className="flex h-full flex-col border-t border-line pt-4 lg:border-l lg:border-t-0 lg:pl-[clamp(1rem,2vw,1.75rem)] lg:pt-0">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-label text-[0.54rem] tracking-[0.26em] text-ice/65">
              <span className="h-1.5 w-1.5 rotate-45 border border-ice/70" aria-hidden="true" />
              SELECTED STRUCTURE
            </span>
            <span className="font-label text-[0.52rem] tracking-[0.16em] text-muted/50">{selected.no} / 07</span>
          </div>

          {/* key 触发重挂载 → CSS 淡入，让结构切换有轻微过渡（PART 07） */}
          <div key={selected.id} className="mt-5 panel-fade" style={{ animation: 'panel-fade 0.45s var(--ease-out) both' }}>
            <h3 className="font-display text-[clamp(1.5rem,2.4vw,2rem)] font-light leading-none text-paper">
              {selected.en}
            </h3>
            <div className="mt-2.5 flex items-center gap-2">
              <span className="h-px w-6 bg-ice/60" aria-hidden="true" />
              <span className="text-[0.76rem] tracking-[0.08em] text-ice/85">{selected.zh}</span>
            </div>
            <p className="mt-4 border-l border-ice/25 pl-3 text-[0.77rem] leading-[1.95] text-muted">{selected.desc}</p>

            <div className="mt-4 border border-line/70 bg-white/[0.015] p-3">
              <div className="flex items-center gap-2">
                <span className="h-px w-4 bg-ice/50" aria-hidden="true" />
                <span className="font-label text-[0.5rem] tracking-[0.24em] text-muted/60">作用 / ROLE</span>
              </div>
              <p className="mt-2 text-[0.74rem] leading-[1.85] text-silver/85">{selected.role}</p>
            </div>

            <div className="mt-3 border border-line/70 bg-white/[0.015] p-3">
              <div className="flex items-center gap-2">
                <span className="h-px w-4 bg-ice/50" aria-hidden="true" />
                <span className="font-label text-[0.5rem] tracking-[0.24em] text-muted/60">原理 / PRINCIPLE</span>
              </div>
              <p className="mt-2 text-[0.74rem] leading-[1.85] text-silver/85">{selected.principle}</p>
            </div>

            <div className="mt-3 border border-line/70 bg-white/[0.015] p-3">
              <div className="flex items-center gap-2">
                <span className="h-px w-4 bg-ice/50" aria-hidden="true" />
                <span className="font-label text-[0.5rem] tracking-[0.24em] text-muted/60">结构关系 / RELATION</span>
              </div>
              <p className="mt-2 text-[0.74rem] leading-[1.85] text-silver/85">{selected.relation}</p>
            </div>
          </div>

          {/* 结构切换：移动端没有悬停，这里是主要入口 */}
          <div className="mt-5 flex items-center justify-between">
            <span className="font-label text-[0.5rem] tracking-[0.24em] text-muted/55">LAYER INDEX</span>
            <span className="font-label text-[0.5rem] tracking-[0.16em] text-muted/40">07 STRUCTURES</span>
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-x-3 lg:grid-cols-1">
            {STRUCTURES.map((s) => {
              const on = selected.id === s.id;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(s.id)}
                    className={`group relative flex w-full items-center gap-2 border-b border-line/45 py-1.5 pl-3 pr-1 text-left transition-colors duration-300 ${
                      on ? 'bg-ice/[0.055] text-ice' : 'text-silver/60 hover:bg-white/[0.02] hover:text-ice/90'
                    }`}
                  >
                    <span
                      className={`absolute left-0 top-1/2 h-4 w-px -translate-y-1/2 transition-colors duration-300 ${
                        on ? 'bg-ice' : 'bg-transparent group-hover:bg-ice/40'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="font-label text-[0.5rem] tracking-[0.1em] opacity-60">{s.no}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.69rem] tracking-[0.04em]">{s.zh}</span>
                      <span className="block truncate font-label text-[0.47rem] tracking-[0.14em] text-muted/55">{s.en}</span>
                    </span>
                    <span
                      className={`h-1 w-1 shrink-0 rounded-full transition-colors duration-300 ${
                        on ? 'bg-ice' : 'bg-transparent group-hover:bg-ice/40'
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={reset}
            className={`mt-5 inline-flex items-center gap-2 self-start border-b pb-1 font-label text-[0.54rem] tracking-[0.2em] transition-colors duration-300 ${
              focus ? 'border-ice/50 text-ice' : 'border-line text-muted/55 hover:text-ice'
            }`}
          >
            返回整体视图 <span aria-hidden="true">↗</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
