import { useEffect, useRef, useState } from 'react';
import { MEDIA } from '../config';

/**
 * 页面加载动画（PART 09 / 10）
 * - 一次性的品牌开场：Logo 由模糊到清晰 + 横线向两侧收束 + 整层淡出
 * - 不阻塞交互：overlay 为 pointer-events-none，动画结束即卸载
 * - 仅桌面与正常动效偏好播放；移动端 / reduced-motion / 静态截图通道直接跳过
 */
export default function PageIntro() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('reveal') === 'all') return;
    const fine = window.matchMedia('(min-width: 769px)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || reduced.matches) return;

    /* 已访问过则不再重复播放，避免刷新打扰 */
    try {
      if (sessionStorage.getItem('sk-intro-seen')) return;
      sessionStorage.setItem('sk-intro-seen', '1');
    } catch { /* 隐私模式下忽略 */ }

    setShow(true);
    const t1 = window.setTimeout(() => setLeaving(true), 1500);
    const t2 = window.setTimeout(() => setShow(false), 2300);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, []);

  if (!show) return null;
  return (
    <div ref={rootRef} className={`page-intro ${leaving ? 'page-intro--out' : ''}`} aria-hidden="true">
      <div className="page-intro__center">
        {MEDIA.logo ? (
          <img src={MEDIA.logo} alt="" className="page-intro__logo" />
        ) : (
          <span className="font-label text-lg tracking-[0.3em] text-paper">SK hynix</span>
        )}
        <div className="page-intro__line"><span /></div>
        <span className="font-label text-[0.55rem] tracking-[0.32em] text-ice/55">THE MEMORY BEHIND AI</span>
      </div>
    </div>
  );
}
