#!/usr/bin/env node
/**
 * check-coconala-wiring.mjs — ココナラ・チャネルの配線ドリフト ガード
 * ---------------------------------------------------------------------------
 * 背景: ココナラは「カタログ（src/lib/coconala-services.ts）＝価格/状態/URL の SoT」と
 *   「state（.claude/state/coconala/*.json）＝受注・KPI の実績」の二層で管理する。
 *   両者が乖離すると、①出品済みなのにサイト導線が出ない/空 URL を出す
 *   ②存在しない serviceId で受注記録が積まれる ③価格改定が実績と食い違う、が起きる。
 *   本ガードは決定論的にその整合を検査する（CLAUDE.md 原則5＝判断不要な検証はコードで）。
 *
 * 検査項目:
 *   1. status:'listed' は serviceUrl 必須（https://coconala.com/services/… 形式）
 *   2. orders-log / kpi-log の serviceId がカタログに実在
 *   3. orders-log の priceYen がカタログの priceYen と一致（価格改定の取り残し検知）
 *   4. sales-log.json の `coconala:<id>` productId の id がカタログに実在
 *   5. listed が1件でもあれば coconala-account.json の profileUrl が非空
 *   6. 一度も出品していない（status:'draft' かつ listedAt 未設定）サービスに受注/KPI 実績が無い
 *   7. カバレッジ: 全カタログ product に listings（category/body）＋商品画像 thumb-*.png がある
 *      （商品追加時の配線漏れ＝publish 失敗/画像なしを機械検知）
 *      ＝未出品なのに閲覧/販売が立つのは論理矛盾（ダミー値の混入・serviceId 取り違えの検知）
 *
 * 使い方:
 *   node scripts/check-coconala-wiring.mjs            # 全検査
 *   node scripts/check-coconala-wiring.mjs --staged   # 関連 staged がある時だけ検査（pre-commit 用）
 *
 * 真実源: .claude/knowledge/reference/coconala-operations.md（運用・スキーマ）
 *        content/note/1級・2級土木/ココナラ展開キット.md（戦略・出品文面）
 * ---------------------------------------------------------------------------
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { checkPauseReasons, findOverdueResume } from './lib/coconala-guards.mjs';
import { todayJst } from './lib/jst-date.mjs';
import { loadManifest as loadAssetManifest } from './lib/asset-storage.mjs';

const ROOT = process.cwd();
const CATALOG_PATH = join(ROOT, 'src/lib/coconala-services.ts');
const ACCOUNT_PATH = join(ROOT, '.claude/config/coconala-account.json');
const ORDERS_PATH = join(ROOT, '.claude/state/coconala/orders-log.json');
const KPI_PATH = join(ROOT, '.claude/state/coconala/kpi-log.json');
const SALES_PATH = join(ROOT, '.claude/state/sales/sales-log.json');
const LISTINGS_PATH = join(ROOT, '.claude/config/coconala-listings.json');
const ASSETS_DIR = join(ROOT, '.claude/config/coconala/assets');

const staged = process.argv.includes('--staged');
if (staged) {
  let changed = '';
  try {
    changed = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACM'], {
      encoding: 'utf-8', maxBuffer: 256 * 1024 * 1024,
    });
  } catch {
    changed = '';
  }
  const relevant = changed.split('\n').some(
    (p) =>
      p.includes('src/lib/coconala-services.ts') ||
      p.includes('.claude/state/coconala/') ||
      p.includes('.claude/config/coconala-account.json') ||
      p.includes('.claude/state/sales/sales-log.json') ||
      p.includes('scripts/check-coconala-wiring.mjs')
  );
  if (!relevant) process.exit(0); // ココナラに無関係な commit → スキップ
}

if (!existsSync(CATALOG_PATH)) {
  console.error('[check-coconala-wiring] ✗ カタログ SoT が見つかりません: src/lib/coconala-services.ts');
  process.exit(1);
}

/** カタログ（SoT）から id / status / serviceUrl / priceYen を抽出。
 *  id → status → serviceUrl の順はファイル規約（verify-note-magazines.mjs の parseSoT 同型）。 */
