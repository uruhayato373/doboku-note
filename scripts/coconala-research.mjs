#!/usr/bin/env node
/**
 * coconala-research.mjs — ココナラ競合の市場調査（read-only スクレイパー）
 * ---------------------------------------------------------------------------
 * 目的: doboku-note のココナラ商品展開（価格・セグメント・空白の判断）に使う一次データを、
 *   公開検索ページから実測して `.claude/state/coconala/market-research.json` に永続化する。
 *   WebFetch の要約（概算・LLM 経由）ではなく、DOM から直接取った実数値を SoT にする。
 *
 * スコープの注意（docs/reference/coconala-operations.md §4 と直交）:
 *   運用 SSOT の「スクレイピングしない」は **自社ダッシュボードの KPI 取得**の話（ログイン必須・
 *   規約と bot 検知の懸念）。本スクリプトは **公開・ログイン不要の検索/カテゴリページの read-only 調査**で、
 *   低頻度（数ヶ月に1度の商品設計時）に限る。投稿・出品・購入等の書き込みは一切しない。
 *
 * 技術（この PC で実証済みのイディオムを踏襲）:
 *   - システム Chrome（channel:'chrome'）＝組み込み Chromium は bot 判定されやすい（note-publish.mjs）
 *   - 会社PCプロキシ: proxy.server に HTTPS_PROXY/HTTP_PROXY ＋ ignoreHTTPSErrors（TLS 傍受を越える）
 *   - 読み取り系は headless: true（verify-ig-status.mjs 流儀）
 *   - 礼節: ページ間 2 秒待ち・同時実行なし
 *
 * ページ形式が2種類ある（実測 2026-07-16）:
 *   A. 検索結果   /search?keyword=X            → カード .c-serviceListItem
 *   B. カテゴリ   /categories/{a}/{b}          → カード .c-serviceBlockItem
 *      ※ 「技術士」「土木施工管理技士」等カテゴリ名と完全一致するキーワードは A から B へ 301。
 *        ?page= は保持されるのでページングは共通。B 冒頭の .c-recommendItem は
 *        「おすすめカルーセル」＝カテゴリ本体リストではないので除外する。
 *
 * 中断耐性（2026-07-16・実測で必要性が判明）:
 *   **1ページ取得ごと・詳細1件ごとに market-research.json へ逐次保存**し、出力ファイル自身を
 *   チェックポイントとして扱う。再実行すると既存を読み、`complete: true` のクエリは丸ごとスキップ、
 *   途中のクエリは `pagesScanned` の次ページから再開、`detail` 取得済みの件はスキップする。
 *   → 経緯: 初版は「全クエリ完了後に一括保存」だったため、4クエリ中3クエリ（613件・詳細36件）まで
 *     進んだ実行を中断した際に**全ロス**した。長時間 I/O は必ず逐次永続化する。
 *
 * 使い方:
 *   node scripts/coconala-research.mjs                       # 既定クエリを調査（中断時は自動再開）
 *   node scripts/coconala-research.mjs --query "技術士 添削"   # クエリ指定（複数可）
 *   node scripts/coconala-research.mjs --max-pages 3         # ページ数上限
 *   node scripts/coconala-research.mjs --details 20          # 上位N件は詳細ページも取得
 *   node scripts/coconala-research.mjs --force               # 既存を無視して最初から取り直す
 *   node scripts/coconala-research.mjs --headed              # 目視デバッグ
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, '.claude/state/coconala');
const OUT_PATH = join(OUT_DIR, 'market-research.json');
const SUMMARY_PATH = join(OUT_DIR, 'market-summary.json');
const PROFILE = join(ROOT, '.local/playwright-coconala-profile');
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';

// --- 引数 ---
const argv = process.argv.slice(2);
const getAll = (flag) =>
  argv.reduce((acc, a, i) => (a === flag && argv[i + 1] ? [...acc, argv[i + 1]] : acc), []);
const getOne = (flag, dflt) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const QUERIES = getAll('--query').length
  ? getAll('--query')
  : ['土木施工管理技士', '技術士', '土木施工管理', '経験記述'];
const MAX_PAGES = parseInt(getOne('--max-pages', '10'), 10);
const DETAIL_TOP = parseInt(getOne('--details', '12'), 10);
const HEADED = argv.includes('--headed');
const FORCE = argv.includes('--force');

/**
 * 価格文字列 → 数値（"10,000円" / "2,000 円" → 10000）
 * ★空白を全除去してはいけない: 価格ブロックにセラー名が同居することがあり、
 *   末尾が数字のセラー名（例 "道路プロ0609"）と価格が連結して "06091,000円"→6,091,000 と誤読する（実測で踏んだ）。
 *   改行・スペースは区切りとして残し、数字と「円」の間の空白だけを許容する（totalHits と同じ防御）。
 */
