import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { MEDIA, NAV_LINKS, SCROLL_SECTIONS } from '../config';

/** 顶部导航：透明悬浮 -> 滚动加深；当前章节状态反馈；移动端独立菜单 */
export default function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>('hero');
  const [open, setOpen] = useState(false);

  /* 滚动深度 + 当前章节：单次 rAF 内完成，passive 监听 */
  useEffect(() => {
    let raf = 0;
    let scheduled = false;
    const update = () => {
      scheduled = false;
      setScrolled(window.scrollY > 48);

      /* 以视口上方 42% 处的探针判定所处章节，快速跳转也不会漏判。 */
      const probe = window.scrollY + window.innerHeight * 0.42;
      let current: string = SCROLL_SECTIONS[0].id;
      for (const s of SCROLL_SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && probe >= el.offsetTop) current = s.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (scheduled) return;
      scheduled = true;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  /* 菜单打开时锁定背景滚动 */
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const isActive = (href: string) => active === href.replace('#', '');

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-all duration-500"
      style={{
        backgroundColor: scrolled ? 'rgba(5,5,7,0.82)' : 'rgba(5,5,7,0)',
        backdropFilter: scrolled ? 'blur(18px)' : 'blur(0px)',
        WebkitBackdropFilter: scrolled ? 'blur(18px)' : 'blur(0px)',
        borderBottom: scrolled ? '1px solid var(--line)' : '1px solid transparent',
      }}
    >
      <div
        className="mx-auto flex h-16 max-w-[1600px] items-center justify-between md:h-[76px]"
        style={{ paddingInline: 'var(--gutter)' }}
      >
        <a href="#hero" data-magnetic className="group flex items-center gap-3" aria-label="SK hynix 首页">
          {MEDIA.logo ? (
            <img src={MEDIA.logo} alt="SK hynix" className="h-6 w-auto" />
          ) : (
            /* 官方 Logo 素材缺失：仅用品牌标准字，不绘制仿制商标 */
            <span className="font-label text-[17px] font-medium tracking-[0.18em] text-paper transition-colors duration-300 group-hover:text-ice">
              SK hynix
            </span>
          )}
        </a>

        <nav className="hidden items-center gap-clamp md:flex" aria-label="主导航"
             style={{ gap: 'clamp(1.5rem, 3vw, 3.5rem)' }}>
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="nav-link"
              data-magnetic
              data-active={isActive(l.href)}
              aria-current={isActive(l.href) ? 'true' : undefined}
            >
              {l.en}
            </a>
          ))}
        </nav>

        <button
          className="text-paper md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? '关闭菜单' : '打开菜单'}
          aria-expanded={open}
        >
          {open ? <X size={22} strokeWidth={1.4} /> : <Menu size={22} strokeWidth={1.4} />}
        </button>
      </div>

      {/* 移动端独立菜单 */}
      <div
        className="overflow-hidden transition-[max-height,opacity] duration-500 md:hidden"
        style={{ maxHeight: open ? '70vh' : 0, opacity: open ? 1 : 0,
                 backgroundColor: open ? 'rgba(5,5,7,0.97)' : 'rgba(5,5,7,0)' }}
      >
        <nav className="flex flex-col px-[var(--gutter)] pb-10 pt-4" aria-label="移动导航">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              data-active={isActive(l.href)}
              className="mobile-nav-link flex items-baseline justify-between border-b border-line py-4"
            >
              <span className="font-label text-xs tracking-[0.24em] text-paper">{l.en}</span>
              <span className="text-xs text-muted">{l.zh}</span>
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