function parseCatalog() {
  const ts = readFileSync(CATALOG_PATH, 'utf-8');
  // interface 定義部を除外し、SERVICES_RAW 本体だけを対象にする
  const rawStart = ts.indexOf('const SERVICES_RAW');
  const body = rawStart >= 0 ? ts.slice(rawStart) : ts;
  const re = /id:\s*'([^']+)',\s*status:\s*'([^']+)',\s*serviceUrl:\s*'([^']*)'/g;
  const hits = [];
  let m;
  while ((m = re.exec(body)) !== null) {
    hits.push({ id: m[1], status: m[2], serviceUrl: m[3], at: m.index });
  }
  return hits.map((cur, i) => {
    const next = hits[i + 1];
    const slice = body.slice(cur.at, next ? next.at : body.length);
    const pm = slice.match(/priceYen:\s*(\d+)/);
    const lm = slice.match(/listedAt:\s*'([^']*)'/);
    const rm = slice.match(/pauseReason:\s*'([^']*)'/);
    const om = slice.match(/resumeOn:\s*'([^']*)'/);
    return {
      id: cur.id,
      status: cur.status,
      serviceUrl: cur.serviceUrl,
      priceYen: pm ? parseInt(pm[1], 10) : null,
      listedAt: lm ? lm[1] : null,
      pauseReason: rm ? rm[1] : null,
      resumeOn: om ? om[1] : null,
    };
  });
}

function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch (e) {
    return { __parseError: String(e) };
  }
}

const violations = [];
/** 赤で止めるほどではないが人が見るべきもの（復帰忘れ等）。exit code は変えない。 */
const warnings = [];
const catalog = parseCatalog();
if (catalog.length === 0) {
  violations.push('カタログから1件もサービスを抽出できません（SERVICES_RAW の記述順 id→status→serviceUrl を確認）');
}
const byId = new Map(catalog.map((s) => [s.id, s]));
const listed = catalog.filter((s) => s.status === 'listed');

// 1. listed は serviceUrl 必須
for (const s of listed) {
  if (!/^https:\/\/coconala\.com\/services\/\d+/.test(s.serviceUrl)) {
    violations.push(
      `[${s.id}] status:'listed' なのに serviceUrl が不正/空（"${s.serviceUrl}"）。出品後の URL を埋めてください`
    );
  }
}

// 8. paused には理由（pauseReason）が必須。
//    paused は「商品整理で恒久廃止（retired）」と「運営者の長期不在で一時休止（absence）」の
//    2つの意味に多重化する。区別が無いと一括復帰で**恒久廃止した商品まで復活**する
//    （2026-08-05、17件全休止のときに実際に取り違えかけた）。判定は coconala-guards（テスト済み）。
violations.push(...checkPauseReasons(catalog));

// 9. 復帰忘れの検知（長期不在プロトコルの最後の輪）。
//    pauseReason:'absence' で resumeOn を過ぎているのに休止のままなら、売上ゼロのまま
//    誰も気づかない。日付を跨いだだけで赤くなるのは運用を止めるので**警告**に留める。
const today = todayJst();
for (const o of findOverdueResume(catalog, today)) {
  warnings.push(
    `[${o.id}] 復帰予定日 ${o.resumeOn} を ${o.overdueDays} 日過ぎても受付休止のままです` +
      '（復帰: npm run coconala-pause -- --resume --absence --commit）'
  );
}

// 5. listed があるなら account SSOT が埋まっていること
const account = readJson(ACCOUNT_PATH);
if (listed.length > 0) {
  if (!account || account.__parseError) {
    violations.push('listed サービスがあるのに .claude/config/coconala-account.json が読めません');
  } else if (!account.profileUrl) {
    violations.push(
      'listed サービスがあるのに coconala-account.json の profileUrl が空（出品済みならアカウント SSOT を埋める）'
    );
  }
}

