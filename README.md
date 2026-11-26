# SK hynix — THE MEMORY BEHIND AI

公开站点（GitHub Pages）：https://lesile1312.github.io/sk-hynix-memory-behind-ai/

## 仓库结构
- 根目录：构建产物，`index.html` 在根，供 GitHub Pages 直接托管。
- `source/`：原始 Vite + React + TypeScript 源码、静态资源与依赖清单。
  - `source/package.json` / `source/package-lock.json`：依赖与精确锁定版本。
  - `source/src/`：组件、样式、运动系统与 3D 场景源码。
  - `source/public/`：视频、GLB/WebP、图标等原始素材。
- `tools/deploy-ghpages-api.mjs`：本次使用的 REST API 部署脚本（token 仅从环境变量读取）。

## 本地复现
```bash
cd source
npm ci
npm run dev      # 开发预览
npm run build    # 输出到 source/dist
npm run preview
```

## 关于体积与性能（三者不要混用）
- 仓库中 `dist` 文件的约 28.6 MB 是**磁盘上的未压缩体积**，不是网络传输量，也不能代表运行性能。
- 浏览器 Performance API 实测（无痕 Edge，1440×900，GitHub Pages 的 gzip）：
  - 仅首屏：20 个请求，传输 **3.61 MB**（解码后 6.01 MB），TTFB 1.13s，load 1.66s。
  - 滚完全部 6 个章节：22 个请求，传输 **11.43 MB**（解码后 17.93 MB），TTFB 2.24s，load 3.24s。
  - 最大单项：HBM GLB 传输 7.79 MB（解码 11.83 MB）；Hero MP4 1.12 MB；Lanyard 懒加载块 785 KB（解码 2.10 MB）。
- 3D 与工牌为懒加载：HBM GLB 在进入技术章节后加载，软件渲染环境约 10–15 秒才出图。
- 帧率数据来自 Edge SwiftShader **软件渲染**，只代表该环境；**真机 GPU 帧率未测**。
- 公开链接无 sharecode、无 cookie 要求，静态资源均返回 200。
