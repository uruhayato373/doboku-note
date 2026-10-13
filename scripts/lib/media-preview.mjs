/**
 * media-preview.mjs — 音声の前の画面確認の素材を作る（DN-0603・npm run media -- preview）。
 * render-manifest.json（render-longform が書く）の場面から、無音プレビュー mp4・コンタクトシート・数値の JSON を
 * .tmp/video-render/{packId}/preview/ に作り、--commit で ID の置き場（.tmp/media/{pubId}/）へ sha 入りの名前で写して台帳に書く。
 * 閾値は config/video-content.json の visualCheck。注意は承認を止めない（人が画面で判断する）。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { loadRegistry, mediaIdOf, parsePubId } from './content-registry.mjs';
import { readDataset } from './dataset-io.mjs';
import { mediaPath, mimeOf } from './media-paths.mjs';

const FFMPEG_FULL = '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
const FONTS_DIR = '.claude/skills/conversion/ogp-create/assets/fonts';
const sha256Of = (buf) => createHash('sha256').update(buf).digest('hex');
const round1 = (n) => Math.round(n * 10) / 10;
const round3 = (n) => Math.round(n * 1000) / 1000;

/** every 秒ごとのコマ（0, every, 2*every, …）で、直前のコマと同じ PNG だった回数。コマは 2 つ以上で比べられる */
function sampleRepeats(scenes, shaOf, every) {
  const none = { everySec: every ?? null, samples: 0, same: 0, ratio: 0 };
  if (!(every > 0) || !scenes.length) return none;
  const secOf = (s) => Number(s.actualSec ?? s.designSec ?? 0);
  const total = scenes.reduce((a, s) => a + secOf(s), 0);
  let idx = 0;
  let end = secOf(scenes[0]);
  let prev = null;
  let samples = 0;
  let same = 0;
  for (let t = 0; t < total; t += every) {
    while (t >= end && idx < scenes.length - 1) { idx += 1; end += secOf(scenes[idx]); }
    const key = shaOf(scenes[idx].sceneId) ?? `scene:${scenes[idx].sceneId}`;
    samples += 1;
    if (prev !== null && key === prev) same += 1;
    prev = key;
  }
  return { everySec: every, samples, same, ratio: samples > 1 ? round3(same / (samples - 1)) : 0 };
}

/**
 * 画面の数値（純関数）。
 * @param {{ sceneId: string, actualSec?: number|null, designSec?: number|null }[]} scenes
 * @param {Record<string,string>|Map<string,string>} pngShaBySceneId 場面 ID → PNG の sha256
 * @param {{ maxOpeningCoverSec: number, maxRepeatFrameRatio: number, longStaticSec: number, contactSheetEverySec?: number }} visualCheck
 *   contactSheetEverySec があれば、その秒ごとに見たときの「直前のコマと同じ画面」の回数（sampledRepeat）も数える
 */