// 7. カバレッジ: 全カタログ product に listings エントリ＋商品画像があること
//    （商品追加時の配線漏れ＝publish 失敗/画像なしを pre-commit で機械検知）。
const listingsData = readJson(LISTINGS_PATH);
if (listingsData?.__parseError) violations.push(`coconala-listings.json が JSON として壊れています: ${listingsData.__parseError}`);
const listings = listingsData?.listings || {};
// 退避台帳。ローカルに実体が無いときの第二の根拠（asset-storage が唯一の真実源）。
const assetLedger = loadAssetManifest()?.entries ?? {};
let thumbLocal = 0;
let thumbInLedger = 0;

for (const s of catalog) {
  const l = listings[s.id];
  if (!l) {
    violations.push(`[${s.id}] listings（coconala-listings.json）に本文/カテゴリのエントリがありません（publish が失敗します）`);
  } else {
    if (!l.category?.master || !l.category?.sub) violations.push(`[${s.id}] listings.category（master/sub）が未確定です`);
    if (!l.body) violations.push(`[${s.id}] listings.body（サービス内容本文）が空です`);
  }
  // 商品画像は coconala-asset グループで R2 へ退避してある。**ローカル実体だけを見ない**——
  // 退避済みの端末や CI のクリーンチェックアウトでは実体が無いのが正常で、そこで落とすと
  // 「生成しろ」と言われても生成すべきものが既に在る、という直せない赤になる（2026-08-30）。
  // 判定は「ローカル実体 または 退避台帳」。どちらにも無ければ本当に存在しない。
  const thumbRel = `.claude/config/coconala/assets/thumb-${s.id.replace(/^coconala-/, '')}.png`;
  if (!existsSync(join(ROOT, thumbRel))) {
    if (assetLedger[thumbRel]) {
      thumbInLedger += 1;
    } else {
      violations.push(`[${s.id}] 商品画像 ${thumbRel} がありません（coconala-thumb で生成してください）`);
    }
  } else {
    thumbLocal += 1;
  }
}

// 2 & 3. orders-log の serviceId 実在＋priceYen 一致
const orders = readJson(ORDERS_PATH);
if (orders?.__parseError) violations.push(`orders-log.json が JSON として壊れています: ${orders.__parseError}`);
else if (orders) {
  for (const [i, o] of (orders.orders ?? []).entries()) {
    const svc = byId.get(o.serviceId);
    if (!svc) {
      violations.push(`orders-log[${i}] 未知の serviceId: "${o.serviceId}"（カタログに存在しません）`);
      continue;
    }
    // 見積り（カスタム提案）受注は定価と違うのが正しい取引形態なので、カタログ定価との
    // 一致検査を quote.amountYen との一致検査へ差し替える（検査を消さない＝ドリフト検知は維持）。
    // 2026-08-06 初発生: フルパック ¥10,000 から購入済み模試 ¥2,500 を引いた ¥7,500 の見積り。
    if (o.quote) {
      if (typeof o.quote.amountYen !== 'number') {
        violations.push(`orders-log[${i}] quote.amountYen が数値でありません（${o.serviceId}）`);
      } else if (o.priceYen !== o.quote.amountYen) {
        violations.push(
          `orders-log[${i}] priceYen 不一致: 実績 ${o.priceYen} vs quote.amountYen ${o.quote.amountYen}（${o.serviceId}）`
        );
      }
      if (!o.quote.basis || String(o.quote.basis).trim() === '') {
        violations.push(
          `orders-log[${i}] quote.basis が空です（${o.serviceId}）` +
            ' — 定価と違う額の根拠が無いと、後から値引きミスと正当な見積りを区別できません'
        );
      }
    } else if (typeof o.priceYen === 'number' && svc.priceYen !== null && o.priceYen !== svc.priceYen) {
      violations.push(
        `orders-log[${i}] priceYen 不一致: 実績 ${o.priceYen} vs カタログ ${svc.priceYen}（${o.serviceId}）` +
          ' — 価格改定なら実績は当時の額のままで正なので memo に改定日を書き、カタログ側の改定を確認' +
          '（カスタム見積りなら quote ブロックを付ける）'
      );
    }
  }
}

