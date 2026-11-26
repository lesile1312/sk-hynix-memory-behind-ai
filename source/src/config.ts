/**
 * 全局素材与站点配置 —— 唯一入口
 * PHASE 03 约束：所有视频素材统一放在 public/videos/，禁止组件内硬编码路径
 */
const base = import.meta.env.BASE_URL;
const VIDEO_BASE = `${base}videos/`;

export const MEDIA = {
  /** 1280 绿幕 H.264（WebGL 实时抠像首选，硬件解码 + 低纹理上传，1.1 MB） */
  video: `${VIDEO_BASE}hbm-hero-green-1280.mp4`,
  /** 已抠像的透明动画 WebP（WebGL 不可用时的兜底；主线程解码较重，不作为首选） */
  webp: `${VIDEO_BASE}hbm-hero-alpha.webp`,
  /** 透明首帧海报（WebP 98 KB，原 PNG 798 KB 留在验收备份目录） */
  poster: `${VIDEO_BASE}hbm-poster.webp`,
  /** 电影级环境背板（WebP 压缩版 136 KB，原 PNG 2.2 MB 留在验收备份目录） */
  backdrop: `${base}assets/keyframe.webp`,

  /**
   * 章节叙事视觉（图像生成，已裁掉生成水印、无任何文字/商标/参数）。
   * 统一标注为「视觉示意」，不代表 SK hynix 真实产品或机房。
   */
  sceneDataCenter: `${base}assets/scenes/dc-corridor.webp`,
  sceneChipMacro: `${base}assets/scenes/hbm-macro.webp`,
  sceneServer: `${base}assets/scenes/ai-server.webp`,
  sceneHorizon: `${base}assets/scenes/chip-horizon.webp`,

  /**
   * 官方 SK hynix CI（用户提供的 Corporate Identity 原图，已抠除白底）。
   * 导航与品牌收尾统一通过此处引用，不再使用仿制标准字。
   */
  logo: `${base}assets/skhynix-logo.webp`,
} as const;

/** 六个区段与导航（2026-11-26：个人介绍页上移到首屏视频之后，序号顺延） */
export const SECTIONS = [
  { id: 'hero',          no: '01', href: '#hero',          en: 'THE MEMORY',              zh: '品牌首屏' },
  { id: 'profile',       no: '02', href: '#profile',       en: 'ABOUT ME',                zh: '个人介绍' },
  { id: 'introduction',  no: '03', href: '#introduction',  en: 'THE FOUNDATION',          zh: '底层力量' },
  { id: 'technology',    no: '04', href: '#technology',    en: 'BEYOND MEMORY',           zh: 'HBM 技术' },
  { id: 'infrastructure',no: '05', href: '#infrastructure',en: 'POWERING THE AI ERA',     zh: 'AI 基础设施' },
  { id: 'ending',        no: '06', href: '#ending',        en: 'BEYOND THE FUTURE',       zh: '品牌收尾' },
] as const;

/**
 * 滚动探针使用的完整区段序列。
 * 原 04 与 05 之间的「physics 独立体验区块」已下线，现序列与 SECTIONS 一致；
 * 保留该导出的原因：NavBar 只依赖「顺序 + id」，日后若再加独立区块，
 * 在此处插入即可，不必改导航与六段结构。
 */
export const SCROLL_SECTIONS = SECTIONS;

/** 顶部导航三项（ABOUT 由原品牌收尾改指向已上移的个人介绍页；原交互体验项随区块下线已移除） */
export const NAV_LINKS = [
  { href: '#technology',     en: 'TECHNOLOGY',     zh: '技术' },
  { href: '#infrastructure', en: 'AI FUTURE',      zh: '智能未来' },
  { href: '#profile',        en: 'ABOUT',          zh: '关于我' },
] as const;
