#!/usr/bin/env node
/**
 * YouTube Shorts「1問1ショート」一括生成 CLI（過去問パック派生・全問展開モード）。
 *
 * 設計（2026-06-06 改修）: YT は IG リール mp4 を流用しない。IG 用 PNG には
 * 「N / 10」ページ番号・「PROBLEM 1 / 4」通し番号・「まずは1問やってみる →」等の
 * スワイプ前提チャームが焼かれており、単発1問動画に不整合だったため。
 * → YT 専用に slide PNG を ytMode で再描画（IG チャーム抑止）し、TTS wav（ナレーションは
 *   IG と同一なので再利用可）と再合成する。カバーは年度共通の汎用ナレーション
 *   ＋ 問別の論点を主役表示（exam-cover-ig の youtube 仕様）。
 *
 * 構成（4スライド）: cover(論点) → problem → answer → cta。いずれも IG チャームなし。
 *   - cover PNG: renderExamCoverIg(hidePage, showCta:false, topic=論点)
 *   - problem/answer/cta PNG: renderSlide(quiz-*, data.ytMode=true)
 *   - 音声: cover=年度別汎用 TTS / problem・answer・cta=reels/wav の既存 TTS を再利用
 *
 * タイトル: --titles <json> の { "<year>-pack-<NN>-q<N>": "<full title>" } を採用。
 *   無いキーは answer.correctText から機械フォールバック。論点（カバー表示）はタイトルから抽出。
 *
 * 出力: content/sns/youtube/<date>-<year>-pack-<NN>-q<N>/{shorts.mp4, thumbnail.png, meta.json}
 *   shorts.mp4 / thumbnail.png は gitignore。meta.json のみ追跡。
 *
 * Usage:
 *   node per-problem-shorts.mjs --exam-dir 技術士総監 --titles .tmp/yt-gen/titles.json
 *   node per-problem-shorts.mjs --exam-dir 技術士総監 --pack r07-pack-02   # 検証
 *
 * 要 VOICEVOX 起動（汎用カバー音声合成）。ffmpeg 必須。
 */

import { mkdirSync, writeFileSync, readFileSync, copyFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

import { synthesize } from '#lib/sns-common/tts-client.mjs';
import { applyReadingDict } from '#lib/sns-common/reading-dict.mjs';
import { renderSlide } from '#lib/sns-common/slide-render.mjs';
import { SNS_CONFIG } from '#lib/sns-common/sns-config.mjs';
import { buildUtmUrl } from '#lib/utm-builder.mjs';

const { renderExamCoverIg } = await import(pathToFileURL(resolve('.claude/scripts/sns/templates/exam-cover-ig.mjs')).href);
const { svgToPng } = await import(pathToFileURL(resolve('.claude/scripts/sns/lib/svg-to-png.mjs')).href);

const W = 1080, H = 1920;
const examRoot = (examDir) => join('content', 'sns', 'instagram', examDir, 'exam-packs');

function yearLabel(year) {
  return `令和${year.replace(/^[rRhH]0?/, '')}年度`;
}
function probeDur(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file], { encoding: 'utf8' });
  return parseFloat((r.stdout || '0').trim()) || 0;
}
function topicFromTitle(title) {
  const m = (title || '').match(/択一｜(.+?)\s*#Shorts\s*$/);
  return m ? m[1].trim() : '';
}

/**
 * PNG + WAV → slide mp4（slide 諸元 h264/yuv420p/25fps/aac 24000 mono に統一＝concat -c copy 整合）。
 * padSec>0 で音声後に無音を足す（問題スライドの読み取りポーズ用）。apad で音声長を映像長に合わせる。
 */
function composeSlide(pngPath, wavPath, outMp4, padSec = 0) {
  const dur = probeDur(wavPath) + padSec;
  const r = spawnSync('ffmpeg', ['-y', '-loop', '1', '-i', pngPath, '-i', wavPath, '-t', String(dur),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '25',
    '-af', 'apad', '-c:a', 'aac', '-ar', '24000', '-ac', '1', '-b:a', '192k', outMp4], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`slide 合成失敗 (${pngPath}):\n${(r.stderr || '').slice(-300)}`);
}

const PROBLEM_PAUSE_SEC = 3; // 問題提示後の読み取り間
const NARRATION_DIR = join('.tmp', 'yt-gen', 'narration'); // 事前生成した YT 問題ナレーション

/** 60秒超ショートを ≤57秒へ等速圧縮（atempo=音声ピッチ保持・setpts=映像）。YT Shorts は60秒厳守。 */
function capDuration(mp4, dur, tmpDir, target = 57) {
  const factor = dur / target; // 1.0〜1.5 程度（atempo 単段で可）
  const capped = join(tmpDir, 'capped.mp4');
  const r = spawnSync('ffmpeg', ['-y', '-i', mp4,
    '-filter:v', `setpts=PTS/${factor}`, '-filter:a', `atempo=${factor}`,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '25', '-c:a', 'aac', '-ar', '24000', '-ac', '1', '-b:a', '192k', capped], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`速度圧縮失敗:\n${(r.stderr || '').slice(-300)}`);
  spawnSync('mv', ['-f', capped, mp4]);
}

function concatCopy(parts, outMp4, tmpDir) {
  const listPath = join(tmpDir, 'concat.txt');
  writeFileSync(listPath, parts.map((p) => `file '${resolve(p).replace(/\\/g, '/')}'`).join('\n') + '\n');
  let r = spawnSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outMp4], { encoding: 'utf8' });
  if (r.status === 0) return;
  r = spawnSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listPath,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '25', '-c:a', 'aac', '-ar', '24000', '-ac', '1', '-b:a', '192k', outMp4], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`concat 失敗:\n${(r.stderr || '').slice(-300)}`);
}

