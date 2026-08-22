/**
 * キャリア整理ツール（/tools/career-check）の純ロジックと安全弁を固定する。
 *
 * 守りたい事故:
 *   - 個人情報の入力欄が後から生える（氏名・会社名・連絡先・年収・自由記述）
 *   - どこかの選択組合せで結果が出ない／例外になる
 *   - 緊急性の高い悩みで転職 CTA が出る
 *   - 資格なし・経験浅い読者に否定的な結果を返す
 *   - GA4 payload に列挙値以外が混ざる
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadTsModule } from './lib/load-ts.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const mod = await loadTsModule('src/lib/career-check.ts');
const {
  evaluateCareerCheck,
  trackingPayload,
  QUALIFICATION_LABEL,
  EXPERIENCE_LABEL,
  WORK_TYPE_LABEL,
  ROLE_LABEL,
  SCALE_LABEL,
  CHANGE_WANT_LABEL,
} = mod;

const CONCERNS = ['urgent', 'quit-or-stay', 'pay', 'workstyle', 'location', 'market-value', 'application'];
const QUALS = Object.keys(QUALIFICATION_LABEL);
const EXPS = Object.keys(EXPERIENCE_LABEL);
const WORKS = Object.keys(WORK_TYPE_LABEL);
const ROLES = Object.keys(ROLE_LABEL);
const SCALES = Object.keys(SCALE_LABEL);
const WANTS = Object.keys(CHANGE_WANT_LABEL);

/** 全組合せ（7×5×4×6×5×4×5 = 84,000 通り）を実際に回す。 */
function* allInputs() {
  for (const concern of CONCERNS)
    for (const qualification of QUALS)
      for (const experience of EXPS)
        for (const workType of WORKS)
          for (const role of ROLES)
            for (const scale of SCALES)
              for (const changeWant of WANTS)
                yield { concern, qualification, experience, workType, role, scale, changeWant };
}

test('全入力組合せが必ず結果を返す（例外を投げない）', () => {
  let checked = 0;
  for (const input of allInputs()) {
    const r = evaluateCareerCheck(input);
    assert.ok(r, `結果が返らない: ${JSON.stringify(input)}`);
    assert.ok(r.headline.length > 0);
    assert.ok(r.points.length > 0, `論点が空: ${JSON.stringify(input)}`);
    assert.ok(r.reads.length > 0, `次に読むページが空: ${JSON.stringify(input)}`);
    checked += 1;
  }
  // 検査ゼロを PASS と呼ばない: 実際に回した件数を主張する
  assert.equal(checked, 7 * 5 * 4 * 6 * 5 * 4 * 5);
});

test('緊急性の高い悩みでは転職 CTA を出さず、公的窓口を先に出す', () => {
  let checked = 0;
  for (const input of allInputs()) {
    if (input.concern !== 'urgent') continue;
    const r = evaluateCareerCheck(input);
    assert.equal(r.showAffiliate, false, 'urgent で affiliate が出ている');
    assert.equal(r.urgent, true);
    assert.ok(r.reads[0].external, '公的窓口が先頭に来ていない');
    assert.ok(r.reads.some((x) => x.href.includes('mhlw.go.jp')), '公的窓口が含まれていない');
    checked += 1;
  }
  assert.ok(checked > 0, 'urgent の組合せを 1 件も検査していない');
});

test('緊急性以外では結果より前に affiliate を置かない構造になっている', () => {
  // 出す条件そのものは「結果が組み立てられた後」で、result 側のフラグだけが持つ。
  const r = evaluateCareerCheck({
    concern: 'pay', qualification: 'civil-1', experience: '7to15',
    workType: 'road', role: 'shunin', scale: 'unknown', changeWant: 'pay',
  });
  assert.equal(r.showAffiliate, true);
  assert.ok(r.points.length > 0 && r.reads.length > 0 && r.questions.length > 0);
});

test('資格なし・経験浅い場合も否定的な結果へ落とさない', () => {
  const r = evaluateCareerCheck({
    concern: 'market-value', qualification: 'none', experience: 'lt3',
    workType: 'other', role: 'tantou', scale: 'unknown', changeWant: 'role',
  });
  assert.equal(r.showAffiliate, true, '資格なしで導線を閉じている');
  assert.ok(r.reads.length >= 2);
  const text = [...r.points, ...r.questions, ...r.inventory].join('');
  for (const ng of ['難しい', '厳しい', '無理', '不利']) {
    assert.ok(!text.includes(ng), `否定的な語「${ng}」が結果に含まれる`);
  }
  assert.ok(r.inventory.some((s) => s.includes('自分で段取りした範囲')), '経験浅い向けの棚卸し項目が無い');
});

