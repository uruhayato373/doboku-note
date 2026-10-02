import { type ResolvedHubCta } from '@/lib/hub-cta';
import NotePopCta from '@/components/ui/NotePopCta/NotePopCta';
/** もくじ・季節商品のPOPタイル。リンク・季節切替・計測は既存の解決結果を使う。 */
export default function HubCtaBanner({ cta, placement }: { cta: ResolvedHubCta; placement: string; }) {
  return <NotePopCta href={cta.url} qualification={cta.qual} title={cta.title1} titleAccent={cta.title2}
    subtitle={cta.sub} badge={cta.badge ?? 'note 有料教材'} price={cta.price} button={cta.cta}
    themeVar={cta.themeVar} format="tile" trackLabel={cta.trackLabel} placement={placement} />;
}