/** 年度別の汎用カバー音声（「全4問」「N番」を排した1問ショート整合ナレーション）。 */
async function ensureCoverWav(year, coversDir) {
  const wavPath = join(coversDir, `cover-${year}.wav`);
  if (existsSync(wavPath)) return wavPath;
  const narration = `${yearLabel(year)}の択一式過去問。答えは動画内で発表します。`;
  const wav = await synthesize({ text: applyReadingDict(narration), speaker: 1 });
  writeFileSync(wavPath, wav);
  return wavPath;
}

/** reels/wav の既存 TTS を再利用（problem はリード時間確保のため padded 優先）。 */
function reelWav(reelsDir, slot, preferPadded) {
  if (preferPadded) {
    const p = join(reelsDir, 'wav', `slide-${slot}-padded.wav`);
    if (existsSync(p)) return p;
  }
  const base = join(reelsDir, 'wav', `slide-${slot}.wav`);
  return existsSync(base) ? base : null;
}

function buildMeta({ year, packNum, q, title, durationSec, management, exam }) {
  const yt = SNS_CONFIG.youtube;
  const mgmtLabel = SNS_CONFIG.managementMap?.[management]?.label || management;
  const description = [
    `${title.replace(/\s*#Shorts\s*$/, '')} — ${SNS_CONFIG.profession}`,
    '',
    `${yearLabel(year)} 択一式 過去問から 1 問を解説する Shorts です。`,
    '',
    yt.descriptionHeaders.site,
    buildUtmUrl(`${SNS_CONFIG.domainUrl}/docs/pe-comprehensive-management-${year}-primary`, { channel: 'youtube', format: 'shorts', campaign: `exam-pack-${year}-pack-${packNum}-q${q}` }),
    '',
    yt.descriptionHeaders.note,
    buildUtmUrl(SNS_CONFIG.noteUrl, { channel: 'youtube', format: 'shorts', campaign: 'note' }),
    '',
    yt.hashtags,
  ].join('\n');
  return {
    title,
    description,
    tags: [...new Set([...yt.tags, yearLabel(year), '過去問', '択一式', mgmtLabel].filter(Boolean))],
    categoryId: yt.categoryId,
    privacyStatus: yt.privacyStatus,
    sourcePackId: `${year}-pack-${packNum}`,
    sourceYear: year,
    featuredProblemQ: q,
    sourceUrl: `${SNS_CONFIG.domainUrl}/docs/pe-comprehensive-management-${year}-primary`,
    durationSeconds: Number(durationSec.toFixed(2)),
    derivedFrom: 'yt-native-render-per-problem',
  };
}

// 管理キー（slide-data _meta.management）→ 日本語ラベル
const MGMT_LABEL = {
  economic: '経済性管理', safety: '安全管理',
  info: '情報管理', information: '情報管理',
  human: '人的資源管理', 'human-resource': '人的資源管理',
  social: '社会環境管理', 'social-environment': '社会環境管理',
};

// problem 本文の先頭1行を要約（表記号/区切り除外）
function firstProblemLine(bodyLines) {
  const ls = (Array.isArray(bodyLines) ? bodyLines : [String(bodyLines || '')])
    .flatMap((l) => String(l).split(/\r?\n/)).map((l) => l.trim())
    .filter((l) => l && !l.includes('|'));
  return (ls[0] || '').replace(/[\s　]+/g, ' ').slice(0, 48);
}