test('工事規模「わからない」でも棚卸し項目を返す', () => {
  const r = evaluateCareerCheck({
    concern: 'application', qualification: 'civil-2', experience: '3to7',
    workType: 'water', role: 'tantou', scale: 'unknown', changeWant: 'holiday',
  });
  assert.ok(r.inventory.some((s) => s.includes('請負金額の帯')), '金額の棚卸し項目が消えている');
});

test('質問は 3〜5 件に収まる', () => {
  for (const input of allInputs()) {
    if (input.concern === 'urgent') continue;
    const r = evaluateCareerCheck(input);
    assert.ok(r.questions.length >= 3 && r.questions.length <= 5, `質問が ${r.questions.length} 件`);
  }
});

test('次に読むページが重複しない', () => {
  for (const input of allInputs()) {
    const r = evaluateCareerCheck(input);
    const hrefs = r.reads.map((x) => x.href);
    assert.equal(new Set(hrefs).size, hrefs.length, `重複: ${hrefs.join(', ')}`);
  }
});

test('concern → need の対応（urgent だけ need を持たない）', () => {
  // concernToNeed は内部関数なので、結果ごしに固定する（テストのためだけに export しない）。
  const base = { qualification: 'civil-1', experience: '7to15', workType: 'road', role: 'shunin', scale: 'unknown', changeWant: 'pay' };
  assert.equal(evaluateCareerCheck({ ...base, concern: 'urgent' }).need, null);
  for (const c of CONCERNS.filter((x) => x !== 'urgent')) {
    assert.equal(evaluateCareerCheck({ ...base, concern: c }).need, c);
  }
});

test('GA4 payload は列挙値だけを含む', () => {
  const allowed = {
    need: [...CONCERNS.filter((c) => c !== 'urgent'), 'urgent'],
    qualification: QUALS,
    experience: EXPS,
    route: [...CONCERNS.filter((c) => c !== 'urgent'), 'urgent', 'unclassified'],
  };
  let checked = 0;
  for (const input of allInputs()) {
    const r = evaluateCareerCheck(input);
    const p = trackingPayload(input, r);
    assert.deepEqual(Object.keys(p).sort(), ['experience', 'need', 'qualification', 'route']);
    for (const [k, v] of Object.entries(p)) {
      assert.ok(allowed[k].includes(v), `${k} に許可外の値: ${v}`);
      assert.ok(typeof v === 'string' && v.length < 32, `${k} が列挙値らしくない: ${v}`);
    }
    checked += 1;
  }
  assert.ok(checked > 0);
});

test('個人情報の入力欄が UI に存在しない', () => {
  const client = read('src/app/tools/career-check/CareerCheckClient.tsx');
  // text/email/tel/number の自由入力と textarea を置かない（選択式のみ）。
  for (const ng of ['type="text"', 'type="email"', 'type="tel"', 'type="number"', '<textarea', '<input type="password"']) {
    assert.ok(!client.includes(ng), `個人情報を取り得る入力 ${ng} が存在する`);
  }
  assert.ok(client.includes('type="radio"'), '選択式の入力が無い');
  // 保存・送信をしない
  for (const ng of ['localStorage', 'sessionStorage', 'fetch(', 'axios', 'XMLHttpRequest']) {
    assert.ok(!client.includes(ng), `保存・送信の痕跡 ${ng} がある`);
  }
});

test('ツール一覧とルーティングに配線されている', () => {
  const index = read('src/app/tools/page.tsx');
  assert.ok(index.includes('/tools/career-check'), 'ツール一覧にカードが無い');
  const page = read('src/app/tools/career-check/page.tsx');
  assert.ok(page.includes('alternates: { canonical: "/tools/career-check" }'), 'canonical が無い');
  assert.ok(page.includes('<noscript>'), 'JS 無効時の導線が無い');
  assert.ok(page.includes('CAREER_HUB_ENTRIES'), 'JS 無効時に hub/柱 へ到達できない');
});

test('免責が結果に明記されている', () => {
  const client = read('src/app/tools/career-check/CareerCheckClient.tsx');
  assert.ok(client.includes('求人紹介や採用可能性を保証するものでもありません'), '免責文が無い');
  assert.ok(client.includes('判定しません'), '判定しない旨が無い');
});
