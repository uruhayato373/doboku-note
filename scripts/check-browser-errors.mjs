import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3022';

const pages = [
  '/',
  '/blog',
  '/about',
];

async function checkPage(browser, url) {
  const page = await browser.newPage();

  const errors = [];
  const warnings = [];
  const logs = [];

  // コンソールメッセージをキャッチ
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();

    if (type === 'error') {
      errors.push(text);
    } else if (type === 'warning') {
      warnings.push(text);
    } else if (type === 'log') {
      logs.push(text);
    }
  });

  // ページエラーをキャッチ
  page.on('pageerror', (err) => {
    errors.push(`[Page Error] ${err.message}`);
  });

  // ネットワークエラーをキャッチ
  page.on('requestfailed', (request) => {
    errors.push(`[Request Failed] ${request.url()} - ${request.failure().errorText}`);
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // ページのタイトルを取得
    const title = await page.title();

    // スクリーンショットを保存
    const screenshotPath = path.join(
      process.cwd(),
      '.local',
      'screenshots',
      `${url.replace(/\//g, '-')}.png`
    );

    const screenshotDir = path.dirname(screenshotPath);
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    await page.screenshot({ path: screenshotPath });

    return {
      url,
      title,
      errors,
      warnings,
      logs,
      screenshot: screenshotPath,
      success: true
    };
  } catch (err) {
    return {
      url,
      errors: [err.message],
      warnings,
      logs,
      success: false
    };
  } finally {
    await page.close();
  }
}

async function main() {
  console.log(`\n🔍 ブラウザエラーチェック開始 (${BASE_URL})\n`);

  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const page of pages) {
    const fullUrl = BASE_URL + page;
    console.log(`📄 チェック中: ${fullUrl}`);

    const result = await checkPage(browser, fullUrl);
    results.push(result);

    if (result.success) {
      console.log(`   ✅ タイトル: ${result.title}`);
      if (result.errors.length > 0) {
        console.log(`   ❌ エラー: ${result.errors.length}件`);
        result.errors.forEach(err => console.log(`      - ${err}`));
      }
      if (result.warnings.length > 0) {
        console.log(`   ⚠️  警告: ${result.warnings.length}件`);
        result.warnings.forEach(warn => console.log(`      - ${warn}`));
      }
      console.log(`   📸 スクリーンショット: ${result.screenshot}`);
    } else {
      console.log(`   ❌ 失敗: ${result.errors[0]}`);
    }
    console.log('');
  }

  await browser.close();

  // 結果をJSONで保存
  const reportPath = path.join(process.cwd(), '.local', 'browser-check-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

  console.log(`📊 レポート保存: ${reportPath}\n`);

  // 概要を表示
  const hasErrors = results.some(r => r.errors.length > 0);
  if (hasErrors) {
    console.log('⚠️  エラーが検出されました！');
    process.exit(1);
  } else {
    console.log('✅ エラーは検出されませんでした！');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('❌ 実行エラー:', err);
  process.exit(1);
});
