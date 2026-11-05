/**
 * shorts-factory.mjs — ショートの標準工程の決定的な部分（生成の計画・機械検査・採用・描画）。
 *
 * 通常動画と同じく、Codex の画像を ai-image-fidelity-auditor の ok が今の sha に付くまで採用しない。
 * 画面は表紙・論点ごとの図解・締めの全面画像で、旧テンプレートの定型カードは使わない。
 * 計画は shorts-design.json（論点の分割）と承認済みの台本から作り、語りは台本から変えない。
 * 承認・公開はここに無い。手順の正本: .claude/knowledge/reference/video-factory.md
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { readJson, writeJson } from './json-io.mjs';
import { mediaPath } from './media-paths.mjs';
import { loadRegistry, qualificationShortLabel } from './qualification-registry.mjs';
import { subtitleChunks } from './video-subtitles.mjs';
import { narrationInput } from './video-narration-cache.mjs';
import { coverInputDigest } from './youtube-approved-cover.mjs';
import { fileRef, packDirOf, readPlan } from './video-factory.mjs';

export const DESIGN_FILE = 'shorts-design.json';
export const MIN_SECONDS = 20;
export const MAX_SECONDS = 60;
const W = 1080;
const H = 1920;
const BOTTOM_ZONE = 0.18;
const BOTTOM_STDEV_MIN = 3;
const SUBTITLE_SIZE = 74;
const SUBTITLE_CHARS = 14;
const SUBTITLE_MARGIN = 420; // 操作ボタンと重ならない高さ（動画ポリシーの Shorts の字幕位置）
const SPEAKER = 13;
const CHARACTER = '.tmp/media/pe-first-stage/pe1-zentaizou/youtube.longform/cover.1941cd22.png';
// 2級土木は図解主体の diagram-led を優先するので、この POP 工程の対象に含めない（create-pop-image）
const PALETTES = {
  'civil-construction-1': '鮮やかな青と深い紺', // qualification-ssot: allow 画像の配色の指示で資格名ではない
  'concrete-engineer': '深いティール（青緑）', // qualification-ssot: allow 画像の配色の指示で資格名ではない
  'concrete-chief-engineer': '深い紫', // qualification-ssot: allow 画像の配色の指示で資格名ではない
};
const FRAME = '縦9:16（1080×1920想定）で構図し直す。横長の参照を引き伸ばしたり切り取ったりしない。背景は上下左右の四辺まで連続させ、無地の帯や大きな空白を作らない。背景は1枚の連続した絵として描き、縦の境界線で途切れさせない。重要な文字・図・顔は左右とも6%以上内側、上は8%より下、下は端から32%より上に収める。画面の上から45%より下では、右端から18%の範囲（アプリの操作ボタンが載る）にも重要な文字・顔を置かない（下32%は字幕とボタンが載る。背景の模様だけは続ける）。';
const BANS = '指定した日本語だけを正確に描く。誤字、余計な文字、英語の飾り文字、URL、価格、合格保証、ロゴは入れない。';
const TEACHER = '先生は同じ顔、黒髪、黒縁眼鏡、軽いひげ、無地の白ヘルメット、紺の作業服とネクタイ、黄白の反射帯。手は左右1本ずつだけで、指は5本、関節は自然に描き、指の形が崩れる構図を避ける。人物の身体を画面の途中で切らない。';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const pop = (palette) => `親しみやすいPOPな教材デザイン。${palette}を主色に、黄色と白、少量の赤。太い黒の輪郭と斜めの面で勢いを出す。`;
const words = (text) => String(text ?? '').replace(/[\s、。,.]/g, '');
const inputOf = (value) => hash(JSON.stringify(value));

export const shortsPlanPath = (pack, key) => `.tmp/media/${pack}/work/factory/shorts-${key}.json`;
export const renderDirOf = (root, pack, key) => join(root, '.tmp/video-render', pack.split('/')[1], 'shorts', key);

function packContext(root, pack, key) {
  const dir = packDirOf(pack);
  const exam = pack.split('/')[0];
  const design = readJson(root, `${dir}/${DESIGN_FILE}`).shorts?.[key];
  if (!design) throw new Error(`${pack}: ${DESIGN_FILE} に ${key} が無い`);
  const board = readJson(root, `${dir}/storyboard.json`);
  const youtube = readJson(root, `${dir}/youtube.json`);
  const item = youtube.shorts?.find((s) => s.key === key);
  if (!item) throw new Error(`${pack}: youtube.json に ${key} が無い`);
  const scene = board.scenes.find((s) => s.sceneId === item.sceneId);
  if (!scene) throw new Error(`${key}: 場面が台本に無い (${item.sceneId})`);
  const covers = readJson(root, `${dir}/cover-design.json`);
  const spec = covers.covers?.[key];
  if (!spec || spec.format !== 'shorts') throw new Error(`${key}: cover-design.json に縦の表紙が無い`);
  const cta = readJson(root, `${dir}/cta-design.json`).shorts?.narration;
  if (!cta) throw new Error(`${pack}: cta-design.json に shorts の語りが無い`);
  return { dir, exam, design, board, youtube, item, scene, covers, spec, cta };
}

/** 語りの切り方の検査。論点ごとの語りをつなぐと承認済みの台本の場面に一致すること。 */
export function narrationProblems(design, scene) {
  const issues = [];
  if (!String(design.hook ?? '').trim()) issues.push('hook が無い');
  if (!Array.isArray(design.beats) || !design.beats.length) issues.push('beats が空');
  else if (words(design.beats.map((b) => b.narration).join('')) !== words(scene.narration)) issues.push('beats の語りが台本の場面と一致しない');
  return issues;
}

