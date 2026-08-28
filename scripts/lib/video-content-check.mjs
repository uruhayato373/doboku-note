/**
 * video-content-check.mjs — 動画パック（DN-0110）の機械検査ライブラリ。
 *
 * 契約の真実源:
 *   - 人間向け: .claude/knowledge/reference/video-content-policy.md §8
 *   - 機械可読: .claude/config/video-content.json
 *
 * 設計:
 *   - すべての関数は root（リポジトリまたは fixture のルート）を受け取る。
 *     tests/fixtures/video-content/ のミニリポジトリに対して同じコードが走ることで、
 *     「チェッカー自体が壊れて 0 件検査で緑」を npm test（quality-audit ci:true）が防ぐ。
 *   - 検査対象 0 件・manifest parse 失敗・sourceRefs 未解決・status parse 失敗を PASS にしない
 *     （CLAUDE.md §9「検査ゼロを PASS と呼ばない」）。
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { videoStatusToStage } from './content-lifecycle.mjs';

const CONFIG_PATH = '.claude/config/video-content.json';

export function loadConfig(root) {
  return JSON.parse(readFileSync(join(root, CONFIG_PATH), 'utf8'));
}

function issue(severity, code, packId, message) {
  return { severity, code, packId, message };
}

function readJsonSafe(path) {
  try {
    return { data: JSON.parse(readFileSync(path, 'utf8')) };
  } catch (e) {
    return { error: e.message };
  }
}

/** 空白・改行を除去した正規化テキスト（逐語一致検査用） */
export function normalizeText(s) {
  return s.replace(/\s+/g, '');
}

/**
 * script 正規化本文が source 正規化本文と windowChars 連続一致するかを返す。
 * script 側を stride 刻みで切り出して includes する（対象は最大数パックなので十分軽い）。
 * stride の粗さの分だけ検出保証は「windowChars + stride - 1 字以上の連続一致」になる。
 */
export function hasVerbatimOverlap(scriptText, sourceText, windowChars) {
  const script = normalizeText(scriptText);
  const source = normalizeText(sourceText);
  if (script.length < windowChars || source.length < windowChars) return false;
  const stride = Math.max(1, Math.floor(windowChars / 8));
  for (let i = 0; i + windowChars <= script.length; i += stride) {
    if (source.includes(script.slice(i, i + windowChars))) return true;
  }
  return false;
}

