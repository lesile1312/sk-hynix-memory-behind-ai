# SK hynix 项目 — 固定约束（PHASE 01 确认）

> 生效范围：PHASE 02 及以后所有阶段
> 确认时间：2026-11-19
> 性质：**固定约束**。后续阶段不得静默偏离；如需变更，必须先得到用户明确确认。
> 本文件只记录决策，不代表已实施。实施状态见文末。

---

## 决策 1 — INTERACTIVE 3D 采用程序化近似芯片

### 背景
本机无任何真实 GLB / GLTF 芯片模型；`D:\AI视频\` 目录不存在，实际视频素材由本项目前期阶段生成。
用户明确决定：**不采用视频替代 3D 交互**（视频无法满足自由旋转与结构拆解）。

### 约束内容

1. **技术实现**：使用 Three.js / React Three Fiber 构建**程序化 HBM 视觉示意模型**。
2. **外观要求**：
   - 银灰色金属质感
   - 多层堆叠结构
   - 基板（substrate）
   - 金属边框
   - 电路纹理
3. **交互要求**：
   - 鼠标拖动旋转
   - 缩放
   - 自动缓慢旋转
   - 滚动触发的分层爆炸视图（exploded view）
   - 冰蓝色局部高亮
4. **真实性红线（不可违反）**：
   - 页面必须**明确标注为示意模型**
   - **不得冒充 SK hynix 真实芯片结构**
   - 不得把程序化几何描述为真实产品规格或真实内部构造
   - 不得编造未经核实的技术参数
5. **可替换性要求**：
   - 模型必须**独立封装**为单独模块/组件
   - 对外提供稳定接口，未来可直接替换为真实 GLB / GLTF 模型
   - 替换时不应改动页面其他部分

### 待安装依赖（PHASE 05 执行，本阶段不安装）
- `three`
- `@react-three/fiber`
- `@react-three/drei`（含 useVideoTexture 等工具）

---

## 决策 2 — 完全采用最新 Master Prompt 设计系统

### 约束内容
**全站统一，清理旧版不一致的颜色、字体与组件样式；不允许新旧设计规范混用。**

| 用途 | 规范值 |
|---|---|
| 背景 | `#050507` |
| 主文字 | `#F4F1EA` |
| 次级文字 | `#96969B` |
| 冰蓝强调 | `#9CCBEB` |
| 金属银 | `#B8BEC7` |
| 分割线 | `rgba(255,255,255,0.14)` |

### 字体分工
| 用途 | 字体 |
|---|---|
| 英文标题 | Cormorant Garamond |
| 英文标签 | Jost |
| 中文正文 | 现代简洁的中文无衬线字体 |
| 中英文使用原则 | **中英文结合，不整站纯英文**；英文负责品牌调性，中文负责技术说明与内容叙事 |

### 需要清理的旧值（PHASE 02）
- 冰蓝旧值 `#9EBED5` → `#9CCBEB`
- 中文衬线大标题字体（Noto Serif SC / `.serif-cn`）→ 按新规范重定：中文正文改现代无衬线，英文标题用 Cormorant Garamond
- 缺失的 Jost 字体标签、缺失的金属银 `#B8BEC7` → 补齐
- Tailwind 配置、CSS 变量、组件内联颜色统一到新规范

### 视觉方向（保持不变）
- Apple 高端产品广告的极简排版
- NVIDIA 的 AI 科技氛围
- 电影级商业摄影光影
- 精密半导体工业设计语言
- 关键词：高级、成熟、克制、精密、未来、冷峻、沉浸
- 禁止：廉价赛博朋克、过度霓虹、紫红渐变、普通企业模板、密集卡片、无意义装饰动画

---

## 页面结构（固定，六段）

```
01 HERO              品牌电影级首屏
02 INTRODUCTION      智能时代的底层力量
03 HBM TECHNOLOGY    HBM 技术展示
04 INTERACTIVE 3D    交互式芯片体验   ← 决策 1
05 AI INFRASTRUCTURE AI 算力基础设施
06 BRAND ENDING      品牌收尾
```

补充：`04 INTERACTIVE 3D` 之后有一个独立物理体验区块 `physics`（悬挂式 Rapier 装置）。
它不计入上述六段、不新增导航项，只参与滚动状态判定；顶部 `HBM` 项在 04 与物理区块保持高亮。

---

## 七阶段执行安排（固定顺序）

| 阶段 | 内容 | 状态 |
|---|---|---|
| P01 | 项目审查 + 两项决策确认 | ✅ 已完成 |
| P02 | 设计系统落地（颜色/字体/素材目录分层） | ✅ 已完成 |
| P03 | 01 HERO + 02 INTRODUCTION 精修 | ✅ 已完成 |
| P04 | 03 HBM TECHNOLOGY | ✅ 已完成 |
| P05 | 04 INTERACTIVE 3D（程序化近似，可换 GLB）+ 独立物理体验区块 | ✅ 已完成 |
| P06 | 05 AI INFRASTRUCTURE + 06 BRAND ENDING | ✅ 已完成 |
| P07 | 性能与响应式验收（降级链、reduced-motion、桌面/移动视口） | ✅ 已完成（真机帧率未测，见下） |
| P08 | 构建与交付 | ✅ 已完成 |