// IG リール（1問1本）の caption。論点＝correctText を主役に。ig-reels-policy.md 準拠。
function buildIgReelCaption({ pr, an, year, management }) {
  const mgmt = MGMT_LABEL[management] || management;
  const topic = an.correctText || '過去問';
  const point = (an.pointText || '').replace(/\s+/g, ' ').trim().slice(0, 70);
  const lines = [
    `【${yearLabel(year)} 択一｜${mgmt}】${topic}`,
    '',
    `❓ ${firstProblemLine(pr.bodyLines)}…`,
    `✅ 正答 ${an.correctNum}：${topic}`,
  ];
  if (point) lines.push('', `📌 ${point}`);
  lines.push('', '🔗 全問解説はプロフィールの doboku-note サイトで', '');
  lines.push(['#技術士', '#総合技術監理部門', '#技術士総監', `#${mgmt}`, '#過去問', '#択一式', '#資格勉強', '#技術士試験'].join(' '));
  return lines.join('\n');
}

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      'exam-dir': { type: 'string', default: '技術士総監' },
      titles: { type: 'string' },
      year: { type: 'string' },
      pack: { type: 'string' },
      date: { type: 'string' },
      'covers-dir': { type: 'string', default: join('.tmp', 'yt-gen', 'covers') },
      'dry-run': { type: 'boolean' },
      'ig-mode': { type: 'boolean' },   // IG リール出力（reels-pp/q<N>/video.mp4 + caption.txt）
      questions: { type: 'string' },    // 生成する問番のみ（例 "1,2"。既定=全4問）
    },
  });
  const examDir = values['exam-dir'];
  const date = values.date || new Date().toISOString().slice(0, 10);
  const coversDir = values['covers-dir'];
  mkdirSync(coversDir, { recursive: true });
  const titles = values.titles && existsSync(values.titles) ? JSON.parse(readFileSync(values.titles, 'utf8')) : {};
  const igMode = !!values['ig-mode'];
  const qSet = values.questions
    ? new Set(values.questions.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => n >= 1 && n <= 4))
    : null;

  const root = examRoot(examDir);
  const targets = [];
  for (const year of readdirSync(root).sort()) {
    if (!statSync(join(root, year)).isDirectory()) continue;
    if (values.year && year !== values.year) continue;
    for (const pk of readdirSync(join(root, year)).sort()) {
      const m = pk.match(/^pack-(\d{2})$/);
      if (!m) continue;
      const packNum = m[1];
      if (values.pack && `${year}-pack-${packNum}` !== values.pack) continue;
      const reels = join(root, year, pk, 'reels');
      const ready = existsSync(join(root, year, pk, 'slide-data.json'))
        && ['00', '01', '02', '09'].every((n) => existsSync(join(reels, 'wav', `slide-${n}.wav`)));
      if (!ready) { console.log(`  skip(未生成) ${year}-pack-${packNum}`); continue; }
      targets.push({ year, packNum, packDir: join(root, year, pk), reels });
    }
  }
  console.log(`対象 ${targets.length} パック → 最大 ${targets.length * 4} 本`);
  if (values['dry-run']) { targets.forEach((t) => console.log(`  ${t.year}-pack-${t.packNum}`)); return; }

  const outRoot = join('content', 'sns', 'youtube');
  let made = 0, over60 = 0, fallbackTitle = 0;
  const overList = [];

  for (const { year, packNum, packDir, reels } of targets) {
    const slideData = JSON.parse(readFileSync(join(packDir, 'slide-data.json'), 'utf8'));
    const meta = slideData._meta || {};
    const management = meta.management || 'safety';
    const exam = meta.exam || 'pe-comprehensive';
    const coverExam = meta.examDir || examDir;
    const fmtLabel = meta.fmtLabel || '択一式 過去問';

    const byQ = {};
    for (const s of slideData.slides || []) {
      if (s.type === 'problem' && s.qNum != null) (byQ[s.qNum] ??= {}).problem = s;
      if (s.type === 'answer' && s.qNum != null) (byQ[s.qNum] ??= {}).answer = s;
    }

    const packTmp = join('.tmp', 'sns', date, `${year}-pack-${packNum}-ytrender`);
    mkdirSync(packTmp, { recursive: true });

    // cover 音声（年度共通）と cta（パック共通: PNG/wav/mp4 を1度だけ用意）
    const coverWav = await ensureCoverWav(year, coversDir);
    const ctaPng = join(packTmp, 'cta.png');
    writeFileSync(ctaPng, await renderSlide({ width: W, height: H, slide: { type: 'quiz-cta', data: { ytMode: true, exam } } }));
    const ctaWav = reelWav(reels, '09', false);
    const ctaMp4 = join(packTmp, 'cta.mp4');
    composeSlide(ctaPng, ctaWav, ctaMp4);

    for (let q = 1; q <= 4; q++) {
      if (qSet && !qSet.has(q)) continue;
      const pr = byQ[q]?.problem, an = byQ[q]?.answer;
      if (!pr || !an) { console.log(`  ⚠ ${year}-pack-${packNum} q${q} スライドデータ欠落`); continue; }
      const key = `${year}-pack-${packNum}-q${q}`;
      let title = titles[key];
      if (!title) { title = `技術士総監 ${yearLabel(year)} 択一｜${an.correctText || '過去問解説'} #Shorts`; if (!igMode) fallbackTitle++; }
      const topic = igMode ? (an.correctText || '') : (topicFromTitle(title) || an.correctText || '');

      const answerSlot = String(2 * q).padStart(2, '0');
      // 問題音声: YT専用の短いナレーション（reelは設問全文を読み長すぎるため流用不可。設問本文はPNGに表示）
      const problemWav = join(NARRATION_DIR, `${key}.wav`);
      const answerWav = reelWav(reels, answerSlot, false); // 解答音声は簡潔なので reel を再利用
      if (!existsSync(problemWav)) { console.log(`  ⚠ ${key} 問題ナレーション欠落（pregen-yt-narration.mjs 未実行?）`); continue; }
      if (!answerWav) { console.log(`  ⚠ ${key} 解答wav欠落`); continue; }

      const qTmp = join(packTmp, `q${q}`);
      mkdirSync(qTmp, { recursive: true });

      // cover PNG（管理分野を主役・論点表示・IGチャームなし）
      const coverSvg = renderExamCoverIg({ exam: coverExam, tag: '過去問', year: yearLabel(year), fmtLabel, format: 'reels', hidePage: true, showCta: false, topic, management: meta.management || null });
      const coverPng = join(qTmp, 'cover.png');
      writeFileSync(coverPng, await svgToPng(coverSvg, { width: W }));
      const coverMp4 = join(qTmp, 'cover.mp4');
      composeSlide(coverPng, coverWav, coverMp4);

      // problem / answer PNG（ytMode）
      const problemPng = join(qTmp, 'problem.png');
      writeFileSync(problemPng, await renderSlide({ width: W, height: H, slide: { type: 'quiz-problem', data: { ...pr, ytMode: true, management, year, packNum, exam } } }));
      const problemMp4 = join(qTmp, 'problem.mp4');
      composeSlide(problemPng, problemWav, problemMp4, PROBLEM_PAUSE_SEC);

      const answerPng = join(qTmp, 'answer.png');
      writeFileSync(answerPng, await renderSlide({ width: W, height: H, slide: { type: 'quiz-answer', data: { ...an, ytMode: true, management } } }));
      const answerMp4 = join(qTmp, 'answer.mp4');
      composeSlide(answerPng, answerWav, answerMp4);

      // concat
      const outDir = igMode
        ? join(packDir, 'reels-pp', `q${q}`)
        : join(outRoot, `${date}-${key}`);
      mkdirSync(outDir, { recursive: true });
      const outMp4 = join(outDir, igMode ? 'video.mp4' : 'shorts.mp4');
      concatCopy([coverMp4, problemMp4, answerMp4, ctaMp4], outMp4, qTmp);
      let dur = probeDur(outMp4);
      const capLimit = igMode ? 90 : 60;
      if (dur > capLimit) { capDuration(outMp4, dur, qTmp, igMode ? 85 : 57); const capped = probeDur(outMp4); over60++; overList.push(`${key}:${dur.toFixed(0)}→${capped.toFixed(0)}s`); dur = capped; }

      if (igMode) {
        writeFileSync(join(outDir, 'caption.txt'), buildIgReelCaption({ pr, an, year, management }) + '\n');
        // カバー PNG（論点カバー＝動画先頭スライド）を残し、publish-ig-bs が編集ステップで
        // 明示アップロードしてサムネを確定する（Meta 自動抽出任せにしない）。
        copyFileSync(coverPng, join(outDir, 'cover.png'));
      } else {
        copyFileSync(coverPng, join(outDir, 'thumbnail.png'));
        writeFileSync(join(outDir, 'meta.json'), JSON.stringify(buildMeta({ year, packNum, q, title, durationSec: dur, management, exam }), null, 2) + '\n');
      }
      made++;
    }
    console.log(`  ✓ ${year}-pack-${packNum} (累計 ${made} 本)`);
  }
  console.log(`\n完了: ${made} 本 / 60s超 ${over60}${over60 ? ' [' + overList.join(', ') + ']' : ''} / 機械タイトル ${fallbackTitle}`);
}

await main();
