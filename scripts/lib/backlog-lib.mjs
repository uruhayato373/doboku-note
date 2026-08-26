/**
 * backlog-lib.mjs
 * ---------------------------------------------------------------------------
 * .claude/todo/backlog.md の機械読取（純関数）。
 *
 * カードの構文（tools/admin-app/src/lib/todo.ts はこのファイルのアダプタ）:
 *   `## 🔴/🟡/🟢/🟣 …` = tier セクション
 *   `### タスク名`      = カード（**tier セクションの外にある ### はカードにしない**）
 *   見出し直下 `タグ: [..] [..]` = token 列（本文が始まる前の行だけ採る）
 *
 * パース実装はここが唯一（2026-08-18 に todo.ts の手書き重複を解消）。tier 語彙・4 層の
 * 宣言もここから export し、検査スクリプトと admin の 3 箇所で同じ値を使う
 * （tests/backlog-lib.test.mjs と tests/backlog-parity.test.mjs が固定）。
 *
 * token の解釈（スキーマ v3-unified・後方互換。stats47 と共通 — 正典は
 * `.claude/knowledge/reference/todo-standards.md`、stats47 側実装は
 * `.claude/scripts/lib/backlog-lib.cjs`。改訂は両リポへ同じ差分を当てる）:
 *   [Codex候補]        → codex フラグ
 *   [進行中]           → wip フラグ（作業中。自動処理が触らない目印）
 *   [種類:不具合] 等   → kind（省略時 null）
 *   [検証:cmd]         → verify（完了の決定的ゲート）
 *   [起票:YYYY-MM-DD]  → filed（鮮度測定）
 *   [期日:YYYY-MM-DD]  → due（期限）
 *   上記以外の最初の token → category（無ければ '未分類'）
 *   `### [ID] タイトル` の先頭 [ID]（ID_PATTERN 合致時のみ）→ id（doboku では任意。
 *   stats47 は backlog-loop の ledger 結線に必須）
 *
 * 未知トークンを沈黙させない（2026-08-18）:
 *   旧実装は kv を `実行|検証|起票` の 3 語ハードコードで判定していたため、`[種類:不具合]` の
 *   ような未知キーは「裸トークン」に落ち、**先頭なら category に化け、後方なら extraCategories
 *   に消えた**（実例: `[試験前 7/20]`）。全角コロンの `[種類：不具合]` も同じ経路で化ける。
 *   いまは「コロンを含む token はすべて kv として捕まえ、キーが語彙外なら unknownKeys へ記録」
 *   する。パースは寛容・リントは厳格（検査は check-backlog-schema が行う）。
 *
 * [実行:] 軸の廃止（2026-08-26・doboku / stats47 両方）:
 *   旧 v3 スキーマは [実行:sweep|機械|対話|ユーザー|windows|別環境] で「誰が完了まで持てるか」を
 *   タグに凍結していたが、起票時の判断が陳腐化する（sweep 実測で実態とずれたカード多数）一方、
 *   選定時にモデルが本文を読めば同じ判断を再導出できるため軸ごと削除した。
 *   [実行:] は語彙から外れたので、以後書くと unknownKeys → check-backlog-schema が error にする。
 * ---------------------------------------------------------------------------
 */

/** tier 絵文字 → 内部値。admin の weekly/monthly 見出し判定もこれを使う。 */
export const TIER = { '🔴': 'high', '🟡': 'mid', '🟢': 'low', '🟣': 'hold' };

/**
 * .claude/todo が取る 4 層（information-architecture.md の宣言）。表示順もこの順。
 * ここに無い .md が .claude/todo に増えたら「影の backlog」として検査が surface する
 * （check-backlog-health S9 / check-backlog-schema の staged ゲート）。
 */
/** 4 層の置き場。2026-08-18 に docs/todo から移設（人が直接開かず admin と
 *  エージェントが読むため、能力定義と同じ .claude 配下に寄せた）。 */
export const TODO_DIR = '.claude/todo';

export const TODO_LAYER_FILES = ['backlog.md', 'weekly.md', 'monthly.md', 'annual.md'];

/** tier の実行優先順（小さいほど先） */
export const TIER_ORDER = { high: 0, mid: 1, low: 2, hold: 3 };

/** backlog.md:16-17 が定めるカテゴリ語彙（正典） */
export const CANONICAL_CATEGORIES = [
  'コンテンツ品質',
  'UI・UX',
  '収益化',
  'エージェント・SSOT',
  'SNS・マーケ',
  'インフラ・計測',
];

/**
 * タスクの種類（backlog.md 凡例が定める語彙）。tier=緊急度・category=ドメインとは直交する軸。
 * 決定規則は上から順に最初に当たったものを採る（凡例に同じ表がある）。
 */
export const KINDS = ['不具合', '改善', '意思決定', '制作', '定期'];

/** 選定で最優先にする種類。「今も損失が出ている」ものを tier より先に出す。 */
export const DEFECT_KIND = '不具合';

