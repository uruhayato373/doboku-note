/**
 * schedule-civil-theme-packs.mjs — 論点パックを Meta Business Suite へ波状予約する継続ドライバ。
 *
 * publish-ig-bs（ブラウザ自動操作）を決定的プランに沿って順次呼び、次の未予約 N 件を予約する。
 * status.json で予約済みを自動スキップ（冪等）＝セッションを跨いで安全に再開できる。
 *
 * 【重要・アカウント安全】ブラウザ自動操作は Meta 規約上グレー。X 凍結歴あり（[[project_x_account_reboot_2026_06]]）
 * のため **1 セッション ~30 件に制限**し、各投稿間に間隔を空ける。全件一括自動予約はしない。
 *
 * プラン（決定的・全122件が 7/18〜9/16＝Meta +75日枠 9/30 内）:
 *   並び順 = 頻出度★ 降順 → 2級先行 → 論点名。1日2件（昼12:00=2級 / 夜19:00=1級・尽きたら他級で充填）。
 *   ANCHOR(2026-07-18) からの通し index で日時が一意に決まる＝再実行で同じ割当。
 *
 * Usage:
 *   node .claude/scripts/sns/schedule-civil-theme-packs.mjs --dry-run          # 次の未予約を1件だけ dry-run 検証
 *   node .claude/scripts/sns/schedule-civil-theme-packs.mjs --count 30         # 次の未予約 30 件を予約
 *   node .claude/scripts/sns/schedule-civil-theme-packs.mjs --plan             # 予約せずプラン全体を表示
 *
 * 前提: publish-ig-bs のログイン済みプロファイル（.local/playwright-ig-bs-profile）。
 *       初回・1週間以上空いた後は必ず --dry-run を先に回す（SKILL.md 準拠）。
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const SKILL = '.claude/skills/social/publish-ig-bs/publish-ig-bs.ts';
const ANCHOR = '2026-07-18';           // プラン起点（過ぎても未予約分の日時は不変・予約済はskip）
const SLOTS = ['12:00', '19:00'];      // 昼=2級 / 夜=1級

function arg(name, def = null) {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

// 決定的プラン構築（generate と同じ並び規則）
function buildPlan() {
  function packs(exam) {
    const base = join(ROOT, 'docs/sns/instagram', exam, 'theme-packs');
    const r = [];
    if (!existsSync(base)) return r;
    for (const ts of readdirSync(base)) for (const pk of readdirSync(join(base, ts))) {
      const sj = join(base, ts, pk, 'slide-data.json');
      if (!existsSync(sj)) continue;
      const m = JSON.parse(readFileSync(sj, 'utf8'))._meta;
      r.push({ slug: `${exam}/theme-packs/${ts}/${pk}`, exam, stars: m.freqStars, label: m.subtopic.label });
    }
    return r;
  }
  const cmp = (a, b) => b.stars - a.stars || a.label.localeCompare(b.label);
  const c2 = packs('civil-2').sort(cmp);
  const c1 = packs('civil-1').sort(cmp);
  const plan = [];
  let i2 = 0, i1 = 0, day = 0;
  const dstr = (off, hh) => {
    const d = new Date(`${ANCHOR}T00:00:00+09:00`);
    d.setDate(d.getDate() + off);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${hh}`;
  };
  while (i2 < c2.length || i1 < c1.length) {
    if (i2 < c2.length) plan.push({ ...c2[i2++], when: dstr(day, SLOTS[0]) });
    else if (i1 < c1.length) plan.push({ ...c1[i1++], when: dstr(day, SLOTS[0]) });
    if (i1 < c1.length) plan.push({ ...c1[i1++], when: dstr(day, SLOTS[1]) });
    else if (i2 < c2.length) plan.push({ ...c2[i2++], when: dstr(day, SLOTS[1]) });
    day++;
  }
  return plan;
}

const isScheduled = (slug) => {
  const sp = join(ROOT, 'docs/sns/instagram', slug, 'status.json');
  if (!existsSync(sp)) return false;
  try { return Object.values(JSON.parse(readFileSync(sp, 'utf8'))).some((v) => v && v.status === 'scheduled'); }
  catch { return false; }
};

const plan = buildPlan();
const pending = plan.filter((p) => !isScheduled(p.slug));

if (arg('plan')) {
  console.log(`全プラン ${plan.length} 件（予約済 ${plan.length - pending.length} / 未予約 ${pending.length}）`);
  plan.forEach((p, i) => console.log(`  ${String(i + 1).padStart(3)} ${p.when.slice(0, 16)} [${p.exam.replace('civil-', '')}級★${p.stars}] ${isScheduled(p.slug) ? '✓予約済' : '·未'} ${p.slug.split('/theme-packs/')[1]}`));
  process.exit(0);
}

const dryRun = arg('dry-run') === true;
const count = dryRun ? 1 : parseInt(arg('count', '30'), 10);
const CAP = 30;
if (!dryRun && count > CAP) { console.error(`--count は 1 セッション ${CAP} 件まで（凍結回避）。分割して実行してください`); process.exit(1); }

const batch = pending.slice(0, count);
console.log(`未予約 ${pending.length} 件中 ${batch.length} 件を${dryRun ? ' dry-run 検証' : '予約'}（残 ${pending.length - batch.length} は次セッション）`);

let ok = 0, fail = 0, consec = 0;
const log = [];
for (let i = 0; i < batch.length; i++) {
  const p = batch[i];
  const when = p.when.slice(0, 16);
  console.log(`\n[${i + 1}/${batch.length}] ${when}  ${p.slug}`);
  try {
    const out = execSync(`npx tsx ${SKILL} post "${p.slug}" --schedule ${when}${dryRun ? ' --dry-run' : ''}`, { cwd: ROOT, stdio: 'pipe', timeout: 175000 }).toString();
    const good = dryRun ? /予約モード確認 OK/.test(out) : /予約成功モーダルを検出|予約投稿 完了/.test(out);
    if (!good) throw new Error('成功マーカー無し: ' + out.split('\n').slice(-4).join(' | ').slice(0, 160));
    ok++; consec = 0; log.push(`OK  ${when} ${p.slug}`); console.log('  ✅');
  } catch (e) {
    fail++; consec++;
    log.push(`FAIL ${when} ${p.slug} :: ${String(e.stdout || e.message || e).split('\n').slice(-3).join(' | ').slice(0, 180)}`);
    console.log('  ❌ ' + log[log.length - 1]);
    if (consec >= 2) { console.log('\n⛔ 連続失敗2回 → 中止'); break; }
  }
  if (i < batch.length - 1) await new Promise((r) => setTimeout(r, (30 + (i % 21)) * 1000)); // jitter 30-50s
}

console.log(`\n=== 完了: OK ${ok} / FAIL ${fail} ===`);
log.forEach((l) => console.log('  ' + l));
console.log('\n次: status.json を commit → 次セッションで同コマンドを再実行（予約済は自動skip）');