/** frontmatter の published: を返す（true / false / null=不明） */
export function readPublishedFlag(text) {
  const m = text.replace(/^﻿/, '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const f = m[1].match(/^published:\s*(true|false)\s*$/m);
  return f ? f[1] === 'true' : null;
}

/** URL の UTM を検査する（doboku-note.com / note.com 宛のみ対象） */
export function checkUtmUrls(text, packId, config, ctxLabel) {
  const issues = [];
  const urls = text.match(/https?:\/\/[^\s)"'<>\]]+/g) ?? [];
  for (const url of urls) {
    if (!/(?:doboku-note\.com|note\.com)/.test(url)) continue;
    let u;
    try {
      u = new URL(url);
    } catch {
      issues.push(issue('FAIL', 'U00', packId, `${ctxLabel}: URL が解析できない: ${url}`));
      continue;
    }
    const p = u.searchParams;
    if (!p.has('utm_source')) {
      issues.push(issue('FAIL', 'U01', packId, `${ctxLabel}: 自サイト/note への URL に UTM がない（計測不能な導線）: ${url}`));
      continue;
    }
    if (p.get('utm_source') !== config.utm.source) {
      issues.push(issue('FAIL', 'U02', packId, `${ctxLabel}: utm_source=${p.get('utm_source')}（${config.utm.source} 固定。instagram 混入は禁忌）`));
    }
    if (p.get('utm_medium') !== config.utm.medium) {
      issues.push(issue('FAIL', 'U03', packId, `${ctxLabel}: utm_medium=${p.get('utm_medium')}（GA4 標準の ${config.utm.medium} 固定）`));
    }
    if (p.get('utm_campaign') !== packId) {
      issues.push(issue('FAIL', 'U04', packId, `${ctxLabel}: utm_campaign=${p.get('utm_campaign')}（packId=${packId} と一致必須）`));
    }
    if (!config.utm.contentEnum.includes(p.get('utm_content'))) {
      issues.push(issue('FAIL', 'U05', packId, `${ctxLabel}: utm_content=${p.get('utm_content')}（${config.utm.contentEnum.join('|')} のいずれか）`));
    }
  }
  return issues;
}

/** packsRoot 配下の video-pack.json を列挙する */
export function discoverPacks(root, config) {
  const packsRoot = join(root, config.paths.packsRoot);
  if (!existsSync(packsRoot)) return { rootExists: false, packs: [] };
  const packs = [];
  for (const exam of readdirSync(packsRoot)) {
    const examDir = join(packsRoot, exam);
    if (!statSync(examDir).isDirectory()) continue;
    for (const slug of readdirSync(examDir)) {
      const dir = join(examDir, slug);
      if (!statSync(dir).isDirectory()) continue;
      packs.push({ exam, slug, dir, manifestPath: join(dir, 'video-pack.json') });
    }
  }
  return { rootExists: true, packs };
}

/**
 * 各パックの「企画ボード 1 行分」を組み立てて返す（読み取り専用）。
 *
 * CLI（build-video-pack-index）と admin（/content/video）が同じ行を見るための単一実装。
 * status 判定を React 側へ再実装しないための入口（video-content-policy §10）。
 *
 * @returns {Array<{ exam, packId, slug, dir, title, pain, promise, intent, audience,
 *                   status, stage, qa, hasScript, hasStoryboard, cta, ctaKind,
 *                   outputs, sourceRefs }>}
 */
export function loadPackSummaries(root, config, state) {
  const cfg = config ?? loadConfig(root);
  const { packs } = discoverPacks(root, cfg);
  let st = state;
  if (!st) {
    const p = join(root, cfg.paths.stateFile);
    st = existsSync(p) ? (readJsonSafe(p).data ?? { packs: {} }) : { packs: {} };
  }

  const rows = [];
  for (const pack of packs) {
    const { data: m } = readJsonSafe(pack.manifestPath);
    if (!m) continue; // parse 不能は checkAll が FAIL させる。ボードは読めた分だけ出す
    const hasScript = existsSync(join(pack.dir, 'script.md'));
    const hasStoryboard = existsSync(join(pack.dir, 'storyboard.json'));
    const longform = st.packs?.[m.packId]?.derivatives?.longform;
    const status = longform?.status ?? null;
    rows.push({
      exam: m.exam ?? pack.exam,
      packId: m.packId ?? pack.slug,
      slug: pack.slug,
      dir: `${cfg.paths.packsRoot}/${pack.exam}/${pack.slug}`,
      title: m.title ?? '',
      pain: m.pain ?? '',
      promise: m.promise ?? '',
      intent: m.intent ?? '',
      audience: m.audience ?? '',
      status,
      stage: videoStatusToStage(status, hasScript || hasStoryboard),
      qa: longform?.qa ?? null,
      hasScript,
      hasStoryboard,
      cta: m.primaryCta?.targetId ?? m.primaryCta?.kind ?? null,
      ctaKind: m.primaryCta?.kind ?? null,
      outputs: m.outputs ?? {},
      sourceRefs: Array.isArray(m.sourceRefs) ? m.sourceRefs : [],
    });
  }
  rows.sort((a, b) => a.exam.localeCompare(b.exam) || a.packId.localeCompare(b.packId));
  return rows;
}

function walkFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkFiles(p, out);
    else out.push(p);
  }
  return out;
}

