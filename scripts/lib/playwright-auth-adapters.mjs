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
    expiredPattern: /(?:\/login|\/signin|ServiceLogin|InteractiveLogin|re-authentication)/i,
  };
}

export function loadAuthAdapter(serviceId, options) {
  const repoRoot = options.repoRoot;
  const adapter = baseAdapter(serviceId, options);
  if (serviceId === 'note') {
    return { ...adapter, checkUrl: 'https://note.com/settings/account', expectedMarkers: ['dobokunote'] };
  }
  if (serviceId === 'brain') {
    const account = readJson(repoRoot, '.claude/config/brain-account.json');
    return { ...adapter, expectedMarkers: [account.sellerName].filter(Boolean) };
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
    return {
      ...adapter,
      expectedMarkers: [memo.defaults?.accountEmail].filter(Boolean),
      missingAssertReason: memo.defaults?.accountEmail ? null : 'kdp-memo.json defaults.accountEmail が未設定',
    };
  }
  if (serviceId === 'x') {
    const account = readJson(repoRoot, '.claude/config/x-account.json');
    return { ...adapter, expectedMarkers: [`@${account.handle}`] };
  }
  if (serviceId === 'instagram') {
    const account = readJson(repoRoot, '.claude/config/ig-account.json');
    return {
      ...adapter,
      checkUrl: account.plannerUrl,
      expectedMarkers: [account.handle, account.fbPageName].filter(Boolean),
    };
  }
  if (serviceId === 'google') {
    const config = readJson(repoRoot, '.claude/config/google-console-automation.json');
    const property = String(config.gsc?.property ?? '').replace(/^sc-domain:/, '');
    return { ...adapter, checkUrl: config.gsc?.baseUrl ?? adapter.checkUrl, expectedMarkers: [property].filter(Boolean) };
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
      return {
        ...adapter,
        supported: false,
        unsupportedReason: 'afbはloginから操作まで同一processで完結する必要があり、別process statusは非対応',
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
  if (/captcha|challenge|bot check|access denied|ブロックされました|安全でないブラウザ/i.test(haystack)) {
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
  return { status: 'unknown', reason: 'login状態またはaccount assertを確認できない' };
}

export async function captureAuthSnapshot(serviceId, page) {
  const base = await page.evaluate(() => ({
    url: location.href,
    title: document.title || '',
    text: (document.body?.innerText || '').slice(0, 20000),
  }));
  if (serviceId === 'x') {
    base.accountText = await page
      .locator('[data-testid="SideNav_AccountSwitcher_Button"]')
      .first()
      .innerText()
      .catch(() => '');
  }
  return base;
}