function priceNum(s) {
  if (!s) return null;
  const m = String(s).match(/([\d,]+)[ \t]*円/);
  return m ? parseInt(m[1].replace(/,/g, ''), 10) : null;
}
/** "(58)" → 58 */
function reviewNum(s) {
  if (!s) return null;
  const m = String(s).match(/\(?\s*([\d,]+)\s*\)?/);
  return m ? parseInt(m[1].replace(/,/g, ''), 10) : null;
}
/**
 * "1\n2\n3\n4\n198 件中 1 - 60 件" → 198
 * ★空白を全除去してはいけない: ページ番号(1 2 3 4)と件数が連結し "1234198件" と誤読する（実測で踏んだ）。
 *   改行・スペースは区切りとして残し、数字と「件中」の間の空白だけを許容する。
 */
function totalHits(pagerText) {
  if (!pagerText) return null;
  const m = pagerText.match(/([\d,]+)[ \t]*件中/);
  return m ? parseInt(m[1].replace(/,/g, ''), 10) : null;
}

/**
 * タイトル＋キャッチから商品セグメントを機械分類する。
 * 判定順が意味を持つ（代行 > 添削 > 診断 …）＝「添削・作成代行します」は代行に寄せる。
 */
function classify(title, catch_ = '') {
  const t = `${title} ${catch_}`;
  if (/代行|作成します|書きます|代筆|丸投げ/.test(t)) return 'daiko';       // 作成代行（＝当社は出さない領域）
  if (/添削|校正|赤入れ|レビュー|見ます|チェック/.test(t)) return 'tensaku'; // 添削
  if (/診断|判定|評価します/.test(t)) return 'shindan';                      // 診断
  if (/相談|アドバイス|指導|コーチ|レッスン|教えます|サポート/.test(t)) return 'soudan'; // 相談・指導
  if (/資料|テキスト|教材|問題集|まとめ|ノート|PDF|提供します|お譲り/.test(t)) return 'kyozai'; // 教材・資料
  return 'other';
}

/** 出力ファイル自体がチェックポイント。1ページ／1詳細ごとに呼ぶ（小さい JSON なので全書きで十分） */
function save(result) {
  result.updatedAt = new Date().toISOString();
  writeFileSync(OUT_PATH, JSON.stringify(result, null, 2) + '\n', 'utf-8');
}

/**
 * エージェント参照用の軽量サマリー SSOT を生データ（market-research.json）から導出する。
 * 生 JSON は 700KB 超でエージェントがコンテキストに載せられないため、
 * キーワード別の価格分位・セグメント内訳・レビュー数トップ5 だけに畳む（数KB）。
 * 生データが唯一の入力＝派生物なので、いつでも --summary-only で再生成できる。
 */
function buildSummary(result) {
  const num = (a) => a.filter((x) => typeof x === 'number' && x > 0).sort((p, q) => p - q);
  const stat = (arr) =>
    arr.length
      ? {
          min: arr[0],
          median: arr[Math.floor(arr.length / 2)],
          mean: Math.round(arr.reduce((s, x) => s + x, 0) / arr.length),
          max: arr[arr.length - 1],
        }
      : null;
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    fetchedAt: result.fetchedAt,
    source: '.claude/state/coconala/market-research.json',
    note: 'エージェント参照用の派生 SSOT。生データは source を read。再生成: npm run coconala-research -- --summary-only',
    keywords: (result.queries || []).map((q) => {
      const s = q.services || [];
      const segments = {};
      for (const x of s) segments[x.segment] = (segments[x.segment] || 0) + 1;
      return {
        keyword: q.keyword,
        totalHits: q.totalHits,
        collected: s.length,
        priceYen: stat(num(s.map((x) => x.priceYen))),
        segments,
        topByReviews: [...s]
          .sort((a, b) => (b.reviews || 0) - (a.reviews || 0))
          .slice(0, 5)
          .map((x) => ({
            title: x.title,
            seller: x.seller,
            priceYen: x.priceYen,
            rating: x.rating,
            reviews: x.reviews,
            segment: x.segment,
            url: x.url,
          })),
      };
    }),
  };
}

function writeSummary(result) {
  writeFileSync(SUMMARY_PATH, JSON.stringify(buildSummary(result), null, 2) + '\n', 'utf-8');
}

