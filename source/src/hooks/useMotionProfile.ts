import { useEffect, useState } from 'react';

const QUERY = '(max-width: 768px)';

/**
 * 移动端动效档位：用于降低视差幅度与装饰复杂度。
 * reduced-motion 由 useReducedMotion 单独控制，两者互不影响。
 */
export function useMotionProfile() {
  const [mobile, setMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia(QUERY).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return { mobile, parallaxScale: mobile ? 0.55 : 1 } as const;
}
