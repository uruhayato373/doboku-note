#!/usr/bin/env node
/**
 * check-coconala-wiring.mjs — ココナラ・チャネルの配線ドリフト ガード
 * ---------------------------------------------------------------------------
 * 背景: ココナラは「カタログ（src/lib/coconala-services.ts）＝価格/状態/URL の SoT」と
 *   「state（data/coconala/*.json）＝受注・KPI の実績」の二層で管理する。
 *   両者が乖離すると、①出品済みなのにサイト導線が出ない/空 URL を出す
 *   ②存在しない serviceId で受注記録が積まれる ③価格改定が実績と食い違う、が起きる。
 *   本ガードは決定論的にその整合を検査する（CLAUDE.md 原則5＝判断不要な検証はコードで）。
 *
 * 検査項目:
 *   1. status:'listed' は serviceUrl 必須（https://coconala.com/services/… 形式）
 *   2. orders.json / kpi.json の serviceId がカタログに実在
 *   3. orders.json の priceYen がカタログの priceYen と一致（価格改定の取り残し検知）
 *   4. data/note/sales.json の `coconala:<id>` productId の id がカタログに実在
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
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { checkPauseReasons, findOverdueResume, resolveThumb } from './lib/coconala-guards.mjs';
import { todayJst } from './lib/jst-date.mjs';
import { loadManifest as loadAssetManifest } from './lib/asset-storage.mjs';
import { loadDriveManifest } from './lib/drive-vault.mjs';
import { parseNotePrices, checkPriceParity, isCoconalaPriceStep } from './lib/coconala-price-parity.mjs';
import { datasetPath } from './lib/datasets.mjs';

const ROOT = process.cwd();
const CATALOG_PATH = join(ROOT, 'src/lib/coconala-services.ts');
const ACCOUNT_PATH = join(ROOT, datasetPath('config.coconala-account'));
const ORDERS_PATH = join(ROOT, datasetPath('coconala.orders'));
const KPI_PATH = join(ROOT, datasetPath('coconala.kpi'));
const SALES_PATH = join(ROOT, datasetPath('note.sales'));
const LISTINGS_PATH = join(ROOT, datasetPath('config.coconala-listings'));
const NOTE_MAGAZINES_PATH = join(ROOT, 'src/lib/note-magazines.ts');
const ASSETS_DIR = join(ROOT, 'content/coconala/assets');

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
      p.includes(`${dirname(datasetPath('coconala.orders'))}/`) ||
      p.includes(datasetPath('config.coconala-account')) ||
      p.includes(datasetPath('config.coconala-listings')) ||
      // note の値上げでココナラが価格ルールの下限を割るのも検知する
      p.includes('src/lib/note-magazines.ts') ||
      p.includes(datasetPath('note.sales')) ||
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
    // 価格改定の履歴（旧定価と有効最終日）。過去受注を受注日時点の定価で突合するために使う
    const hm = slice.match(/priceHistory:\s*\[([^\]]*)\]/);
    const priceHistory = hm
      ? [...hm[1].matchAll(/priceYen:\s*(\d+),\s*until:\s*'([^']+)'/g)].map((x) => ({ priceYen: parseInt(x[1], 10), until: x[2] }))
      : [];
    return {
      id: cur.id,
      status: cur.status,
      serviceUrl: cur.serviceUrl,
      priceYen: pm ? parseInt(pm[1], 10) : null,
      listedAt: lm ? lm[1] : null,
      pauseReason: rm ? rm[1] : null,
      resumeOn: om ? om[1] : null,
      priceHistory,
      notePriceBasis: (slice.match(/notePriceBasis:\s*'([^']*)'/) || [])[1] ?? null,
      notePriceExempt: (slice.match(/notePriceExempt:\s*'([^']*)'/) || [])[1] ?? null,
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

// 8b. 価格がココナラで設定できる刻みか（¥10,000 以下=500円・超=1,000円）。出品前（draft）から止める。
for (const s of catalog) {
  if (s.status === 'paused' || s.priceYen == null) continue;
  if (!isCoconalaPriceStep(s.priceYen)) violations.push(`[${s.id}] priceYen ${s.priceYen} はココナラの価格刻みに合いません（¥10,000以下=500円刻み／超=1,000円刻み）`);
}

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
    violations.push(`listed サービスがあるのに ${datasetPath('config.coconala-account')} が読めません`);
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
// R2 台帳と Drive 台帳の両方（商品画像は 2026-09-05 に Drive vault へ移した）
const assetLedger = { ...(loadAssetManifest()?.entries ?? {}), ...(loadDriveManifest()?.entries ?? {}) };
let thumbLocal = 0;
let thumbInLedger = 0;
let thumbApproved = 0;
let thumbRenderable = 0;
// 承認済みの POP 画像（正本）と、coconala-thumb.mjs の描画定義（THUMB_COPY のキー）。
// coconala-thumb.mjs は実行すると画像を書くので import せず、定義ブロックのキーだけ読む。
const approvedThumbs = readJson(join(ROOT, datasetPath('coconala.thumb-approved')))?.images ?? {};
const thumbScript = existsSync(join(ROOT, 'scripts/coconala-thumb.mjs')) ? readFileSync(join(ROOT, 'scripts/coconala-thumb.mjs'), 'utf-8') : '';
const thumbCopyBlock = thumbScript.match(/const THUMB_COPY = \{([\s\S]*?)\r?\n\};/)?.[1] ?? '';
const renderableThumbs = new Set([...thumbCopyBlock.matchAll(/^ {2}'(coconala-[a-z0-9-]+)': \{/gm)].map((m) => m[1]));

for (const s of catalog) {
  const l = listings[s.id];
  if (!l) {
    violations.push(`[${s.id}] listings（coconala-listings.json）に本文/カテゴリのエントリがありません（publish が失敗します）`);
  } else {
    if (!l.category?.master || !l.category?.sub) violations.push(`[${s.id}] listings.category（master/sub）が未確定です`);
    if (!l.body) violations.push(`[${s.id}] listings.body（サービス内容本文）が空です`);
  }
  // 商品画像は coconala-asset グループで Google Drive vault へ退避してある（2026-09-05 まで R2）。**ローカル実体だけを見ない**——
  // 退避済みの端末や CI のクリーンチェックアウトでは実体が無いのが正常で、そこで落とすと
  // 「生成しろ」と言われても生成すべきものが既に在る、という直せない赤になる（2026-08-30）。
  // 判定は「ローカル実体 または 退避台帳」。どちらにも無ければ本当に存在しない。
  // 2026-09-29: 正本は承認済みの POP 画像（data/coconala/thumb-approved.json）。フラットな thumb-<key>.png は
  // そこから複製する派生物なので、承認原本を先に見る（旧デザインのフラット画像を台帳へ上げ直させない）。
  const thumbRel = `content/coconala/assets/thumb-${s.id.replace(/^coconala-/, '')}.png`;
  const thumb = resolveThumb({
    id: s.id,
    approvedPath: approvedThumbs[s.id]?.path ?? null,
    flatPath: thumbRel,
    has: (rel) => (existsSync(join(ROOT, rel)) ? 'local' : assetLedger[rel] ? 'ledger' : null),
    renderable: renderableThumbs.has(s.id),
  });
  if (!thumb.ok) {
    violations.push(`[${s.id}] 商品画像がありません（承認済み画像・${thumbRel}・coconala-thumb の描画定義のどれも無い）`);
    continue;
  }
  if (thumb.warn && s.status === 'listed') warnings.push(thumb.warn); // 休止・下書きは出品画面に出ないので警告しない
  if (thumb.source === 'approved') thumbApproved += 1;
  if (thumb.where === 'local') thumbLocal += 1;
  else if (thumb.where === 'ledger') thumbInLedger += 1;
  else thumbRenderable += 1;
}

// 10. 価格ルール: PDF 商品は note で同じ中身を最安で買う価格 × 1.1（ココナラの刻みで切り上げ）以上（2026-09-23 ユーザー決定）。
//     ココナラで note より安く売ると note の買い手を奪う。note の値上げでも下限が上がるので note-magazines.ts の変更でも走らせる。
let parityRows = [];
let parityExempt = [];
if (existsSync(NOTE_MAGAZINES_PATH)) {
  const parity = checkPriceParity(catalog, parseNotePrices(readFileSync(NOTE_MAGAZINES_PATH, 'utf-8')));
  violations.push(...parity.violations);
  parityRows = parity.rows;
  parityExempt = parity.exempt;
} else {
  violations.push('src/lib/note-magazines.ts が無く、価格ルール（note より安く売らない）を検査できません');
}

// 2 & 3. orders.json の serviceId 実在＋priceYen 一致
// 受注日時点の定価。priceHistory（until 昇順）で受注日が until 以前の最初の旧定価、無ければ現行価格。
const priceAt = (svc, date) => {
  const hist = [...(svc.priceHistory ?? [])].sort((a, b) => a.until.localeCompare(b.until));
  return hist.find((h) => typeof date === 'string' && date <= h.until)?.priceYen ?? svc.priceYen;
};
const orders = readJson(ORDERS_PATH);
if (orders?.__parseError) violations.push(`${datasetPath('coconala.orders')} が JSON として壊れています: ${orders.__parseError}`);
else if (orders) {
  for (const [i, o] of (orders.orders ?? []).entries()) {
    const svc = byId.get(o.serviceId);
    if (!svc) {
      violations.push(`orders.json[${i}] 未知の serviceId: "${o.serviceId}"（カタログに存在しません）`);
      continue;
    }
    // 見積り（カスタム提案）受注は定価と違うのが正しい取引形態なので、カタログ定価との
    // 一致検査を quote.amountYen との一致検査へ差し替える（検査を消さない＝ドリフト検知は維持）。
    // 2026-08-06 初発生: フルパック ¥10,000 から購入済み模試 ¥2,500 を引いた ¥7,500 の見積り。
    if (o.quote) {
      if (typeof o.quote.amountYen !== 'number') {
        violations.push(`orders.json[${i}] quote.amountYen が数値でありません（${o.serviceId}）`);
      } else if (o.priceYen !== o.quote.amountYen) {
        violations.push(
          `orders.json[${i}] priceYen 不一致: 実績 ${o.priceYen} vs quote.amountYen ${o.quote.amountYen}（${o.serviceId}）`
        );
      }
      if (!o.quote.basis || String(o.quote.basis).trim() === '') {
        violations.push(
          `orders.json[${i}] quote.basis が空です（${o.serviceId}）` +
            ' — 定価と違う額の根拠が無いと、後から値引きミスと正当な見積りを区別できません'
        );
      }
    } else if (typeof o.priceYen === 'number' && svc.priceYen !== null && o.priceYen !== priceAt(svc, o.date)) {
      violations.push(
        `orders.json[${i}] priceYen 不一致: 実績 ${o.priceYen} vs 受注日時点の定価 ${priceAt(svc, o.date)}（${o.serviceId}・${o.date}）` +
          ' — 価格改定なら実績は当時の額のままで正なので、カタログの priceHistory に旧定価と有効最終日を足す' +
          '（カスタム見積りなら quote ブロックを付ける）'
      );
    }
  }
}

// 2. kpi.json の serviceId 実在
const kpi = readJson(KPI_PATH);
if (kpi?.__parseError) violations.push(`${datasetPath('coconala.kpi')} が JSON として壊れています: ${kpi.__parseError}`);
else if (kpi) {
  for (const [i, w] of (kpi.weekly ?? []).entries()) {
    if (!byId.has(w.serviceId)) {
      violations.push(`kpi.json[${i}] 未知の serviceId: "${w.serviceId}"（カタログに存在しません）`);
    }
  }
}

// 4. sales.json の coconala:<id> がカタログに実在
const sales = readJson(SALES_PATH);
if (sales && !sales.__parseError) {
  for (const [i, s] of (sales.sales ?? []).entries()) {
    const id = String(s.productId ?? '');
    if (!id.startsWith('coconala:')) continue;
    const svcId = id.slice('coconala:'.length);
    if (!byId.has(svcId)) {
      violations.push(
        `sales.json[${i}] productId "${id}" の id がカタログに存在しません` +
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
      `[${id}] 未出品（status:'draft' かつ listedAt 未設定）なのに orders.json に受注があります` +
        ' — ダミー値の混入か serviceId 取り違え。出品済みならカタログを listed + listedAt へ更新'
    );
  }
  for (const id of kpiHit) {
    violations.push(
      `[${id}] 未出品（status:'draft' かつ listedAt 未設定）なのに kpi.json に実績があります` +
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
  console.error(`対処: src/lib/coconala-services.ts（カタログ SoT）と ${dirname(datasetPath('coconala.orders'))}/*.json、`);
  console.error(`      ${datasetPath('note.sales')} の整合を取ってください。`);
  console.error('      運用・スキーマの真実源: .claude/knowledge/reference/coconala-operations.md');
  process.exit(1);
}

// 商品画像の判定根拠を必ず出す。台帳側の引き方が壊れても、ローカル実体があるうちは
// 緑のままになる（2026-08-30 に章 OGP で踏んだのと同じ穴）。この数字が両方 0 なら故障。
console.log(
  `[check-coconala-wiring] 商品画像 ${thumbLocal + thumbInLedger + thumbRenderable}/${catalog.length} 件を確認` +
    `（うち承認済み POP ${thumbApproved}・ローカル実体 ${thumbLocal} / 退避台帳 ${thumbInLedger} / 描画定義のみ ${thumbRenderable}・描画定義 ${renderableThumbs.size} 件を読んだ）`
);
console.log(
  `[check-coconala-wiring] 価格ルール: PDF ${parityRows.length} 件を note 基準で検査（対象外 ${parityExempt.length} 件: ${parityExempt.join(', ') || 'なし'}）`
);
console.log(
  `[check-coconala-wiring] ✓ カタログ ${catalog.length} 件（listed ${listed.length}）・受注 ${
    orders?.orders?.length ?? 0
  } 件・KPI ${kpi?.weekly?.length ?? 0} 週は整合`
);
