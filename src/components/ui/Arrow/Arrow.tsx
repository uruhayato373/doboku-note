/**
 * リンク・ボタンの行き先を示す矢印（読み上げない）。2026-11-17 に「→」「›」と lucide の ArrowRight の 3 通りが混在していたのを、
 * 文字の → / ← にそろえた（アイコンの読み込みが要らず、文字の大きさに追従する）。
 */
export default function Arrow({ direction = 'next', className = '' }: { readonly direction?: 'next' | 'prev'; readonly className?: string }) {
  return <span aria-hidden="true" className={`inline-block shrink-0 ${className}`}>{direction === 'prev' ? '←' : '→'}</span>;
}
