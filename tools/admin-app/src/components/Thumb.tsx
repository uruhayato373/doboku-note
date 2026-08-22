/** ギャラリー用サムネイル。画像は loading="lazy" で可視分だけ取得。 */
export default function Thumb({
  url,
  name,
  tall,
  video,
  offloaded,
  bucket,
  children,
}: {
  url: string;
  name: string;
  tall?: boolean;
  video?: boolean;
  /** R2 へ退避済みで手元に実体が無い（DN-0111）。src を作らず状態を出す。 */
  offloaded?: boolean;
  bucket?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="thumb">
      <div className={'frame' + (tall ? ' tall' : '')}>
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
          // 大量画像のため next/image ではなく素の img + lazy を使う
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={name} loading="lazy" decoding="async" />
        )}
      </div>
      <div className="meta">
        <span className="name">{name}</span>
        {children ? <span className="tags">{children}</span> : null}
      </div>
    </div>
  );
}
