import Image from 'next/image';
import type { CSSProperties } from 'react';
import type { NoteMagazine } from '@/lib/note-magazines';
import { NOTE_LINK_REL } from '@/lib/external-link-rel';

interface NotePopCtaProps {
  href: string;
  qualification: string;
  title: string;
  titleAccent?: string;
  subtitle?: string;
  badge?: string;
  price?: string | undefined;
  button: string;
  themeVar: string;
  pose?: NoteMagazine['ctaPose'];
  format?: 'body' | 'tile' | 'compact';
  trackLabel: string;
  placement: string;
  className?: string;
}

/** note CTAの共通POP表示。文字・ボタンはHTML、人物だけを透過画像で配信する。 */
export default function NotePopCta({
  href, qualification, title, titleAccent, subtitle, badge, price, button,
  themeVar, pose = 'pointing', format = 'body', trackLabel, placement, className = '',
}: NotePopCtaProps) {
  const external = !href.startsWith('/');
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? NOTE_LINK_REL : undefined}
      data-cta="note"
      data-cta-label={trackLabel}
      data-cta-placement={placement}
      className={`note-pop-cta note-pop-cta--${format} focus-ring not-prose group block overflow-hidden rounded-card-content border border-(--rule-soft) dark:border-(--rule) shadow-card-content transition-shadow hover:shadow-card-hover ${className}`}
      style={{ '--note-pop-theme': `var(${themeVar})` } as CSSProperties}
    >
      <div className="note-pop-layout">
        <div className="note-pop-copy">
          <span className="note-pop-qualification">{qualification}</span>
          {badge && <span className="note-pop-badge">{badge}</span>}
          <span className="note-pop-title">
            {title}
            {titleAccent && <span className="note-pop-title-accent">{titleAccent}</span>}
          </span>
          {subtitle && <span className="note-pop-subtitle">{subtitle}</span>}
        </div>
        <div className="note-pop-character" aria-hidden="true">
          <Image
            src={`/images/character/cta-${pose}.webp`}
            alt=""
            fill
            sizes={format === 'tile' ? '120px' : '(max-width: 640px) 120px, 200px'}
            className="note-pop-character-image"
          />
        </div>
        <span className="note-pop-button">
          {price && <span className="note-pop-price">{price}</span>}
          <span>{button}</span>
          <span aria-hidden="true">›</span>
        </span>
      </div>
    </a>
  );
}
