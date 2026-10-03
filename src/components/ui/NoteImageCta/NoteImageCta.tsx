import Image from 'next/image';
import { NOTE_LINK_REL } from '@/lib/external-link-rel';

interface NoteImageCtaProps {
  href: string;
  image: {
    src: string; width: number; height: number; alt: string;
    caption?: { title: string; description: string; price: string | undefined };
  };
  trackLabel: string;
  placement: string;
  compact?: boolean;
  className?: string;
}

/** バナーは完成画像のみ。商品一覧のcompactは識別用の商品名だけ添える。 */
export default function NoteImageCta({ href, image, trackLabel, placement, compact = false, className = '' }: NoteImageCtaProps) {
  return <a href={href} target="_blank" rel={NOTE_LINK_REL}
    data-cta="note" data-cta-label={trackLabel} data-cta-placement={placement}
    className={`note-image-cta focus-ring not-prose ${compact ? 'flex items-start bg-(--paper)' : 'block'} overflow-hidden rounded-card-content border border-(--rule-soft) dark:border-(--rule) shadow-card-content transition-shadow hover:shadow-card-hover ${className}`}>
    <Image src={image.src} alt={image.alt} width={image.width} height={image.height}
      unoptimized className={compact ? 'block h-auto w-28 shrink-0 sm:w-44' : 'block h-auto w-full'} />
    {compact && image.caption && <span className="block min-w-0 bg-(--paper) px-4 py-3 text-(--ink)">
      <span className="block text-sm font-bold leading-relaxed">{image.caption.title}</span>
    </span>}
  </a>;
}
