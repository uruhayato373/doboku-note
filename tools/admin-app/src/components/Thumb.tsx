function MaybeLink({ href, children }: { href?: string; children: React.ReactNode }) {
  return href ? (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  ) : (
    <>{children}</>
  );
}

/** ギャラリー用サムネイル。画像は loading="lazy" で可視分だけ取得。 */
export default function Thumb({
  url,
  name,
  tall,
  video,
  offloaded,
  bucket,
  href,
  paper,
  children,
}: {
  url: string;
  name: string;
  tall?: boolean;
  video?: boolean;
  /** R2 へ退避済みで手元に実体が無い（DN-0111）。src を作らず状態を出す。 */
  offloaded?: boolean;
  bucket?: string;
  /** 指定時は画像クリックで開く（新しいタブ）。 */
  href?: string;
  /** 透過図を白地で見せる（図版の目視確認用）。 */
  paper?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="thumb">
      <div className={'frame' + (tall ? ' tall' : '') + (paper ? ' paper' : '')}>
        {offloaded ? (
          // 実体が無いので <img> は出さない（壊れた画像アイコンにしない）。
          // private バケットのものを公開 URL へ変換しないため、リンクも張らない。
          <div style={{ display: 'grid', placeItems: 'center', gap: 4, padding: 12, textAlign: 'center', fontSize: 12, opacity: 0.75 }}>
            <span>R2 にあり（要 hydrate）</span>
            <span style={{ fontSize: 11, opacity: 0.7 }}>{bucket ?? 'r2'}</span>
            <code style={{ fontSize: 10 }}>npm run asset-hydrate</code>
          </div>
        ) : video ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={url} controls preload="none" style={{ maxWidth: '100%', maxHeight: '100%' }} />
        ) : (
          <MaybeLink href={href}>
            {/* 大量画像のため next/image ではなく素の img + lazy を使う */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={name} loading="lazy" decoding="async" />
          </MaybeLink>
        )}
      </div>
      <div className="meta">
        <span className="name">{name}</span>
        {children ? <span className="tags">{children}</span> : null}
      </div>
    </div>
  );
}