const coverPrompt = (design, spec, label, palette) => [
  `添付は採用済みの全面POP動画表紙の意匠と先生キャラクターの同一性の参照です。新規の日本語YouTube Shorts表紙を作る。${FRAME}`,
  pop(palette), '黄色と白の極太文字。',
  `上部に『${label}』、最も大きく${spec.headline.map((l) => `『${l}』`).join('')}、小さな黄色帯に『${spec.pop?.authority ?? '総監が制作'}』。`,
  `先生を大きく（腰から上、顔が画面の幅の2割以上）描く。${design.pose}`, TEACHER, BANS,
].join(' ');
const bodyPrompt = (beat, index, label, palette) => [
  `添付は意匠の参照のみ（構図と文字はまねない）。新規の縦長学習画面。${FRAME}`,
  pop(palette), '図を画面の主役にする。図は画面の上から68%までの範囲いっぱいに大きく描き、上半分へ縮めて寄せない。白いカードの箇条書きにしない。人物なし。',
  `一番上に資格名の小さなラベル『${label}』。大きな番号『${index + 1}』と見出し『${beat.heading}』。`,
  `図: ${beat.diagram}`, BANS,
].join(' ');
const ctaPrompt = (label, palette) => [
  `添付は全面POPの意匠と先生キャラクターの同一性の参照です。新規の日本語YouTube Shorts締め画面。${FRAME}`,
  pop(palette), '大きく2行で『詳しい解説は』『関連動画へ』、下向きの矢印を添える。先生が大きく腰から上で、手のひらで矢印を示す。',
  TEACHER, `資格名『${label}』は書かない。下端に無地帯を作らない。`, BANS,
].join(' ');

