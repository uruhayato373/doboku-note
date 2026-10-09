import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, rmdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect, type Page } from '@playwright/test';

/**
 * /content/items（作品と公開の確認画面）と /media の素材配信の read-only 契約を実ブラウザで固定する。
 *
 * 守りたい事故:
 *   - 書き込み経路（form・書き込みボタン）が生える
 *   - Drive のマウント先（メールアドレス入りの絶対パス）が HTML に漏れる
 *   - 素材の配信（Range・HEAD・パス検査）が壊れ、動画のシークや表紙の表示が止まる
 *
 * 配信（200・206・HEAD・416・403）は beforeAll で作る固定の小さな mp4 で必ず確かめる（素材が無い環境でも 0 件にならない）。
 * 実素材（総まとめの表紙・完成動画）を使うテストだけ、素材が無い環境で test.skip して理由を出す。
 */

const LIST = '/content/items';
const WORK = '/content/items/civil-construction-2/matome-2kyu-chokuzen';
const COPY_LABELS = ['コピー', 'コピーした', 'コマンドをコピー', 'promptをコピー'];

async function assertReadOnly(page: Page, allowTableControls: boolean) {
  expect(await page.locator('form').count()).toBe(0);
  const buttons = await page.locator('main').getByRole('button').allInnerTexts();
  const writeLike = buttons
    .map((t) => t.trim())
    .filter((t) => t !== '' && !/Toggle Sidebar/i.test(t)) // レイアウト側のサイドバー開閉（モバイルは main 内）
    .filter((t) => !COPY_LABELS.includes(t))
    // 一覧の DataTable の並べ替え・ページ送りは表示だけを変える
    .filter((t) => !(allowTableControls && /^(前へ|次へ|Previous|Next|.*[↑↓⇅▲▼].*)$/.test(t)))
    .filter((t) => /公開|申請|保存|削除|アップロード|upload|承認|価格|status|実行|送信|再ビルド|提出|復元|pull|push/i.test(t));
  expect(writeLike).toEqual([]);
}

function assertNoLeak(html: string) {
  expect(html).not.toContain('GoogleDrive-');
  expect(html).not.toContain('CloudStorage');
  expect(html).not.toContain('@gmail');
}

test('/content/items は 200 で作品の行と件数を表示する', async ({ page }) => {
  const res = await page.goto(LIST);
  expect(res!.status()).toBe(200);
  await expect(page.getByRole('heading', { name: '作品と公開', level: 1 })).toBeVisible();
  await expect(page.getByText(/作品 \d+ 件 · 公開 \d+ 件/)).toBeVisible();
  // 行は一覧の表（ページ送りあり）。先頭ページに作品へのリンクが出ていればよい
  await expect(page.locator('main a[href^="/content/items/"]').first()).toBeVisible();
});

test('/content/items は form・書き込みボタンを持たず、Drive のパスを出さない', async ({ page }) => {
  const res = await page.goto(LIST);
  assertNoLeak(await res!.text());
  await assertReadOnly(page, true);
});

test('作品の詳細は表紙・締め・完成動画・字幕・承認・次のコマンドの区画を出す', async ({ page }) => {
  const res = await page.goto(WORK);
  expect(res!.status()).toBe(200);
  const main = page.locator('main');
  for (const name of ['表紙', '締め', '完成動画', '字幕']) {
    await expect(main.getByRole('heading', { name: new RegExp(`^${name}`), level: 4 }).first()).toBeVisible();
  }
  await expect(main.getByRole('heading', { name: '承認', level: 3 }).first()).toBeVisible();
  await expect(main.getByRole('heading', { name: /^次のコマンド/, level: 3 }).first()).toBeVisible();
});

test('作品の詳細は承認・QA の日時を UTC の ISO のまま出さない（JST の「YYYY-MM-DD HH:MM」）', async ({ page }) => {
  await page.goto(WORK);
  expect(await page.locator('main').innerText()).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
});

test('作品の詳細は form・書き込みボタンを持たず、Drive のパスを出さない', async ({ page }) => {
  const res = await page.goto(WORK);
  assertNoLeak(await res!.text());
  await assertReadOnly(page, false);
  // ボタンは CopyButton だけ
  const buttons = (await page.locator('main').getByRole('button').allInnerTexts())
    .map((t) => t.trim())
    .filter((t) => t !== '' && !/Toggle Sidebar/i.test(t));
  for (const t of buttons) expect(COPY_LABELS).toContain(t);
});

