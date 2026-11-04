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

export const MAX_ATTEMPTS = 3;
const SUBTITLE_ZONE = 0.18; // 本文の下端は字幕が載る。生成指示と機械検査で同じ値を使う
const SUBTITLE_STDEV_MAX = 14;
const COVER_STYLE = '.tmp/media/pe-first-stage/pe1-zentaizou/youtube.longform/cover.1941cd22.png';
const BODY_STYLE = '.tmp/media/pe-first-stage/pe1-kiso-newton-hou/work/answer-diagram.2d6c31ce.png';
const PALETTES = {
  'pe-construction': '深いインディゴ #33356B と明るい青紫', // qualification-ssot: allow 画像の配色の指示で資格名ではない
  'pe-comprehensive-management': '鮮やかな青・シアン・ネイビー', // qualification-ssot: allow 画像の配色の指示で資格名ではない
};
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

export function readPlan(root, pack) {
  return existsSync(join(root, planPath(pack))) ? readJson(root, planPath(pack)) : null;
}

/** 参照画像を手元へ揃える。.tmp/media に無ければ Drive から写す */
function fileRef(root, rel) {
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

/** 本文の生成指示。場面の原稿だけから決まる（同じ原稿なら同じ指示）。 */
export function buildBodyPrompt(scene, exam) {
  const palette = PALETTES[exam] ?? '試験の青と深紺';
  const art = scene.visual?.art ?? {};
  const words = (scene.visual?.items ?? []).map(oneLine);
  return [
    `参照画像は学習図解の意匠参照のみ。新規の16:9横長（1920×1080想定）教育動画本文の1場面。白〜淡いグレー背景、${palette}の太い線、補助に小さな黄色。`,
    'シンプルで大きな図解を主役にする。広告風POPポスター、人物、白い箇条書きカード、細かい文字は禁止。',
    `すべての意味ある文字・図は左右5%・上5%・下${SUBTITLE_ZONE * 100}%の内側に置く。下端は字幕用の無地の背景だけ。`,
    '文字は指定した日本語だけを大きく正確に描き、余計な文言・数字を足さない。',
    `見出し『${scene.visual?.heading ?? scene.sceneId}』。`,
    COMPOSITION[art.type] ? `構図: ${COMPOSITION[art.type]}。` : '',
    words.length ? `図に入れる文字: ${words.map((w) => `『${w}』`).join(' ')}。` : '',
    art.note ? `図の下に『${oneLine(art.note)}』。` : '',
    `この場面の説明（文字にしない）: ${oneLine(scene.narration)}`,
  ].filter(Boolean).join(' ');
}

/** 表紙の生成指示。cover-design の見出しだけを文字にする。 */
export function buildCoverPrompt(spec, exam) {
  const lines = spec.headline ?? [];
  const palette = PALETTES[exam] ?? '鮮やかな青・シアン・ネイビー';
  return [
    '添付の1枚目はdoboku-noteで採用済みの全面POP動画表紙の意匠参照、2枚目は先生キャラクターの同一性参照です。',
    `新規の16:9横長（1920×1080想定）日本語YouTube動画表紙を作る。${palette}、黄色と白の極太文字、明確な黒い輪郭、少量の赤、斜めの面と勢いのある背景、右側に先生キャラクターを大きく。`,
    '先生は同じ顔、黒髪、黒縁眼鏡、軽いひげ、無地の白ヘルメット、紺の作業服とネクタイ、黄白の反射帯。',
    `左〜中央に正確に${lines.map((l) => `『${l}』`).join('')}を大きく配置。上部の黄色帯に小さく『${spec.pop?.authority ?? '総監が制作'}』。`,
    '誤字・余計な文字・合格保証・URL・価格・不明な実績を足さない。文字と顔は左右5%・上下5%内、下端18%は字幕が重なるので重要な文字や顔を置かず背景が全面に続く。',
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
    return old && old.inputSha256 === item.inputSha256 && old.basePrompt === item.basePrompt ? { ...item, ...old } : item;
  };
  const items = [keep({
    id: 'cover', kind: 'cover', inputSha256: coverInput(spec), basePrompt: buildCoverPrompt(spec, exam),
    references: [refs(root, COVER_STYLE), refs(root, `content/sns/_assets/character/_source/${spec.character?.pose ?? 'pop-explaining'}.png`)],
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

/** 未生成と不合格の項目だけを作る。回数の上限に達した項目は残す（勝手に通さない）。 */
export async function generatePlan(root, pack, { concurrency = 3, generate = generateWithCodexAsync, log = () => {} } = {}) {
  const plan = readPlan(root, pack);
  if (!plan) throw new Error(`${pack}: 先に plan を作る`);
  const todo = plan.items.filter((i) => !i.raw && i.attempts < MAX_ATTEMPTS);
  let next = 0;
  const one = async (item) => {
    item.attempts += 1;
    const prompt = item.fix ? `${item.basePrompt} 前回の不合格の理由を直す: ${item.fix}` : item.basePrompt;
    const out = await generate(prompt, null, { images: item.references.map((r) => join(root, r.path)) });
    if (!out) { item.lastError = '画像が出なかった'; log(`${item.id}: 画像が出なかった`); return; }
    const bytes = await sharp(readFileSync(out)).png().toBuffer();
    const issues = await inspectImage(bytes, item.kind);
    if (issues.length) { item.fix = issues.join('／'); item.lastError = item.fix; log(`${item.id}: ${item.fix}`); return; }
    const sha256 = hash(bytes);
    const path = `.tmp/media/${pack}/work/factory/raw-${item.id}.${sha256.slice(0, 8)}.png`;
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), bytes);
    Object.assign(item, { raw: { path, sha256 }, prompt, audit: null, lastError: null });
    log(`${item.id}: ok`);
  };
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next < todo.length) await one(todo[next++]);
  }));
  writeJson(root, planPath(pack), plan);
  return summarize(plan);
}

