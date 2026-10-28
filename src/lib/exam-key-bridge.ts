import { QUALIFICATION_TO_EXAM_KEY, type ExamKey } from '@/lib/exam-brand';
import { listedCoconalaServices, type CoconalaService } from '@/lib/coconala-services';

/**
 * 資格キーの二重体系を橋渡しする。
 *
 * サイト内の表示ブランドは `ExamKey`（`tankan` / `civil-1` …＝exam-brand.ts）、
 * 外部チャネルの商品カタログ（ココナラ）は `examScope`（`pe-comprehensive-management` …
 * ＝categories.json 準拠）と、**同じ資格を別の語彙で呼んでいる**。
 * 変換を各所に散らすとドリフトするのでここに集約する。
 */
// 1級・2級土木だけはカタログ側も civil-1 / civil-2（ExamKey と同じ語）。それ以外は registry の資格 id（categories.json 準拠）
const CIVIL_SCOPE: Partial<Record<ExamKey, string>> = { 'civil-1': 'civil-1', 'civil-2': 'civil-2' };
/** ExamKey → examScope。資格 id → ExamKey の正本（exam-brand.ts の QUALIFICATION_TO_EXAM_KEY）を逆に引いて作る（表を写さない） */
const EXAM_SCOPE_BY_KEY: Partial<Record<ExamKey, string>> = Object.fromEntries(
  Object.entries(QUALIFICATION_TO_EXAM_KEY).map(([qualification, key]) => [key, CIVIL_SCOPE[key] ?? qualification]),
);

/** ExamKey → 商品カタログ側の examScope 値。対応が無い資格は null。 */
function toExamScope(key: ExamKey): string | null {
  return EXAM_SCOPE_BY_KEY[key] ?? null;
}

/**
 * 代表 1 件を選ぶ優先順位。
 *
 * `/links` の 3 行目は「自分の答案を見てもらう / 道具を手に入れる」枠なので、
 * **人が介在するサービス（診断・添削・作成）を PDF 商品より優先**する。
 * ココナラのカタログには order/priority が無いため、id の語幹で判定する。
 * 該当が無ければ listed の先頭（＝カタログ定義順）にフォールバックする。
 */
const COCONALA_PRIORITY = ['tensaku', 'shindan', 'sakusei', 'kit'];

function coconalaRank(service: CoconalaService): number {
  const i = COCONALA_PRIORITY.findIndex((k) => service.id.includes(k));
  return i === -1 ? COCONALA_PRIORITY.length : i;
}

/** 資格に紐づく listed ココナラサービスの代表 1 件（無ければ null）。 */
export function pickCoconalaFor(key: ExamKey): CoconalaService | null {
  const scope = toExamScope(key);
  if (!scope) return null;
  const matched = listedCoconalaServices().filter((s) => s.examScope.includes(scope as never));
  if (matched.length === 0) return null;
  return [...matched].sort((a, b) => coconalaRank(a) - coconalaRank(b))[0] ?? null;
}
