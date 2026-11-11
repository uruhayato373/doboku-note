/**
 * video-factory.mjs — 通常動画を量産する工程の決定的な部分（生成の計画・機械検査・採用・状態の判定）。
 *
 * 作る側と判定する側を分ける。Codex が作った画像は ai-image-fidelity-auditor の ok が
 * 今の画像の sha に付くまで採用できない（adoptPlan が止める）。承認と公開はここに無い。
 * 作業の記録は .tmp/media/<exam>/<pack>/work/factory/plan.json（再生成できるので Git に入れない）。
 * 手順の正本: .claude/knowledge/reference/video-factory.md
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { generateWithCodexAsync } from './codex-image.mjs';
import { resolveVaultRoot, vaultAbsFor } from './drive-vault.mjs';
import { readJson, writeJson } from './json-io.mjs';
import { normalizeLearningFrame } from './learning-frame.mjs';
import { popSceneHash, requirePopDiagramStandard } from './longform-pop-images.mjs';
import { coverInputDigest } from './youtube-approved-cover.mjs';
import { examPalette, loadImageRules } from './image-rules.mjs';

export const MAX_ATTEMPTS = 3;
// 画像が出なかった試行は MAX_ATTEMPTS に数えない（品質の不合格ではないので）。同じ項目で続けば止める（DN-1065）
export const MAX_NO_OUTPUT = 3;
const SUBTITLE_STDEV_MAX = 14;
const rules = loadImageRules();
const SUBTITLE_ZONE = rules.formats.longform.bottomZone; // 本文の下端は字幕が載る。生成指示と機械検査で同じ値を使う
const { coverStyle: COVER_STYLE, character: CHARACTER, bodyStyle: BODY_STYLE } = rules.references;
const COMPOSITION = {
  compare: '左右2つの枠を比べ、右を強調する構図',
  grid: '同じ大きさの枠を並べる構図',
  sheet: '整理メモの用紙を描き、行ごとに欄を分ける構図',
  steps: '左から右へ進む段階の図',
  mapping: '左の問いから右の行動へ矢印で結ぶ対応図',
  recap: '番号付きの大きな枠を横に並べる構図',
  closing: '教材のノートを中央に置く構図。価格とURLは描かない',
};

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const oneLine = (text) => String(text ?? '').replace(/\n/g, ' ');
export const planPath = (pack) => `.tmp/media/${pack}/work/factory/plan.json`;
export const packDirOf = (pack) => `content/sns/video-packs/${pack}`;

export function readPlan(root, pack, path = planPath(pack)) {
  return existsSync(join(root, path)) ? readJson(root, path) : null;
}

/** 参照画像を手元へ揃える。.tmp/media に無ければ Drive から写す */
export function fileRef(root, rel) {
  const abs = join(root, rel);
  if (!existsSync(abs) && rel.startsWith('.tmp/media/')) {
    const vault = resolveVaultRoot();
    const from = vault.root ? vaultAbsFor(vault.root, `制作物/コンテンツ/${rel.slice('.tmp/media/'.length)}`) : null;
    if (!from || !existsSync(from)) throw new Error(`参照画像が無い: ${rel}`);
    mkdirSync(dirname(abs), { recursive: true });
    copyFileSync(from, abs);
  }
  return { path: rel, sha256: hash(readFileSync(abs)) };
}

// 『』は指示の中の文字の区切り。括弧ごと描かれ、照合で落ちていた（2026-11-10・2 本）
const QUOTE_RULE = '『』は描く文字の区切りで、括弧そのものは描かない。';

/** 本文の生成指示。場面の原稿だけから決まる（同じ原稿なら同じ指示）。 */
export function buildBodyPrompt(scene, exam) {
  const palette = examPalette(exam);
  const art = scene.visual?.art ?? {};
  const words = (scene.visual?.items ?? []).map(oneLine);
  return [
    `参照画像は学習図解の意匠参照のみ。新規の16:9横長（1920×1080想定）教育動画本文の1場面。白〜淡いグレー背景、${palette}の太い線、補助に小さな黄色。`,
    'シンプルで大きな図解を主役にする。広告風POPポスター、人物、白い箇条書きカード、細かい文字は禁止。',
    rules.formats.longform.frame,
    '文字は指定した日本語だけを大きく正確に描き、余計な文言・数字を足さない。',
    QUOTE_RULE,
    `見出し『${scene.visual?.heading ?? scene.sceneId}』。`,
    COMPOSITION[art.type] ? `構図: ${COMPOSITION[art.type]}。` : '',
    words.length ? `図に入れる文字: ${words.map((w) => `『${w}』`).join(' ')}。` : '',
    art.center ? `図の中央に『${oneLine(art.center)}』。` : '',
    art.note ? `図の下、下端の字幕の帯より上に『${oneLine(art.note)}』の全文を省かずに入れる。` : '',
    `この場面の説明（文字にしない）: ${oneLine(scene.narration)}`,
  ].filter(Boolean).join(' ');
}

