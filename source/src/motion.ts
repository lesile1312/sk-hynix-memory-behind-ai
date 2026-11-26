/**
 * 全站动效参数 —— 唯一事实源
 *
 * 设计信条：MOTION IS STORYTELLING.
 * 每个动画服务于视觉表达 / 技术展示 / 交互反馈 / 章节叙事，不为动而动。
 *
 * 原则：
 * 1. 统一气质 Cinematic / Precision / Smooth / Premium / Minimal / Responsive
 * 2. 四级时长：Micro 150-250ms · UI 300-500ms · Reveal 600-1000ms · Cinematic 1200-2500ms
 * 3. 不同类型使用不同缓动：UI 快而清晰，图片柔和推进，3D 缓慢惯性，章节连续镜头，物理真实回弹
 * 4. 组件内禁止另写一套 ease / duration，一律引用本文件
 * 5. 只使用现有 GSAP 3.12 / three 0.170 / Rapier 1.5，不新增依赖
 */

/** 缓动：按运动特征分类，不再所有动画共用一条曲线 */
export const EASE = {
  /* 既有四档（保持兼容，不改动语义） */
  out: 'power3.out',        // 内容入场：自然减速，无回弹
  soft: 'power2.out',       // 正文/标签：更柔和的减速
  inOut: 'power2.inOut',    // 背景层/双向连续运动
  linear: 'none',           // 滚动映射：避免与 scrub 叠加二次缓动

  /* 新增：按类型区分运动特征 */
  ui: 'power2.out',         // UI 微交互：快速清晰，短促收敛
  uiSnap: 'power4.out',     // 按钮/开关：极快到位，明确反馈
  image: 'power2.out',      // 图片/视觉：柔和推进，不抢内容
  camera: 'power3.inOut',   // 镜头/3D：缓慢起步、惯性收尾
  cinematic: 'expo.out',    // 电影级开场：先慢后极快收敛，克制不弹跳
  line: 'power1.inOut',     // 线路/扫描：匀速中带轻微加减速
} as const;

/** 既有时长档（保持兼容） */
export const DUR = {
  micro: 0.35,
  label: 0.75,
  body: 0.95,
  title: 1.15,
  stage: 1.2,
} as const;

/**
 * 四级时长规范（秒）—— 新动效一律按此取值
 * Micro 0.15-0.25 / UI 0.3-0.5 / Reveal 0.6-1.0 / Cinematic 1.2-2.5
 */
export const TIER = {
  micro: 0.2,
  ui: 0.4,
  reveal: 0.85,
  cinematic: 1.8,
} as const;

/** 按动画类型给出的标准配置，避免组件内重复组合 ease/duration */
export const MOTION = {
  micro: { dur: TIER.micro, ease: EASE.ui },
  ui: { dur: TIER.ui, ease: EASE.ui },
  image: { dur: TIER.reveal, ease: EASE.image },
  reveal: { dur: TIER.reveal, ease: EASE.out },
  camera: { dur: TIER.cinematic, ease: EASE.camera },
  cinematic: { dur: TIER.cinematic, ease: EASE.cinematic },
} as const;

/** ScrollTrigger scrub 阻尼：数值越大越滞后；统一为三档 */
export const SCRUB = {
  tight: 0.55,
  normal: 0.8,
  slow: 1.1,
} as const;

export type RevealPreset = 'label' | 'title' | 'cnTitle' | 'body' | 'card' | 'stage' | 'rule';

export interface RevealSpec {
  y: number;
  duration: number;
  ease: string;
  stagger: number;
  start: string;
  fromOpacity: number;
  /** 章节英文标题：遮罩揭示 + 字间距收敛 */
  mask?: boolean;
  tracking?: readonly [string, string];
}

/**
 * 层级差异：
 * label  轻微透明度变化 + 小位移，只做提示
 * title  遮罩揭示 + 字间距，先于正文完成
 * cnTitle 中文整句上移，不逐字跳动
 * body   分段淡入，位移最小
 * card   卡片/列表，短促错开
 * stage  3D / 视频容器，稍慢且位移更大
 * rule   纯透明度，不承担层级
 *
 * 时长落在 Reveal 档（0.6-1.0s）；title / stage 略超上限属既有设定，保持以维持已验收观感。
 */
export const REVEALS: Record<RevealPreset, RevealSpec> = {
  label: {
    y: 10, duration: DUR.label, ease: EASE.soft, stagger: 0.06,
    start: 'top 88%', fromOpacity: 0.2,
  },
  title: {
    y: 22, duration: DUR.title, ease: EASE.out, stagger: 0.14,
    start: 'top 84%', fromOpacity: 0, mask: true,
    tracking: ['0.045em', '0em'],
  },
  cnTitle: {
    y: 26, duration: DUR.body, ease: EASE.soft, stagger: 0.1,
    start: 'top 86%', fromOpacity: 0,
  },
  body: {
    y: 16, duration: DUR.body, ease: EASE.soft, stagger: 0.09,
    start: 'top 86%', fromOpacity: 0.12,
  },
  card: {
    y: 22, duration: DUR.label, ease: EASE.out, stagger: 0.09,
    start: 'top 88%', fromOpacity: 0.15,
  },
  stage: {
    y: 30, duration: DUR.stage, ease: EASE.out, stagger: 0.1,
    start: 'top 86%', fromOpacity: 0,
  },
  rule: {
    y: 0, duration: DUR.micro, ease: EASE.soft, stagger: 0.05,
    start: 'top 90%', fromOpacity: 0.25,
  },
};