export function summarize(plan) {
  const items = plan?.items ?? [];
  const missing = items.filter((i) => !i.raw);
  return {
    total: items.length,
    missing: missing.length,
    exhausted: missing.filter((i) => i.attempts >= MAX_ATTEMPTS).map((i) => i.id),
    unaudited: items.filter((i) => i.raw && i.audit?.sha !== i.raw.sha256).length,
    ok: items.filter((i) => i.raw && i.audit?.sha === i.raw.sha256 && i.audit.verdict === 'ok').length,
  };
}

/** 監査へ渡す項目。作った側の説明は渡さず、原稿と指示だけを渡す。 */
export function auditQueue(root, pack) {
  const plan = readPlan(root, pack);
  if (!plan) throw new Error(`${pack}: 先に plan を作る`);
  return plan.items.filter((i) => i.raw && i.audit?.sha !== i.raw.sha256).map((i) => ({
    figKey: i.id, kind: i.kind, img: join(root, i.raw.path), prompt: i.basePrompt,
    用途の説明: `${pack} の通常動画の${i.kind === 'cover' ? '表紙' : `本文の場面 ${i.id}`}`,
    references: i.kind === 'cover' ? i.references.map((r) => join(root, r.path)) : [],
  }));
}

/** 判定を記録する。fail は画像を外し、理由を次の生成へ渡す。 */
export function recordAudit(root, pack, verdicts, { by }) {
  if (!by) throw new Error('判定した担当の名前が要る');
  const plan = readPlan(root, pack);
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
  writeJson(root, planPath(pack), plan);
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
  const nextSpec = { ...spec, design: 'pop-poster-v3', layout: 'diagram-led' };
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

/** 事実から次の工程を決める。確認が取れていない工程を飛ばさない。 */
export function nextStage(f) {
  if (['approved', 'rendered', 'uploaded_private', 'scheduled', 'published'].includes(f.status)) return 'done';
  if (f.status === 'stopped') return 'stopped';
  if (f.qa === 'blocked') return 'fix-script';
  if (!f.standard) {
    if (!f.plan) return 'plan';
    if (f.plan.exhausted.length) return 'images-exhausted';
    if (f.plan.missing) return 'generate';
    if (f.plan.unaudited) return 'audit';
    return 'adopt';
  }
  if (!f.rendered) return 'render';
  if (f.qa !== 'passed') return 'qa';
  if (f.review === 'fail') return 'review-failed';
  if (f.review !== 'pass') return 'review';
  return 'ready-for-approval';
}