/** 表紙の生成指示。cover-design の見出しだけを文字にする。 */
export function buildCoverPrompt(spec, exam) {
  const lines = spec.headline ?? [];
  const palette = examPalette(exam);
  return [
    '添付の1枚目はdoboku-noteで採用済みの全面POP動画表紙の意匠参照、2枚目は先生キャラクターの同一性参照です。',
    `新規の16:9横長（1920×1080想定）日本語YouTube動画表紙を作る。${palette}、黄色と白の極太文字、明確な黒い輪郭、少量の赤、斜めの面と勢いのある背景、右側に先生キャラクターを大きく。`,
    rules.teacher.identity,
    `左〜中央に正確に${lines.map((l) => `『${l}』`).join('')}を大きく配置。上部の黄色帯に小さく『${spec.pop?.authority ?? '総監が制作'}』。`,
    QUOTE_RULE,
    '誤字・余計な文字・合格保証・URL・価格・不明な実績を足さない。文字ブロックの黒い縁取りまで含めて左右8%の内側へ収め（画面の左端から8%は背景だけ）、顔は左右5%・上下5%内、下端18%は字幕が重なるので重要な文字や顔を置かず背景が全面に続く。',
  ].join(' ');
}

const coverInput = (spec) => hash(JSON.stringify(spec.headline ?? []));

/**
 * 作業の計画を作る。原稿が同じ項目は、生成済みの画像と判定を引き継ぐ。
 * scope: all＝表紙と全本文 / cover＝表紙だけ（本文の採用済み改訂をそのまま使う）
 */
export function buildPlan(root, pack, { scope = 'all', date, refs = fileRef } = {}) {
  if (!/^\d{8}$/.test(date ?? '')) throw new Error('date は YYYYMMDD');
  if (!['all', 'cover'].includes(scope)) throw new Error('scope は all か cover');
  const dir = packDirOf(pack);
  const exam = pack.split('/')[0];
  const board = readJson(root, `${dir}/storyboard.json`);
  const spec = readJson(root, `${dir}/cover-design.json`).covers?.longform;
  if (!spec) throw new Error(`${pack}: cover-design.json に longform が無い`);
  const prior = new Map((readPlan(root, pack)?.items ?? []).map((i) => [i.id, i]));
  const keep = (item) => {
    const old = prior.get(item.id);
    if (!old || old.inputSha256 !== item.inputSha256) return item;
    // 合格済みの画像は、指示を改善しても作り直さない。未合格の項目は新しい指示で回数を数え直す
    if (old.audit?.verdict === 'ok' || old.basePrompt === item.basePrompt) return { ...item, ...old };
    return item;
  };
  const items = [keep({
    id: 'cover', kind: 'cover', inputSha256: coverInput(spec), basePrompt: buildCoverPrompt(spec, exam),
    references: [refs(root, COVER_STYLE), refs(root, CHARACTER)],
    attempts: 0, raw: null, audit: null,
  })];
  if (scope === 'all') {
    for (const scene of board.scenes.slice(1)) {
      items.push(keep({
        id: scene.sceneId, kind: 'body', inputSha256: popSceneHash(scene), basePrompt: buildBodyPrompt(scene, exam),
        references: [refs(root, BODY_STYLE)], attempts: 0, raw: null, audit: null,
      }));
    }
  }
  const plan = { schemaVersion: 1, pack, scope, revision: `body-diagram-${date}`, coverRevision: `cover-pop-${date}`, items };
  writeJson(root, planPath(pack), plan);
  return plan;
}

