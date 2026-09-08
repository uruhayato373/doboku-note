#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { mkdirSync, mkdtempSync, writeFileSync, realpathSync } from 'node:fs';
import { dirname, join, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCharacterCatalog } from './lib/character-catalog.mjs';
import { renderCharacterFrame } from './lib/character-framing.mjs';
import { FRAME_LABELS } from './lib/character-frame-geometry.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { values } = parseArgs({ options: {
  pose: { type: 'string' }, all: { type: 'boolean' }, frame: { type: 'string', default: 'all' },
  width: { type: 'string', default: '0' }, commit: { type: 'boolean' }, help: { type: 'boolean' },
} });
if (values.help) {
  console.log('node scripts/render-character-frames.mjs --all|--pose <id> [--frame full|waist|bust|all] [--width 720] [--commit]\n既定dry-run。原画像は変更せず、実行時に.tmp/character-frames/へ派生PNGと来歴を書き出します。');
} else {
  try {
    if (Boolean(values.pose) === Boolean(values.all)) throw new Error('--pose または --all のどちらかを指定してください');
    const catalog = readCharacterCatalog(ROOT);
    const poses = values.all ? catalog.poses : catalog.poses.filter(p => p.slug === values.pose);
    if (!poses.length) throw new Error('該当するポーズがありません');
    const frames = values.frame === 'all' ? Object.keys(FRAME_LABELS) : [values.frame];
    if (frames.some(f => !Object.hasOwn(FRAME_LABELS, f))) throw new Error('未登録の切り取りです');
    const width = Number(values.width);
    if (!/^\d+$/.test(values.width) || !Number.isInteger(width) || width > 4096) throw new Error('幅は0〜4096の整数です');
    const report = { mode: values.commit ? 'write' : 'dry-run', requested: poses.length * frames.length, rendered: 0, excluded: [], errors: [], outputs: [] };
    let out;
    if (values.commit) {
      const cache = join(ROOT, '.tmp/character-frames');
      mkdirSync(cache, { recursive: true });
      const rel = relative(realpathSync(ROOT), realpathSync(cache));
      if (isAbsolute(rel) || rel.startsWith('..')) throw new Error('出力先がリポジトリ外です');
      out = mkdtempSync(join(cache, 'run-'));
    }
    for (const pose of poses) for (const frame of frames) {
      const key = `${pose.slug}/${frame}`;
      if (pose.quality?.status !== 'ready' || pose.framing?.variants[frame]?.box === null) {
        report.excluded.push({ key, reason: pose.quality?.status !== 'ready' ? pose.quality?.note ?? '画像品質未確認' : pose.framing.variants[frame].note });
        continue;
      }
      try {
        const { buffer, ...detail } = await renderCharacterFrame(ROOT, { pose: pose.slug, frame, width });
        if (out) writeFileSync(join(out, detail.filename), buffer);
        report.outputs.push(detail);
        report.rendered++;
      } catch (error) { report.errors.push({ key, reason: error.message }); }
    }
    if (out) writeFileSync(join(out, 'manifest.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ ...report, outputDir: out ? relative(ROOT, out) : null }, null, 2));
    if (report.errors.length || !report.rendered) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