export function previewMetrics(scenes, pngShaBySceneId, visualCheck) {
  const shaOf = (id) => (pngShaBySceneId instanceof Map ? pngShaBySceneId.get(id) : pngShaBySceneId?.[id]);
  const secOf = (s) => Number(s.actualSec ?? s.designSec ?? 0);
  const totalSec = scenes.reduce((a, s) => a + secOf(s), 0);
  const openingCoverSec = scenes.length ? secOf(scenes[0]) : 0;

  let repeatSec = 0;
  for (let i = 1; i < scenes.length; i += 1) {
    const sha = shaOf(scenes[i].sceneId);
    if (sha && sha === shaOf(scenes[i - 1].sceneId)) repeatSec += secOf(scenes[i]);
  }
  const repeatFrameRatio = totalSec > 0 ? repeatSec / totalSec : 0;

  const longStatic = [];
  let i = 0;
  while (i < scenes.length) {
    const sha = shaOf(scenes[i].sceneId);
    let j = i;
    let sec = secOf(scenes[i]);
    while (sha && j + 1 < scenes.length && shaOf(scenes[j + 1].sceneId) === sha) { j += 1; sec += secOf(scenes[j]); }
    if (sec >= visualCheck.longStaticSec) longStatic.push({ fromSceneId: scenes[i].sceneId, toSceneId: scenes[j].sceneId, sec: round3(sec) });
    i = j + 1;
  }

  // コンタクトシートと同じ刻み（contactSheetEverySec 秒ごと）で見たとき、直前のコマと同じ PNG だった回数
  const sampledRepeat = sampleRepeats(scenes, shaOf, visualCheck.contactSheetEverySec);

  const warnings = [];
  if (openingCoverSec > visualCheck.maxOpeningCoverSec) {
    warnings.push(`冒頭の表紙が ${round1(openingCoverSec)} 秒続く（目安 ${visualCheck.maxOpeningCoverSec} 秒以内）`);
  }
  if (repeatFrameRatio > visualCheck.maxRepeatFrameRatio) {
    warnings.push(`直前と同じ画面の割合が ${Math.round(repeatFrameRatio * 100)}%（目安 ${Math.round(visualCheck.maxRepeatFrameRatio * 100)}% 以下）`);
  }
  if (sampledRepeat.samples > 1 && sampledRepeat.ratio > visualCheck.maxRepeatFrameRatio) {
    warnings.push(`${visualCheck.contactSheetEverySec} 秒ごとのコマで直前と同じ画面が ${sampledRepeat.same}/${sampledRepeat.samples - 1} 回（${Math.round(sampledRepeat.ratio * 100)}%・目安 ${Math.round(visualCheck.maxRepeatFrameRatio * 100)}% 以下）`);
  }
  for (const s of longStatic) {
    warnings.push(`同じ画面が ${round1(s.sec)} 秒続く（${s.fromSceneId} から ${s.toSceneId}・目安 ${visualCheck.longStaticSec} 秒未満）`);
  }
  return { openingCoverSec: round3(openingCoverSec), repeatFrameRatio: round3(repeatFrameRatio), sampledRepeat, longStatic, warnings };
}


function runFfmpeg(root, args) {
  const r = spawnSync(findFfmpeg() ?? 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { cwd: root, encoding: 'utf8' });
  if (r.error || r.status !== 0) throw new Error(`ffmpeg が失敗した: ${r.error?.message ?? (r.stderr || '').trim().split('\n').slice(-3).join(' / ')}`);
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
  return { ok: false, message };
}

/** 手元の ffmpeg（ass フィルタのある ffmpeg-full を優先）。無ければ null */
export function findFfmpeg() {
  if (existsSync(FFMPEG_FULL)) return FFMPEG_FULL;
  const r = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
  return r.error || r.status !== 0 ? null : 'ffmpeg';
}

/** 描画済みの作業場（.tmp/video-render/{packId}）から場面・PNG の sha・閾値を読む。足りなければ { ok:false, message } */
export function loadPreviewInput(root, packId) {
  const renderDir = `.tmp/video-render/${packId}`;
  const manifestPath = join(root, renderDir, 'render-manifest.json');
  const renderHint = `npm run render-longform -- --pack-dir content/sns/video-packs/{exam}/${packId} --skip-tts`;
  if (!existsSync(manifestPath)) return { ok: false, message: `${renderDir}/render-manifest.json が無い。先に描画する: ${renderHint}` };
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const scenes = manifest.scenes ?? [];
  if (!scenes.length) return { ok: false, message: `${renderDir}/render-manifest.json に場面が無い` };

  // 尺が読めない場面があると concat の duration が NaN になり、ffmpeg が分かりにくく失敗する。その前に場面 ID つきで止める
  const noSec = scenes.filter((s) => (s.designSec ?? s.actualSec) == null || !Number.isFinite(Number(s.actualSec ?? s.designSec))).map((s) => s.sceneId ?? '(sceneId なし)');
  if (noSec.length) return { ok: false, message: `${renderDir}/render-manifest.json の場面に designSec も actualSec も無い（${noSec.length} 件: ${noSec.slice(0, 3).join(', ')}）。描画し直す: ${renderHint}` };

  const visualCheck = readDataset(root, 'config.video-content').visualCheck;
  if (!visualCheck) return { ok: false, message: '動画の設定（config.video-content）に visualCheck が無い' };

  const pngShaBySceneId = {};
  const missingPng = [];
  for (const s of scenes) {
    const abs = join(root, renderDir, 'img', s.png);
    if (!existsSync(abs)) { missingPng.push(`img/${s.png}`); continue; }
    pngShaBySceneId[s.sceneId] = sha256Of(readFileSync(abs));
  }
  if (missingPng.length) return { ok: false, message: `場面の PNG が無い（${missingPng.length} 件: ${missingPng.slice(0, 3).join(', ')}）。先に描画する: ${renderHint}` };
  return { ok: true, renderDir, manifest, scenes, visualCheck, pngShaBySceneId };
}