/**
 * 比率がわずかにずれた生成画像を、中央で切り抜いて指定の比率に揃える（2026-11-11）。Codex は 16:9 を頼んでも
 * 1717×916（約 5% 横長）をよく返し、比率の検査で 1 項目 3 回を使い切っていた。切るのは長い辺の両端で、
 * 片側 3% 以内（生成の指示の安全余白 6% の内側）に収まるときだけ。それより大きいずれは触らず、検査で落とす。
 */
export async function fitAspect(bytes, ratio, tolerance = 0.06) {
  const meta = await sharp(bytes).metadata();
  if (!meta.width || !meta.height) return bytes;
  const off = meta.width / meta.height / ratio - 1;
  if (Math.abs(off) <= 0.005 || Math.abs(off) > tolerance) return bytes;
  const [width, height] = off > 0 ? [Math.round(meta.height * ratio), meta.height] : [meta.width, Math.round(meta.width / ratio)];
  return sharp(bytes).extract({ left: Math.floor((meta.width - width) / 2), top: Math.floor((meta.height - height) / 2), width, height }).png().toBuffer();
}

/** 目で見る前の機械検査。比率と字幕の帯を見る。空なら合格。 */
export async function inspectImage(bytes, kind) {
  const meta = await sharp(bytes).metadata();
  const issues = [];
  if (!meta.width || !meta.height || meta.width < 1200) issues.push(`解像度が足りない（${meta.width}×${meta.height}）`);
  if (Math.abs(meta.width / meta.height / (16 / 9) - 1) > 0.005) issues.push(`16:9 ではない（${meta.width}×${meta.height}）`);
  if (issues.length) return issues;
  // sharp の stats は加工前の入力を見るので、加工の結果を一度バイト列にしてから測る
  const stdev = async (image) => (await sharp(await image.greyscale().png().toBuffer()).stats()).channels[0].stdev;
  if (await stdev(sharp(bytes)) < 5) issues.push('全面がほぼ単色');
  if (kind === 'body') {
    const height = Math.floor(meta.height * SUBTITLE_ZONE);
    const zone = await stdev(sharp(bytes).extract({ left: 0, top: meta.height - height, width: meta.width, height }));
    if (zone > SUBTITLE_STDEV_MAX) issues.push(`字幕の帯に絵や文字がある（ばらつき ${zone.toFixed(1)}）`);
  }
  return issues;
}

const stuck = (i) => !i.raw && (i.attempts >= MAX_ATTEMPTS || (i.noOutput ?? 0) >= MAX_NO_OUTPUT);

/**
 * 未生成と不合格の項目だけを作る。回数の上限に達した項目は残す（勝手に通さない）。
 * 画像が出なかった試行は回数に数えず noOutput に数える。この回に試した全項目で画像が出なければ unreachable を返す
 * （生成の経路が無い環境で回すと、品質の判定をしないまま全項目が上限に達していた・DN-1065）。
 */
export async function generatePlan(root, pack, { concurrency = 3, generate = generateWithCodexAsync, log = () => {}, path: file = planPath(pack), inspect = inspectImage, aspect = 16 / 9, maxItems = Infinity } = {}) {
  const plan = readPlan(root, pack, file);
  if (!plan) throw new Error(`${pack}: 先に plan を作る`);
  // maxItems は 1 回の呼び出しで試す項目の上限。呼び出し 1 回を短く保ち、途中で止まっても進んだ分を残す
  const todo = plan.items.filter((i) => !i.raw && !stuck(i)).slice(0, maxItems);
  let next = 0;
  let noOutput = 0;
  const one = async (item) => {
    const prompt = item.fix ? `${item.basePrompt} 前回の不合格の理由を直す: ${item.fix}` : item.basePrompt;
    const out = await generate(prompt, null, { images: item.references.map((r) => join(root, r.path)) });
    if (!out) {
      noOutput += 1;
      item.noOutput = (item.noOutput ?? 0) + 1;
      item.lastError = '画像が出なかった';
      log(`${item.id}: 画像が出なかった`);
      return;
    }
    item.attempts += 1;
    item.noOutput = 0;
    const bytes = await fitAspect(await sharp(readFileSync(out)).png().toBuffer(), aspect);
    const issues = await inspect(bytes, item.kind);
    if (issues.length) { item.fix = issues.join('／'); item.lastError = item.fix; log(`${item.id}: ${item.fix}`); return; }
    const sha256 = hash(bytes);
    // 別の場面と同じ画像は、並列の実行で別の画像を取り違えた疑いがある（DN-1036）。採らずに作り直しへ回す
    const twin = plan.items.find((other) => other !== item && other.raw?.sha256 === sha256);
    if (twin) { item.lastError = `${twin.id} と同じ画像（取り違えの疑い）`; log(`${item.id}: ${item.lastError}`); return; }
    const path = `.tmp/media/${pack}/work/factory/raw-${item.id}.${sha256.slice(0, 8)}.png`;
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), bytes);
    Object.assign(item, { raw: { path, sha256 }, prompt, audit: null, lastError: null });
    writeJson(root, file, plan);
    log(`${item.id}: ok`);
  };
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next < todo.length) await one(todo[next++]);
  }));
  writeJson(root, file, plan);
  return { ...summarize(plan), attempted: todo.length, unreachable: todo.length > 0 && noOutput === todo.length };
}