/** 作業の計画を作る。入力が同じ項目は生成済みの画像と判定を引き継ぐ。 */
export function buildShortPlan(root, pack, key, { date, refs = fileRef } = {}) {
  if (!/^\d{8}$/.test(date ?? '')) throw new Error('date は YYYYMMDD');
  const { exam, design, scene, spec, cta } = packContext(root, pack, key);
  const palette = PALETTES[exam];
  if (!palette) throw new Error(`${exam}: POP のショート工程の対象外（2級土木は diagram-led の手順を使う）`);
  const problems = narrationProblems(design, scene);
  if (problems.length) throw new Error(`${key}: ${problems.join('・')}`);
  const label = qualificationShortLabel(loadRegistry(root), exam);
  const prior = new Map((readPlan(root, pack, shortsPlanPath(pack, key))?.items ?? []).map((i) => [i.id, i]));
  const keep = (item) => (prior.get(item.id)?.inputSha256 === item.inputSha256 ? { ...item, ...prior.get(item.id) } : item);
  const people = [refs(root, CHARACTER), ...(spec.approvedImage?.path && existsSync(join(root, spec.approvedImage.path)) ? [refs(root, spec.approvedImage.path)] : [])];
  const base = { attempts: 0, raw: null, audit: null };
  const items = [
    keep({ ...base, id: 'cover', kind: 'cover', narration: design.hook, inputSha256: inputOf([spec.headline, design.hook, design.pose]), basePrompt: coverPrompt(design, spec, label, palette), references: people }),
    ...design.beats.map((beat, i) => keep({ ...base, id: `scene-${String(i + 1).padStart(3, '0')}`, kind: 'body', narration: beat.narration, inputSha256: inputOf([beat.narration, beat.heading, beat.diagram]), basePrompt: bodyPrompt(beat, i, label, palette), references: [refs(root, CHARACTER)] })),
    keep({ ...base, id: 'cta', kind: 'cta', narration: cta, inputSha256: inputOf([cta]), basePrompt: ctaPrompt(label, palette), references: people }),
  ];
  const plan = { schemaVersion: 1, pack, key, revision: `shorts-pop-${key}-${date}`, items };
  writeJson(root, shortsPlanPath(pack, key), plan);
  return plan;
}

/** 目で見る前の機械検査。比率・解像度と、下端の無地帯を見る。空なら合格。 */
export async function inspectShortImage(bytes) {
  const meta = await sharp(bytes).metadata();
  const issues = [];
  if (!meta.width || meta.width < 900) issues.push(`解像度が足りない（${meta.width}×${meta.height}）`);
  if (Math.abs(meta.width / meta.height / (9 / 16) - 1) > 0.005) issues.push(`9:16 ではない（${meta.width}×${meta.height}）`);
  if (issues.length) return issues;
  const stdev = async (image) => (await sharp(await image.greyscale().png().toBuffer()).stats()).channels[0].stdev;
  if (await stdev(sharp(bytes)) < 5) issues.push('全面がほぼ単色');
  const height = Math.floor(meta.height * BOTTOM_ZONE);
  const zone = await stdev(sharp(bytes).extract({ left: 0, top: meta.height - height, width: meta.width, height }));
  if (zone < BOTTOM_STDEV_MIN) issues.push(`下端が無地の帯になっている（ばらつき ${zone.toFixed(1)}）`);
  return issues;
}

/** ok の判定が揃った計画を採用する。入力が変わった項目・判定の無い項目があれば何も書かない。 */
export async function adoptShort(root, pack, key, { now }) {
  const plan = readPlan(root, pack, shortsPlanPath(pack, key));
  if (!plan) throw new Error(`${pack}/${key}: 先に plan を作る`);
  const current = buildShortPlanInputs(root, pack, key);
  const stale = plan.items.filter((i) => current.get(i.id) !== i.inputSha256).map((i) => i.id);
  if (stale.length || current.size !== plan.items.length) throw new Error(`入力が変わった項目がある（plan から作り直す）: ${stale.join(', ')}`);
  const unaudited = plan.items.filter((i) => !i.raw || i.audit?.verdict !== 'ok' || i.audit.sha !== i.raw.sha256).map((i) => i.id);
  if (unaudited.length) throw new Error(`監査の ok が無い項目がある: ${unaudited.join(', ')}`);

  const { dir, covers, spec, item: short } = packContext(root, pack, key);
  const pubId = `${pack}/youtube.short.${key}`;
  const images = [];
  for (const item of plan.items) {
    const raw = readFileSync(join(root, item.raw.path));
    if (hash(raw) !== item.raw.sha256) throw new Error(`${item.id}: 原本の sha が違う`);
    const output = await sharp(raw).resize(W, H, { fit: 'fill' }).png({ palette: true, quality: 92, effort: 9 }).toBuffer();
    const sha256 = hash(output);
    const path = mediaPath({ pubId, role: item.id, sha256, ext: 'png' });
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), output);
    images.push({
      role: item.id, inputSha256: item.inputSha256, narration: item.narration,
      generation: { tool: 'image_gen', prompt: item.prompt ?? item.basePrompt, references: item.references, output: item.raw, generatedAt: now },
      output: { path, sha256, width: W, height: H }, normalization: { mode: 'full-frame-v1', sourceSha256: item.raw.sha256 },
      review: { status: 'ai-reviewed', checkedAt: now, by: item.audit.by, reason: item.audit.reason },
    });
  }
  const popFile = join(root, dir, 'pop-image.json');
  const record = existsSync(popFile) ? JSON.parse(readFileSync(popFile, 'utf8')) : {};
  record.revisions ??= {};
  record.revisions[plan.revision] = { version: 'pop-poster-v3-shorts', publicationId: pubId, key, sceneId: short.sceneId, images };
  record.activeShorts = { ...record.activeShorts, [key]: plan.revision };
  const coverOutput = images[0].output;
  const { approvedImage: _old, ...rest } = spec;
  const input = { ...rest, design: 'pop-poster-v3' };
  covers.covers[key] = { ...input, approvedImage: { path: coverOutput.path, sha256: coverOutput.sha256, specSha256: coverInputDigest(input) } };
  writeJson(root, `${dir}/pop-image.json`, record);
  writeJson(root, `${dir}/cover-design.json`, covers);
  return { pack, key, revision: plan.revision, images: images.length };
}

