import utmTemplates from '../../config/utm-templates.json';

/**
 * サイトから note へ送るリンクの UTM を付ける唯一の関数。
 *
 * source / medium と既定の campaign は面（surface）ごとに config/utm-templates.json の `siteToNote` が持つ
 * （SNS・note からサイトへの契約 `channels` と同じファイル。コードに source / medium を書き写さない）。
 * utm_content と、campaign を面が決めないもの（quiz の試験別 campaign など）は呼び出し側が渡す。
 * 付く順は source・medium・campaign・content（GA4 の見え方と既存リンクを変えない）。
 */
export type NoteUtmSurface = keyof typeof utmTemplates.siteToNote;

type SurfaceTemplate = { source: string; medium: string; campaign?: string };

export function withNoteUtm(
  url: string,
  surface: NoteUtmSurface,
  extra: { campaign?: string; content?: string } = {},
): string {
  const template: SurfaceTemplate = utmTemplates.siteToNote[surface];
  const params = new URLSearchParams({ utm_source: template.source, utm_medium: template.medium });
  const campaign = extra.campaign ?? template.campaign;
  if (campaign) params.set('utm_campaign', campaign);
  if (extra.content !== undefined) params.set('utm_content', extra.content);
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${params.toString()}`;
}
