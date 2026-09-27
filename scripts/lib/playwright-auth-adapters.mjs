/**
 * auth CLI用のread-only account判定adapter。
 * アカウント値は既存configから読み、authenticatedは期待値を画面で確認できた場合だけ返す。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getServiceEntry } from './playwright-auth-profile.mjs';

function readJson(repoRoot, relativePath) {
  return JSON.parse(readFileSync(join(repoRoot, relativePath), 'utf8'));
}

function baseAdapter(serviceId, options) {
  const entry = getServiceEntry(serviceId, { cwd: options.repoRoot });
  return {
    serviceId,
    loginUrl: entry.loginUrl,
    checkUrl: entry.checkUrl,
    sessionMode: entry.sessionMode,
    supported: true,
    expectedMarkers: [],
    // ログアウトを URL の redirect だけで判定すると取りこぼす。2026-09-07 実測では
    // google（/search-console/about へ退避）・x（x.com/ でパスワード欄）のいずれも redirect パターンに当たらず unknown になっていた。
    expiredPattern: /(?:\/login|\/signin|ServiceLogin|InteractiveLogin|re-authentication)/i,
    // account marker が見つからないときに「ログアウトの証拠」として扱う本文（任意）
    loggedOutMarkers: [],
  };
}

export function loadAuthAdapter(serviceId, options) {
  const repoRoot = options.repoRoot;
  const adapter = baseAdapter(serviceId, options);
  if (serviceId === 'note') {
    return { ...adapter, checkUrl: 'https://note.com/settings/account', expectedMarkers: ['dobokunote'] };
  }
  if (serviceId === 'coconala') {
    const account = readJson(repoRoot, '.claude/config/coconala-account.json');
    return {
      ...adapter,
      checkUrl: 'https://coconala.com/mypage/services_lists',
      expectedMarkers: [account.sellerName].filter(Boolean),
    };
  }
  if (serviceId === 'kdp') {
    const memo = readJson(repoRoot, '.claude/config/kdp-memo.json');
    const accountEmail = memo.defaults?.accountEmail;
    const checkUrl = 'https://kdpreports.amazon.co.jp/dashboard';
    if (!accountEmail) {
      // account config が無くても、ダッシュボード文言そのものを account marker として使う
      // （口座を取り違えないための担保は kdp-report.mjs の LIVE 書籍 fail-closed 側にある）。
      return {
        ...adapter,
        checkUrl,
        expectedMarkers: ['ロイヤリティの見積り'],
        missingAssertReason: null,
        note: '口座スコープは kdp-report.mjs の LIVE 書籍 fail-closed が担保',
      };
    }
    return { ...adapter, checkUrl, expectedMarkers: [accountEmail], missingAssertReason: null };
  }
  if (serviceId === 'x') {
    const account = readJson(repoRoot, '.claude/config/x-account.json');
    return { ...adapter, expectedMarkers: [`@${account.handle}`] };
  }

  if (serviceId === 'instagram') {
    const account = readJson(repoRoot, '.claude/config/ig-account.json');
    // Business Suite のプランナーは本文にハンドル/ページ名を出さない（アカウント表示は img/aria）。
    // ログイン済みならプランナー URL に asset_id=<Doboku-note ページ ID> が付いてリダイレクトされるので、
    // それを account assert にする（2026-09-21 実測: 旧 marker では常に unknown だった）。
    const assetId = account.businessSuite?.assetId;
    return {
      ...adapter,
      checkUrl: account.plannerUrl,
      expectedMarkers: assetId ? [`asset_id=${assetId}`] : [account.handle, account.fbPageName].filter(Boolean),
      loggedOutMarkers: ['ログイン', 'Log in'],
      missingAssertReason: assetId ? null : 'ig-account.json businessSuite.assetId が未設定',
    };
  }
  if (serviceId === 'google') {
    const config = readJson(repoRoot, '.claude/config/google-console-automation.json');
    const property = String(config.gsc?.property ?? '').replace(/^sc-domain:/, '');
    return {
      ...adapter,
      // 最後に開いたプロパティ（共用口座では stats47 など）に飛ぶので、resource_id を明示して doboku-note のプロパティを開く。
      // 2026-09-21: 明示しないと URL にも本文にも property が出ず authenticated なのに unknown になった。
      checkUrl: `${config.gsc?.baseUrl ?? adapter.checkUrl}?resource_id=${encodeURIComponent(config.gsc?.property ?? '')}`,
      expectedMarkers: [property].filter(Boolean),
      // 未ログインの GSC は /login ではなく紹介ページ（/search-console/about）へ退避する。
      expiredPattern: /(?:\/search-console\/about|\/login|\/signin|ServiceLogin|InteractiveLogin)/i,
    };
  }
  if (serviceId === 'a8') {
    const config = readJson(repoRoot, '.claude/config/a8-report-automation.json');
    return {
      ...adapter,
      checkUrl: `${config.a8.baseUrl}${config.a8.homePath}`,
      expectedMarkers: [config.a8.mediaId].filter(Boolean),
    };
  }
  if (serviceId === 'moshimo' || serviceId === 'afb') {
    const root = readJson(repoRoot, '.claude/config/affiliate-asp.json');
    const asp = root.asps?.[serviceId];
    if (serviceId === 'afb') {
      // 2026-09-21: export（同一プロセスで login→state 取得）を成立させるため supported に。
      // 判定は affiliate-asp.json の readyPath/readyMarker（#top_site_select の DOM）。テキスト一致は読み込み途中を通すので使わない。
      // 別プロセスの status は従来どおり信頼できない（sessionPersistsAcrossProcesses:false）が、export は同一プロセスなので可。
      const readyPath = asp?.readyPath ?? '/pa/promolist/?rel=non';
      return {
        ...adapter,
        checkUrl: new URL(readyPath, asp?.baseUrl ?? 'https://www.afi-b.com').href,
        expectedMarkers: ['AFB_READY_MARKER'],
        expiredPattern: new RegExp(asp?.reAuthPattern ?? 'requiredlogin|/login', 'i'),
        domMarkerSelector: asp?.readyMarker ?? '#top_site_select',
      };
    }
    const siteId = asp.sites?.[root.targetSiteName];
    const url = new URL(asp.homePath, asp.baseUrl);
    if (siteId) url.searchParams.set(asp.siteParam, siteId);
    return {
      ...adapter,
      checkUrl: url.href,
      expectedMarkers: [siteId, root.targetSiteName].filter(Boolean),
      forbiddenMarkers: root.forbiddenSiteText ?? [],
      expiredPattern: new RegExp(asp.reAuthPattern, 'i'),
    };
  }
  throw new Error(`AUTH_ADAPTER_UNSUPPORTED: ${serviceId}`);
}

export function classifyAuthSnapshot(adapter, snapshot) {
  if (!adapter.supported) {
    return { status: 'unsupported', reason: adapter.unsupportedReason };
  }
  const url = String(snapshot.url ?? '');
  const haystack = [url, snapshot.title, snapshot.text, snapshot.accountText].filter(Boolean).join('\n');
  // 「セキュリティ検証の実行 / 悪意のあるボットから保護」は X が datacenter IP に出す JS 挑戦ページ（2026-09-21 CI 実測）
  if (/captcha|challenge|bot check|access denied|ブロックされました|安全でないブラウザ|セキュリティ検証|悪意のあるボット|しばらくお待ちください/i.test(haystack)) {
    return { status: 'blocked', reason: 'CAPTCHA・bot判定・アクセス遮断の可能性' };
  }
  if (adapter.expiredPattern?.test(url)) {
    return { status: 'expired', reason: 'login画面へredirect' };
  }
  if (adapter.missingAssertReason || adapter.expectedMarkers.length === 0) {
    return { status: 'unknown', reason: adapter.missingAssertReason ?? 'account assertの期待値が無い' };
  }
  const forbidden = (adapter.forbiddenMarkers ?? []).find((marker) => haystack.includes(marker));
  if (forbidden) {
    return { status: 'unknown', reason: `禁止サイト表示を検出: ${forbidden}` };
  }
  const missing = adapter.expectedMarkers.filter((marker) => !haystack.includes(marker));
  if (missing.length === 0) {
    return { status: 'authenticated', reason: 'account/site/property assert OK' };
  }
  // ここへ来るのは「account marker が見つからなかった」ときだけ。ログイン済みの設定画面には
  // パスワード変更欄があるため（note の /settings/account がまさにそれ）、この判定を
  // marker 確認より前に置くと認証済みを expired と誤判定する。
  if (snapshot.hasPasswordField) {
    return { status: 'expired', reason: 'account markerが無くログインフォーム（パスワード欄）が出ている' };
  }
  const loggedOut = (adapter.loggedOutMarkers ?? []).find((marker) => haystack.includes(marker));
  if (loggedOut) {
    return { status: 'expired', reason: `account markerが無くログアウト表示: ${loggedOut}` };
  }
  return { status: 'unknown', reason: 'login状態またはaccount assertを確認できない' };
}

/**
 * 認証状態の判定を「1回見て断定」しない。`unknown`（＝期待 marker がまだ見つからない）ときだけ
 * 待ち直す。`authenticated` / `expired` / `blocked` / `unsupported` は決着済みなので即返す。
 *
 * 2026-09-07 実測: 1 回 1.5 秒の単発判定だったため、`status --all` が note を `unknown` と
 * 返す一方 `--service note` は 3 回とも `authenticated` になり、同じ profile の判定が
 * 呼び方で割れていた。描画待ちの不足を「認証されていない」と読み替えないための poll。
 *
 * @param {() => Promise<{status: string}>} probe 1 回分の判定
 * @param {{attempts?: number, waitMs?: number, sleep?: (ms: number) => Promise<void>}} [opts]
 */
