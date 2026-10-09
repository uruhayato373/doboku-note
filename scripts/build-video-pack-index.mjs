/**
 * build-video-pack-index.mjs — 動画パック企画バンクの一覧 README を再生成する。
 *
 * 出力: content/sns/video-packs/README.md（生成物・手編集しない）
 * 読み手: 運営管理画面 /content/video（企画ボード）と、汎用コンテンツブラウザ
 *   /content/content~sns/video-packs のディレクトリ表示（README を inline 描画）と人間。
 *
 * 真実源は各 video-pack.json ＋ .claude/state/video-content-status.json で、
 * README はその投影。行の組み立ては scripts/lib/video-content-check.mjs の
 * loadPackSummaries に集約し、admin と同じ 1 実装を共有する（第2実装を作らない）。
 * 鮮度は check-video-content の R 系検査が守る（回し忘れると FAIL）。
 *
 * Usage: npm run build-video-pack-index
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, loadPackSummaries } from './lib/video-content-check.mjs';
import { STAGE_LABELS } from './lib/content-lifecycle.mjs';
import { todayJst } from './lib/jst-date.mjs';
import { loadRegistry, orderedQualifications } from './lib/qualification-registry.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = loadConfig(ROOT);
const rows = loadPackSummaries(ROOT, config);

// 資格の名前と並びは registry（qualification-registry.json）から引く
const registry = loadRegistry(ROOT);

const lines = [
  '# 動画パック 企画バンク（自動生成）',
  '',
  '> このファイルは生成物。手編集せず `npm run build-video-pack-index` で再生成する（パック追加・状態変更後）。',
  '> 真実源: 各 `video-pack.json` ＋ コンテンツ台帳 `content/registry/`（状態の写し: `.claude/state/video-content-status.json`）。契約: `.claude/knowledge/reference/video-content-policy.md`',
  '> 管理画面の企画ボード（資格・段階で絞り込める表）: `/content/video`',
  '',
  `パック数: **${rows.length}**（更新: ${todayJst()}）`,
  '',
];

for (const { id: exam, label } of orderedQualifications(registry)) {
  const group = rows.filter((r) => r.exam === exam);
  if (group.length === 0) continue;
  lines.push(`## ${label}（${group.length}）`, '');
  lines.push('| packId | タイトル | 悩み | intent | 段階 | 台本/構成 | 主CTA |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const r of group) {
    const stage = r.stage ? STAGE_LABELS[r.stage] : '未登録';
    const files = `${r.hasScript ? '台本' : '—'}/${r.hasStoryboard ? '構成' : '—'}`;
    lines.push(`| \`${r.packId}\` | ${r.title} | ${r.pain} | ${r.intent} | ${stage} | ${files} | \`${r.cta ?? '-'}\` |`);
  }
  lines.push('');
}

const out = join(ROOT, config.paths.packsRoot, 'README.md');
writeFileSync(out, lines.join('\n'), 'utf8');
console.log(`build-video-pack-index: ${rows.length} パックを ${config.paths.packsRoot}/README.md へ書き出し`);