/** タグ行の kv キー → カード側のフィールド名（[実行:] は 2026-08-26 廃止＝unknownKeys 行き） */
const TAG_KEYS = { 種類: 'kind', 検証: 'verify', 起票: 'filed', 期日: 'due' };

/**
 * カード ID の形（stats47 docs-governance の idPattern と同一）。ハイフンを最低 1 つ要求するので、
 * `[WIP]` のような 1 語ブラケットをタイトル先頭に書いても ID に化けない。
 */
export const ID_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)+$/;

/**
 * doboku-note のカード ID。2026-08-18 に全 91 枚へ付番し、**必須**へ移行した
 * （monthly/weekly が本文を複製せず ID で backlog を参照するため／docs/ の恒久文書から
 *  実行タスクを指すため）。カテゴリや優先度は将来変わるので ID へ含めない。
 * 一度付けた番号は再利用しない（削除しても欠番のままにする）。
 */
export const DOBOKU_ID_PATTERN = /^DN-\d{4}$/;

/** `### [ID] タイトル` から id を切り出す。ID_PATTERN に合わなければ id=null・タイトルはそのまま */
export function splitHeadingId(headingText) {
  const m = headingText.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (m && ID_PATTERN.test(m[1])) return { id: m[1], title: m[2].trim() };
  return { id: null, title: headingText.trim() };
}

function tierOf(text) {
  for (const [emoji, tier] of Object.entries(TIER)) if (text.includes(emoji)) return tier;
  return null;
}

/**
 * コードフェンスの中かどうかを行ごとに返すトラッカー。
 * backlog.md にはフェンスが 6 対あり、bash ブロックにコメント `## ...` を 1 行書いた瞬間に
 * tier セクションが偽発生してカードが誤配置される。検査で見張るのではなくパーサで正す。
 * 開始フェンスの記号と長さを覚え、同種・同長以上でだけ閉じる（CommonMark 準拠の簡易版）。
 */
function fenceTracker() {
  let open = null;
  return (ln) => {
    const m = ln.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (m) {
      const marker = m[1][0];
      const len = m[1].length;
      if (!open) { open = { marker, len }; return true; }
      if (marker === open.marker && len >= open.len && !ln.slice(m[0].length).trim()) {
        open = null;
        return true;
      }
    }
    return Boolean(open);
  };
}

export function parseTagLine(raw) {
  const tokens = [...raw.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);
  const out = {
    tokens,
    codex: false,
    wip: false,
    category: '未分類',
    kind: null,
    verify: null,
    filed: null,
    due: null,
    unknownKeys: [],
    unknownCategories: [],
  };
  const rest = [];
  for (const t of tokens) {
    if (t === 'Codex候補') { out.codex = true; continue; }
    if (t === '進行中') { out.wip = true; continue; }
    // 全角コロンも受理する（日本語入力で現実に起きる。旧実装だと黙って category に化けた）
    const kv = t.match(/^([^:：]+)[:：]\s*(.+)$/);
    if (kv) {
      const field = TAG_KEYS[kv[1].trim()];
      if (field) out[field] = kv[2].trim();
      else out.unknownKeys.push({ key: kv[1].trim(), value: kv[2].trim(), raw: t });
      continue;
    }
    rest.push(t);
  }
  if (rest.length) out.category = rest[0];
  out.extraCategories = rest.slice(1);
  out.unknownCategories = rest.filter((c) => !CANONICAL_CATEGORIES.includes(c));
  return out;
}

/**
 * backlog.md 本文をカード配列へ。
 * @param {string} text backlog.md の中身
 * @returns {Array<{id:string|null,line:number,tier:string,title:string,category:string,kind:string|null,
 *                  codex:boolean,wip:boolean,verify:string|null,filed:string|null,due:string|null,
 *                  hasTagLine:boolean,tokens:string[],extraCategories:string[],
 *                  unknownKeys:Array<{key:string,value:string,raw:string}>,
 *                  unknownCategories:string[],body:string}>}
 */