/** 詳細画面から、先頭が prefix の素材ファイル名を持つ src を集める。 */
async function srcsOf(page: Page, selector: string, filePrefix: string): Promise<string[]> {
  const all = await page.locator(selector).evaluateAll((els) => els.map((e) => e.getAttribute('src') ?? ''));
  return all.filter((s) => /^\/media\/(vault|cmedia)\//.test(s) && (s.split('/').pop() ?? '').startsWith(filePrefix));
}

test('実素材: 表紙の src は 200・image/png で配信される', async ({ page }) => {
  await page.goto(WORK);
  const srcs = await srcsOf(page, 'main img', 'cover.');
  test.skip(srcs.length === 0, '表紙が手元（.tmp/media）にも Drive にも無い（要復元の表示になっている）ため配信を確かめられない');
  const res = await page.request.get(srcs[0]!);
  if (res.status() === 409) test.skip(true, '表紙が Drive 上のみで手元に未復元（409）。npm run media -- pull で復元すると確かめられる');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('image/png');
});

/** 実素材の動画に対する配信（素材が無い環境では skip を許す。固定素材での検査は下の「固定素材の配信」が必ず走る） */
test('実素材: 完成動画の src は Range で 206、HEAD で 200 と Accept-Ranges を返し、範囲外は 416', async ({ page }) => {
  await page.goto(WORK);
  const srcs = await srcsOf(page, 'main video', 'video.');
  test.skip(srcs.length === 0, '完成動画が手元（.tmp/media）にも Drive にも無い（要復元の表示になっている）ため実素材の配信を確かめられない');
  const src = srcs[0]!;

  const head = await page.request.head(src);
  if (head.status() === 409) test.skip(true, '完成動画が Drive 上のみで手元に未復元（409）。npm run media -- pull で復元すると確かめられる');
  expect(head.status()).toBe(200);
  expect(head.headers()['accept-ranges']).toBe('bytes');
  const size = Number(head.headers()['content-length']);
  expect(size).toBeGreaterThan(1024);

  const part = await page.request.get(src, { headers: { Range: 'bytes=0-1023' } });
  expect(part.status()).toBe(206);
  expect(part.headers()['content-range']).toBe(`bytes 0-1023/${size}`);
  expect((await part.body()).length).toBe(1024);

  const over = await page.request.get(src, { headers: { Range: 'bytes=999999999999-' } });
  expect(over.status()).toBe(416);
  expect(over.headers()['content-range']).toBe(`bytes */${size}`);
});

test.describe('固定素材の配信（/media/cmedia）', () => {
  // cmedia は台帳に無いファイルも配信する。projects が並列に走るので、置き場は project ごとに分ける（afterAll の削除が他方を巻き込まない）
  const BYTES = Buffer.from(Array.from({ length: 4096 }, (_, i) => (i * 7 + 3) % 256));
  const SHA8 = createHash('sha256').update(BYTES).digest('hex').slice(0, 8);
  let dir = '';
  let url = '';

  test.beforeAll(() => {
    const tag = test.info().project.name;
    dir = join(process.cwd(), '.tmp', 'media', '_e2e', tag, 'youtube.longform');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `video.${SHA8}.mp4`), BYTES);
    url = `/media/cmedia/_e2e/${tag}/youtube.longform/video.${SHA8}.mp4`;
  });

  test.afterAll(() => {
    rmSync(join(process.cwd(), '.tmp', 'media', '_e2e', test.info().project.name), { recursive: true, force: true });
    try { rmdirSync(join(process.cwd(), '.tmp', 'media', '_e2e')); } catch { /* 他方の project が使用中 */ }
  });

  test('GET は 200・video/mp4・全バイト', async ({ request }) => {
    const res = await request.get(url);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toBe('video/mp4');
    expect(res.headers()['accept-ranges']).toBe('bytes');
    expect(Buffer.compare(await res.body(), BYTES)).toBe(0);
  });

  test('Range は 206 と Content-Range で、その範囲のバイトだけ返す', async ({ request }) => {
    const res = await request.get(url, { headers: { Range: 'bytes=100-199' } });
    expect(res.status()).toBe(206);
    expect(res.headers()['content-range']).toBe(`bytes 100-199/${BYTES.length}`);
    expect(Buffer.compare(await res.body(), BYTES.subarray(100, 200))).toBe(0);
    const tail = await request.get(url, { headers: { Range: 'bytes=-16' } });
    expect(tail.status()).toBe(206);
    expect(Buffer.compare(await tail.body(), BYTES.subarray(BYTES.length - 16))).toBe(0);
  });

  test('HEAD は 200 と Content-Length・Accept-Ranges で、本文は無い', async ({ request }) => {
    const res = await request.head(url);
    expect(res.status()).toBe(200);
    expect(res.headers()['accept-ranges']).toBe('bytes');
    expect(res.headers()['content-length']).toBe(String(BYTES.length));
    expect((await res.body()).length).toBe(0);
  });

  test('範囲外の Range は 416 と Content-Range: bytes */size', async ({ request }) => {
    const res = await request.get(url, { headers: { Range: `bytes=${BYTES.length}-` } });
    expect(res.status()).toBe(416);
    expect(res.headers()['content-range']).toBe(`bytes */${BYTES.length}`);
  });

  test('許可外の拡張子・.. は 403、素材が無ければ 404', async ({ request }) => {
    expect((await request.get(url.replace(/\.mp4$/, '.exe'))).status()).toBe(403);
    expect((await request.get(url.replace('/_e2e/', '/_e2e/..%2F'))).status()).toBe(403);
    expect((await request.get(url.replace(/video\.[0-9a-f]{8}/, 'video.00000000'))).status()).toBe(404);
  });
});

test('/media は .. と許可されない root を 403 で拒む', async ({ request }) => {
  for (const url of [
    '/media/vault/..%2F..%2Fetc%2Fpasswd',
    '/media/cmedia/..%2F..%2Fetc%2Fpasswd',
    '/media/cmedia/civil-construction-2/..%2F..%2F..%2Fpackage.json',
    '/media/notaroot/civil-construction-2/x.png',
    '/media/etc/passwd',
  ]) {
    const res = await request.get(url);
    expect(res.status(), url).toBe(403);
  }
});

test('詳細画面は不正な % を含む URL でも 500 にならず 404 を返す（params はデコード済みで二重に decode しない）', async ({ request }) => {
  const res = await request.get('/content/items/civil-construction-2/100%25-not-a-work');
  expect(res.status()).toBe(404);
});
