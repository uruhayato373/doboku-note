/** VOICEVOX を手元で起動する。既に動いていれば null、起動したら child を返す（呼び手が kill する）。 */
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

export async function ensureVoicevox() {
  const up = () => fetch('http://127.0.0.1:50021/version').then((r) => r.ok, () => false);
  if (await up()) return null;
  const engine = join(homedir(), 'voicevox_engine/macos-arm64/run');
  if (!existsSync(engine)) throw new Error(`VOICEVOX が無い: ${engine}`);
  const child = spawn(engine, ['--host', '127.0.0.1', '--port', '50021'], { stdio: 'ignore', detached: true });
  for (let i = 0; i < 60; i += 1) {
    await new Promise((r) => { setTimeout(r, 1000); });
    if (await up()) return child;
  }
  child.kill();
  throw new Error('VOICEVOX が起動しない');
}

/** 文字起こしは同音の漢字を取り違える（圧密→厚密）ので、表記でなく VOICEVOX の読み仮名で比べる */
export async function readingOf(text) {
  const kana = [];
  for (const part of text.split(/(?<=[。？！])/).filter((s) => s.trim())) {
    const query = await fetch(`http://127.0.0.1:50021/audio_query?speaker=13&text=${encodeURIComponent(part)}`, { method: 'POST' });
    if (!query.ok) throw new Error(`読み仮名を取れない: ${query.status}`);
    kana.push((await query.json()).kana.replace(/[/'、_]/g, ''));
  }
  return kana.join('');
}
