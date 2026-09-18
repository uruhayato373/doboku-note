/**
 * note-traffic-normalize.mjs — note ダッシュボード「アクセス状況」の innerText を機械可読へ正規化する純関数群。
 *
 * 取得（Playwright）は scripts/note-traffic-fetch.mjs が担う。ここは文字列→JSON の変換だけで、
 * テスト（tests/note-traffic-normalize.test.mjs）が fixture（tests/fixtures/note-dashboard-*.txt）で契約を固定する。
 *
 * ダッシュボードの構造（2026-09-15 実測・Mac）:
 *   - 「記事の流入元（時系列）のデータテーブル」: 見出し行 `項目\tno referrer(PV)\tnote.com(PV)…`、
 *     データ行 `2026/9\t4,088\t686\t…`（月は YYYY/M・値は 3 桁区切り）
 *   - 「記事の流入元（円グラフ）のデータテーブル」: `項目\t値(PV)\t割合` → `no referrer\t4,628\t62.9%`
 *   - 記事一覧: 「タイトル」ヘッダの後、記事ごとに 3 行（タイトル／`公開中` 等の状態／`YYYY年M月D日`）
 *     ＋ 数値行 `\t133\t5\t2\t-\t-`（インプレッション・PV・スキ・コメント・売上。`-` は 0/なし）
 */

const num = (s) => {
  const t = String(s ?? '').trim();
  if (t === '' || t === '-' || t === '—') return null;
  const n = Number(t.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

/** `2026/9` → `2026-09` */
export function normalizeMonth(label) {
  const m = String(label).trim().match(/^(\d{4})\/(\d{1,2})$/);
  return m ? `${m[1]}-${m[2].padStart(2, '0')}` : null;
}

/**
 * 時系列テーブルを { months: [{ month, sources: {name: pv}, total }] } にする。
 * 見出しが無ければ null（呼び出し側が「検査不成立」にする）。
 */
export function parseReferrerTimeSeries(text) {
  const lines = String(text).split(/\r?\n/);
  const h = lines.findIndex((l) => l.startsWith('記事の流入元（時系列）のデータテーブル'));
  if (h < 0) return null;
  const header = lines[h + 1]?.split('\t') ?? [];
  if (header[0] !== '項目' || header.length < 2) return null;
  const sources = header.slice(1).map((c) => c.replace(/\(PV\)$/, '').trim());
  const months = [];
  for (let i = h + 2; i < lines.length; i++) {
    const cells = lines[i].split('\t');
    const month = normalizeMonth(cells[0]);
    if (!month) break;
    const row = { month, sources: {}, total: 0 };
    sources.forEach((name, j) => {
      const v = num(cells[j + 1]) ?? 0;
      row.sources[name] = v;
      row.total += v;
    });
    months.push(row);
  }
  return months.length ? { sources, months } : null;
}

/** 円グラフテーブル → [{ source, pv, share }] */
export function parseReferrerPie(text) {
  const lines = String(text).split(/\r?\n/);
  const h = lines.findIndex((l) => l.startsWith('記事の流入元（円グラフ）のデータテーブル'));
  if (h < 0) return null;
  const rows = [];
  for (let i = h + 2; i < lines.length; i++) {
    const cells = lines[i].split('\t');
    if (cells.length < 3) break;
    const pv = num(cells[1]);
    const share = Number(String(cells[2]).replace('%', ''));
    if (pv === null || !Number.isFinite(share)) break;
    rows.push({ source: cells[0].trim(), pv, share });
  }
  return rows.length ? rows : null;
}

/** ヘッダ直下の「2026/8/19〜2026/9/15」を { from, to } にする。無ければ null。 */
export function parsePeriod(text) {
  const m = String(text).match(/(\d{4})\/(\d{1,2})\/(\d{1,2})〜(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (!m) return null;
  const d = (y, mo, da) => `${y}-${mo.padStart(2, '0')}-${da.padStart(2, '0')}`;
  return { from: d(m[1], m[2], m[3]), to: d(m[4], m[5], m[6]) };
}

/** 集計カード（インプレッション／ページビュー／スキ／コメント／売上）を拾う。 */
export function parseSummary(text) {
  const lines = String(text).split(/\r?\n/).map((l) => l.trim());
  const pick = (label) => {
    // ラベル行の後に空行を挟んで値が来る（実測: `ページビュー\n\n7,359`）
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] !== label) continue;
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        if (lines[j] === '') continue;
        const v = num(lines[j]);
        if (v !== null) return v;
        break;
      }
    }
    return null;
  };
  return { impressions: pick('インプレッション'), pageViews: pick('ページビュー'), likes: pick('スキ'), comments: pick('コメント'), salesYen: pick('売上') };
}

/**
 * 記事一覧（タイトル・状態・公開日・数値 5 列）→ [{ title, status, publishedAt, impressions, pageViews, likes, comments, salesYen }]
 * 「もっとみる」で追加読込した分も同じ形で連続するので、そのまま拾える。
 */
export function parseArticleRows(text) {
  const lines = String(text).split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === 'タイトル');
  if (start < 0) return [];
  const rows = [];
  for (let i = start + 1; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === 'もっとみる' || t.startsWith('流入元グラフ') || t.startsWith('記事の流入元')) break;
    const status = lines[i + 1]?.trim();
    const date = lines[i + 2]?.trim().match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
    const nums = lines[i + 3]?.split('\t') ?? [];
    if (!t || !/^(公開中|下書き|予約|非公開|限定公開)/.test(status ?? '') || !date || nums.length < 6) continue;
    rows.push({
      title: t,
      status,
      publishedAt: `${date[1]}-${date[2].padStart(2, '0')}-${date[3].padStart(2, '0')}`,
      impressions: num(nums[1]), pageViews: num(nums[2]), likes: num(nums[3]), comments: num(nums[4]), salesYen: num(nums[5]),
    });
    i += 3;
  }
  return rows;
}
