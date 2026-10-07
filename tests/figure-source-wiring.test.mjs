// 記事の図と原典の結線（DN-0563・DN-0564）を固定する。
// 2026-10-07: 図の切り出し直しで原典を引けず worker が vault を総当たりし、白書はネットから取得した。
// 流用不可の市販書籍の図が試験ページ以外の記事に 41 枚あり、検査はそれを見ていなかった。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { figureSourceFindings, isExamArticle, refForVaultPath, sourceCandidatesFor, sourceIdsOf } from '../scripts/lib/figure-source-wiring.mjs';
import { repoRelForVault } from '../scripts/lib/drive-vault.mjs';

const cfg = {
  classes: {
    'commercial-book': { figureReuse: false },
    'operator-owned': { figureReuse: true },
    'government-publication': { figureReuse: true },
    'exam-official': { figureReuse: true },
    'external-primary': { figureReuse: false },
  },
  sources: [
    { id: 'workbook', title: '問題解説集', class: 'commercial-book', origin: { kind: 'drive', vaultDir: '原資料PDF/書籍/workbook__問題解説集' },
      bookBundle: { sourceFiles: [{ order: 1 }], renderProfile: { rotation: 180 } } },
    { id: 'keyword-book', title: '論文対策キーワード', class: 'operator-owned', origin: { kind: 'drive', vaultDir: '原資料PDF/書籍/keyword-book__論文' } },
    { id: 'mlit-white-paper', title: '国土交通白書', class: 'government-publication', origin: { kind: 'external', url: 'https://www.mlit.go.jp/' },
      vaultCopies: [{ path: '原資料PDF/白書/国土交通白書（令和７年度）.pdf' }] },
    { id: 'cecc-past-exams', title: '過去問', class: 'exam-official', origin: { kind: 'external', url: 'https://www.jctc.jp/' } },
    { id: 'labor-act', title: '労働基準法', class: 'external-primary', origin: { kind: 'none' } },
  ],
};

test('試験ページの判定と sources の id の取り出し', () => {
  assert.equal(isExamArticle('civil-construction-1/primary-h29-a'), true);
  assert.equal(isExamArticle('civil-construction-1/secondary-earthwork-basics'), false);
  assert.deepEqual(sourceIdsOf(['labor-act#第36条', 'workbook', 3]), ['labor-act', 'workbook']);
});

test('出典パスから原本の参考文献を引く（書籍の vaultDir・白書の写し・該当なし）', () => {
  assert.equal(refForVaultPath('vault:原資料PDF/書籍/workbook__問題解説集/source/001.pdf', cfg).id, 'workbook');
  assert.equal(refForVaultPath('vault:原資料PDF/白書/国土交通白書（令和７年度）.pdf', cfg).id, 'mlit-white-paper');
  assert.equal(refForVaultPath('vault:原資料PDF/過去問/１級土木施工管理技士/R02/a.pdf', cfg), null);
  assert.equal(refForVaultPath('https://www.mlit.go.jp/x.pdf', cfg), null);
});

test('解説記事は原典の宣言が要り、流用不可の書籍からの図は別に返す。試験ページは試験の原典の宣言だけ見る', () => {
  const provenance = {
    'civil-construction-1/secondary-earthwork-basics/img/fig-2-41': { pdf: 'vault:原資料PDF/書籍/workbook__問題解説集/source/001.pdf' },
    'civil-construction-1/primary-h29-a/img/h29-a-fig-01': { pdf: 'vault:原資料PDF/書籍/workbook__問題解説集/source/001.pdf' },
    'pe-construction/ninaite-dx-ronbun-keyword/img/fig21': { pdf: 'vault:原資料PDF/書籍/keyword-book__論文/source/001.pdf' },
    'civil-construction-1/deleted-article/img/x': { pdf: 'vault:原資料PDF/書籍/workbook__問題解説集/source/001.pdf' },
  };
  const articleSources = new Map([
    ['civil-construction-1/secondary-earthwork-basics', []],
    ['civil-construction-1/primary-h29-a', ['cecc-past-exams']],
    ['pe-construction/ninaite-dx-ronbun-keyword', ['mlit-white-paper']],
  ]);
  const { checked, findings } = figureSourceFindings({ provenance, cfg, articleSources });
  assert.equal(checked, 3, '記事の無い図は数えない');
  const kinds = findings.map((f) => `${f.kind}:${f.figKey.split('/').pop()}`).sort();
  assert.deepEqual(kinds, ['figure-reuse-forbidden:fig-2-41', 'figure-source-undeclared:fig-2-41', 'figure-source-undeclared:fig21']);

  const declared = new Map([...articleSources, ['civil-construction-1/secondary-earthwork-basics', ['workbook']], ['civil-construction-1/primary-h29-a', []]]);
  const again = figureSourceFindings({ provenance, cfg, articleSources: declared }).findings.map((f) => f.kind).sort();
  assert.deepEqual(again, ['figure-reuse-forbidden', 'figure-source-exam-undeclared', 'figure-source-undeclared'], '宣言しても流用不可は残り、試験ページは試験の原典が要る');
});

