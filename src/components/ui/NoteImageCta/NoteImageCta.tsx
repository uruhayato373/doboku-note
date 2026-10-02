import Image from 'next/image';
import { NOTE_LINK_REL } from '@/lib/external-link-rel';

interface NoteImageCtaProps {
  href: string;
  image: { src: string; width: number; height: number; alt: string };
  trackLabel: string;
  placement: string;
  className?: string;
}

/** 承認済み完成画像を、縦横比と計測を保って表示する。 */
export default function NoteImageCta({ href, image, trackLabel, placement, className = '' }: NoteImageCtaProps) {
  return <a href={href} target="_blank" rel={NOTE_LINK_REL}
    data-cta="note" data-cta-label={trackLabel} data-cta-placement={placement}
    className={`note-image-cta focus-ring not-prose block overflow-hidden rounded-card-content border border-(--rule-soft) dark:border-(--rule) shadow-card-content transition-shadow hover:shadow-card-hover ${className}`}>
    <Image src={image.src} alt={image.alt} width={image.width} height={image.height}
      unoptimized className="block h-auto w-full" />
  </a>;
}
