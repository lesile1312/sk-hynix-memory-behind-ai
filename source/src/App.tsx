import { useEffect, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import NavBar from './components/NavBar';
import ProgressBar from './components/ProgressBar';
import Hero from './components/Hero';
import SectionIntro from './components/SectionIntro';
import SectionHbmTechnology from './components/SectionHbmTechnology';
import AiInfrastructure from './components/AiInfrastructure';
import BrandEnding from './components/BrandEnding';
import ProfileExperience from './components/ProfileExperience';
import PointerFX from './components/PointerFX';
import PageIntro from './components/PageIntro';

gsap.registerPlugin(ScrollTrigger);

/**
 * 六段结构（2026-11-26 调整）：个人介绍页由站点末尾上移到首屏视频之后。
 * HERO → PROFILE 个人介绍页 → INTRODUCTION → HBM TECHNOLOGY → AI INFRASTRUCTURE → BRAND ENDING
 * 个人页仍严格位于视频区之后，视频、Lanyard 物理与既有动画均未改动。
 * 原「PHYSICS 悬挂物理体验」与「EXPLORE THE TECHNOLOGY 交互体验」两个区块
 * 已按需求整体下线（见 _archive_removed_physics/ 与 _archive_removed_experience/）。
 */
export default function App() {
  /* 字体、图片、懒加载资源完成后都要刷新滚动映射，否则 trigger 起点会错位 */
  useLayoutEffect(() => {
    const refresh = () => ScrollTrigger.refresh();
    const raf = requestAnimationFrame(refresh);
    window.addEventListener('resize', refresh, { passive: true });
    window.addEventListener('load', refresh);
    document.fonts?.ready.then(refresh).catch(() => undefined);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', refresh);
      window.removeEventListener('load', refresh);
    };
  }, []);

  /* React 渲染前 hash 目标还不存在，浏览器原生跳转会失效；这里在挂载后补跳 */
  useEffect(() => {
    const jumpToHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      requestAnimationFrame(() => {
        const target = document.getElementById(id);
        if (!target) return;
        const html = document.documentElement;
        const prev = html.style.scrollBehavior;
        html.style.scrollBehavior = 'auto';
        target.scrollIntoView({ block: 'start' });
        html.style.scrollBehavior = prev;
        /* 跳转后连续两帧刷新：先让浏览器 settled，再让 ScrollTrigger 重算 trigger 起点，
           避免直接访问中间章节时 reveal 动画因旧映射不触发。 */
        ScrollTrigger.refresh();
        requestAnimationFrame(() => ScrollTrigger.refresh());
      });
    };
    jumpToHash();
    window.addEventListener('hashchange', jumpToHash);
    return () => window.removeEventListener('hashchange', jumpToHash);
  }, []);

  return (
    <div className="relative bg-void text-paper">
      <PageIntro />
      <PointerFX />
      <ProgressBar />
      <NavBar />
      <main>
        <Hero />
        {/* 个人介绍页：紧跟首屏视频之后（2026-11-26 上移），导航 ABOUT 直接指向此处 */}
        <ProfileExperience />
        <SectionIntro />
        <SectionHbmTechnology />
        <AiInfrastructure />
        <BrandEnding />
      </main>
    </div>
  );
}
