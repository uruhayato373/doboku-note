// log-rewrite の本体。資格ごとの log-rewrite.mjs（scripts-cem・scripts-civil-textbook）が、state の読み書きと違いだけを渡して呼ぶ。
//
// 動作:
//   - 各 result について、page.history の中で wave が一致し action='rewritten' のエントリを探す。
//     見つかれば extras を in-place でマージ（date は温存）。見つからなければ現在時刻で新規エントリを append。
//   - page.status は 'rewritten' に更新。
import { readFileSync } from 'node:fs';

/** history に写す項目（この並びで書く）。資格で使わない項目は omit で外す。 */
export const REWRITE_EXTRA_KEYS = [
  'applied_patterns',
  'added_sections',
  'converted_tables',
  'migrated_images',
  'before_chars',
  'after_chars',
  'added_chars',
  'lint_high_before',
  'lint_high_after',
  'lint_medium_before',
  'lint_medium_after',
  'mojibake',
];

/**
 * results を state に書き込む（state を書き換える・純関数ではないが I/O は無い）。
 * @param {object} opts
 * @param {string[]} [opts.omit] 写さない項目
 * @param {(state:object)=>string|null} [opts.defaultWave] wave の無い result に付ける wave（null なら飛ばす）
 * @param {string} [opts.now] 新規エントリの date
 */
export function applyRewriteResults(state, results, { omit = [], defaultWave = () => null, now = new Date().toISOString() } = {}) {
  const keys = REWRITE_EXTRA_KEYS.filter((k) => !omit.includes(k));
  let merged = 0;
  let appended = 0;
  let skipped = 0;
  for (const r of results) {
    const wave = r?.wave || (r?.slug ? defaultWave(state) : null);
    if (!r || !r.slug || !wave) {
      skipped++;
      continue;
    }
    if (!state.pages[r.slug]) state.pages[r.slug] = { status: 'unscored', history: [] };
    const page = state.pages[r.slug];
    page.status = 'rewritten';
    const extras = {};
    for (const key of keys) if (r[key] !== undefined) extras[key] = r[key];
    const existing = page.history.find((h) => h.wave === wave && h.action === 'rewritten');
    if (existing) {
      Object.assign(existing, extras);
      merged++;
    } else {
      page.history.push({ date: now, action: 'rewritten', wave, ...extras });
      appended++;
    }
  }
  return { merged, appended, skipped };
}

/** CLI の入口: <results.json> を読み、state に書いて件数を出す。 */
export function runLogRewrite({ readState, writeState, omit, defaultWave, argv = process.argv.slice(2) }) {
  const input = argv[0];
  if (!input) {
    console.error('Usage: node log-rewrite.mjs <results.json>');
    process.exit(1);
  }
  const results = JSON.parse(readFileSync(input, 'utf-8'));
  if (!Array.isArray(results)) {
    console.error('[log-rewrite] results.json must be a JSON array');
    process.exit(1);
  }
  const state = readState();
  const { merged, appended, skipped } = applyRewriteResults(state, results, { omit, defaultWave });
  writeState(state);
  console.log(`[log-rewrite] merged=${merged} appended=${appended} skipped=${skipped} total_pages=${Object.keys(state.pages).length}`);
}
