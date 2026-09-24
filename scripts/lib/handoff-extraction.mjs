// 前送り（次に誰かがやること）を書いた文書を削除・確定するときの判定部品。
// 呼び出し元は scripts/check-handoff-extraction.mjs（pre-commit）だけ。git I/O はここに置かない（純関数＝テスト可能）。
//
// 対象は 2 種類:
//   - handoff（docs/handoffs/*.md）: 本文全体の前送りマーカーを拾い、backlog 同梱を「抽出の強制注意」とする（2026-07-14）
//   - 週次レビュー（docs/reviews/weekly/*.md）: 「来週／次週への申し送り」節の各項目に台帳上の居場所があるかを見る（DN-0230）
//
// 週次レビューの「居場所」（どれか 1 つで可）:
//   backlog     行内の DN-ID が backlog にカードとして在る
//   completed   行内の DN-ID が dispatch-log に done/swept で記録されている（完了して backlog から消えた正常経路）
//   experiment  行内の EXP-ID が experiments.json に在る
//   issue       行内に Issue 参照（#123）がある（automation-failure Issue は起票元の成功で自動クローズされる台帳）
//   routine     振り分け先が「定常」（weekly.md の定常運用＝反復作業で、backlog に置かない。todo-standards §1-2）
//   carried     項目の本文が、削除後も残る週次ファイル（＝最新レビュー＋計画）に同じ文面で残っている

// 前送り（未完了・保留・手動フォロー）を示すマーカー。ヒット＝「backlog へ抽出すべき作業」の疑い。
// 過検出（＝抽出を促す方向）に倒す設計。誤ブロックは SKIP_HANDOFF_EXTRACT=1 で回避可能。
export const FORWARD_MARKERS = [
  '🔴', '🟡', '残タスク', '残り', '次アクション', '次セッション',
  '未実施', '未着手', '未検証', '保留', '別PC', '要確認', '後続メモ',
];

export const HANDOFF_DIRECT_RE = /^docs\/handoffs\/[^/]+\.md$/;
export const WEEKLY_FILE_RE = /^docs\/reviews\/weekly\/[^/]+\.md$/;
export const WEEKLY_REVIEW_RE = /^docs\/reviews\/weekly\/(\d{4}-W\d{2})-review\.md$/;

// 振り分けの必須化はこの週のレビューから（それ以前のレビューは振り分け表記を持たない）。
export const ROUTING_REQUIRED_FROM = '2026-W39';