/**
 * 上限に達した項目・画像が出ずに止まった項目の回数と理由を戻す。ids に 'all' を含めば止まった項目すべて。
 * 原稿を変えずにやり直す唯一の経路（buildPlan は原稿が同じなら回数ごと引き継ぐ）。
 */
export function retryItems(root, pack, ids, { path: file = planPath(pack) } = {}) {
  const plan = readPlan(root, pack, file);
  if (!plan) throw new Error(`${pack}: 先に plan を作る`);
  const all = ids.includes('all');
  const unknown = ids.filter((id) => id !== 'all' && !plan.items.some((i) => i.id === id));
  if (unknown.length) throw new Error(`${pack}: 計画に無い項目 ${unknown.join(', ')}`);
  const targets = plan.items.filter((i) => !i.raw && (all ? stuck(i) : ids.includes(i.id)));
  for (const item of targets) Object.assign(item, { attempts: 0, noOutput: 0, fix: null, lastError: null });
  writeJson(root, file, plan);
  return { reset: targets.map((i) => i.id), ...summarize(plan) };
}

export function summarize(plan) {
  const items = plan?.items ?? [];
  const missing = items.filter((i) => !i.raw);
  return {
    total: items.length,
    missing: missing.length,
    exhausted: missing.filter((i) => i.attempts >= MAX_ATTEMPTS).map((i) => i.id),
    stalled: missing.filter((i) => i.attempts < MAX_ATTEMPTS && (i.noOutput ?? 0) >= MAX_NO_OUTPUT).map((i) => i.id),
    reasons: Object.fromEntries(missing.filter(stuck).map((i) => [i.id, i.lastError ?? i.fix ?? '理由の記録なし'])),
    unaudited: items.filter((i) => i.raw && i.audit?.sha !== i.raw.sha256).length,
    ok: items.filter((i) => i.raw && i.audit?.sha === i.raw.sha256 && i.audit.verdict === 'ok').length,
  };
}

/** 監査へ渡す項目。作った側の説明は渡さず、原稿と指示だけを渡す。 */
export function auditQueue(root, pack, { path = planPath(pack), label = (i) => `${pack} の通常動画の${i.kind === 'cover' ? '表紙' : `本文の場面 ${i.id}`}` } = {}) {
  const plan = readPlan(root, pack, path);
  if (!plan) throw new Error(`${pack}: 先に plan を作る`);
  return plan.items.filter((i) => i.raw && i.audit?.sha !== i.raw.sha256).map((i) => ({
    figKey: i.id, kind: i.kind, img: join(root, i.raw.path), prompt: i.basePrompt,
    用途の説明: label(i),
    references: i.kind === 'body' ? [] : i.references.map((r) => join(root, r.path)),
  }));
}

/** 判定を記録する。fail は画像を外し、理由を次の生成へ渡す。 */
export function recordAudit(root, pack, verdicts, { by, path = planPath(pack) }) {
  if (!by) throw new Error('判定した担当の名前が要る');
  const plan = readPlan(root, pack, path);
  if (!plan) throw new Error(`${pack}: 先に plan を作る`);
  const byId = new Map(plan.items.map((i) => [i.id, i]));
  for (const v of verdicts) {
    const item = byId.get(v.figKey);
    if (!item?.raw) throw new Error(`判定の対象が無い: ${v.figKey}`);
    if (!['ok', 'fail'].includes(v.verdict) || String(v.reason ?? '').length < 8) throw new Error(`${v.figKey}: 判定は ok/fail と 8 字以上の理由が要る`);
    if (v.verdict === 'ok') item.audit = { verdict: 'ok', reason: v.reason, by, sha: item.raw.sha256 };
    else {
      item.rejected = [...(item.rejected ?? []), { sha: item.raw.sha256, reason: v.reason }];
      Object.assign(item, { raw: null, audit: null, fix: v.reason });
    }
  }
  writeJson(root, path, plan);
  return summarize(plan);
}