function checkManifest(pack, config, seenPackIds, issues) {
  if (!existsSync(pack.manifestPath)) {
    issues.push(issue('FAIL', 'M00', `${pack.exam}/${pack.slug}`, 'video-pack.json が無い（パックディレクトリだけ存在）'));
    return null;
  }
  const { data: m, error } = readJsonSafe(pack.manifestPath);
  if (error) {
    issues.push(issue('FAIL', 'M01', `${pack.exam}/${pack.slug}`, `video-pack.json の parse 失敗: ${error}`));
    return null;
  }
  const id = typeof m.packId === 'string' ? m.packId : `${pack.exam}/${pack.slug}`;
  for (const f of config.manifest.requiredFields) {
    const v = m[f];
    const empty = v === undefined || v === null || v === '' ||
      (Array.isArray(v) && v.length === 0) ||
      (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);
    if (empty) issues.push(issue('FAIL', 'M03', id, `必須フィールド欠落: ${f}`));
  }
  if (m.schemaVersion !== config.manifest.schemaVersion) {
    issues.push(issue('FAIL', 'M02', id, `schemaVersion=${m.schemaVersion}（期待 ${config.manifest.schemaVersion}）`));
  }
  if (typeof m.packId === 'string') {
    if (!new RegExp(config.manifest.packIdPattern).test(m.packId)) {
      issues.push(issue('FAIL', 'M06', id, `packId が命名規則に不一致: ${m.packId}`));
    }
    if (m.packId !== pack.slug) {
      issues.push(issue('FAIL', 'M06', id, `packId とディレクトリ名の不一致: ${m.packId} ≠ ${pack.slug}`));
    }
    if (seenPackIds.has(m.packId)) {
      issues.push(issue('FAIL', 'M07', id, `packId 重複: ${m.packId}（${seenPackIds.get(m.packId)} と衝突）`));
    } else {
      seenPackIds.set(m.packId, `${pack.exam}/${pack.slug}`);
    }
  }
  if (m.exam && !config.manifest.examEnum.includes(m.exam)) {
    issues.push(issue('FAIL', 'M04', id, `exam が enum 外: ${m.exam}`));
  }
  if (m.exam && m.exam !== pack.exam) {
    issues.push(issue('FAIL', 'M09', id, `manifest の exam=${m.exam} と配置ディレクトリ ${pack.exam} の不一致`));
  }
  if (m.intent && !config.manifest.intentEnum.includes(m.intent)) {
    issues.push(issue('FAIL', 'M05', id, `intent が enum 外: ${m.intent}`));
  }
  for (const key of ['pain', 'promise']) {
    const v = m[key];
    if (v !== undefined && typeof v !== 'string') {
      issues.push(issue('FAIL', 'M08', id, `${key} は 1 つの文字列（悩み・約束は 1 つずつ）`));
    } else if (typeof v === 'string' && v.length > config.manifest.painPromiseMaxChars) {
      issues.push(issue('WARN', 'M08', id, `${key} が ${config.manifest.painPromiseMaxChars} 字超（絞れていない兆候）`));
    }
  }
  if (m.outputs && typeof m.outputs === 'object') {
    for (const k of Object.keys(m.outputs)) {
      if (!config.manifest.outputsKeys.includes(k)) {
        issues.push(issue('FAIL', 'M10', id, `outputs に未知のキー: ${k}`));
      }
    }
  }
  return m;
}

function checkSourceRefs(m, id, root, config, issues) {
  const resolved = [];
  if (!Array.isArray(m.sourceRefs)) return resolved;
  m.sourceRefs.forEach((ref, i) => {
    const label = `sourceRefs[${i}]`;
    if (!ref || !config.sourceRef.typeEnum.includes(ref.type)) {
      issues.push(issue('FAIL', 'S02', id, `${label}: type が enum 外: ${ref?.type}`));
      return;
    }
    if (ref.type === 'external') {
      if (!/^https:\/\//.test(ref.url ?? '') || !ref.title) {
        issues.push(issue('FAIL', 'S06', id, `${label}: external は https url と title が必須`));
      }
      return;
    }
    if (!ref.path) {
      issues.push(issue('FAIL', 'S03', id, `${label}: path が無い`));
      return;
    }
    const abs = join(root, ref.path);
    if (!existsSync(abs)) {
      issues.push(issue('FAIL', 'S03', id, `${label}: 実在しない: ${ref.path}`));
      return;
    }
    if (ref.type === 'site' && /\.(mdx?|md)$/.test(ref.path)) {
      const published = readPublishedFlag(readFileSync(abs, 'utf8'));
      if (published === false && ref.allowUnpublished !== true) {
        issues.push(issue('FAIL', 'S04', id, `${label}: published:false の記事を参照（漏洩リスク。意図的なら allowUnpublished:true を明示）`));
      }
    }
    if (ref.type === 'note' && !['free', 'paid'].includes(ref.access)) {
      issues.push(issue('FAIL', 'S05', id, `${label}: note 参照は access(free|paid) の明示が必須`));
    }
    resolved.push({ ...ref, abs });
  });
  return resolved;
}