export function parseBacklog(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let tier = null;
  let cur = null;
  const fence = fenceTracker();
  const flush = (endLineNo) => {
    if (cur) {
      // 末尾の空行はカードに含めない（行番号削除で段落の区切りが崩れないように）
      let end = endLineNo;
      while (end > cur.startLine && lines[end - 1].trim() === '') end -= 1;
      cur.endLine = end;
      cur.body = cur.bodyLines.join('\n').trim();
      delete cur.bodyLines;
      out.push(cur);
      cur = null;
    }
  };
  lines.forEach((ln, i) => {
    const lineNo = i + 1;
    // フェンス内の `##`/`###`/`タグ:` は本文（コマンド例やテンプレ）であって構造ではない
    if (fence(ln)) { if (cur) cur.bodyLines.push(ln); return; }
    if (/^###\s+/.test(ln)) {
      flush(lineNo - 1);
      // tier セクションの外にある ### はカードにしない（todo.ts:69 と同じ挙動）
      if (tier) {
        const { id, title } = splitHeadingId(ln.replace(/^###\s+/, '').trim());
        cur = {
          line: lineNo,
          startLine: lineNo,
          endLine: lineNo,
          id,
          tier,
          title,
          category: '未分類',
          kind: null,
          codex: false,
          wip: false,
          verify: null,
          filed: null,
          due: null,
          hasTagLine: false,
          tokens: [],
          extraCategories: [],
          unknownKeys: [],
          unknownCategories: [],
          body: '',
          bodyLines: [],
        };
      }
      return;
    }
    if (/^##\s+/.test(ln)) {
      flush(lineNo - 1);
      tier = tierOf(ln);
      return;
    }
    if (!cur) return;
    const tag = ln.match(/^タグ:\s*(.+)/);
    // 本文が始まる前の タグ: 行だけ採る（todo.ts:92 と同じ）
    if (tag && cur.bodyLines.filter((l) => l.trim()).length === 0 && !cur.hasTagLine) {
      Object.assign(cur, parseTagLine(tag[1]), { hasTagLine: true });
      return;
    }
    cur.bodyLines.push(ln);
  });
  flush(lines.length);
  return out;
}

/**
 * tier セクションの外に取り残された `###`（パーサーが黙って捨てる行）を返す。
 * 「見えていないタスク」の検出用。
 */
export function findOrphanHeadings(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let tier = null;
  const fence = fenceTracker();
  lines.forEach((ln, i) => {
    if (fence(ln)) return;
    if (/^##\s+/.test(ln) && !/^###/.test(ln)) { tier = tierOf(ln); return; }
    if (/^###\s+/.test(ln) && !tier) out.push({ line: i + 1, title: ln.replace(/^###\s+/, '').trim() });
  });
  return out;
}

/**
 * 選定。コードで決定しモデルに委ねない（CLAUDE.md §5）。
 * @param {Array} cards parseBacklog の出力
 * @param {{limit?:number, classifyLimit?:number}} opts
 */
export function pickTasks(cards, opts = {}) {
  const limit = opts.limit ?? 2;
  const classifyLimit = opts.classifyLimit ?? 2;

  const byTier = (a, b) => (TIER_ORDER[a.tier] ?? 9) - (TIER_ORDER[b.tier] ?? 9) || a.line - b.line;

  // 実行候補の順序: 不具合が第1キー、tier は第2キー。
  // tier がもはや不具合の緊急度を表していない（26 件中 5 件が 🟢＝時期未定に沈む）ため、
  // 壊れているものを先に出す。種類未付与は不具合として扱わない（移行中に順序を壊さないため）。
  const byKindThenTier = (a, b) =>
    (a.kind === DEFECT_KIND ? 0 : 1) - (b.kind === DEFECT_KIND ? 0 : 1) || byTier(a, b);

  // wip（[進行中]）は hold と同じ扱い＝自動選定バケットから外し、専用カウンタで数える
  // （DN-0093 批判的レビュー課題3: 選定器が wip を除外せず、複数セッション・Codex との
  //  同時実行防止が機能していなかった。note・移行・一括編集での競合事故を防ぐ）。
  const isAuto = (c) => c.tier !== 'hold' && !c.wip;

  // 実行候補: hold・wip 以外の全カード（判断待ち／作業中は自動選定しない）。
  // 旧 [実行:] 軸（誰が完了まで持てるか）は 2026-08-26 に廃止。単独で回せるかの判断は
  // 選定側のモデルが本文を読んで行う（タグに凍結すると陳腐化するため）。
  const runnable = cards.filter(isAuto).sort(byKindThenTier);

  const holdTotal = cards.filter((c) => c.tier === 'hold').length;
  const wip = cards.filter((c) => c.tier !== 'hold' && c.wip).sort(byTier);
  const wipTotal = wip.length;
  // 3 バケットは総数の真の分割であること。破れたら分類漏れ＝検査不成立として呼び出し側が落とす。
  const partitionOk = runnable.length + holdTotal + wipTotal === cards.length;

  // 分類キュー: kind が欠けているもの（partition ではなく作業キュー）
  const needsTag = cards
    .filter((c) => isAuto(c) && !c.kind)
    .sort(byTier)
    .map((c) => ({ ...c, missing: ['種類'] }));

  // 不具合の全件（limit を掛けない。沈没の可視化が目的なので上限を掛けると意味が消える）
  const defects = cards.filter((c) => c.kind === DEFECT_KIND).sort(byTier);
  const kindCount = cards.reduce((a, c) => ((a[c.kind ?? '未分類'] = (a[c.kind ?? '未分類'] ?? 0) + 1), a), {});

  return {
    total: cards.length,
    order: 'kind-then-tier',
    run: runnable.slice(0, limit),
    runnableTotal: runnable.length,
    classify: needsTag.slice(0, classifyLimit),
    needsTagTotal: needsTag.length,
    kindMissingTotal: cards.filter((c) => !c.kind).length,
    kindCount,
    defects,
    sunkDefects: defects.filter((c) => c.tier === 'low' || c.tier === 'hold'),
    holdTotal,
    wip,
    wipTotal,
    partitionOk,
  };
}