/** ok の判定が揃った計画を採用する。原稿が変わった項目・判定の無い項目があれば何も書かない。 */
export async function adoptPlan(root, pack, { now }) {
  const plan = readPlan(root, pack);
  if (!plan) throw new Error(`${pack}: 先に plan を作る`);
  const dir = packDirOf(pack);
  const board = readJson(root, `${dir}/storyboard.json`);
  const design = readJson(root, `${dir}/cover-design.json`);
  const scenes = new Map(board.scenes.map((s) => [s.sceneId, s]));
  const stale = [], unaudited = [];
  for (const item of plan.items) {
    const current = item.kind === 'cover' ? coverInput(design.covers.longform) : scenes.has(item.id) ? popSceneHash(scenes.get(item.id)) : null;
    if (current !== item.inputSha256) stale.push(item.id);
    if (!item.raw || item.audit?.verdict !== 'ok' || item.audit.sha !== item.raw.sha256) unaudited.push(item.id);
  }
  if (stale.length) throw new Error(`原稿が変わった項目がある（作り直す）: ${stale.join(', ')}`);
  if (unaudited.length) throw new Error(`監査の ok が無い項目がある: ${unaudited.join(', ')}`);
  if (plan.scope === 'all' && plan.items.length !== board.scenes.length) throw new Error('計画の項目数が原稿の場面数と違う');

  const finish = async (item, label) => {
    const raw = readFileSync(join(root, item.raw.path));
    if (hash(raw) !== item.raw.sha256) throw new Error(`${item.id}: 原本の sha が違う`);
    const output = item.kind === 'cover'
      ? await sharp(raw).resize(1920, 1080, { fit: 'fill' }).png({ palette: true, quality: 92, effort: 9 }).toBuffer()
      : await normalizeLearningFrame(raw);
    if (item.kind === 'cover' && output.length > 2 * 1024 * 1024) throw new Error('表紙が 2MiB を超える');
    const sha256 = hash(output);
    const path = `.tmp/media/${pack}/work/${label}.${sha256.slice(0, 8)}.png`;
    writeFileSync(join(root, path), output);
    return { path, sha256, width: 1920, height: 1080 };
  };
  const generation = (item) => ({ tool: 'image_gen', prompt: item.prompt ?? item.basePrompt, references: item.references, output: item.raw, generatedAt: now });
  const review = (item, extra) => ({ status: 'ai-reviewed', checkedAt: now, by: item.audit.by, reason: item.audit.reason, ...extra });
  const normalization = (item) => ({ mode: 'full-frame-v1', sourceSha256: item.raw.sha256 });

  const pop = existsSync(join(root, `${dir}/pop-image.json`)) ? readJson(root, `${dir}/pop-image.json`) : {};
  pop.revisions ??= {};
  const cover = plan.items.find((i) => i.kind === 'cover');
  const coverOutput = await finish(cover, 'cover-pop');
  const spec = design.covers.longform;
  pop.revisions[plan.coverRevision] = {
    version: 'pop-poster-v3', layout: { mode: 'diagram-led' }, generation: generation(cover),
    copy: { exam: pack.split('/')[0], headline: spec.headline, authority: spec.pop?.authority ?? '総監が制作' },
    output: coverOutput, normalization: normalization(cover), review: review(cover, { userImageReview: 'pending' }),
    storage: { group: 'content-media', sync: 'local' },
  };
  pop.activeCoverRevision = plan.coverRevision;
  if (plan.scope === 'all') {
    const images = [];
    for (const item of plan.items.filter((i) => i.kind === 'body')) {
      images.push({
        sceneId: item.id, inputSha256: item.inputSha256, generation: generation(item), output: await finish(item, `${item.id}-diagram`),
        normalization: normalization(item), review: review(item, { userReview: 'pending', continuousListening: 'not-performed' }),
      });
    }
    pop.revisions[plan.revision] = { layout: { mode: 'diagram-led' }, images };
    pop.activeBodyRevision = plan.revision;
  }
  if (!pop.activeBodyRevision) throw new Error('本文の採用済み改訂が無い。scope all で作る');
  board.imageDesign = { mode: 'codex-pop', scope: 'all-body', revision: pop.activeBodyRevision, coverRevision: plan.coverRevision, layout: 'diagram-led' };
  // 図解表紙（人物なし）から POP 表紙へ移すときも、描画が読む character を欠かさない
  const nextSpec = { character: { pose: 'pop-explaining', frame: 'waist' }, ...spec, design: 'pop-poster-v3', layout: 'diagram-led' };
  const { approvedImage: _old, ...input } = nextSpec;
  design.covers.longform = { ...input, approvedImage: { ...coverOutput, specSha256: coverInputDigest(input) } };

  const before = Object.fromEntries(['pop-image.json', 'cover-design.json', 'storyboard.json'].map((f) => {
    const p = join(root, dir, f);
    return [f, existsSync(p) ? readFileSync(p) : null];
  }));
  writeJson(root, `${dir}/pop-image.json`, pop);
  writeJson(root, `${dir}/cover-design.json`, design);
  writeJson(root, `${dir}/storyboard.json`, board);
  try {
    requirePopDiagramStandard(root, join(root, dir));
  } catch (error) { // 基準を満たさない書き込みを残さない
    for (const [f, bytes] of Object.entries(before)) if (bytes) writeFileSync(join(root, dir, f), bytes);
    throw error;
  }
  return { pack, cover: coverOutput.path, scenes: plan.scope === 'all' ? plan.items.length - 1 : 0 };
}

