#!/usr/bin/env node
/**
 * check-figure-crop-integrity.mjs — 図クロップの画素ジオメトリ検査（機械ゲート）
 *
 * 既存の図監査（audit-figure-text.mjs = OCR で答え/本文テキスト写り込みを分類、
 * build-figure-provenance.mjs = 鮮明度・出所）は「テキストの内容」しか見ないため、
 *   A) クロップ縁での図・文字の切断（例: r07-a-fig-02 下端の「収縮限界」欠け）
 *   B) 縁近くの孤立インク断片＝隣接図版のキャプション写り込み（例: r07-a-fig-04 下端のルビ行）
 * が needs:ok / textStatus:clean のまま素通りしていた。本スクリプトは画素レベルで検出する。
 *
 * ルール（★=CI ブロッキング / それ以外は情報のみ・baseline 追跡はするが CI は落とさない）:
 *   ★ STRAY_SLIVER (HIGH) … 上下端の極薄インク島（≤6px かつ ≤1%H）が白ギャップで本体から分離＝
 *                          隣接図の切れ端＝写り込み。フルハイトの正当ラベル/軸と分離できる唯一の
 *                          高精度シグナル（fig-04=5px/fig13=3px を捕捉、15-38px の正当ラベルを落とす）。
 *   EDGE_CUT (HIGH表示)    … margin=0 で縁2行/内側4行の密度比≥0.5＝ストローク中割りの疑い。ただし
 *                          finished 図では tight-crop（正当な密着）と幾何で判別不能（実測 538/643 が
 *                          縁接触＝旧常態）。**情報のみ**。真価は下記の予防フックで発揮する。
 *   EDGE_LINE / EDGE_TIGHT (LOW) … 縁の直線（罫線/軸/枠）/ 先細り接触（端点タイトトリム）。正当。
 *   STRAY_LABEL (LOW)     … スライバーより厚い分離島（小見出し/軸/写り込みのいずれか・要目視）。
 *   THIN_MARGIN (LOW)     … 白マージンが 4px 未満の辺。切断予備軍の注意喚起。
 *
 * 既知の限界（正直に明記）: 旧 recrop パイプラインは切断後に白 border を付加するため、
 * 「切断済み＋白枠」の legacy 図（r07-a-fig-02「収縮限界」欠け型）は画素が既に失われており
 * 機械では高精度検出できない（先細り/突然終端ヒューリスティックはハッチング面・平底図形で
 * FP 多発を実測し不採用）。対策は予防側: figure-recrop.mjs が border 付加**前**の生クロップに
 * 本スクリプトの EDGE_CUT 検査を掛け、切断を持ち込んだ時点で検出する（生クロップでは切断=縁接触が成立）。
 *
 * 写真（白率 < 50%）は線画前提の検査が成立しないため自動スキップ（photo-like と報告）。
 *
 * 運用: 既存コーパスの違反は baseline（.claude/state/quality/figure-crop-baseline.json）に
 * 登録し、--ci では baseline に無い**新規違反のみ** exit 1（content-quality-ratchet と同方式）。
 * フルレポートは .claude/state/quality/figure-crop-report.json（管理画面・分析用）。
 *
 * Usage:
 *   node scripts/check-figure-crop-integrity.mjs                  # 全走査 + レポート出力
 *   node scripts/check-figure-crop-integrity.mjs --ci             # baseline 比の新規違反で exit 1
 *   node scripts/check-figure-crop-integrity.mjs --update-baseline
 *   node scripts/check-figure-crop-integrity.mjs --file <img>     # 1枚だけ検査（figure-recrop の自己検証用）
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, relative, dirname } from 'node:path';
import sharp from 'sharp';
import { SITE_CONTENT_ROOT } from './lib/repository-paths.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const POSTS_DIR = SITE_CONTENT_ROOT;
const BASELINE = join(ROOT, '.claude', 'state', 'quality', 'figure-crop-baseline.json');
const REPORT = join(ROOT, '.claude', 'state', 'quality', 'figure-crop-report.json');

// ── チューニング定数 ─────────────────────────────────────────────
const INK_THRESHOLD = 160;      // grey < 160 をインクとみなす（スキャン線画のアンチエイリアス込み）
const NOISE_LINE_FRAC = 0.002;  // 1ラインのインク率がこれ未満なら「白ライン」（スキャンノイズ許容）
const FRAME_EDGE_FRAC = 0.55;   // 縁ラインのインク率がこれ以上の辺が4辺 → 枠付き図
const THIN_MARGIN_PX = 4;       // これ未満の白マージンは LOW
const STRAY_BAND_FRAC = 0.12;   // 上下端から画像高の 12% 以内で始まる島だけを断片候補にする
const STRAY_MAX_H_FRAC = 0.06;  // 断片（LABEL 含む）の高さ上限は画像高の 6% 以下
const STRAY_MAX_INK_FRAC = 0.04;// 断片のインク量は全インクの 4% 以下
const STRAY_MIN_GAP_PX = 8;     // 本体との白ギャップの最低px（かつ断片高の1.2倍以上）
// 極薄スライバー = 隣接図の切れ端（クロップ面が隣を掠めた）。フルハイトの正当ラベル/軸と分離する
// 唯一の高精度シグナル。fig-04(5px)/fig13(3px) を捕捉、15-38px の正当ラベルを落とす（実測）。
const SLIVER_MAX_H_PX = 6;      // これ以下の高さ（かつ ≤1%H）＝スライバー
const SLIVER_MAX_H_FRAC = 0.01;
const SLIVER_MAX_INK_FRAC = 0.015;
const PHOTO_WHITE_FRAC = 0.5;   // 白率がこれ未満なら写真扱いでスキップ
const EDGE_CUT_TAPER = 0.5;     // margin=0 で 縁2行/内側4行 の密度比がこれ以上＝ストローク中割り(HIGH)
const EDGE_LINE_FRAC = 0.6;     // 縁行のインクが内容スパンのこの比以上＝罫線/軸/枠の bbox 一致(LOW)

function parseArgs() {
  const a = process.argv.slice(2);
  return {
    ci: a.includes('--ci'),
    updateBaseline: a.includes('--update-baseline'),
    file: a.includes('--file') ? a[a.indexOf('--file') + 1] : null,
  };
}

/** 対象画像を列挙（png を正典とし webp ペアは重複走査しない。jpg/jpeg も対象）。 */
function listTargets() {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!/\/img\/|\\img\\/.test(p)) continue;
      if (/\.png$/i.test(e.name)) out.push(p);
      else if (/\.(jpe?g)$/i.test(e.name)) out.push(p);
      else if (/\.webp$/i.test(e.name)) {
        // png ペアが無い webp のみ対象（ペアがあれば png 側で1回だけ検査）
        if (!existsSync(p.replace(/\.webp$/i, '.png'))) out.push(p);
      }
    }
  };
  walk(POSTS_DIR);
  return out;
}