function checkCta(m, id, root, config, issues) {
  const cta = m.primaryCta;
  if (cta === undefined) return;
  if (Array.isArray(cta)) {
    issues.push(issue('FAIL', 'C02', id, 'primaryCta が配列（主 CTA は 1 つだけ）'));
    return;
  }
  if (!cta || !config.cta.kindEnum.includes(cta.kind)) {
    issues.push(issue('FAIL', 'C01', id, `primaryCta.kind が enum 外: ${cta?.kind}`));
    return;
  }
  if (cta.campaign !== m.packId) {
    issues.push(issue('FAIL', 'C05', id, `primaryCta.campaign=${cta.campaign}（packId と一致必須）`));
  }
  const catalogRel = config.cta.catalogs[cta.kind];
  if (catalogRel) {
    if (!cta.targetId) {
      issues.push(issue('FAIL', 'C03', id, `primaryCta: ${cta.kind} は targetId 必須`));
    } else {
      const catalogPath = join(root, catalogRel);
      if (!existsSync(catalogPath)) {
        issues.push(issue('FAIL', 'C03', id, `カタログが無い: ${catalogRel}`));
      } else {
        const text = readFileSync(catalogPath, 'utf8');
        if (!new RegExp(`id:\\s*['"]${cta.targetId}['"]`).test(text)) {
          issues.push(issue('FAIL', 'C03', id, `primaryCta.targetId=${cta.targetId} が ${catalogRel} に解決できない`));
        }
      }
    }
  } else if (cta.kind === 'site-article') {
    if (!cta.targetPath || !existsSync(join(root, cta.targetPath))) {
      issues.push(issue('FAIL', 'C04', id, `primaryCta.targetPath が実在しない: ${cta.targetPath}`));
    }
  }
}

function checkStoryboard(pack, id, root, config, required, issues) {
  const sbPath = join(pack.dir, 'storyboard.json');
  if (!existsSync(sbPath)) {
    // draft（企画のみ）の欠落は INFO＝正常な未着手。qa_passed 以降で無いのは契約違反。
    issues.push(issue(required ? 'FAIL' : 'INFO', 'B00', id, `storyboard.json が無い${required ? '（qa_passed 以降の状態なのに）' : '（企画のみ・draft 段階なら正常）'}`));
    return;
  }
  const { data: sb, error } = readJsonSafe(sbPath);
  if (error) {
    issues.push(issue('FAIL', 'B01', id, `storyboard.json の parse 失敗: ${error}`));
    return;
  }
  if (!config.storyboard.formatEnum.includes(sb.format)) {
    issues.push(issue('FAIL', 'B09', id, `storyboard.format が enum 外: ${sb.format}`));
  }
  if (!Array.isArray(sb.scenes) || sb.scenes.length === 0) {
    issues.push(issue('FAIL', 'B02', id, 'storyboard.scenes が空'));
    return;
  }
  const sceneIds = new Set();
  const narrations = new Map();
  let prevEnd = 0;
  sb.scenes.forEach((sc, i) => {
    const label = `scene[${i}]${sc.sceneId ? `(${sc.sceneId})` : ''}`;
    if (!sc.sceneId) issues.push(issue('FAIL', 'B03', id, `${label}: sceneId が無い`));
    else if (sceneIds.has(sc.sceneId)) issues.push(issue('FAIL', 'B03', id, `${label}: sceneId 重複`));
    else sceneIds.add(sc.sceneId);
    if (typeof sc.start !== 'number' || typeof sc.end !== 'number' || sc.end <= sc.start) {
      issues.push(issue('FAIL', 'B04', id, `${label}: start/end が不正`));
    } else {
      if (Math.abs(sc.start - prevEnd) > 0.01) {
        issues.push(issue('FAIL', 'B04', id, `${label}: start=${sc.start} が前 scene の end=${prevEnd} と連続していない`));
      }
      prevEnd = sc.end;
    }
    if (!sc.narration) {
      issues.push(issue('FAIL', 'B07', id, `${label}: narration が無い`));
    } else {
      const key = normalizeText(sc.narration);
      if (narrations.has(key)) {
        issues.push(issue('FAIL', 'B08', id, `${label}: narration が ${narrations.get(key)} と同一（定型反復）`));
      } else {
        narrations.set(key, label);
      }
    }
    if (typeof sc.caption === 'string' && sc.caption.length > config.storyboard.captionMaxChars) {
      issues.push(issue('FAIL', 'B06', id, `${label}: caption が ${config.storyboard.captionMaxChars} 字超（1 画面へ長文を詰めない）`));
    }
    if (sc.sourceRef && !existsSync(join(root, sc.sourceRef))) {
      issues.push(issue('FAIL', 'B07', id, `${label}: sourceRef が実在しない: ${sc.sourceRef}`));
    }
  });
  const bounds = sb.format === 'vertical-9x16'
    ? config.storyboard.durationSeconds.shorts
    : config.storyboard.durationSeconds.longform;
  if (prevEnd < bounds.min || prevEnd > bounds.max) {
    issues.push(issue('FAIL', 'B05', id, `総尺 ${prevEnd}s が ${sb.format} の範囲 [${bounds.min}, ${bounds.max}] 外`));
  }
}