/** 描画に使う採用画像を手元へ揃える。表紙だけ作り直すときの本文は Drive にしか無い */
export function hydrateAdopted(root, pack, { refs = fileRef } = {}) {
  const pop = readJson(root, `${packDirOf(pack)}/pop-image.json`);
  const images = pop.revisions?.[pop.activeBodyRevision]?.images ?? [];
  const paths = images.flatMap((i) => [i.output?.path, i.generation?.output?.path]).filter(Boolean);
  paths.forEach((path) => refs(root, path));
  return paths.length;
}

/** 素材の台帳の行へ、採用した画像の判定を写す（R10 が見る形）。 */
export function ledgerVerdicts(root, pack, media) {
  const plan = readPlan(root, pack);
  if (!plan) throw new Error(`${pack}: 先に plan を作る`);
  const pop = readJson(root, `${packDirOf(pack)}/pop-image.json`);
  const reasons = new Map();
  for (const item of plan.items.filter((i) => i.audit?.verdict === 'ok')) {
    const revision = pop.revisions?.[item.kind === 'cover' ? plan.coverRevision : plan.revision];
    const output = item.kind === 'cover' ? revision?.output : revision?.images?.find((x) => x.sceneId === item.id)?.output;
    if (output) reasons.set(output.sha256, item.audit.reason);
  }
  return media.filter((m) => m.provenance?.kind === 'ai-generated' && reasons.has(m.sha256))
    .map((m) => ({ figKey: `media:${m.id}`, verdict: 'ok', reason: reasons.get(m.sha256) }));
}

/**
 * 承認を外した公開行（qa_passed）を返す。承認済みで予約の段へ進んでいない行だけを受け付ける（DN-1066）。
 * 方針が書いた画面確認の承認も外し、運営者の確認は残す。
 */
export function unapprovedRow(pub) {
  if (pub.status !== 'approved' || !pub.approval) throw new Error(`${pub.id}: ${pub.status} は承認済みの行ではない`);
  if (pub.delivery?.uploadRequestedAt) throw new Error(`${pub.id}: 予約の段へ進んでいる（delivery あり）。registry-reconcile で実体を確かめる`);
  const { approval: _approval, review, ...rest } = pub;
  const keep = review?.visual && review.visual.by !== 'policy' ? { review } : {};
  return { ...rest, ...keep, status: 'qa_passed' };
}