/** 1枚を解析して violations / 分類を返す。 */
export async function analyzeImage(absPath) {
  const { data, info } = await sharp(absPath)
    .flatten({ background: '#ffffff' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;

  // 行・列のインク数プロファイル
  const rowInk = new Array(H).fill(0);
  const colInk = new Array(W).fill(0);
  let totalInk = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[y * W + x] < INK_THRESHOLD) { rowInk[y]++; colInk[x]++; totalInk++; }
    }
  }
  const whiteFrac = 1 - totalInk / (W * H);
  if (whiteFrac < PHOTO_WHITE_FRAC) {
    return { path: absPath, w: W, h: H, kind: 'photo-like', violations: [] };
  }

  const rowIsWhite = rowInk.map((n) => n / W < NOISE_LINE_FRAC);
  const colIsWhite = colInk.map((n) => n / H < NOISE_LINE_FRAC);

  // 各辺の白マージン（縁から最初の非白ラインまで）
  const margin = { top: 0, bottom: 0, left: 0, right: 0 };
  while (margin.top < H && rowIsWhite[margin.top]) margin.top++;
  while (margin.bottom < H && rowIsWhite[H - 1 - margin.bottom]) margin.bottom++;
  while (margin.left < W && colIsWhite[margin.left]) margin.left++;
  while (margin.right < W && colIsWhite[W - 1 - margin.right]) margin.right++;

  // 枠付き図の判定: 4辺すべて margin=0 かつ縁ラインのインク率が高い
  const edgeFrac = {
    top: rowInk[0] / W, bottom: rowInk[H - 1] / W,
    left: colInk[0] / H, right: colInk[W - 1] / H,
  };
  const framed =
    margin.top === 0 && margin.bottom === 0 && margin.left === 0 && margin.right === 0 &&
    Object.values(edgeFrac).every((f) => f >= FRAME_EDGE_FRAC);

  const violations = [];
  if (!framed) {
    // 縁から内側への垂直プロファイル（index0=縁行）。上下=rowInk, 左右=colInk。
    const perpSeries = (side) => {
      const arr = [];
      for (let k = 0; k < 6; k++) {
        if (side === 'top') arr.push(rowInk[k] ?? 0);
        else if (side === 'bottom') arr.push(rowInk[H - 1 - k] ?? 0);
        else if (side === 'left') arr.push(colInk[k] ?? 0);
        else arr.push(colInk[W - 1 - k] ?? 0);
      }
      return arr;
    };
    // 縁に沿う内容スパン（上下=内容幅, 左右=内容高）。直線判定の分母。
    const contentSpan = (side) =>
      (side === 'top' || side === 'bottom')
        ? Math.max(1, W - margin.left - margin.right)
        : Math.max(1, H - margin.top - margin.bottom);

    for (const side of ['top', 'bottom', 'left', 'right']) {
      if (margin[side] > 0) {
        if (margin[side] < THIN_MARGIN_PX) {
          violations.push({ rule: 'THIN_MARGIN', severity: 'LOW', side, detail: `白マージン ${margin[side]}px < ${THIN_MARGIN_PX}px` });
        }
        continue;
      }
      // margin === 0 の辺を EDGE_LINE / EDGE_CUT / EDGE_TIGHT に分類
      const s = perpSeries(side);
      const edgeLineFrac = s[0] / contentSpan(side);
      const edge2 = (s[0] + s[1]) / 2;
      const inner4 = (s[2] + s[3] + s[4] + s[5]) / 4;
      const taper = inner4 > 0 ? edge2 / inner4 : (edge2 > 0 ? 2 : 0);
      if (edgeLineFrac >= EDGE_LINE_FRAC) {
        violations.push({ rule: 'EDGE_LINE', severity: 'LOW', side, detail: `${side}縁の直線が内容スパンの${(edgeLineFrac * 100).toFixed(0)}%＝罫線/軸/枠の bbox 一致（内容は完全）` });
      } else if (taper >= EDGE_CUT_TAPER) {
        violations.push({ rule: 'EDGE_CUT', severity: 'HIGH', side, detail: `${side}縁でストローク中割りの疑い（縁2行/内側4行の密度比 ${(taper * 100).toFixed(0)}%≥${EDGE_CUT_TAPER * 100}%・縁幅 ${(edgeLineFrac * 100).toFixed(0)}%）` });
      } else {
        violations.push({ rule: 'EDGE_TIGHT', severity: 'LOW', side, detail: `${side}縁で先細り接触＝端点タイトトリム（密度比 ${(taper * 100).toFixed(0)}%<${EDGE_CUT_TAPER * 100}%）` });
      }
    }
  }

  // 断片写り込み（上端・下端）: 縁側の小インク島が白ギャップで本体と分離
  const strayCheck = (fromTop) => {
    const idx = (i) => (fromTop ? i : H - 1 - i);
    let i = 0;
    while (i < H && rowIsWhite[idx(i)]) i++;              // 縁の白を飛ばす
    if (i >= H * STRAY_BAND_FRAC) return null;            // 島の開始が帯の外 → 対象外
    const blockStart = i;
    while (i < H && !rowIsWhite[idx(i)]) i++;             // 島本体
    const blockEnd = i;                                    // [blockStart, blockEnd)
    const blockH = blockEnd - blockStart;
    let gap = 0;
    while (i + gap < H && rowIsWhite[idx(i + gap)]) gap++; // 本体までの白ギャップ
    if (i + gap >= H) return null;                         // 島の先に本体が無い（画像全体が島）
    const blockInk = Array.from({ length: blockH }, (_, k) => rowInk[idx(blockStart + k)]).reduce((a, b) => a + b, 0);
    const inkFrac = blockInk / totalInk;
    const gapOk = gap >= Math.max(STRAY_MIN_GAP_PX, blockH * 1.2);
    const side = fromTop ? 'top' : 'bottom';
    // 極薄スライバー（高精度・CI ブロッキング）: 隣接図の切れ端
    if (blockH <= Math.max(SLIVER_MAX_H_PX, H * SLIVER_MAX_H_FRAC) && inkFrac <= SLIVER_MAX_INK_FRAC && gapOk) {
      return { rule: 'STRAY_SLIVER', severity: 'HIGH', side,
        detail: `${side}縁の極薄インク島（高さ${blockH}px・全インクの${(inkFrac * 100).toFixed(1)}%・白ギャップ${gap}px）＝隣接図の切れ端＝写り込み` };
    }
    // それ以外の分離島（情報のみ）: 正当な小見出し/軸矢印か写り込みか幾何では判別不能
    if (blockH <= H * STRAY_MAX_H_FRAC && inkFrac <= STRAY_MAX_INK_FRAC && gapOk) {
      return { rule: 'STRAY_LABEL', severity: 'LOW', side,
        detail: `${side}縁の分離島（高さ${blockH}px・全インクの${(inkFrac * 100).toFixed(1)}%・白ギャップ${gap}px）＝小見出し/軸/写り込みのいずれか（要目視）` };
    }
    return null;
  };
  for (const fromTop of [true, false]) {
    const v = strayCheck(fromTop);
    if (v) violations.push(v);
  }

  return { path: absPath, w: W, h: H, kind: framed ? 'framed' : 'line-art', margin, violations };
}