// 2. kpi-log の serviceId 実在
const kpi = readJson(KPI_PATH);
if (kpi?.__parseError) violations.push(`kpi-log.json が JSON として壊れています: ${kpi.__parseError}`);
else if (kpi) {
  for (const [i, w] of (kpi.weekly ?? []).entries()) {
    if (!byId.has(w.serviceId)) {
      violations.push(`kpi-log[${i}] 未知の serviceId: "${w.serviceId}"（カタログに存在しません）`);
    }
  }
}

// 4. sales-log の coconala:<id> がカタログに実在
const sales = readJson(SALES_PATH);
if (sales && !sales.__parseError) {
  for (const [i, s] of (sales.sales ?? []).entries()) {
    const id = String(s.productId ?? '');
    if (!id.startsWith('coconala:')) continue;
    const svcId = id.slice('coconala:'.length);
    if (!byId.has(svcId)) {
      violations.push(
        `sales-log[${i}] productId "${id}" の id がカタログに存在しません` +
          '（命名規則: coconala:<coconala-services.ts の id>）'
      );
    }
  }
}

// 6. 一度も出品していないサービスに実績が立っていないか
//    （listed → 後で draft/paused へ戻した場合は listedAt が残るので誤検知しない）
const neverListed = new Set(
  catalog.filter((s) => s.status === 'draft' && !s.listedAt).map((s) => s.id)
);
if (neverListed.size > 0) {
  const orderHit = new Set(
    (orders?.orders ?? []).map((o) => o.serviceId).filter((id) => neverListed.has(id))
  );
  const kpiHit = new Set(
    (kpi?.weekly ?? []).map((w) => w.serviceId).filter((id) => neverListed.has(id))
  );
  for (const id of orderHit) {
    violations.push(
      `[${id}] 未出品（status:'draft' かつ listedAt 未設定）なのに orders-log に受注があります` +
        ' — ダミー値の混入か serviceId 取り違え。出品済みならカタログを listed + listedAt へ更新'
    );
  }
  for (const id of kpiHit) {
    violations.push(
      `[${id}] 未出品（status:'draft' かつ listedAt 未設定）なのに kpi-log に実績があります` +
        ' — ダミー値の混入か serviceId 取り違え。出品済みならカタログを listed + listedAt へ更新'
    );
  }
}

if (warnings.length) {
  console.log('[check-coconala-wiring] ⚠ 要対応:');
  for (const w of warnings) console.log(`  - ${w}`);
  console.log('');
}

if (violations.length) {
  console.error('[check-coconala-wiring] ✗ ココナラの配線ドリフトを検出:');
  for (const v of violations) console.error(`  - ${v}`);
  console.error('');
  console.error('対処: src/lib/coconala-services.ts（カタログ SoT）と .claude/state/coconala/*.json、');
  console.error('      .claude/state/sales/sales-log.json の整合を取ってください。');
  console.error('      運用・スキーマの真実源: .claude/knowledge/reference/coconala-operations.md');
  process.exit(1);
}

// 商品画像の判定根拠を必ず出す。台帳側の引き方が壊れても、ローカル実体があるうちは
// 緑のままになる（2026-08-30 に章 OGP で踏んだのと同じ穴）。この数字が両方 0 なら故障。
console.log(
  `[check-coconala-wiring] 商品画像 ${thumbLocal + thumbInLedger}/${catalog.length} 件を確認` +
    `（ローカル実体 ${thumbLocal} / 退避台帳 ${thumbInLedger}）`
);
console.log(
  `[check-coconala-wiring] ✓ カタログ ${catalog.length} 件（listed ${listed.length}）・受注 ${
    orders?.orders?.length ?? 0
  } 件・KPI ${kpi?.weekly?.length ?? 0} 週は整合`
);