/**
 * 内容QAが採点した原稿の digest。script.md・storyboard.json（画像の工程が書く imageDesign を除く）・video-pack.json。
 * QA の合格はこの digest に付き、原稿が変われば古くなる（合格の後に台本を直しても合格のままだった・DN-1067）。
 */
export function qaInputDigest(root, pack) {
  const dir = join(root, packDirOf(pack));
  const { imageDesign: _imageDesign, ...board } = JSON.parse(readFileSync(join(dir, 'storyboard.json'), 'utf8'));
  const text = (file) => readFileSync(join(dir, file), 'utf8').replace(/\r\n/g, '\n');
  return hash(JSON.stringify({ script: text('script.md'), storyboard: board, videoPack: JSON.parse(text('video-pack.json')) }));
}

/**
 * 台帳の QA を今の原稿で読む。none＝未採点・stale＝原稿が変わった・passed・blocked。
 * digest の無い記録（DN-1067 より前）は採点時の原稿が分からないので、そのまま受け入れる。
 */
export function qaState(qa, digest) {
  if (!qa) return 'none';
  if (qa.inputSha256 && qa.inputSha256 !== digest) return 'stale';
  return qa.avg >= 2 && qa.blocks === 0 ? 'passed' : 'blocked';
}

/** 事実から次の工程を決める。確認が取れていない工程を飛ばさない。 */
export function nextStage(f) {
  // 承認しただけで予約の段へ進んでいない行は done にしない。公開の枠を落としても緑に見えていた（DN-1066）
  if (['approved', 'rendered'].includes(f.status) && f.delivering === false) return f.slotExpired ? 'slot-expired' : 'publish-pending';
  if (['approved', 'rendered', 'uploaded_private', 'scheduled', 'published'].includes(f.status)) return 'done';
  if (f.status === 'stopped') return 'stopped';
  if (f.qa === 'blocked') return 'fix-script';
  // 内容QAは画像の前。BLOCK の台本に画像と描画の費用をかけない（Workflow と同じ順・DN-1067）
  if (f.qa !== 'passed') return 'qa';
  if (!f.standard) {
    if (!f.plan) return 'plan';
    if (f.plan.exhausted.length) return 'images-exhausted';
    if (f.plan.stalled?.length) return 'generate-stalled';
    if (f.plan.missing) return 'generate';
    if (f.plan.unaudited) return 'audit';
    return 'adopt';
  }
  if (!f.rendered) return 'render';
  if (f.review === 'fail') return 'review-failed';
  if (f.review !== 'pass') return 'review';
  return 'ready-for-approval';
}

/**
 * 画像を作る前に、無料で決まる関門の項目を見る（DN-1068）。空なら合格。
 * 計画にない・送り先が解決できない・表紙の設計が無いパックが、画像・描画・画面確認の費用を払った後の関門で初めて落ちていた。
 * @param {{ pub: object|null, planProblems: string[], cta: object|undefined, products: object[], siteUrl: (path: string) => string, cover: object|null }} f
 */
export function preflightProblems({ pub, planProblems, cta, products, siteUrl, cover }) {
  const problems = [];
  if (!pub) problems.push('公開行が無い（registry -- import-video-pack で載せ、年間計画の行に publicationId を結ぶ）');
  problems.push(...planProblems);
  const product = (channel) => products.find((p) => p.channel === channel && p.id === cta?.targetId);
  if (!cta?.kind) problems.push('video-pack.json に primaryCta が無い');
  else if (cta.kind === 'note-magazine') {
    const p = product('note');
    if (!p?.catalog?.published || p.catalog.retiredAt) problems.push(`主CTAの note 商品が公開中でない: ${cta.targetId}`);
  } else if (cta.kind === 'coconala-service') {
    if (product('coconala')?.catalog?.status !== 'listed') problems.push(`主CTAのココナラ商品が出品中でない: ${cta.targetId}`);
  } else if (cta.kind === 'site-article') {
    try { siteUrl(cta.targetPath); } catch (error) { problems.push(`主CTAのサイト記事: ${error.message}`); }
  } else if (cta.kind === 'links-hub') {
    problems.push('主CTAが links-hub（新規公開は商品か関連記事への直接の導線が要る）');
  } else problems.push(`未対応の主CTA: ${cta.kind}`);
  if (!cover?.covers?.longform?.headline?.length) problems.push('cover-design.json に longform の見出しが無い');
  return problems;
}