function keyOf(rel, v) { return `${rel}::${v.rule}::${v.side}`; }

// CI を落とす（＝新規で fail させる）ルール。幾何では tight-crop と切断を判別できない
// EDGE_* / STRAY_LABEL は「情報のみ」で baseline 追跡はするが CI は落とさない。
// STRAY_SLIVER のみが「隣接図の切れ端」の高精度シグナルで、新規発生を CI ブロックする。
const BLOCKING_RULES = new Set(['STRAY_SLIVER']);

async function main() {
  const flags = parseArgs();

  if (flags.file) {
    const r = await analyzeImage(resolve(flags.file));
    console.log(JSON.stringify({ ...r, path: relative(ROOT, r.path) }, null, 2));
    process.exitCode = r.violations.some((v) => BLOCKING_RULES.has(v.rule)) ? 1 : 0;
    return;
  }

  const targets = listTargets();
  const results = [];
  for (const t of targets) {
    try {
      const r = await analyzeImage(t);
      results.push({ ...r, path: relative(ROOT, t).replaceAll('\\', '/') });
    } catch (e) {
      results.push({ path: relative(ROOT, t).replaceAll('\\', '/'), kind: 'error', violations: [], error: e.message });
    }
  }

  const flat = results.flatMap((r) => r.violations.map((v) => ({ path: r.path, ...v })));
  const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const v of flat) counts[v.severity]++;
  const skipped = results.filter((r) => r.kind === 'photo-like').length;
  const framed = results.filter((r) => r.kind === 'framed').length;
  const errors = results.filter((r) => r.kind === 'error').length;

  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, JSON.stringify({
    generated_at: new Date().toISOString(),
    scanned: results.length, skipped_photo: skipped, framed, errors,
    counts,
    violations: flat,
  }, null, 2) + '\n');

  console.log(`[figure-crop] scanned ${results.length}（photo skip ${skipped} / framed ${framed} / error ${errors}）`);
  console.log(`[figure-crop] violations: HIGH ${counts.HIGH} / MEDIUM ${counts.MEDIUM} / LOW ${counts.LOW} → ${relative(ROOT, REPORT)}`);

  if (flags.updateBaseline) {
    mkdirSync(dirname(BASELINE), { recursive: true });
    writeFileSync(BASELINE, JSON.stringify({
      updated_at: new Date().toISOString(),
      note: '既存違反の棚卸し台帳。新規違反のみ CI で fail（content-quality-ratchet と同方式）。是正したら --update-baseline で刈り込む。',
      keys: flat.map((v) => keyOf(v.path, v)).sort(),
    }, null, 2) + '\n');
    console.log(`[figure-crop] baseline 更新: ${flat.length} 件`);
    return;
  }

  const baseline = existsSync(BASELINE) ? new Set(JSON.parse(readFileSync(BASELINE, 'utf8')).keys) : new Set();
  const fresh = flat.filter((v) => !baseline.has(keyOf(v.path, v)));
  const freshBlocking = fresh.filter((v) => BLOCKING_RULES.has(v.rule));
  const freshInfo = fresh.filter((v) => !BLOCKING_RULES.has(v.rule));
  if (freshInfo.length > 0) {
    console.log(`ℹ baseline 外の情報系（非ブロッキング）${freshInfo.length} 件（EDGE_*/STRAY_LABEL/THIN_MARGIN）`);
  }
  if (freshBlocking.length > 0) {
    console.log(`${flags.ci ? '✗' : '⚠'} baseline 比の新規ブロッキング違反 ${freshBlocking.length} 件（STRAY_SLIVER＝写り込み）:`);
    for (const v of freshBlocking.slice(0, 30)) console.log(`  [${v.severity}] ${v.rule}(${v.side}) ${v.path} — ${v.detail}`);
    if (flags.ci) process.exitCode = 1;
  } else {
    console.log('✓ baseline 比の新規ブロッキング違反なし（STRAY_SLIVER）');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
