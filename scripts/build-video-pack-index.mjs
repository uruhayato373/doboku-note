/**
 * build-video-pack-index.mjs — 動画パック企画バンクの一覧 README を再生成する。
 *
 * 出力: content/sns/video-packs/README.md（生成物・手編集しない）
 * 読み手: 運営管理画面 /content/content~sns/video-packs（tools/admin-app の
 *   汎用コンテンツブラウザが README.md を文書として描画する）と人間。
 *
 * 真実源は各 video-pack.json ＋ .claude/state/video-content-status.json で、
 * README はその投影。鮮度は check-video-content の R 系検査が守る
 * （パック追加・削除後に本スクリプトを回し忘れると FAIL）。
 *
 * Usage: npm run build-video-pack-index
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, discoverPacks } from './lib/video-content-check.mjs';
import { todayJst } from './lib/jst-date.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = loadConfig(ROOT);
const { packs } = discoverPacks(ROOT, config);

const statePath = join(ROOT, config.paths.stateFile);
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : { packs: {} };

const EXAM_LABEL = {
  'civil-construction-1': '1級土木施工管理技士',
  'civil-construction-2': '2級土木施工管理技士',
  'pe-comprehensive-management': '技術士 総合技術監理部門',
  'pe-construction': '技術士 建設部門',
  'pe-first-stage': '技術士 第一次試験',
  'concrete-chief-engineer': 'コンクリート主任技士',
  'concrete-diagnostician': 'コンクリート診断士',
};

const rows = [];
for (const pack of packs) {
  let m;
  try {
    m = JSON.parse(readFileSync(pack.manifestPath, 'utf8'));
  } catch {
    continue; // parse 不能は check-video-content が FAIL させる。index は読めた分だけ
  }
  const longform = state.packs?.[m.packId]?.derivatives?.longform;
  const hasScript = existsSync(join(pack.dir, 'script.md'));
  const hasSb = existsSync(join(pack.dir, 'storyboard.json'));
  const stage = longform?.status === 'draft' && !hasScript ? '企画のみ' : (longform?.status ?? '未登録');
  const cta = m.primaryCta?.targetId ?? m.primaryCta?.kind ?? '-';
  rows.push({
    exam: m.exam, packId: m.packId, title: m.title, pain: m.pain,
    intent: m.intent, stage, cta,
    files: `${hasScript ? '台本' : '—'}/${hasSb ? '構成' : '—'}`,
  });
}

rows.sort((a, b) => a.exam.localeCompare(b.exam) || a.packId.localeCompare(b.packId));

const lines = [
  '# 動画パック 企画バンク（自動生成）',
  '',
  `> このファイルは生成物。手編集せず \`npm run build-video-pack-index\` で再生成する（パック追加・状態変更後）。`,
  `> 真実源: 各 \`video-pack.json\` ＋ \`.claude/state/video-content-status.json\`。契約: \`.claude/knowledge/reference/video-content-policy.md\``,
  '',
  `パック数: **${rows.length}**（更新: ${todayJst()}）`,
  '',
];

for (const [exam, label] of Object.entries(EXAM_LABEL)) {
  const group = rows.filter((r) => r.exam === exam);
  if (group.length === 0) continue;
  lines.push(`## ${label}（${group.length}）`, '');
  lines.push('| packId | タイトル | 悩み | intent | 状態 | 台本/構成 | 主CTA |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const r of group) {
    lines.push(`| \`${r.packId}\` | ${r.title} | ${r.pain} | ${r.intent} | ${r.stage} | ${r.files} | \`${r.cta}\` |`);
  }
  lines.push('');
}

const out = join(ROOT, config.paths.packsRoot, 'README.md');
writeFileSync(out, lines.join('\n'), 'utf8');
console.log(`build-video-pack-index: ${rows.length} パックを ${config.paths.packsRoot}/README.md へ書き出し`);