---

## 实施状态说明（2026-11-22 更新）

- 两项固定决策均已落地：程序化 HBM 示意模型用于 3D 与物理区块，页面明确标注「非真实产品内部结构」；全站统一使用 Master Prompt 设计系统，旧色值/字体已清理。
- 3D 依赖已安装：`three@0.170`、`@react-three/fiber@8.18`、`@react-three/drei@9.122`、`@react-three/rapier@1.5`。Rapier 2.x 因要求 React 19 / R3F 9 未采用。
- 六段主叙事结构保持不变；P05 新增的 `physics` 悬挂物理装置是**独立体验区块**，不属于六段、不新增顶部导航项。滚动状态跟踪使用 `config.ts` 的 `SCROLL_SECTIONS`，顶部 `HBM` 项同时覆盖 04 交互与物理区块。
- 英文字体（Cormorant Garamond / Jost / Inter）已自托管于 `src/assets/fonts/`，不再依赖 Google Fonts CDN；中文仍用系统现代无衬线字体栈。
- **未验证 / 待用户提供**：
  - 官方 SK hynix Logo 文件仍缺失，`MEDIA.logo = null`，全站暂用品牌标准字，禁止绘制仿制商标。
  - 无真实 HBM GLB / GLTF，当前 3D 与物理模型均为程序化视觉示意。
  - 帧率只在 Playwright + Edge SwiftShader（软件渲染）环境采样：最终一次为静止首屏 rAF 中位 92.8ms、脚本滚动中位 109.8ms；**真实设备 GPU 帧率未测**，软件渲染数据不代表真机表现。
  - 首屏透明动画 WebP 已由 21 MB 无损版改为 11.4 MB 有损版（q75，alpha 无损、0 绿溢色、133 帧 / 5.985 秒、无限循环）；原 21 MB 母版留在 `_verify_final/` 备份。
  - 绿幕 MP4 改为按需加载：首选 WebP 路径 0 次请求 MP4；WebP 失败 / `?render=webgl` 才挂载 src；reduced-motion 完全不加载视频。
  - 背板图 PNG 2.2 MB → WebP 136 KB；首帧海报 PNG 798 KB → WebP 98 KB（原图均在 `_verify_final/` 备份）。
  - Vite 构建仍提示 3D / Rapier 分块 > 500 kB；两者均按需加载且离屏暂停，未进入首屏包。

## 补充：PREMIUM MOTION DESIGN & VISUAL POLISH（2026-11-22）

用户在本轮追加了全站动效与视觉精修需求，不改变上述六段结构与两项固定决策。
新增 `src/motion.ts` 作为唯一动效参数源，`Reveal` 改为七级语义预设；各章节节奏差异化，
环境动画降速，移动端降低复杂度，`prefers-reduced-motion` 保持一致。
详细优化项、验收数据与未验证项见 `site/VISUAL_POLISH_RECORD.md`。

## 补充：PHASE 07 最终 QA（2026-11-23）

按用户要求完成真实运行验收，而非静态代码推断；四档视口、视频与降级链、滚动动画、
3D / 物理交互、性能与生产构建全部重跑通过。明确事实：

- 当前 3D 与物理仍是**程序化示意模型**，本机无真实 GLB / GLTF，未冒充真实结构。
- 物理区块是独立体验，不进入六段主叙事与顶部导航。
- 首屏首选透明 WebP，绿幕 MP4 按需加载；`preload="auto"` 已取消。
- WebP 首帧时长此前异常为 22.6 秒，已统一改写为 45ms/帧（5.985 秒），与 6 秒母片一致。
- 完整交付清单、数据与未验证项见 `site/_verify_final/FINAL_QA_REPORT.md`。

## 素材与架构基线（P01 审查结论）

- 技术栈：React 18.3.1 + TypeScript 5.6.3 + Vite 6.4.6 + Tailwind 3.4.19 + GSAP 3.15.1 + lucide-react 0.469
- 3D 依赖：three / @react-three/fiber / @react-three/drei / framer-motion **均未安装**
- 可复用组件：`ChromaKeyVideo`、`Hero`、`Reveal`、`ProgressBar`、`NavBar`、四个 Section 组件；`config.ts` 为统一素材入口
- 素材：绿幕视频 v2（1920×1080 / 24fps / 6.000s / 144 帧）、透明 WebP、ProRes4444 母版、首帧海报、电影背板
- 缺失：`D:\AI视频\` 不存在；无真实 GLB/GLTF；无 AI 数据中心图、HBM 爆炸结构图、本地字体文件

> 以上为 P01 当时的审查快照。后续变化：3D / Rapier 依赖已安装，本地字体文件已自托管，AI 数据中心与 HBM 结构改用 CSS / 程序化视觉表达；真实模型与官方 Logo 仍缺失。
