import noteFunnel from '../../.claude/config/note-funnel.json';
import type { ExamKey } from '@/lib/exam-brand';

/**
 * note ファネル L2（資格別「もくじ」記事）の解決。
 *
 * もくじは資格ごとの索引で、有料マガジンを 1 本ずつ列挙する代わりにここへ送れば
 * 商品が増えてもサイト側の改修が要らない（`/links` のカードを最大 3 行に保てる理由）。
 * 真実源は `.claude/config/note-funnel.json` の `exams.{key}.L2`
 * （運用・追加手順は `.claude/knowledge/reference/note-funnel-architecture.md`）。
 * URL をここで直書きしない — funnel の監査（audit-note-funnel）と食い違うため。
 */
type FunnelL2 = { readonly noteId: string; readonly title: string; readonly noteUrl: string };

const EXAMS = noteFunnel.exams as Record<string, { L2?: FunnelL2 } | undefined>;

/**
 * funnel の資格キー（`tankan` / `pe-construction` / `civil`）と ExamKey の対応。
 * **1級・2級土木は L2 が 1 本しかない**（`civil` = 土木もくじ）ため両方が同じ記事を指す。
 * note は記事内アンカーに対応しないので、着地はもくじ先頭で共通・UTM で流入元を分ける。
 */
const FUNNEL_KEY_BY_EXAM: Partial<Record<ExamKey, string>> = {
  tankan: 'tankan',
  'pe-construction': 'pe-construction',
  'civil-1': 'civil',
  'civil-2': 'civil',
};

/** 資格の L2 もくじ（無ければ null）。concrete / pe-first-stage は未整備。 */
export function mokujiFor(key: ExamKey): FunnelL2 | null {
  const funnelKey = FUNNEL_KEY_BY_EXAM[key];
  if (!funnelKey) return null;
  return EXAMS[funnelKey]?.L2 ?? null;
}
