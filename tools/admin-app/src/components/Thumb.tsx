/** ギャラリー用サムネイル。画像は loading="lazy" で可視分だけ取得。 */
export default function Thumb({
  url,
  name,
  tall,
  video,
  children,
}: {
  url: string;
  name: string;
  tall?: boolean;
  video?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="thumb">
      <div className={'frame' + (tall ? ' tall' : '')}>
        {video ? (
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