function buildShortPlanInputs(root, pack, key) {
  const { design, spec, cta } = packContext(root, pack, key);
  return new Map([
    ['cover', inputOf([spec.headline, design.hook, design.pose])],
    ...design.beats.map((b, i) => [`scene-${String(i + 1).padStart(3, '0')}`, inputOf([b.narration, b.heading, b.diagram])]),
    ['cta', inputOf([cta])],
  ]);
}

const assTime = (s) => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${(s % 60).toFixed(2).padStart(5, '0')}`;

export function buildAss(segments) {
  const header = `[Script Info]\nScriptType: v4.00+\nPlayResX: ${W}\nPlayResY: ${H}\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Noto Sans JP,${SUBTITLE_SIZE},&H00FFFFFF,&H000000FF,&H00000000,&H98000000,1,0,0,0,100,100,0,0,3,3,0,2,64,64,${SUBTITLE_MARGIN},1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;
  const lines = [];
  for (const { text, start, duration } of segments) {
    const chunks = subtitleChunks(text, SUBTITLE_CHARS);
    const total = [...text].length || 1;
    let at = start;
    chunks.forEach((chunk, index) => {
      const end = index === chunks.length - 1 ? start + duration : at + duration * ([...chunk].length / total);
      lines.push(`Dialogue: 0,${assTime(at)},${assTime(end)},Default,,0,0,0,,${chunk}`);
      at = end;
    });
  }
  return `${header}\n${lines.join('\n')}\n`;
}