/** 数値の文書（preview-metrics.json の中身）。無音プレビューの尺は実尺（未合成なら設計尺）、総尺は実尺があれば実尺 */
export function buildMetricsDoc({ packId, pubId = null, manifest, scenes, visualCheck, metrics, designTotal }) {
  return {
    packId, pubId, renderedAt: manifest.renderedAt ?? null, sceneCount: scenes.length,
    totalSec: round3(scenes.reduce((a, s) => a + Number(s.actualSec ?? s.designSec ?? 0), 0)), previewSec: round3(designTotal),
    ...metrics, thresholds: {
      maxOpeningCoverSec: visualCheck.maxOpeningCoverSec, maxRepeatFrameRatio: visualCheck.maxRepeatFrameRatio, longStaticSec: visualCheck.longStaticSec,
    },
  };
}

/** 無音プレビュー mp4 とコンタクトシートを作る（ffmpeg が要る）。シートの { role, file } を返す */
function buildPreviewMedia(root, { renderDir, manifest, scenes, visualCheck, designTotal }) {
  const outRel = `${renderDir}/preview`;
  const outAbs = join(root, outRel);
  mkdirSync(outAbs, { recursive: true });

  // 無音プレビュー: 実尺（未合成なら設計尺）で並べ、render の字幕と同期する
  const concat = [...scenes.map((s) => `file ../img/${s.png}\nduration ${Number(s.actualSec ?? s.designSec)}`), `file ../img/${scenes.at(-1).png}`].join('\n');
  writeFileSync(join(outAbs, 'preview.txt'), `${concat}\n`);
  const assRel = `${renderDir}/subtitles.ass`;
  const vf = ['fps=' + visualCheck.previewFps];
  if (manifest.subtitles !== false && existsSync(join(root, assRel))) vf.push(`ass=${assRel}:fontsdir=${FONTS_DIR}`);
  vf.push('format=yuv420p');
  runFfmpeg(root, ['-f', 'concat', '-safe', '0', '-i', `${outRel}/preview.txt`, '-vf', vf.join(','), '-an', '-movflags', '+faststart', `${outRel}/preview.mp4`]);

  // コンタクトシート: contactSheetEverySec 秒ごとに 1 コマ、cols×rows コマで 1 枚。長尺は複数枚
  const every = visualCheck.contactSheetEverySec;
  const perSheet = visualCheck.contactSheetCols * visualCheck.contactSheetRows;
  const sheetSpan = every * perSheet;
  const sheetCount = Math.max(1, Math.ceil(designTotal / sheetSpan));
  const sheets = [];
  for (let n = 1; n <= sheetCount; n += 1) {
    const name = n === 1 ? 'contact-sheet.jpg' : `contact-sheet-${n}.jpg`;
    runFfmpeg(root, [
      '-ss', String((n - 1) * sheetSpan), '-t', String(sheetSpan), '-i', `${outRel}/preview.mp4`,
      '-vf', `fps=1/${every},scale=${visualCheck.contactSheetWidth}:-1,tile=${visualCheck.contactSheetCols}x${visualCheck.contactSheetRows}`,
      '-frames:v', '1', '-update', '1', '-q:v', '3', `${outRel}/${name}`,
    ]);
    sheets.push({ role: n === 1 ? 'contact-sheet' : `contact-sheet-${n}`, file: name });
  }
  return sheets;
}

