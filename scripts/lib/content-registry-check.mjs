/**
 * content-registry-check.mjs — コンテンツ台帳の検査 R01〜R10（R09 は欠番・content-registry.md「検査」）の唯一の実装。
 * 型（zod）は check-datasets が見るので、ここはファイルをまたぐ整合だけを見る。
 * 切り替え前のチャネル（config の cutover に無いもの）は、孤児と件数の一致を WARN に留める。
 * （R09 は動画の台帳の写し .claude/state/video-content-status.json の照合だった。写しは 2026-10-09 に消えたので欠番）
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CHANNEL_DATASET, approvalHash, approvalParts, canTransition, idShapeIssues, loadRegistry, loadRegistryConfig, parsePubId, pubIdOf, requiresApproval,
} from './content-registry.mjs';
import { datasetDir } from './datasets.mjs';
import { parseMediaPath, sha8Matches } from './media-paths.mjs';
import { readJsonIf } from './json-io.mjs';

const issue = (severity, code, id, message) => ({ severity, code, id, message });

/** 動画パックのフォルダ（video-pack.json のあるもの）を packId → { exam, dir, manifest } で返す */
export function discoverVideoPacks(root) {
  const packsRoot = join(root, 'content/sns/video-packs');
  const out = new Map();
  if (!existsSync(packsRoot)) return out;
  for (const exam of readdirSync(packsRoot, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)) {
    for (const slug of readdirSync(join(packsRoot, exam), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)) {
      const manifestPath = join(packsRoot, exam, slug, 'video-pack.json');
      if (existsSync(manifestPath)) out.set(slug, { exam, dir: `content/sns/video-packs/${exam}/${slug}`, manifest: JSON.parse(readFileSync(manifestPath, 'utf8')) });
    }
  }
  return out;
}