/** 採用画像と語りから完成動画を作り、youtube.json の sha と採用記録の動画 sha を更新する。 */
export async function renderShort(root, pack, key, { refs = fileRef, log = () => {} } = {}) {
  const { dir, youtube, item } = packContext(root, pack, key);
  const popFile = `${dir}/pop-image.json`;
  const record = readJson(root, popFile);
  const revision = record.revisions?.[record.activeShorts?.[key]];
  if (!revision) throw new Error(`${key}: 採用した画像が無い。adopt を先に行う`);
  const { composeStaticSlidesVideo, probeDuration } = await import(pathToFileURL(join(root, '.claude/skills/social/yt-shorts-create/scripts/lib/ffmpeg-compose.mjs')).href);
  const { synthesize } = await import(pathToFileURL(join(root, '.claude/scripts/lib/sns-common/tts-client.mjs')).href);
  const out = renderDirOf(root, pack, key);
  const work = join(out, 'work');
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });

  const segments = [];
  let start = 0;
  for (const image of revision.images) {
    refs(root, image.output.path);
    const abs = join(root, image.output.path);
    if (hash(readFileSync(abs)) !== image.output.sha256) throw new Error(`${image.role}: 採用画像の sha が違う`);
    const input = narrationInput(image.narration, SPEAKER);
    const wav = join(work, `${image.role}.wav`);
    writeFileSync(wav, Buffer.from(await synthesize({ text: input.text, speaker: SPEAKER })));
    const duration = await probeDuration(wav);
    segments.push({ role: image.role, text: image.narration, spoken: input.text, png: abs, wav, start, duration });
    start += duration;
  }
  const assPath = join(out, 'subtitles.ass');
  writeFileSync(assPath, buildAss(segments), 'utf8');
  const video = join(out, 'shorts.mp4');
  await composeStaticSlidesVideo({ pngPaths: segments.map((s) => s.png), wavPaths: segments.map((s) => s.wav), assPath, outPath: video });
  const durationSeconds = await probeDuration(video);
  if (durationSeconds < MIN_SECONDS || durationSeconds > MAX_SECONDS) throw new Error(`${key}: 尺が ${MIN_SECONDS}〜${MAX_SECONDS} 秒の外 (${durationSeconds.toFixed(2)})`);
  const thumbnail = join(out, 'thumbnail.png');
  copyFileSync(segments[0].png, thumbnail);

  // 画面確認の材料。字幕込みの各画面を幅 360px で並べる（判定はこの動画の sha に付ける）
  const frames = segments.map((s, i) => {
    const frame = join(work, `frame-${i}.png`);
    const run = spawnSync('ffmpeg', ['-y', '-v', 'error', '-ss', String(s.start + s.duration / 2), '-i', video, '-frames:v', '1', '-vf', 'scale=360:-1', frame]);
    if (run.status !== 0) throw new Error(`${s.role}: 確認用の画面を切り出せない`);
    return frame;
  });
  const sheet = join(out, 'frames.png');
  const stacked = spawnSync('ffmpeg', ['-y', '-v', 'error', ...frames.flatMap((f) => ['-i', f]), '-filter_complex', `hstack=${frames.length}`, sheet]);
  if (stacked.status !== 0) throw new Error('確認用の一覧を作れない');

  const videoSha = hash(readFileSync(video));
  const thumbnailSha = hash(readFileSync(thumbnail));
  writeFileSync(join(out, 'meta.json'), `${JSON.stringify({
    title: item.title, description: item.description, tags: item.tags, categoryId: item.categoryId, privacyStatus: 'private', publishAt: item.publishAt,
    sourcePackId: pack.split('/')[1], sourceUrl: null, durationSeconds, derivedFrom: 'video-pack', relatedVideoKey: 'longform',
  }, null, 2)}\n`);
  item.sha256 = videoSha;
  item.thumbnailSha256 = thumbnailSha;
  writeJson(root, `${dir}/youtube.json`, youtube);
  revision.render = { videoSha256: videoSha, durationSeconds, speaker: SPEAKER, sceneCount: segments.length };
  delete revision.screenReview; // 動画が変わったら画面確認はやり直す
  writeJson(root, popFile, record);
  log(`${key}: ${durationSeconds.toFixed(2)}s sha256=${videoSha}`);
  return { video, sheet, durationSeconds, videoSha, spoken: segments.map((s) => s.spoken) };
}

/** 画面確認の判定を、今の完成動画の sha に付ける。 */
export function recordScreenReview(root, pack, key, { verdict, by, reason, now }) {
  if (!['pass', 'fail'].includes(verdict) || !by || String(reason ?? '').length < 8) throw new Error('判定は pass/fail・担当・8 字以上の理由が要る');
  const { dir, item } = packContext(root, pack, key);
  const record = readJson(root, `${dir}/pop-image.json`);
  const revision = record.revisions?.[record.activeShorts?.[key]];
  if (!revision?.render || revision.render.videoSha256 !== item.sha256) throw new Error(`${key}: 描画の記録が今の動画と合わない`);
  revision.screenReview = { verdict, by, reason, videoSha256: item.sha256, checkedAt: now };
  writeJson(root, `${dir}/pop-image.json`, record);
  return revision.screenReview;
}
