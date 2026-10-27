/**
 * quality-audit の ops 区分（運用アラート）が Pre-merge ゲート（ci:true）に混ざらないことを固定する。
 *
 * 背景（2026-09-18）: membership-drip（会員記事の配信予定日超過）が ci:true に置かれ、記事が 2 日
 * 遅れるたびに**全 PR が赤**になっていた。30 日で Pre-merge 58 敗のうち 13 敗がこれで、その陰で
 * unit-tests の赤 6 回が読まれなかった。壁時計に依存する検査は PR の diff では直せないので、
 * マージゲートではなく日次アラート（ops-audit.yml → automation-failure Issue channel ops）で出す。
 *
 * 守ること:
 *   1. ops:true は ci:false（実装側も exit 2 で止める）
 *   2. 壁時計・鮮度を示す語を持つ検査が ci:true に居ない（再混入の検知）
 *   3. --ops / --ci / --report-only の対象が排他で、--ops が 0 件実行を PASS と呼ばない
 *   4. ops 区分を日次で読む配線（ops-audit.yml）が実在し、復旧で自動クローズしている
 *   5. 回す頻度（cadence・DN-0847）: 毎日（なし）／土曜の週次レビュー（weekly）／土曜の収集の検算（collect）が排他で、
 *      weekly は review-wiring の weekly.checks、collect は weekly-collect の段の verify から実際に回る
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';
import { CHECKS } from '../scripts/quality-audit.mjs';

const SRC = readFileSync(join(ROOT, 'scripts/quality-audit.mjs'), 'utf8');

function parseChecks(source) {
  const start = source.indexOf('const CHECKS = [');
  assert.ok(start > 0, 'CHECKS 配列が見つからない（定義の形が変わった＝検査不成立）');
  const end = source.indexOf('\n];', start);
  assert.ok(end > start, 'CHECKS 配列の終端が見つからない');
  const body = source.slice(start, end);
  const heads = [...body.matchAll(/\{\s*\n?\s*id:\s*'([a-z0-9-]+)'/g)];
  return heads.map((h, i) => {
    const block = body.slice(h.index, i + 1 < heads.length ? heads[i + 1].index : body.length);
    const note = /note:\s*'((?:[^'\\]|\\.)*)'/.exec(block)?.[1] ?? '';
    // フラグ判定は note 文字列と行コメントを除いた部分で行う（note に「ci:true」と書いただけで誤判定しない）
    const flags = block.replace(/note:\s*'(?:[^'\\]|\\.)*'/, '').replace(/\/\/.*$/gm, '');
    return {
      id: h[1],
      ci: /\bci:\s*true\b/.test(flags),
      ops: /\bops:\s*true\b/.test(flags),
      npm: /npm:\s*'([^']+)'/.exec(block)?.[1] ?? '',
      timeout: /\btimeout:\s*[0-9_]+/.test(flags),
      note,
    };
  });
}

test('全検査に timeout がある（無いと setTimeout(undefined) で即 TIMEOUT になり、CI が赤になる）', () => {
  // 2026-10-13: content-series を timeout なしで登録し、フル実行で 0.0 秒の TIMEOUT になった
  assert.ok(CHECKS.length >= 100, `検査が ${CHECKS.length} 件しか読めない（検査不成立）`);
  assert.deepEqual(CHECKS.filter((c) => !Number.isFinite(c.timeout) || c.timeout <= 0).map((c) => c.id), []);
});

test('ops:true の検査は ci:false（マージゲートに混ざらない）', () => {
  const checks = parseChecks(SRC);
  const ops = checks.filter((c) => c.ops);
  assert.ok(ops.length >= 1, 'ops:true が 1 件も無い（区分が消えた＝検査不成立）');
  assert.deepEqual(ops.filter((c) => c.ci).map((c) => c.id), [], 'ops:true なのに ci:true の検査がある');
  assert.ok(ops.some((c) => c.id === 'membership-drip'), 'membership-drip が ops に居ない（ci に戻すと全 PR が赤になる）');
  // 2026-10-11: 広告リンクの期限（affiliate-placements）は壁時計依存なので ops 側へ分けた
  assert.ok(ops.some((c) => c.id === 'affiliate-placements-upcoming'), 'affiliate-placements-upcoming が ops に居ない（壁時計依存の検査が消えたか ci に戻った）');
});

test('壁時計・鮮度に依存する検査が ci:true に居ない（再混入の検知）', () => {
  // id / npm / note に「予定日を過ぎた」「転記が止まった」を示す語があれば、PR の diff では直せない
  // 検査とみなす。誤検知なら note の書き方を変えるのではなく、本当に diff で決まるかを見直す。
  const WALLCLOCK = /overdue|drip|freshness|予定日|配信予定|転記が止|日超過|GRACE_DAYS|期限内|期限切れ|鮮度切れ/;
  const bad = parseChecks(SRC)
    .filter((c) => c.ci && WALLCLOCK.test(`${c.id} ${c.npm} ${c.note}`))
    .map((c) => c.id);
  assert.deepEqual(bad, [], `壁時計依存の検査が ci:true にある: ${bad.join(', ')} → ops:true, ci:false にする`);
});

test('selectsCheck: --ci / --ops / --weekly / --report-only の対象が排他（collect はどれでも回さない）', async () => {
  const { selectsCheck } = await import('../scripts/quality-audit.mjs');
  const gate = { id: 'g', ci: true };
  const ops = { id: 'o', ci: false, ops: true };
  const weekly = { id: 'w', ci: false, ops: true, cadence: 'weekly' };
  const collect = { id: 'c', ci: false, ops: true, cadence: 'collect' };
  const report = { id: 'r', ci: false };
  const info = { id: 'k', ci: false, digest: false };
  const all = [gate, ops, weekly, collect, report, info];
  assert.deepEqual(all.map((c) => selectsCheck(c, { ci: true })), [true, false, false, false, false, false]);
  assert.deepEqual(all.map((c) => selectsCheck(c, { ops: true })), [false, true, false, false, false, false]);
  assert.deepEqual(all.map((c) => selectsCheck(c, { weekly: true })), [false, false, true, false, false, false]);
  assert.deepEqual(all.map((c) => selectsCheck(c, { reportOnly: true })), [false, false, false, false, true, false]);
  assert.deepEqual(all.map((c) => selectsCheck(c, {})), [true, true, true, true, true, true]);
});

test('cadence は ops:true にだけ weekly か collect で付き、毎日の ops に週 1 回しか変わらない検算を残さない（DN-0847）', () => {
  const bad = CHECKS.filter((c) => c.cadence !== undefined && (!c.ops || !['weekly', 'collect'].includes(c.cadence)));
  assert.deepEqual(bad.map((c) => c.id), []);
  const daily = CHECKS.filter((c) => c.ops && !c.cadence).map((c) => c.id);
  // 数日で実害が出るもの・CI の取得の停止・土曜の収集の死活は毎日
  for (const id of ['note-delivery-due', 'membership-drip', 'affiliate-placements-upcoming', 'weekly-collect']) assert.ok(daily.includes(id), `${id} が毎日の ops に居ない`);
  // 土曜の収集が書く記録の検算を毎日回すと、1 段落ちただけで同じ赤が 6 回出る（2026-10-25 に 3 本が赤）
  for (const id of ['sales-freshness', 'kdp-report-freshness', 'a8-report-due', 'coconala-analytics']) {
    assert.equal(CHECKS.find((c) => c.id === id)?.cadence, 'collect', `${id} が収集の検算に居ない`);
  }
  // 毎日の weekly-collect は死活だけ（段の合否は土曜の Issue と週次レビュー）
  assert.equal(CHECKS.find((c) => c.id === 'weekly-collect').npm, 'check-weekly-collect:alive');
});

test('週次の点検（cadence weekly）は土曜の週次レビューが review-checks で回す', () => {
  const wiring = JSON.parse(readFileSync(join(ROOT, '.claude/config/review-wiring.json'), 'utf8'));
  assert.ok(CHECKS.some((c) => c.cadence === 'weekly'), 'cadence weekly が 1 件も無い（検査不成立）');
  assert.ok((wiring.cadences.weekly.checks ?? []).some((k) => k.command === 'quality:audit:weekly'), 'review-wiring の weekly.checks に quality:audit:weekly が無い（週次の点検の読み手が無い）');
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  assert.match(pkg.scripts['quality:audit:weekly'] ?? '', /quality-audit\.mjs --weekly/);
});

test('--ops / --weekly のガードが実装されている（排他・検査ゼロ・ops は ci:false）', () => {
  assert.match(SRC, /if\s*\(OPS\s*&&\s*\(CI\s*\|\|\s*REPORT_ONLY\)\)/, '--ops と --ci/--report-only の排他ガードが無い');
  assert.match(SRC, /if\s*\(WEEKLY\s*&&\s*\(CI\s*\|\|\s*REPORT_ONLY\s*\|\|\s*OPS\)\)/, '--weekly と他のモードの排他ガードが無い');
  assert.match(SRC, /\(OPS\s*\|\|\s*WEEKLY\)\s*&&\s*results\.length === 0/, '--ops / --weekly の検査ゼロ判定が無い');
  assert.match(SRC, /c\.ops\s*&&\s*c\.ci/, 'ops:true かつ ci:true を exit 2 で止める検証が無い');
});

test('ops 区分を日次で読む配線が実在する（ops-audit.yml）', () => {
  const wf = readFileSync(join(ROOT, '.github/workflows/ops-audit.yml'), 'utf8');
  assert.match(wf, /quality-audit\.mjs --ops/, 'ops-audit.yml が --ops を実行していない');
  assert.match(wf, /--channel ops/, 'ops の FAIL を automation-failure Issue へ届けていない');
  assert.match(wf, /--resolve --channel ops/, '復旧時に ops Issue を自動クローズしていない');
  assert.match(wf, /issues:\s*write/, 'ops-audit.yml に issues: write が無い（起票できない）');
  assert.match(wf, /schedule:/, 'ops-audit.yml が cron で回っていない');
  assert.match(wf, /outputs\.rc != '0'/, 'rc=2（検査不成立）を緑にしないガードが無い');
});

test('ops-audit.yml が workflow-health の監視対象に居る', () => {
  const cfg = JSON.parse(readFileSync(join(ROOT, 'config/workflow-health.json'), 'utf8'));
  assert.ok(cfg.workflows.some((w) => w.workflow === 'ops-audit.yml'), 'ops-audit.yml が workflow-health.json に無い（沈黙を拾えない）');
});

test('internally parallel unit suite runs without competing audit workers', () => {
  assert.equal(CHECKS.find((c) => c.id === 'unit-tests').serial, true);
});

test('generated-indexes waits for audit writers before comparing worktree changes', () => {
  assert.equal(CHECKS.find((c) => c.id === 'generated-indexes').serial, true);
});

test('SNS（X・Instagram・YouTube）と動画・コンテンツ台帳の検査は CI に置かない（SNS の保留・2026-10-25 運営者の判断）', () => {
  // 再開するときは必要なものを作り直す。スクリプトは手元の道具として残っている
  const SNS = /^(x-|instagram-|youtube-|video-|sns-landing|registry-due|content-registry)/;
  assert.deepEqual(CHECKS.filter((c) => SNS.test(c.id)).map((c) => c.id), []);
  const snsUrls = CHECKS.find((c) => c.id === 'sns-urls');
  assert.deepEqual(snsUrls.steps.map((s) => s.label), ['sns-urls-mdx', 'sns-urls-note'], 'sns-urls はサイトの MDX と note のリンクだけを見る');
});

test('束（steps）は手順を全部回し、1 つでも落ちたら fail・落ちた手順の名前を出す（DN-0805）', async () => {
  const { runSteps } = await import('../scripts/quality-audit.mjs');
  const node = (code) => ['node', '-e', `console.log('out-${code}'); process.exit(${code})`];
  const ok = await runSteps({ id: 'b', ci: true, timeout: 30_000, steps: [{ label: 'a', cmd: node(0), timeout: 10_000 }, { label: 'b', cmd: node(0), timeout: 10_000 }] });
  assert.equal(ok.status, 'pass');
  assert.match(ok.stdoutTail, /=== a \(pass\) ===[\s\S]*=== b \(pass\) ===/, '全部の手順が回っていない');
  const bad = await runSteps({ id: 'b', ci: true, timeout: 30_000, steps: [{ label: 'a', cmd: node(1), timeout: 10_000 }, { label: 'b', cmd: node(0), timeout: 10_000 }] });
  assert.equal(bad.status, 'fail');
  assert.match(bad.stdoutTail, /=== b \(pass\) ===/, '落ちた後の手順も回す（1 回で全部の結果が見える）');
  assert.match(bad.excerpt, /\[a: fail\]/);
  const missing = await runSteps({ id: 'b', ci: true, timeout: 30_000, steps: [{ label: 'x', npm: '__no_such_script__' }] });
  assert.equal(missing.status, 'fail', '未定義の npm script を束の中で黙って飛ばさない');
});

test('束の検査は全部 steps を持ち、各手順に label・timeout・npm か cmd がある', () => {
  const bundles = CHECKS.filter((c) => c.steps);
  assert.deepEqual(bundles.map((c) => c.id).sort(), ['admin-ui', 'internal-links', 'report-generators', 'sns-urls', 'workflow-static']);
  for (const b of bundles) {
    for (const s of b.steps) {
      assert.ok(s.label && Number.isFinite(s.timeout) && (s.npm || s.cmd), `${b.id}: ${JSON.stringify(s).slice(0, 80)}`);
    }
  }
});