test('原典候補: 解説記事では流用不可の書籍を外し、法令は候補にも除外にも入れない', () => {
  const r = sourceCandidatesFor({
    articleDir: 'civil-construction-1/secondary-earthwork-basics', sourceIds: ['workbook', 'labor-act'], cfg, vaultRoot: '/V',
  });
  assert.equal(r.exam, false);
  assert.deepEqual(r.candidates, []);
  assert.deepEqual(r.forbidden, ['workbook']);
});

test('原典候補: 試験ページは公式過去問のフォルダとスキャン媒体の書籍（PDF・向き・OCR）を出す', () => {
  const r = sourceCandidatesFor({
    articleDir: 'civil-construction-1/primary-h29-a', sourceIds: ['cecc-past-exams'], cfg, vaultRoot: '/V',
    scanRefIds: ['workbook'], examDir: '原資料PDF/過去問/１級土木施工管理技士',
  });
  assert.equal(r.exam, true);
  assert.deepEqual(r.candidates.map((c) => c.id), ['past-exam-inventory', 'workbook'], 'URL しか無い公式過去問の候補はフォルダに置き換わる');
  const wb = r.candidates[1];
  assert.deepEqual(wb.files, ['/V/原資料PDF/書籍/workbook__問題解説集/source/001.pdf']);
  assert.equal(wb.rotation, 180);
  assert.equal(wb.ocrDir, '/V/原資料PDF/書籍/workbook__問題解説集/ocr');
});

test('原典候補: 白書は vault の写しを出し、写しが無ければ URL と「取得しない」の注意だけ', () => {
  const withCopy = sourceCandidatesFor({ articleDir: 'pe-construction/ninaite-dx-ronbun-keyword', sourceIds: ['mlit-white-paper'], cfg, vaultRoot: '/V' });
  assert.deepEqual(withCopy.candidates[0].files, ['/V/原資料PDF/白書/国土交通白書（令和７年度）.pdf']);
  const noCopy = { ...cfg, sources: cfg.sources.map((s) => (s.id === 'mlit-white-paper' ? { ...s, vaultCopies: undefined } : s)) };
  const r = sourceCandidatesFor({ articleDir: 'pe-construction/ninaite-dx-ronbun-keyword', sourceIds: ['mlit-white-paper'], cfg: noCopy, vaultRoot: '/V' });
  assert.deepEqual(r.candidates[0].files, []);
  assert.equal(r.candidates[0].url, 'https://www.mlit.go.jp/');
  assert.match(r.candidates[0].note, /ネットから取得しない/);
});

test('repoRelForVault: vault にだけある原本から repo 側のキーを導き、group に戻らなければ null', () => {
  const group = { id: 'white-paper-source-pdf', status: 'active', audience: 'human', vaultDir: '原資料PDF/白書',
    keyFrom: 'stripPrefix:content/sources/white-papers/', match: { pathRegex: '^content/sources/white-papers/.+\\.pdf$' } };
  const driveCfg = { groups: [group] };
  assert.equal(repoRelForVault('原資料PDF/白書/国土交通白書（令和７年度）.pdf', group, driveCfg), 'content/sources/white-papers/国土交通白書（令和７年度）.pdf');
  assert.equal(repoRelForVault('原資料PDF/白書/memo.txt', group, driveCfg), null, 'pathRegex に合わないものは登録しない');
  assert.equal(repoRelForVault('原資料PDF/書籍/x.pdf', group, driveCfg), null, 'group の外');
});