function checkScript(pack, id, root, config, required, resolvedRefs, issues) {
  const scriptPath = join(pack.dir, 'script.md');
  if (!existsSync(scriptPath)) {
    issues.push(issue(required ? 'FAIL' : 'INFO', 'P00', id, `script.md が無い${required ? '（qa_passed 以降の状態なのに）' : '（企画のみ・draft 段階なら正常）'}`));
    return;
  }
  const text = readFileSync(scriptPath, 'utf8');
  if (!/^#{1,3}\s*.*出典/m.test(text)) {
    issues.push(issue('FAIL', 'P03', id, 'script.md に出典一覧の見出しが無い（台本契約 §3-7）'));
  }
  issues.push(...checkUtmUrls(text, id, config, 'script.md'));
  for (const ref of resolvedRefs) {
    if (!ref.abs || !/\.(mdx?|md)$/.test(ref.path ?? '')) continue;
    const sourceText = readFileSync(ref.abs, 'utf8');
    if (hasVerbatimOverlap(text, sourceText, config.verbatim.windowChars)) {
      issues.push(issue('FAIL', 'P02', id, `script.md が ${ref.path} と ${config.verbatim.windowChars} 字以上連続一致（逐語転用の禁止・動画向け再編集が必要）`));
    }
  }
}

function checkBinaries(pack, id, config, issues) {
  for (const file of walkFiles(pack.dir)) {
    const lower = file.toLowerCase();
    if (config.forbiddenBinaryExtensions.some((ext) => lower.endsWith(ext))) {
      issues.push(issue('FAIL', 'F04', id, `再生成可能バイナリがパック内に混入（R2 へ置く）: ${file}`));
    }
  }
}

/** state ファイルを検査し、packId → 最上位進行 status を返す */
function checkState(root, config, knownPackIds, issues) {
  const statePath = join(root, config.paths.stateFile);
  const progress = new Map();
  if (!existsSync(statePath)) return { exists: false, progress };
  const { data: st, error } = readJsonSafe(statePath);
  if (error) {
    issues.push(issue('FAIL', 'T01', null, `${config.paths.stateFile} の parse 失敗（status 取得失敗を PASS にしない）: ${error}`));
    return { exists: true, progress };
  }
  if (st.schemaVersion !== config.state.schemaVersion) {
    issues.push(issue('FAIL', 'T01', null, `state schemaVersion=${st.schemaVersion}（期待 ${config.state.schemaVersion}）`));
  }
  const seenVideoIds = new Map();
  const statusOrder = config.state.statusEnum;
  const approvalGateIdx = statusOrder.indexOf(config.state.approvalRequiredFrom);
  for (const [packId, entry] of Object.entries(st.packs ?? {})) {
    if (!knownPackIds.has(packId)) {
      issues.push(issue('FAIL', 'T03', packId, 'status の孤児（対応する video-pack.json が無い）'));
    }
    if (typeof entry.status === 'string') {
      issues.push(issue('FAIL', 'T08', packId, 'pack 全体の一括 status は禁止（派生物ごとに状態を持つ）'));
    }
    for (const [key, raw] of Object.entries(entry.derivatives ?? {})) {
      if (!config.state.derivativeKeys.includes(key)) {
        issues.push(issue('FAIL', 'T02', packId, `未知の派生キー: ${key}`));
        continue;
      }
      const list = Array.isArray(raw) ? raw : [raw];
      list.forEach((d, i) => {
        const label = `${key}${Array.isArray(raw) ? `[${i}]` : ''}`;
        if (!statusOrder.includes(d.status)) {
          issues.push(issue('FAIL', 'T02', packId, `${label}: status が enum 外: ${d.status}`));
          return;
        }
        const idx = statusOrder.indexOf(d.status);
        const prev = progress.get(packId) ?? -1;
        if (idx > prev) progress.set(packId, idx);
        if (idx >= approvalGateIdx && d.status !== 'failed' && !d.approvedBy) {
          issues.push(issue('FAIL', 'T07', packId, `${label}: ${d.status} なのに approvedBy が無い（承認はユーザーだけが設定）`));
        }
        if (['published', 'measured', 'refresh_due'].includes(d.status)) {
          if (!d.url && !d.videoId) {
            issues.push(issue('FAIL', 'T04', packId, `${label}: published なのに url も videoId も無い（実体照合不能）`));
          }
          if (key === 'shorts' && !d.relatedVideoId) {
            issues.push(issue('FAIL', 'T06', packId, `${label}: 公開済み Short に relatedVideoId が無い（関連動画が主導線）`));
          }
        }
        if (d.videoId) {
          const dupe = seenVideoIds.get(d.videoId);
          if (dupe) issues.push(issue('FAIL', 'T05', packId, `${label}: videoId=${d.videoId} が ${dupe} と重複`));
          else seenVideoIds.set(d.videoId, `${packId}/${label}`);
        }
        if (d.status === 'measured' && !d.measuredAt) {
          issues.push(issue('FAIL', 'T09', packId, `${label}: measured なのに measuredAt が無い（鮮度判定不能）`));
        }
      });
    }
  }
  return { exists: true, progress };
}

