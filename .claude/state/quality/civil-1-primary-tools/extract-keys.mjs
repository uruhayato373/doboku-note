import { readFileSync } from 'node:fs';
for (const file of process.argv.slice(2)) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  const keys = {};
  let no = null;
  for (const l of lines) {
    const m = l.match(/^##\s*問題\s*No\.?\s*([0-9]+)/);
    if (m) { no = m[1]; continue; }
    const k = l.match(/正答[：:]\s*([0-9]+)/);
    if (k && no != null) { keys[no] = k[1]; no = null; }
  }
  const name = file.split('/').slice(-2)[0].replace('primary-', '');
  const nums = Object.keys(keys).map(Number).sort((a,b)=>a-b);
  console.log(`${name} (${nums.length}): ` + nums.map(n => `${n}=${keys[n]}`).join(' '));
}
