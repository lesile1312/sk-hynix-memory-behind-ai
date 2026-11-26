import type { ReactNode } from 'react';

interface SectionLabelProps {
  no: string;
  en: string;
  zh?: string;
  className?: string;
}

/** 统一章节编号 + 英文小标签 + 细线分隔符 */
export default function SectionLabel({ no, en, zh, className = '' }: SectionLabelProps) {
  return (
    <div className={`flex items-center gap-[clamp(0.75rem,1.6vw,1.5rem)] ${className}`}>
      <span className="font-label text-[clamp(0.6rem,0.75vw,0.7rem)] tracking-[0.28em] text-silver/70">
        {no}
      </span>
      <span className="relative h-px w-[clamp(1.5rem,3vw,3.5rem)] bg-line" aria-hidden="true">
        <span className="absolute -right-px -top-[1px] h-[3px] w-[3px] rounded-full bg-ice/55" />
      </span>
      <span className="eyebrow">{en}</span>
      {zh && <span className="tech-tag ml-1 text-[clamp(0.65rem,0.8vw,0.75rem)] tracking-[0.16em] text-muted">{zh}</span>}
    </div>
  );
}

export function SectionIntro({
  no, en, zh, children, className = '',
}: { no: string; en: string; zh: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <SectionLabel no={no} en={en} />
      {children}
    </div>
  );
}