function loadPrev() {
  if (FORCE || !existsSync(OUT_PATH)) return null;
  try {
    const j = JSON.parse(readFileSync(OUT_PATH, 'utf-8'));
    return Array.isArray(j.queries) ? j : null;
  } catch {
    return null; // 壊れていたら作り直す
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    headless: !HEADED,
    channel: 'chrome',
    proxy: PROXY ? { server: PROXY } : undefined,
    ignoreHTTPSErrors: true,
    viewport: { width: 1366, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled'],
    locale: 'ja-JP',
  });
  const page = ctx.pages()[0] ?? (await ctx.newPage());

  const prev = loadPrev();
  const result = prev ?? {
    version: 1,
    fetchedAt: new Date().toISOString(),
    method: 'playwright(channel:chrome, headless)',
    note: '公開・ログイン不要ページの read-only 調査。運用KPI（ログイン必須）の取得ではない（coconala-operations.md §4 と直交）。',
    queries: [],
  };
  if (prev) console.log(`[coconala-research] 既存を検出 → 再開モード（完了済み ${prev.queries.filter((q) => q.complete).length}/${prev.queries.length} クエリ）`);

  for (const keyword of QUERIES) {
    // --- 再開: 既存クエリを引き継ぐ ---
    let q = result.queries.find((x) => x.keyword === keyword);
    if (q?.complete) {
      console.log(`[coconala-research] ${keyword}: 完了済みのためスキップ（${q.services.length}件）`);
      continue;
    }
    if (!q) {
      q = { keyword, resolvedUrl: null, pageType: null, totalHits: null, pagesScanned: 0, complete: false, services: [] };
      result.queries.push(q);
    }
    const seen = new Set(q.services.map((s) => s.url?.replace('https://coconala.com', '')).filter(Boolean));
    const startPage = (q.pagesScanned ?? 0) + 1;
    if (startPage > 1) console.log(`[coconala-research] ${keyword}: ページ${startPage}から再開（既に${q.services.length}件）`);

    for (let p = startPage; p <= MAX_PAGES; p++) {
      const url = `https://coconala.com/search?keyword=${encodeURIComponent(keyword)}&page=${p}`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      // ★ networkidle を待たない: カードが出た時点で抽出可能（実測で networkidle は最大20秒無駄に待つ）。
      //   検索(.c-serviceListItem) / カテゴリ(.c-serviceBlockItem) のどちらかが出れば良い。
      try {
        await page.waitForSelector('.c-serviceListItem, .c-serviceBlockItem', { timeout: 15000 });
      } catch {
        /* 0件ページや最終ページ超過。下の items.length===0 で break する */
      }

      const scraped = await page.evaluate(() => {
        const txt = (el, sel) => el.querySelector(sel)?.innerText?.trim() ?? null;
        // ページ形式の判定（A=検索結果 / B=カテゴリ）
        const searchCards = [...document.querySelectorAll('.c-serviceListItem')];
        const catCards = [...document.querySelectorAll('.c-serviceBlockItem')];
        const isSearch = searchCards.length > 0;
        const cards = isSearch ? searchCards : catCards;

        const items = cards.map((c) => {
          const href = c.querySelector('a[href*="/services/"]')?.getAttribute('href') ?? null;
          if (isSearch) {
            return {
              title: txt(c, '.c-serviceListItemColContentHeader_overview'),
              catchphrase: txt(c, '.c-serviceListItemColContentHeader_catchphrase'),
              excerpt: txt(c, '.c-serviceListItemColContentHeader_description'),
              seller: txt(c, '.c-serviceListItemColContentFooterInfoUser_name'),
              ratingRaw: txt(c, '.c-serviceListItemColContentFooterPriceRating_score'),
              reviewsRaw: txt(c, '.c-serviceListItemColContentFooterPriceRating_count'),
              priceRaw: txt(c, '.c-serviceListItemColContentFooterPrice_price'),
              href,
            };
          }
          // ★セレクタ精度が重要（実測 2026-07-16）:
          //   _name は「サービス名」であってセラー名ではない（seller に title が入る誤り）。
          //   _price（外側）はセラー名と価格が同居するため、内側の Price_price を使う。
          return {
            title: txt(c, '.c-serviceBlockItemContent_title'),
            catchphrase: null,
            excerpt: null,
            seller: txt(c, '.c-serviceBlockItemContentInfoUser'),
            ratingRaw: txt(c, '.c-serviceBlockItemContentPriceRating_score'),
            reviewsRaw: txt(c, '.c-serviceBlockItemContentPriceRating_count'),
            priceRaw: txt(c, '.c-serviceBlockItemContentPrice_price'),
            href,
          };
        });
        const pager = document.querySelector('.c-searchPage_pagination, [class*="pagination"]')?.innerText ?? null;
        return { items, pager, pageType: isSearch ? 'search' : 'category', url: location.href };
      });

      if (!q.resolvedUrl) {
        q.resolvedUrl = scraped.url;
        q.pageType = scraped.pageType;
        q.totalHits = totalHits(scraped.pager);
      }
      if (scraped.items.length === 0) break;

      for (const it of scraped.items) {
        if (!it.href || seen.has(it.href)) continue;
        seen.add(it.href);
        q.services.push({
          title: it.title,
          catchphrase: it.catchphrase,
          excerpt: it.excerpt,
          seller: it.seller,
          rating: it.ratingRaw ? parseFloat(it.ratingRaw) : null,
          reviews: reviewNum(it.reviewsRaw),
          priceYen: priceNum(it.priceRaw),
          url: `https://coconala.com${it.href}`,
          segment: classify(it.title ?? '', it.catchphrase ?? ''),
          detail: null,
        });
      }
      q.pagesScanned = p;
      save(result); // ★ 1ページごとにチェックポイント（中断しても失わない）

      // 最終ページ判定: 累積がヒット数に達したら終了
      if (q.totalHits && q.services.length >= q.totalHits) break;
      const hasNext = await page.evaluate(() => !!document.querySelector('a.pagination-next'));
      if (!hasNext) break;
      await page.waitForTimeout(1500); // 礼節
    }

    // 詳細ページ（レビュー数の多い順に上位 N 件・未取得のものだけ）
    const top = [...q.services]
      .filter((s) => s.url)
      .sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0))
      .slice(0, DETAIL_TOP);
    const todo = top.filter((s) => s.detail === null);
    if (todo.length < top.length) console.log(`[coconala-research] ${keyword}: 詳細 ${top.length - todo.length}件は取得済みのためスキップ`);
    for (const s of todo) {
      try {
        await page.goto(s.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        // ★ networkidle でなく本文セレクタを待つ（詳細48件×15秒の空待ちが最大の律速だった）
        try {
          await page.waitForSelector('.c-serviceContentsSummary_summary, .c-contentsFreeText_text', { timeout: 10000 });
        } catch {}
        s.detail = await page.evaluate(() => {
          const body = document.body.innerText;
          const grab = (re) => body.match(re)?.[1]?.trim() ?? null;
          // 実測（2026-07-16）: サービス内容の本文は .c-serviceContentsSummary_summary
          //（親 .c-serviceContentsSummary は「サービス内容」見出しを含む）
          const desc =
            document.querySelector('.c-serviceContentsSummary_summary, .c-contentsFreeText_text')?.innerText ??
            document.querySelector('.c-serviceContentsSummary')?.innerText ??
            null;
          return {
            deliveryDays: grab(/お届け日数\s*([^\n]+)/),
            totalSales: grab(/販売実績\s*([^\n]+)/),
            description: desc ? desc.replace(/\n{3,}/g, '\n\n').trim().slice(0, 3000) : null,
            hasOptions: /オプション/.test(body),
          };
        });
      } catch {
        s.detail = { error: 'fetch_failed' };
      }
      save(result); // ★ 詳細1件ごとにチェックポイント
      await page.waitForTimeout(1500); // 礼節
    }

    q.complete = true;
    save(result);
    console.log(
      `[coconala-research] ${keyword}: type=${q.pageType} hits=${q.totalHits ?? '?'} collected=${q.services.length} pages=${q.pagesScanned} details=${top.length} ✓`
    );
  }

  await ctx.close();
  save(result);
  writeSummary(result);
  const total = result.queries.reduce((n, q) => n + q.services.length, 0);
  console.log(`[coconala-research] ✓ ${result.queries.length} クエリ / ${total} サービスを ${OUT_PATH} に保存`);
  console.log(`[coconala-research] ✓ エージェント参照サマリーを ${SUMMARY_PATH} に生成`);
}

/** Playwright を起動せず、既存の生データからサマリー SSOT だけを再生成する */
function summaryOnly() {
  const prev = loadPrev();
  if (!prev) {
    console.error(`[coconala-research] ✗ ${OUT_PATH} が無い／壊れている。先に実測を回してください（--force なしで）`);
    process.exit(1);
  }
  writeSummary(prev);
  console.log(`[coconala-research] ✓ ${SUMMARY_PATH} を生データから再生成（Playwright 不使用）`);
}

if (argv.includes('--summary-only')) {
  summaryOnly();
} else {
  main().catch((e) => {
    console.error('[coconala-research] ✗', e?.message ?? e);
    process.exit(1);
  });
}