const HANDOFF_SECTION_RE = /^##\s+(?:来週|次週)への申し送り\s*$/;
const TOP_BULLET_RE = /^(?:[-*+]|\d+\.)\s+(.*)$/;
const DN_RE = /\bDN-\d{4}\b/g;
const EXP_RE = /\bEXP-\d{3}\b/g;
// PR 番号（PR #621）は居場所ではない（マージ済みの記録で、残作業を持たない）
const ISSUE_RE = /(?<!PR ?)(?<![\w&#])#(\d+)\b/;
// 振り分け表記: 「→ 振り分け: DN-0301」「→ 振り分け: 定常」「→ 振り分け: #485」「→ 振り分け: EXP-007」
const ROUTING_RE = /振り分け\s*[:：]\s*(.+)$/;
const NONE_RE = /^(?:なし|特になし|該当なし)[。．]?$/;

const uniq = (arr) => [...new Set(arr)];

/** handoff 本文から前送りマーカーを含む行を返す（1 行 1 マーカー）。 */
export function findForwardMarkers(content) {
  const hits = [];
  String(content ?? '').replace(/\r\n/g, '\n').split('\n').forEach((line, i) => {
    for (const m of FORWARD_MARKERS) {
      if (line.includes(m)) {
        hits.push({ line: i + 1, marker: m, text: line.trim().slice(0, 70) });
        break;
      }
    }
  });
  return hits;
}

/**
 * 週次レビュー／計画の「来週への申し送り」「次週への申し送り」節からトップレベルの箇条書き項目を返す。
 * ネストした子行は親項目の本文に連結する（子行に書いた ID も親の居場所として数える）。
 * @returns {{hasSection:boolean, items:Array<{line:number, text:string, head:string}>}}
 */
export function extractWeeklyHandoffItems(content) {
  const lines = String(content ?? '').replace(/\r\n/g, '\n').split('\n');
  const items = [];
  let inSection = false;
  let hasSection = false;
  let inFence = false;
  let cur = null;
  lines.forEach((ln, i) => {
    if (/^\s*(```|~~~)/.test(ln)) { inFence = !inFence; return; }
    if (inFence) return;
    if (/^#{1,2}\s/.test(ln)) {
      cur = null;
      inSection = HANDOFF_SECTION_RE.test(ln.trim());
      if (inSection) hasSection = true;
      return;
    }
    if (!inSection) return;
    const top = ln.match(TOP_BULLET_RE);
    if (top) {
      cur = { line: i + 1, head: top[1].trim(), text: top[1].trim() };
      items.push(cur);
      return;
    }
    if (cur && /^\s+\S/.test(ln)) cur.text += ` ${ln.trim()}`;
    else if (ln.trim() === '') { /* 空行は項目を閉じない（ゆるい箇条書き） */ }
    else cur = null;
  });
  return { hasSection, items: items.filter((it) => !NONE_RE.test(it.head)) };
}

/** 行内の振り分け表記を読む。無ければ null。 */
export function parseRouting(text) {
  const m = String(text ?? '').match(ROUTING_RE);
  if (!m) return null;
  const dest = m[1].trim();
  return {
    raw: dest,
    dnIds: uniq(dest.match(DN_RE) ?? []),
    expIds: uniq(dest.match(EXP_RE) ?? []),
    issue: ISSUE_RE.test(dest),
    routine: /定常/.test(dest),
  };
}

/** 照合用の正規化: 振り分け表記・装飾・空白を落とす。 */
export function normalizeForMatch(s) {
  return String(s ?? '')
    .replace(/→?\s*振り分け\s*[:：].*$/gm, '')
    .replace(/\*\*|__|`/g, '')
    .replace(/\s+/g, '');
}

/**
 * 1 項目の居場所を返す。無ければ null。
 * @param {string} text 項目本文（子行込み）
 * @param {{backlogIds:Set<string>, completedIds:Set<string>, experimentIds:Set<string>, carriedTexts?:string[]}} ctx
 *   carriedTexts は normalizeForMatch 済みの本文（削除後も残る週次ファイル）
 */
export function findHome(text, ctx) {
  const dn = uniq(String(text).match(DN_RE) ?? []);
  const live = dn.find((id) => ctx.backlogIds.has(id));
  if (live) return { via: 'backlog', ref: live };
  const done = dn.find((id) => ctx.completedIds.has(id));
  if (done) return { via: 'completed', ref: done };
  const exp = uniq(String(text).match(EXP_RE) ?? []).find((id) => ctx.experimentIds.has(id));
  if (exp) return { via: 'experiment', ref: exp };
  const issue = String(text).match(ISSUE_RE);
  if (issue) return { via: 'issue', ref: `#${issue[1]}` };
  const routing = parseRouting(text);
  if (routing?.routine) return { via: 'routine', ref: '定常' };
  const body = normalizeForMatch(text);
  if (body && (ctx.carriedTexts ?? []).some((t) => t.includes(body))) return { via: 'carried', ref: null };
  return null;
}

/**
 * 削除される週次ファイルの申し送り各項目に居場所があるか。
 * @returns {{items:number, missing:Array<{line:number, text:string}>, homes:Record<string,number>}}
 */
export function checkWeeklyDeletion(content, ctx) {
  const { items } = extractWeeklyHandoffItems(content);
  const missing = [];
  const homes = {};
  for (const it of items) {
    const h = findHome(it.text, ctx);
    if (h) homes[h.via] = (homes[h.via] ?? 0) + 1;
    else missing.push({ line: it.line, text: it.head });
  }
  return { items: items.length, missing, homes };
}

/**
 * 確定する週次レビューの申し送り各項目に「振り分け: 先」があり、その先が実在するか。
 * DN-ID は backlog カード（または完了記録）に、EXP-ID は experiments.json に在ること。
 * @returns {{hasSection:boolean, items:number, problems:Array<{line:number, text:string, reason:string}>}}
 */
export function checkWeeklyRouting(content, ctx) {
  const { hasSection, items } = extractWeeklyHandoffItems(content);
  const problems = [];
  for (const it of items) {
    const r = parseRouting(it.text);
    const push = (reason) => problems.push({ line: it.line, text: it.head, reason });
    if (!r) { push('振り分け先の記載が無い'); continue; }
    if (!r.dnIds.length && !r.expIds.length && !r.issue && !r.routine) {
      push(`振り分け先「${r.raw}」が DN-#### / 定常 / #Issue / EXP-### のどれでもない`);
      continue;
    }
    const ghostDn = r.dnIds.filter((id) => !ctx.backlogIds.has(id) && !ctx.completedIds.has(id));
    if (ghostDn.length) push(`${ghostDn.join(', ')} が backlog に無い（起票してから振り分ける）`);
    const ghostExp = r.expIds.filter((id) => !ctx.experimentIds.has(id));
    if (ghostExp.length) push(`${ghostExp.join(', ')} が experiments.json に無い`);
  }
  return { hasSection, items: items.length, problems };
}

/** 週番号（YYYY-Www）が振り分け必須の対象か。 */
export function routingRequired(week) {
  return String(week) >= ROUTING_REQUIRED_FROM;
}

/** backlog 本文からカード ID を返す（parseBacklog の結果を渡す）。 */
export function idsFromCards(cards) {
  return new Set(cards.map((c) => c.id).filter(Boolean));
}

/** dispatch-log.json から完了（done / swept）した ID を返す。 */
export function completedIdsFromDispatchLog(json) {
  const entries = Array.isArray(json?.entries) ? json.entries : [];
  return new Set(entries.filter((e) => e && ['done', 'swept'].includes(e.outcome)).map((e) => e.id).filter(Boolean));
}

/** experiments.json から実験 ID を返す。 */
export function experimentIdsFrom(json) {
  const list = Array.isArray(json?.experiments) ? json.experiments : [];
  return new Set(list.map((e) => e?.id).filter(Boolean));
}