/**
 * 画面確認の素材を作る。既定は dry-run（作業場に作るだけで台帳は書かない）。
 * @returns {Promise<{ ok: boolean, message?: string, metrics?: object, files?: object[] }>}
 */
export async function runPreview(root, { pub, commit }) {
  if (!pub) return fail('--pub <公開 ID> が要る');
  const parsed = parsePubId(pub);
  if (!parsed) return fail(`公開 ID の形が違う: ${pub}`);
  if (parsed.channel !== 'youtube') return fail(`未対応: ${pub}（今の preview は YouTube の通常動画だけ）`);
  if (parsed.format !== 'longform') {
    return fail(`未対応: ${pub}（Shorts は作品ごとの render-manifest.json が無く、通常動画の shorts/{key}/ にだけ描画物がある。通常動画の preview を使う）`);
  }
  const reg = loadRegistry(root);
  const row = reg.publications.find((p) => p.id === pub);
  const work = reg.works.find((w) => w.id === parsed.work && w.exam === parsed.exam);
  if (!row || !work) return fail(`台帳に無い: ${pub}（先に npm run registry -- import-video-pack）`);

  const packId = work.id;
  const input = loadPreviewInput(root, packId);
  if (!input.ok) return fail(input.message);
  const { renderDir, manifest, scenes, visualCheck, pngShaBySceneId } = input;

  const metrics = previewMetrics(scenes, pngShaBySceneId, visualCheck);
  const designTotal = scenes.reduce((a, s) => a + Number(s.actualSec ?? s.designSec ?? 0), 0);
  const metricsDoc = buildMetricsDoc({ packId, pubId: pub, manifest, scenes, visualCheck, metrics, designTotal });

  const outRel = `${renderDir}/preview`;
  const outAbs = join(root, outRel);
  mkdirSync(outAbs, { recursive: true });
  let sheets;
  try {
    sheets = buildPreviewMedia(root, { renderDir, manifest, scenes, visualCheck, designTotal });
  } catch (e) {
    return fail(e.message);
  }
  writeFileSync(join(outAbs, 'preview-metrics.json'), `${JSON.stringify(metricsDoc, null, 2)}\n`);

  const files = [
    { role: 'preview', file: 'preview.mp4', ext: 'mp4' },
    ...sheets.map((s) => ({ ...s, ext: 'jpg' })),
    { role: 'preview-metrics', file: 'preview-metrics.json', ext: 'json' },
  ].map((f) => {
    const buf = readFileSync(join(outAbs, f.file));
    return { ...f, sha256: sha256Of(buf), bytes: buf.length, rel: `${outRel}/${f.file}` };
  });

  console.log(`${pub}: 場面 ${scenes.length}・プレビュー ${round1(designTotal)} 秒・コンタクトシート ${sheets.length} 枚`);
  printMetrics(metrics);
  for (const f of files) console.log(`  ${f.role.padEnd(16)} ${f.sha256.slice(0, 8)}  ${f.rel}`);

  if (!commit) {
    console.log('dry-run: 台帳は書いていない。書くときは --commit');
    return { ok: true, metrics: metricsDoc, files };
  }

  const { upsertMedia, upsertPublications } = await import('./content-registry-write.mjs');
  const sharp = (await import('sharp')).default;
  const provenance = { kind: 'render', by: 'media-preview', spec: `${work.definition}/storyboard.json` };
  const rows = [];
  for (const f of files) {
    const dest = mediaPath({ pubId: pub, role: f.role, sha256: f.sha256, ext: f.ext });
    const destAbs = join(root, dest);
    if (existsSync(destAbs)) {
      if (sha256Of(readFileSync(destAbs)) !== f.sha256) throw new Error(`置き場に別の中身がある（書き換えない）: ${dest}`);
    } else {
      mkdirSync(dirname(destAbs), { recursive: true });
      copyFileSync(join(root, f.rel), destAbs);
    }
    const mrow = { id: mediaIdOf(pub, f.role), role: f.role, type: mimeOf(f.ext), sha256: f.sha256, bytes: statSync(destAbs).size, store: { tier: 'drive', path: dest }, provenance };
    if (f.ext === 'jpg') { const meta = await sharp(destAbs).metadata(); mrow.width = meta.width; mrow.height = meta.height; }
    if (f.role === 'preview') mrow.durationSec = round3(designTotal);
    rows.push(mrow);
  }
  upsertMedia(root, parsed.exam, rows);
  // 古い contact-sheet-N が残らないよう、この公開の contact-sheet* の参照は今回の枚数に置き換える
  const keep = Object.fromEntries(Object.entries(row.media ?? {}).filter(([role]) => !/^contact-sheet(-\d+)?$/.test(role)));
  const media = { ...keep, ...Object.fromEntries(rows.map((r) => [r.role, r.id])) };
  upsertPublications(root, row.channel, row.exam, [{ ...row, media }]);
  console.log(`台帳に書いた: 素材 ${rows.length} 件（${pub}）`);
  console.log(`次: npm run media -- sync --work ${parsed.exam}/${parsed.work} --commit`);
  return { ok: true, metrics: metricsDoc, files };
}

