/**
 * media-plate.mjs — Codex で作った画像を、公開の役割の素材として台帳に結ぶ（運営者決定 2026-10-09）。
 * 使うなら来歴（ツール・モデル・指示文・ハッシュ）と ai-image-fidelity-auditor の判定 ok が必須。
 *   生成 → .tmp/media/{pubId}/{role}.{sha8}.{ext} → 素材の行（provenance ai-generated）・公開の行の media[role]
 *   → AI 台帳 .claude/state/quality/ai-image-review-ledger.json に 'media:<素材 ID>'（verdict はまだ無い）
 * 既定 dry-run（codex を呼ばない）。生成と書き込みは deps で差し替えられる（テスト用）。
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { dirname, extname, join } from 'node:path';
import sharp from 'sharp';
import { loadRegistry, mediaIdOf, parsePubId } from './content-registry.mjs';
import { upsertMedia, upsertPublications } from './content-registry-write.mjs';
import { mediaPath, mimeOf } from './media-paths.mjs';
import { generateWithCodex } from './codex-image.mjs';
import { AI_LEDGER_FILE, emptyAiLedger } from './image-origin.mjs';
import { readJsonIf, writeJson } from './json-io.mjs';

const sha256Of = (buf) => createHash('sha256').update(buf).digest('hex');

/**
 * @param {string} root
 * @param {{ pub: string, role: string, promptFile: string, model?: string|null, commit?: boolean }} o
 * @param {{ generate?: Function, now?: () => Date, load?: Function, upsertMedia?: Function, upsertPublications?: Function, log?: Function }} [deps]
 * @returns {Promise<{ committed: boolean, mediaId: string, path?: string, row?: object, code: number }>}
 */
export async function runPlate(root, o, deps = {}) {
  const { generate = generateWithCodex, now = () => new Date(), load = loadRegistry, log = console.log } = deps;
  const writeMedia = deps.upsertMedia ?? upsertMedia;
  const writePubs = deps.upsertPublications ?? upsertPublications;
  if (!o.pub || !parsePubId(o.pub)) throw new Error(`--pub <公開 ID> が要る（形が違う: ${o.pub}）`);
  if (!/^[a-z][a-z0-9-]*$/.test(o.role ?? '')) throw new Error('--role <役割> が要る（小文字・数字・ハイフン）');
  if (!o.promptFile) throw new Error('--prompt-file <指示文のファイル> が要る');
  const prompt = readFileSync(o.promptFile, 'utf8').trim();
  if (!prompt) throw new Error(`指示文が空: ${o.promptFile}`);
  const reg = load(root);
  const pub = reg.publications.find((p) => p.id === o.pub);
  if (!pub) throw new Error(`台帳に無い公開: ${o.pub}`);
  const mediaId = mediaIdOf(pub.id, o.role);
  const promptSha256 = sha256Of(prompt);

  log(`公開 ${pub.id} / 役割 ${o.role} / 素材 ID ${mediaId}`);
  log(`指示文（${prompt.length} 字・sha256 ${promptSha256.slice(0, 16)}）:\n${prompt}`);
  log(`置き場の予定: .tmp/media/${pub.id}/${o.role}.{sha8}.{ext}（生成後に決まる）`);
  if (!o.commit) { log('dry-run（codex を呼んでいない・書いていない）。生成するときは --commit'); return { committed: false, mediaId, code: 0 }; }

  const generated = generate(prompt, o.model ?? null);
  if (!generated) { log('画像が生成されなかった（codex のログを確認）'); return { committed: false, mediaId, code: 3 }; }
  const buf = readFileSync(generated);
  const sha256 = sha256Of(buf);
  const ext = extname(generated).slice(1).toLowerCase().replace('jpeg', 'jpg');
  const path = mediaPath({ pubId: pub.id, role: o.role, sha256, ext });
  const dest = join(root, path);
  if (!existsSync(dest)) { mkdirSync(dirname(dest), { recursive: true }); copyFileSync(generated, dest); }
  else if (sha256Of(readFileSync(dest)) !== sha256) throw new Error(`置き場に別の中身がある（書き換えない）: ${path}`);

  const meta = await sharp(buf).metadata();
  const generatedAt = now().toISOString();
  const row = {
    id: mediaId, role: o.role, type: mimeOf(ext), sha256, bytes: buf.length, width: meta.width, height: meta.height,
    store: { tier: 'drive', path },
    provenance: { kind: 'ai-generated', tool: 'codex', ...(o.model ? { model: o.model } : {}), prompt, promptSha256, generatedAt },
  };
  // 同じ素材 ID の行（旧い表紙など）を置き換えるときは、旧い置き場を legacyPaths に引き継いで履歴を残す
  const prev = (reg.media ?? []).find((m) => m.id === mediaId);
  if (prev && prev.sha256 !== sha256) {
    log(`既存の素材 ${mediaId}（${prev.provenance?.kind}・sha ${prev.sha256.slice(0, 12)}）を AI 画像で置き換える`);
    row.legacyPaths = [...new Set([...(prev.legacyPaths ?? []), prev.store?.path].filter(Boolean))];
  }
  writeMedia(root, pub.exam, [row]);
  // 生成の一時フォルダ（codex-image.mjs が os.tmpdir() に作る gen-article-photo-* だけ）を片付ける
  const genDir = dirname(generated);
  if (genDir.startsWith(tmpdir()) && /[\\/]gen-article-photo-[^\\/]+$/.test(genDir)) rmSync(genDir, { recursive: true, force: true });
  writePubs(root, pub.channel, pub.exam, [{ ...pub, media: { ...(pub.media ?? {}), [o.role]: mediaId } }]);

  const ledger = readJsonIf(root, AI_LEDGER_FILE) ?? emptyAiLedger();
  ledger.figures[`media:${mediaId}`] = { sha: sha256.slice(0, 16), promptSha: promptSha256.slice(0, 16), tool: 'codex', generatedAt };
  ledger.figures = Object.fromEntries(Object.entries(ledger.figures).sort(([a], [b]) => a.localeCompare(b)));
  writeJson(root, AI_LEDGER_FILE, ledger);

  log(`置いた: ${path}（${meta.width}×${meta.height}）。素材の行と公開の行 media.${o.role} を書き、AI 台帳へ記録した（判定は未）`);
  log(`次: ai-image-fidelity-auditor で判定し node scripts/check-image-origin.mjs record-ai media:${mediaId} ok|fail <理由>`);
  return { committed: true, mediaId, path, row, code: 0 };
}
