# SK hynix 网站 — PREMIUM MOTION DESIGN & VISUAL POLISH 记录

日期：2026-11-22  
范围：全站动效、文字层级、滚动节奏、微交互、光影背景、性能与无障碍。  
原则：不新增无意义特效；让已有功能更精致、更协调、更高级。

---

## 1. 审查结论（优化前）

| 问题 | 表现 |
|---|---|
| 动效参数分散 | 各组件手写 `power3.out` / `duration: 0.9` / `scrub: 0.65~1.1`，速度与阻尼不一致 |
| 显现节奏雷同 | `Reveal` 全站统一 `y=28 / 1.1s / top 82%`，章节进入时多个元素几乎同时淡入 |
| 中文正文整块出现 | 两行中文段落是一个文本块，没有分段层级；但没有逐字动画，需保留这一优点 |
| 环境动画偏快 | 呼吸 4s、数据流 5s、扫掠 6s、颗粒亮度 0.045，长时间观看易疲劳 |
| 章节衔接生硬 | Hero 有黑幕过渡，其余章节之间缺少统一的暗场衔接 |
| 移动端未真正降复杂度 | 环境粒子、呼吸、数据流在移动端仍全量运行 |
| 微交互不统一 | 导航、按钮、标签、卡片各自的 hover 时长/位移不同；移动端菜单无激活态 |
| 装饰细节 | 缺少极弱微粒、金属边缘高光；章节细线没有节点感 |
| 旧文案 | 03 章节脚注仍写「3D 模块将在 PHASE 05 接入」，与当前状态不符 |

---

## 2. 统一动效参数

新增 `src/motion.ts` 作为**唯一动效参数源**：

- `EASE.out / soft / inOut / linear`：统一缓动，取消所有 `power3.out` 内联值；滚动映射统一用 `linear`，避免与 scrub 叠加二次缓动。
- `DUR.micro / label / body / title / stage`：统一时长，标题 1.15s、正文 0.95s、标签 0.75s、舞台 1.2s、微交互 0.35s。
- `SCRUB.tight / normal / slow`：0.55 / 0.8 / 1.1 三档，Hero 用紧阻尼、视差用慢阻尼。
- `REVEALS` 七级预设：`label / title / cnTitle / body / card / stage / rule`。

`Reveal` 组件改为消费预设，支持：
- 英文标题：**遮罩揭示 + 字间距 0.045em → 0em + 轻微上移**，不用逐字动画；
- 中文标题：整句上移，不拆字；
- 正文：`staggerSelector` 做**分段淡入**；
- 卡片 / 标签：短促错开，透明度轻变；
- 只在动画期间设置 `will-change`，结束或反向结束后清除，避免长期占用合成层。

---

## 3. 各章节节奏差异

| 章节 | 节奏处理 |
|---|---|
| 01 HERO | 分层入场：编号 → 两行英文（错开 0.13s）→ 中文 → 辅助信息 → 滚动提示；Sticky 三段式运镜保留，scrub 收紧为 0.55 |
| 02 INTRODUCTION | 左侧标题先完成、细线延后 0.42s；右侧中文与正文延后 0.24/0.36s，形成非对称阅读顺序 |
| 03 HBM TECHNOLOGY | 标题与中文主张紧凑；正文两段错开；技术列表按 0.09s 错开；CSS 层叠示意随滚动展开，移动端幅度减半 |
| 04 INTERACTIVE 3D | 舞台先于控件出现；左侧说明三段错开；右侧结构信息与层列表延后；3D 镜头推进仍写 `zoomRef`，不触发 React 渲染 |
| PHYSICS 独立区块 | 标题 → 中文 → 说明 → 拖拽提示依次出现；舞台延后 0.16s；HUD 状态跟随真实交互 |
| 05 AI INFRASTRUCTURE | 标题 → 中文 → 分段正文 → 叙事链 → 三根支撑柱；三条数据流统一 9s 周期，只错开相位 |
| 06 BRAND ENDING | 收尾最慢：标题、中文、主题句、章节索引、品牌字依次出现；光束与光晕用慢阻尼 scrub |

所有正文段落均按语义拆为 `[data-segment]` 块，**没有逐字跳动**。

---

## 4. 科技视觉细节