export async function pollAuthStatus(probe, opts = {}) {
  const attempts = opts.attempts ?? 6;
  const waitMs = opts.waitMs ?? 1500;
  const sleep = opts.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  let result = { status: 'unknown', reason: '判定を1回も実行できていない' };
  for (let i = 0; i < attempts; i += 1) {
    await sleep(waitMs);
    result = await probe();
    if (result.status !== 'unknown') return { ...result, attemptsUsed: i + 1 };
  }
  return { ...result, attemptsUsed: attempts };
}

export async function captureAuthSnapshot(serviceId, page) {
  const base = await page.evaluate(() => ({
    url: location.href,
    title: document.title || '',
    text: (document.body?.innerText || '').slice(0, 20000),
    // ログイン要求の普遍的な証拠。値は読まない（secret を掴まない）。
    hasPasswordField: !!document.querySelector('input[type=password]'),
  }));
  if (serviceId === 'x') {
    base.accountText = await page
      .locator('[data-testid="SideNav_AccountSwitcher_Button"]')
      .first()
      .innerText()
      .catch(() => '');
  }
  if (serviceId === 'afb') {
    // 管理画面固有の DOM（サイト切替ウィジェット）があれば ready。テキストではなく DOM で判定する。
    const present = await page.locator('#top_site_select').count().catch(() => 0);
    if (present > 0) base.accountText = 'AFB_READY_MARKER';
  }
  return base;
}