/** 数値の注意行を出す（runPreview と runPackPreview で同じ見た目） */
function printMetrics(metrics) {
  console.log(`  冒頭の表紙 ${round1(metrics.openingCoverSec)} 秒 / 直前と同じ画面 ${Math.round(metrics.repeatFrameRatio * 100)}%（${metrics.sampledRepeat.everySec} 秒ごとのコマでは ${metrics.sampledRepeat.same}/${Math.max(0, metrics.sampledRepeat.samples - 1)} 回）/ 長い静止 ${metrics.longStatic.length} 箇所`);
  for (const w of metrics.warnings) console.log(`  注意: ${w}`);
  if (!metrics.warnings.length) console.log('  注意なし');
}

/**
 * 台帳を使わず、動画パック 1 本の画面確認をする（DN-0603・scripts/video-preview-sheet.mjs の本体）。
 * 数値は render-manifest.json と場面の PNG だけで出す（動画も ffmpeg も要らない）。無音プレビューとコンタクトシートは ffmpeg があるときだけ作る。
 * 出力は .tmp/video-render/{packId}/preview/（Git に入れない）。注意は承認を止めない。
 * 終了コード: 0＝完走（注意があっても 0）／1＝入力が足りない（描画していない・PNG 欠け）／2＝検査不成立（ffmpeg が無く、動画とシートは作れなかった。数値は出した）
 * @param {string} root
 * @param {{ packId: string, metricsOnly?: boolean, ffmpeg?: string|null }} opts ffmpeg はテスト用に差し替える（undefined なら手元を探す）
 * @returns {{ code: 0|1|2, message?: string, metrics?: object, metricsDoc?: object, sheets?: object[] }}
 */