- **微弱粒子**：新增 `AmbientDust`（12 个固定点位、1px、19–28s 慢速漂移），只放在 Hero 与 05 章节，用于空间纵深；移动端与 reduced-motion 下隐藏。
- **精细电路线条**：章节编号后的细线增加 3px 冰蓝节点；保留局部网格与 3D 电路纹理。
- **金属边缘高光**：`.stage-frame` 顶边改为银灰高光，内缘加 1px 弱反射；四角定位标记保留。
- **冰蓝数据流**：`.line-flow` 周期统一 9s，相位错开；`.signal-sweep` 同为 9s。
- **微弱光晕**：收尾光 scrub 阻尼统一；`breathe` 从 4s 改为 7s，幅度从 0.85–1.15 降为 0.94–1.06，避免闪烁。
- **章节编号 / 细分割线 / 进度条**：结构未变，统一为 `--line` 与冰蓝强调。
- **胶片颗粒**：opacity 0.045 → 0.035，移动端 0.025，reduced-motion 0.02。
- **章节衔接**：`main > section:not(#hero)::before` 加顶部黑色渐变蒙版，Hero 黑幕之后各章节自然接续。
- **旧文案修正**：03 章节脚注改为「视觉示意 · 非真实芯片结构 · 可继续探索交互 3D」。

---

## 5. 鼠标微交互

- 导航：桌面与移动端菜单共用激活色；移动端菜单新增 `data-active` 状态与冰蓝下划线。
- 按钮：`.btn-line` hover 上移 2px、active 回位并加深底色；统一 `--dur-hover` 与 `--ease-out`。
- 技术标签：新增 `.tech-tag`，hover / 父级 hover 时只做颜色与描边变化，不位移。
- 卡片：03 技术列表与 05 支撑柱 hover 位移 4px / 2px，配合细线展开；点击行有短暂底色反馈。
- 3D：模型层 hover 的冰蓝高亮与 `pointer` 光标保留；物理装置 `grab / grabbing` 光标保留。
- 焦点：所有链接、按钮与可聚焦元素增加 `focus-visible` 冰蓝描边，键盘可见。

---

## 6. 性能与无障碍

- 滚动探针、进度条仍走 `requestAnimationFrame` + passive 监听；`Reveal` 不主动触发 React 渲染。
- `will-change` 只在动画期间存在；Hero 舞台与少量视差层保留必要提升。
- 移动端：隐藏粒子；`.line-flow`、`.signal-sweep`、`.breathe` 动画关闭，保留静态视觉；GSAP 视差幅度乘 `parallaxScale = 0.55`。
- `prefers-reduced-motion`：视频暂停、物理静态降级、所有 CSS 动画停止、粒子隐藏、Hero 文案直接可见。

---

## 7. 修改后的文件

- 新增：`src/motion.ts`、`src/hooks/useMotionProfile.ts`、`src/components/AmbientDust.tsx`
- 重写：`src/components/Reveal.tsx`
- 更新：`Hero.tsx`、`SectionIntro.tsx`、`SectionHbmTechnology.tsx`、`InteractiveExperience.tsx`、`PhysicsExperience.tsx`、`AiInfrastructure.tsx`、`BrandEnding.tsx`、`SectionLabel.tsx`、`NavBar.tsx`
- 样式：`src/index.css`
- 验收：`_verify_p06_motion/`（截图 + report.json + hero_timing.py）

---

## 8. 验证结果（2026-11-22）

- `npm run build` 通过；TypeScript 无错误。
- Playwright / Edge 桌面 1440×900、移动 390×844：七个区块导航高亮全部正确；横向溢出 0；console / pageerror / 失败请求 0。
- 首屏分层采样（700ms）：label 1.00、line 0.97、sub 0.10、aux 0、hint 0；到 2600ms 全部为 1，确认不是同时淡入。
- 遮罩标题动画结束后：`clip-path: inset(0%)`、`letter-spacing: 0em`、`will-change: auto`。
- 环境动画周期：breathe 7s、line-flow 9s、signal-sweep 9s、颗粒 0.035；章节渐变蒙版生效。
- 移动端：粒子 `display:none`、line-flow / breathe 动画为 `none`、横向溢出 0。
- reduced-motion：视频 paused、物理显示 `MOTION REDUCED` 静态降级、粒子隐藏、Hero 文案 opacity 1。
- 软件渲染帧率采样（Edge SwiftShader，非真机）：Hero 12fps / 3D 14fps / 物理 13fps / 收尾 144fps；首屏 FCP 约 1000ms。

---

## 9. 未验证与已知取舍

- 真机 GPU 帧率、触摸设备长时间滑动的视觉疲劳度未测；软件渲染数据不代表真机表现。
- 21 MB 透明动画 WebP 仍是首屏最大流量项；本阶段没有更换素材，只降低了动画处理复杂度。
- Vite 仍提示 3D / Rapier 分块 > 500 kB；两者按需加载且离屏暂停，未进入首屏包。
- 官方 Logo 与真实 HBM GLB 仍缺失，约束不变：不绘制仿制商标，程序化模型继续明确标注为示意。