/** git の ref の時点の台帳（R03 の比較用）。ref に台帳が無ければ空 */
export function loadRegistryAt(root, ref) {
  let names = [];
  try {
    const dirs = Object.values(CHANNEL_DATASET).map((id) => `${datasetDir(id)}/`);
    names = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-tree', '-r', '--name-only', ref, '--', ...dirs], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
      .split('\n').filter((f) => f.endsWith('.json'));
  } catch {
    return null;
  }
  const pubs = [];
  for (const f of names) {
    const doc = JSON.parse(execFileSync('git', ['show', `${ref}:${f}`], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
    for (const p of doc.publications ?? []) pubs.push({ ...p, exam: doc.exam, channel: doc.channel });
  }
  return pubs;
}

/**
 * @param {string} root
 * @param {{ cfg?: object, reg?: object, driveManifest?: object|null, aiLedger?: object|null, packs?: Map, base?: string|null, basePublications?: object[] }} [opts]
 *   basePublications: R03 の比較元の公開（テスト用。無ければ base の git ref から読む）
 * @returns {{ issues: object[], counts: object }}
 */
export function checkRegistry(root, opts = {}) {
  const cfg = opts.cfg ?? loadRegistryConfig(root);
  const reg = opts.reg ?? loadRegistry(root);
  const driveManifest = opts.driveManifest !== undefined ? opts.driveManifest : readJsonIf(root, '.claude/state/assets/drive-manifest.json');
  const aiLedger = opts.aiLedger !== undefined ? opts.aiLedger : readJsonIf(root, '.claude/state/quality/ai-image-review-ledger.json');
  const packs = opts.packs ?? discoverVideoPacks(root);
  const cutover = new Set(cfg.cutover);
  const issues = [];
  const counts = { works: reg.works.length, publications: reg.publications.length, media: reg.media.length, byChannel: {} };
  for (const p of reg.publications) counts.byChannel[p.channel] = (counts.byChannel[p.channel] ?? 0) + 1;

  // R01: 件数。台帳が空、または切り替え済みのチャネルが 0 件なら検査不成立
  if (counts.works + counts.publications + counts.media === 0) issues.push(issue('FAIL', 'R01', null, '台帳が 0 件（何も検査していない）'));
  for (const ch of cutover) if (!counts.byChannel[ch]) issues.push(issue('FAIL', 'R01', ch, '切り替え済みのチャネルに公開が 0 件'));

  // R02: ID の一意・形・例外の上限
  const workById = new Map();
  for (const w of reg.works) {
    if (workById.has(w.id)) issues.push(issue('FAIL', 'R02', w.id, `作品 ID が重複（${workById.get(w.id).file} と ${w.file}）`));
    workById.set(w.id, w);
    if (!w.idException) for (const m of idShapeIssues('work', w.id, cfg.idRules)) issues.push(issue('FAIL', 'R02', w.id, m));
    if (!cfg.workKinds.includes(w.kind)) issues.push(issue('FAIL', 'R02', w.id, `作品の種類が語彙に無い: ${w.kind}`));
  }
  const pubById = new Map();
  for (const p of reg.publications) {
    if (pubById.has(p.id)) issues.push(issue('FAIL', 'R02', p.id, '公開 ID が重複'));
    pubById.set(p.id, p);
    const parsed = parsePubId(p.id);
    if (!parsed) { issues.push(issue('FAIL', 'R02', p.id, '公開 ID の形が違う（{exam}/{work}/{channel}.{format}[.{variant}]）')); continue; }
    const expected = pubIdOf({ exam: p.exam, work: p.work, channel: p.channel, format: p.format, variant: p.variant });
    if (expected !== p.id) issues.push(issue('FAIL', 'R02', p.id, `公開 ID が行の中身（資格・作品・チャネル・形式・variant）と合わない（期待 ${expected}）`));
    const ch = cfg.channels[p.channel];
    if (!ch?.formats.includes(p.format)) issues.push(issue('FAIL', 'R02', p.id, `チャネル ${p.channel} に形式 ${p.format} が無い`));
    if (ch && !ch.accounts.includes(p.account)) issues.push(issue('FAIL', 'R02', p.id, `チャネル ${p.channel} のアカウントではない: ${p.account}`));
    if (p.variant && !p.idException) for (const m of idShapeIssues('variant', p.variant, cfg.idRules)) issues.push(issue('FAIL', 'R02', p.id, m));
  }
  const mediaById = new Map();
  for (const m of reg.media) {
    if (mediaById.has(m.id)) issues.push(issue('FAIL', 'R02', m.id, '素材 ID が重複'));
    mediaById.set(m.id, m);
    if (!m.id.endsWith(`/${m.role}`)) issues.push(issue('FAIL', 'R02', m.id, `素材 ID の末尾が役割（${m.role}）と合わない`));
    for (const msg of idShapeIssues('role', m.role, cfg.idRules)) issues.push(issue('FAIL', 'R02', m.id, msg));
  }
  const exceptions = [...reg.works, ...reg.publications].filter((x) => x.idException).length;
  counts.idExceptions = exceptions;
  if (exceptions > cfg.idRules.idExceptionMax) issues.push(issue('FAIL', 'R02', null, `idException が ${exceptions} 件（上限 ${cfg.idRules.idExceptionMax}・増やさない）`));

  // R03: 予約以上の行は消さない・改名しない（--base の時点と比べる）
  if (opts.base || opts.basePublications) {
    const before = opts.basePublications ?? loadRegistryAt(root, opts.base);
    if (before === null) issues.push(issue('INFO', 'R03', null, `base ${opts.base} を読めない（削除と遷移を比較していない）`));
    else {
      for (const old of before) {
        const rank = cfg.status.values.indexOf(old.status);
        if (rank < cfg.status.values.indexOf('scheduled') || old.status === 'failed') continue;
        if (!pubById.has(old.id) && !reg.publications.some((p) => p.renamedTo === old.id)) {
          issues.push(issue('FAIL', 'R03', old.id, `予約以上（${old.status}）の公開が消えた・改名された（改名は新しい行と renamedTo で）`));
        }
      }
      // R07: 比較元から状態が変わった行は、config の transitions にある遷移だけ（stopped(unverified-legacy)→published は証拠つきだけ）
      const beforeById = new Map(before.map((b) => [b.id, b]));
      for (const p of reg.publications) {
        const b = beforeById.get(p.id);
        if (!b || b.status === p.status) continue;
        counts.checkedTransitions = (counts.checkedTransitions ?? 0) + 1;
        if (b.status === 'stopped' && p.status === 'published') {
          if (b.stopReason !== 'unverified-legacy' || !p.platform?.evidence) issues.push(issue('FAIL', 'R07', p.id, `stopped（${b.stopReason}）から published へ戻せるのは unverified-legacy に証拠（platform.evidence）を付けたときだけ`));
          continue;
        }
        if (!canTransition(cfg, b.status, p.status, p.channel)) issues.push(issue('FAIL', 'R07', p.id, `${b.status} → ${p.status} は遷移に無い（コンテンツ台帳の設定の transitions）`));
      }
    }
  }

  // R04: 参照の整合と孤児
  for (const w of reg.works) if (!existsSync(join(root, w.definition))) issues.push(issue('FAIL', 'R04', w.id, `作品の定義フォルダが無い: ${w.definition}`));
  for (const p of reg.publications) {
    const w = workById.get(p.work);
    if (!w) issues.push(issue('FAIL', 'R04', p.id, `作品が台帳に無い: ${p.work}`));
    else if (w.exam !== p.exam) issues.push(issue('FAIL', 'R04', p.id, `作品（${w.exam}）と公開（${p.exam}）の資格が違う`));
    if (p.copy && !existsSync(join(root, p.copy.split('#')[0]))) issues.push(issue('FAIL', 'R04', p.id, `文面のファイルが無い: ${p.copy}`));
    if (p.definition && !existsSync(join(root, p.definition))) issues.push(issue('FAIL', 'R04', p.id, `定義フォルダが無い: ${p.definition}`));
    for (const [role, mid] of Object.entries(p.media ?? {})) if (!mediaById.has(mid)) issues.push(issue('FAIL', 'R04', p.id, `素材（${role}）が台帳に無い: ${mid}`));
    if (p.relatedTo && !pubById.has(p.relatedTo)) issues.push(issue('FAIL', 'R04', p.id, `関連先の公開が台帳に無い: ${p.relatedTo}`));
    if (p.renamedTo && !pubById.has(p.renamedTo)) issues.push(issue('FAIL', 'R04', p.id, `改名先が台帳に無い: ${p.renamedTo}`));
  }
  for (const m of reg.media) {
    const owner = m.id.split('/').slice(0, 3).join('/');
    if (m.scope !== 'brand' && m.id.split('/')[2] !== 'work' && !pubById.has(owner)) issues.push(issue('WARN', 'R04', m.id, `素材の持ち主の公開が台帳に無い: ${owner}`));
  }
  const orphanPacks = [...packs.keys()].filter((id) => !workById.has(id));
  counts.videoPacks = packs.size;
  counts.videoPacksWithoutWork = orphanPacks.length;
  if (orphanPacks.length) issues.push(issue(cutover.has('youtube') ? 'FAIL' : 'INFO', 'R04', null, `動画パック ${packs.size} 本のうち ${orphanPacks.length} 本が台帳に無い${cutover.has('youtube') ? '' : '（youtube は切り替え前）'}`));

  // R05: video-pack.json の outputs と公開の数（切り替え済みのチャネルだけ FAIL）
  for (const w of reg.works.filter((x) => x.kind === 'video-pack')) {
    const pack = packs.get(w.id);
    if (!pack) continue;
    const pubs = reg.publications.filter((p) => p.work === w.id && p.channel === 'youtube');
    const want = { longform: pack.manifest.outputs?.longform ? 1 : 0, short: Number(pack.manifest.outputs?.shorts) || 0 };
    for (const [format, n] of Object.entries(want)) {
      const got = pubs.filter((p) => p.format === format).length;
      // Shorts は作る段（youtube.json の shorts に鍵を決めたとき）で行ができる。まだ 1 本も無いのは未作成
      if (format === 'short' && got === 0 && n > 0) { issues.push(issue('INFO', 'R05', w.id, `Shorts ${n} 本は未作成`)); continue; }
      if (got !== n) issues.push(issue(cutover.has('youtube') ? 'FAIL' : 'WARN', 'R05', w.id, `youtube.${format} が ${got} 件（outputs では ${n} 件）`));
    }
  }

  // R06: 素材と Drive 台帳
  for (const m of reg.media) {
    if (m.store.tier !== 'drive') continue;
    if (!parseMediaPath(m.store.path)) { issues.push(issue('FAIL', 'R06', m.id, `置き場の名前が規則に合わない: ${m.store.path}`)); continue; }
    if (!sha8Matches(m.store.path, m.sha256)) issues.push(issue('FAIL', 'R06', m.id, '置き場の名前の sha8 が sha256 と違う'));
    const entry = driveManifest?.entries?.[m.store.path];
    if (!entry) issues.push(issue('WARN', 'R06', m.id, `Drive 台帳に未登録（npm run media -- sync）: ${m.store.path}`));
    else if (entry.sha256 !== m.sha256) issues.push(issue('FAIL', 'R06', m.id, 'Drive 台帳の sha256 と違う'));
  }

  // R07: 状態の必須欄と承認ハッシュ
  for (const p of reg.publications) {
    if (!cfg.status.values.includes(p.status)) { issues.push(issue('FAIL', 'R07', p.id, `状態が語彙に無い: ${p.status}`)); continue; }
    if (requiresApproval(cfg, p.status) && p.approval?.by !== 'user') issues.push(issue('FAIL', 'R07', p.id, `${p.status} には運営者の承認（approval.by=user）が要る`));
    if (p.status === 'stopped' && !cfg.status.stopReasons.includes(p.stopReason)) issues.push(issue('FAIL', 'R07', p.id, 'stopped には語彙の stopReason が要る'));
    if (p.status === 'published' && !p.platform?.evidence) issues.push(issue('FAIL', 'R07', p.id, 'published には公開を確かめた証拠（platform.evidence）が要る'));
    if (p.approval?.contentSha256) {
      const now = approvalHash(approvalParts(root, p, mediaById));
      if (now !== p.approval.contentSha256) {
        const published = p.status === 'published';
        issues.push(issue(published ? 'WARN' : 'FAIL', 'R07', p.id, published ? '承認した中身から変わった（要同期）' : '承認した後に中身（文面・素材・予定）が変わった。承認し直す'));
      }
    }
  }

  // R08: 外部 ID の重複・Shorts の関連動画
  const byPlatformId = new Map();
  for (const p of reg.publications) {
    const pid = p.platform?.id;
    if (!pid) continue;
    const key = `${p.channel}:${pid}`;
    if (byPlatformId.has(key)) issues.push(issue('FAIL', 'R08', p.id, `外部 ID ${pid} が ${byPlatformId.get(key)} と重複`));
    else byPlatformId.set(key, p.id);
  }
  for (const p of reg.publications.filter((x) => x.channel === 'youtube' && x.format === 'short')) {
    const target = p.relatedTo ? pubById.get(p.relatedTo) : null;
    // 関連動画を求めるのは、同じ作品に通常動画があるときだけ（動画パック以前の旧 Shorts は通常動画を持たない）
    const hasLongform = reg.publications.some((x) => x.work === p.work && x.channel === 'youtube' && x.format === 'longform');
    if (!p.relatedTo && hasLongform) issues.push(issue('WARN', 'R08', p.id, 'Shorts に関連動画（relatedTo）が無い'));
    else if (target && (target.work !== p.work || target.format !== 'longform')) issues.push(issue('FAIL', 'R08', p.id, '関連動画が同じ作品の通常動画ではない'));
  }

  // R10: AI 生成の素材は判定 ok が要る（承認以降の公開が参照していれば FAIL）
  const referencedBy = new Map();
  for (const p of reg.publications) for (const mid of Object.values(p.media ?? {})) referencedBy.set(mid, [...(referencedBy.get(mid) ?? []), p]);
  for (const m of reg.media.filter((x) => x.provenance.kind === 'ai-generated')) {
    const r = aiLedger?.figures?.[`media:${m.id}`];
    const ok = r?.verdict === 'ok' && String(m.sha256).startsWith(r.sha ?? '-');
    if (ok) continue;
    const gated = (referencedBy.get(m.id) ?? []).some((p) => requiresApproval(cfg, p.status));
    issues.push(issue(gated ? 'FAIL' : 'WARN', 'R10', m.id, 'AI 生成の素材に今の画像の判定 ok が無い（ai-image-fidelity-auditor → check-image-origin record-ai）'));
  }

  return { issues, counts };
}