export function runPackPreview(root, { packId, metricsOnly = false, ffmpeg }) {
  const input = loadPreviewInput(root, packId);
  if (!input.ok) { console.error(input.message); return { code: 1, message: input.message }; }
  const { renderDir, manifest, scenes, visualCheck, pngShaBySceneId } = input;
  const metrics = previewMetrics(scenes, pngShaBySceneId, visualCheck);
  const designTotal = scenes.reduce((a, s) => a + Number(s.actualSec ?? s.designSec ?? 0), 0);
  const metricsDoc = buildMetricsDoc({ packId, manifest, scenes, visualCheck, metrics, designTotal });
  const outRel = `${renderDir}/preview`;
  mkdirSync(join(root, outRel), { recursive: true });
  writeFileSync(join(root, outRel, 'preview-metrics.json'), `${JSON.stringify(metricsDoc, null, 2)}\n`);

  console.log(`${packId}: 場面 ${scenes.length}（PNG ${Object.keys(pngShaBySceneId).length} 枚を検査）・設計尺 ${round1(designTotal)} 秒`);
  printMetrics(metrics);
  console.log(`  数値: ${outRel}/preview-metrics.json`);
  if (metricsOnly) return { code: 0, metrics, metricsDoc, sheets: [] };

  const bin = ffmpeg === undefined ? findFfmpeg() : ffmpeg;
  if (!bin) {
    const message = '検査不成立: ffmpeg が無く、無音プレビューとコンタクトシートは作れなかった（数値は上のとおり出した）。ffmpeg のある Mac で同じコマンドを実行する';
    console.error(message);
    return { code: 2, message, metrics, metricsDoc, sheets: [] };
  }
  try {
    const sheets = buildPreviewMedia(root, { renderDir, manifest, scenes, visualCheck, designTotal });
    console.log(`  無音プレビュー: ${outRel}/preview.mp4`);
    for (const sh of sheets) console.log(`  コンタクトシート: ${outRel}/${sh.file}`);
    return { code: 0, metrics, metricsDoc, sheets };
  } catch (e) {
    console.error(e.message);
    return { code: 1, message: e.message, metrics, metricsDoc };
  }
}

/**
 * 最終承認の関門（YouTube へ上げる前・R2 へ stage する前）。台帳の通常動画の公開の行に approval.contentSha256 があるとき、
 * 今の中身（文面・素材・予定）が承認したときと同じでなければ止める。contentSha256 が無い（grandfathered・台帳に無い）なら今の挙動のまま通す。
 * @param {string} root
 * @param {string} exam 資格（別資格の同じ作品 ID と混ざらないよう台帳の exam でも絞る）
 * @param {string} packId 動画パックの ID（台帳の作品 ID と同じ）
 * @param {{ reg?: object }} [opts] テスト用に台帳を差し替える
 * @returns {Promise<{ ok: boolean, gated: boolean, reason: string|null }>}
 */
export async function finalApprovalGate(root, exam, packId, opts = {}) {
  const { approvalState } = await import('./media-review.mjs');
  const reg = opts.reg ?? loadRegistry(root);
  const pubs = reg.publications.filter((p) => p.exam === exam && p.work === packId && p.channel === 'youtube' && p.format === 'longform' && !p.variant);
  const pub = pubs.find((p) => p.approval?.contentSha256);
  if (!pub) return { ok: true, gated: false, reason: null };
  const state = approvalState(root, pub, new Map(reg.media.map((m) => [m.id, m])));
  if (state.final.valid) return { ok: true, gated: true, reason: null };
  return { ok: false, gated: true, reason: `${pub.id}: 台帳の最終承認が今の中身と合わない（${state.final.reason}）。確認して再承認する: npm run registry -- approve --pub ${pub.id} --stage final --expect ${state.final.current}` };
}

/**
 * 複数の動画パックを最終承認の関門に通し、通るものと止めるもの（理由つき）に分ける。
 * 1 本の古い承認や台帳の読み込みエラーで全体を止めないための入口（R2 stage 用）。関門が投げた例外も、その 1 本の理由にする。
 * @param {string} root
 * @param {string} exam
 * @param {string[]} packIds
 * @param {{ reg?: object }} [opts]
 * @returns {Promise<{ passed: string[], blocked: { packId: string, reason: string }[] }>}
 */
export async function partitionByFinalApproval(root, exam, packIds, opts = {}) {
  const passed = [];
  const blocked = [];
  for (const packId of packIds) {
    try {
      const gate = await finalApprovalGate(root, exam, packId, opts);
      if (gate.ok) passed.push(packId);
      else blocked.push({ packId, reason: gate.reason });
    } catch (e) {
      blocked.push({ packId, reason: `最終承認の関門を判定できない: ${e?.message ?? e}` });
    }
  }
  return { passed, blocked };
}