/**
 * 全検査を実行する。
 * @returns {{ notStarted: boolean, rootExists: boolean, packCount: number,
 *             checkedCount: number, stateExists: boolean, issues: Array }}
 */
export function checkAll(root, { config } = {}) {
  const cfg = config ?? loadConfig(root);
  const issues = [];
  const { rootExists, packs } = discoverPacks(root, cfg);

  const seenPackIds = new Map();
  const manifests = [];
  for (const pack of packs) {
    const m = checkManifest(pack, cfg, seenPackIds, issues);
    if (m) manifests.push({ pack, m });
  }

  const knownPackIds = new Set(seenPackIds.keys());
  const { exists: stateExists, progress } = checkState(root, cfg, knownPackIds, issues);

  // README index（build-video-pack-index の生成物）の鮮度。回し忘れ＝管理画面と実体のずれを止める
  if (packs.length > 0) {
    const readmePath = join(root, cfg.paths.packsRoot, 'README.md');
    if (!existsSync(readmePath)) {
      issues.push(issue('FAIL', 'R01', null, `${cfg.paths.packsRoot}/README.md が無い（npm run build-video-pack-index で生成）`));
    } else {
      const readme = readFileSync(readmePath, 'utf8');
      const listed = new Set(
        [...readme.matchAll(/^\| `([a-z0-9][a-z0-9-]+)`/gm)].map((m) => m[1]),
      );
      for (const id of knownPackIds) {
        if (!listed.has(id)) issues.push(issue('FAIL', 'R02', id, 'README index に載っていない（npm run build-video-pack-index を回し忘れ）'));
      }
      for (const id of listed) {
        if (!knownPackIds.has(id)) issues.push(issue('FAIL', 'R03', id, 'README index の孤児（パック削除後に index 未再生成）'));
      }
    }
  }

  const qaPassedIdx = cfg.state.statusEnum.indexOf('qa_passed');
  for (const { pack, m } of manifests) {
    const id = typeof m.packId === 'string' ? m.packId : `${pack.exam}/${pack.slug}`;
    const resolvedRefs = checkSourceRefs(m, id, root, cfg, issues);
    checkCta(m, id, root, cfg, issues);
    const advanced = (progress.get(id) ?? -1) >= qaPassedIdx;
    checkStoryboard(pack, id, root, cfg, advanced, issues);
    checkScript(pack, id, root, cfg, advanced, resolvedRefs, issues);
    checkBinaries(pack, id, cfg, issues);
  }

  return {
    notStarted: !rootExists && !stateExists,
    rootExists,
    packCount: packs.length,
    checkedCount: manifests.length,
    stateExists,
    issues,
  };
}
