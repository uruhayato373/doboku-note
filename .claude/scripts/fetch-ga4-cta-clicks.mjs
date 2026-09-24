/**
 * GA4 から収益 CTA クリック（note 有料マガジン / アフィリエイト）をページ別に取得する。
 *
 * AnalyticsProvider のデリゲートリスナー／visible impression observer が発火するイベントを集計する:
 *   - note_cta_click       (event_category: note-magazine)
 *   - note_cta_impression  (event_category: note-magazine)
 *   - affiliate_cta_click  (event_category: affiliate)
 *   - affiliate_cta_impression (event_category: affiliate)
 *   - coconala_cta_impression  (event_category: coconala)
 *
 * GA4 はイベントに pagePath を自動付与するため、カスタムディメンション登録なしで
 * 「eventName × pagePath」の 2 ディメンションレポートが取れる。これが
 * report-monetization-coverage.mts の CTR 分子になる。
 *
 * 使い方:
 *   npm run fetch-ga4-cta-clicks                 # 過去28日（既定・eventName × pagePath）
 *   npm run fetch-ga4-cta-clicks -- --days 7     # 過去7日
 *   npm run fetch-ga4-cta-clicks -- --by-device  # eventName × deviceCategory（モバイル vs PC の CTA クリック）
 *                                                #   → ga4-cta-clicks-by-device-*.json（既定の page 別とは別ファイル・downstream 非破壊）
 *   npm run fetch-ga4-cta-clicks -- --by-label   # eventName × event_label（プログラム/面別＝BuildJob-sidebar 等）
 *                                                #   → ga4-cta-clicks-by-label-*.json。要 GA4 カスタムディメンション
 *                                                #     （イベントスコープ・パラメータ event_label）を先に管理画面で登録。
 *                                                #     未登録なら API がエラー→登録手順を表示して exit 0（CI 非破壊）。
 *   npm run fetch-ga4-cta-clicks -- --key-events # pagePath × sessions / keyEvents / sessionKeyEventRate（標準指標）
 *                                                #   → ga4-key-events-by-page-*.json。イベント名では絞らない（キーイベント定義は
 *                                                #     GA4 側＝ga4-admin-desired-state.json）。0 行はサイト全体 0 セッションで異常のため exit 1。
 *
 * 認証は fetch-ga4-data.mjs と同じサービスアカウント鍵（.env.local）。
 * 計測は本番（NODE_ENV=production）でのみ発火するため、デプロイ後に
 * ユーザークリックが蓄積してから値が入る（導入直後は 0 件が正常）。
 */
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";
import { resolveWindow } from "./lib/ga4-snapshot.mjs";
import { ga4FromEnv, japanFilter, runReportAll, isLimited } from "./lib/ga4-client.mjs";
import {
  buildKeyEventsByPageRequest,
  parseKeyEventsByPageRows,
  summarizeKeyEvents,
} from "./lib/ga4-key-events.mjs";

dotenv.config({ path: ".env.local" });

const OUTPUT_DIR = ".claude/state/metrics/ga4";
const DEFAULT_DAYS = 28;
const EVENT_NAMES = [
  "note_cta_click",
  "note_cta_impression",
  "affiliate_cta_click",
  "affiliate_cta_impression",
  "note_article_click",
  // サイト内回遊（カテゴリ目次・関連記事・次のステップ）。アクセス改善の主要評価指標。
  "internal_nav_click",
  // キャリア hub / 診断ツールで読者が悩みを選んだイベント（2026-08-21 新設）。
  // これが無いと hub→柱 の遷移が測れず Phase 06 の評価が成立しない。
  "career_need_select",
  // 整理ツールの利用から相談準備までを、広告クリックと分けて確認する。
  "career_tool_result",
  "career_checklist_copy",
  "career_checklist_download",
  // ココナラ・Brain への送客と、共通仕様書データのダウンロード（加工受託の入口）。
  // AnalyticsProvider が発火しているのに取得しておらず、週次レビューが 0 件と未取得を区別できなかった。
  "coconala_cta_click",
  "brain_cta_click",
  "standards_data_download",
  // ココナラ CTA の可視 impression（クリック率の分母・2026-09-25 新設）。
  "coconala_cta_impression",
  // 過去問演習の完了（キーイベント）。AnalyticsProvider 外（演習クライアント）から送られる。
  "quiz_complete",
  // 実務記事・共通仕様書の章末「業務経験 → 資格」カード（2026-09-25 新設・EXP-012）。
  // --by-label で立場別（orderer / contractor / qualification-map）、--by-placement で面別に分かれる。
  "qualification_bridge_impression",
  "qualification_bridge_click",
];

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    days: DEFAULT_DAYS,
    japanOnly: true,
    byDevice: false,
    byLabel: false,
    byPlacement: false,
    keyEvents: false,
    // 月次窓（--month YYYY-MM）または任意の絶対日付（--start/--end）。
    // 既定の --days は「前日を終端とする N 日」で月境界と揃わないため、EPC の分子
    // （A8 は月次でしか出ない）と分母を同じ窓で取れない。DN-0062。
    month: null,
    startDate: null,
    endDate: null,
  };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--days":
        opts.days = parseInt(args[++i], 10);
        break;
      case "--month":
        // 例: --month 2026-08 → 2026-08-01 〜 2026-08-31（月末日は自動導出）
        opts.month = args[++i];
        break;
      case "--start":
        opts.startDate = args[++i];
        break;
      case "--end":
        opts.endDate = args[++i];
        break;
      case "--no-japan-only":
        opts.japanOnly = false;
        break;
      case "--by-device":
        // pagePath の代わりに deviceCategory を 2 つ目の dimension にする。
        // モバイル/PC 別の CTA クリックを取り、device 別 sessions（fetch-ga4-data --dimension device）を
        // 分母にしてデバイス別 CTR を出す。downstream（report-monetization-coverage = page 別）は非破壊。
        opts.byDevice = true;
        break;
      case "--by-label":
        // pagePath の代わりに event_label（=data-cta-label＝プログラム/面）を 2 つ目の dimension に。
        // BuildJob-sidebar / KensetsuJobs-sidebar / BuildJob-midtext / ビルドジョブ 等のプログラム×面別
        // クリック内訳を取り、アフィリ EPC 判定（建設JOBs vs BuildJob）の分子にする。別ファイル・非破壊。
        opts.byLabel = true;
        break;
      case "--by-placement":
        // アフィリエイトの可視 impression / click を配置別に取得する。
        // GA4 にイベントスコープの cta_placement カスタムディメンション登録が必要。
        opts.byPlacement = true;
        break;
      case "--key-events":
        // イベント別でなく、ページ別のキーイベント率（sessions / keyEvents / sessionKeyEventRate）を取る。
        opts.keyEvents = true;
        break;
    }
  }
  return opts;
}

async function fetchCtaClicks(client, propertyId, opts) {
  const { startDate, endDate, windowKind } = resolveWindow(opts);

  const andFilters = [
    {
      filter: {
        fieldName: "eventName",
        inListFilter: { values: EVENT_NAMES },
      },
    },
  ];
  if (opts.japanOnly) andFilters.push(japanFilter());

  // event_label は GA4 のイベントスコープ カスタムディメンション（パラメータ event_label）として
  // 管理画面で登録済みの場合のみ customEvent:event_label で取得できる（未登録なら API がエラー）。
  const firstDim = opts.byPlacement
    ? "customEvent:cta_placement"
    : opts.byLabel
    ? "customEvent:event_label"
    : opts.byDevice
      ? "deviceCategory"
      : "pagePath";
  const rowKey = opts.byPlacement
    ? "placement"
    : opts.byLabel
      ? "label"
      : opts.byDevice
        ? "device"
        : "page";
  const request = {
    property: propertyId,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: firstDim }, { name: "eventName" }],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: { andGroup: { expressions: andFilters } },
    orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
  };

  // 全件ページング（旧 limit: 1000 固定は無言で打ち切っていた）
  const report = await runReportAll(client, request);
  const rows = report.rows.map((row) => ({
    [rowKey]: row.dimensionValues?.[0]?.value || "",
    eventName: row.dimensionValues?.[1]?.value || "",
    eventCount: parseInt(row.metricValues?.[0]?.value || "0", 10),
  }));

  return {
    meta: {
      startDate,
      endDate,
      // "month" | "explicit" | "days"。消費側はこれで窓を選ぶ（未設定の既存ファイルは "days" 扱い）。
      windowKind,
      eventNames: EVENT_NAMES,
      japanOnly: opts.japanOnly,
      byDevice: opts.byDevice,
      byLabel: opts.byLabel,
      byPlacement: opts.byPlacement,
      propertyId,
      rowCount: report.rowCount,
      truncated: report.truncated,
    },
    rows,
  };
}

async function fetchKeyEventsByPage(client, propertyId, opts) {
  const { startDate, endDate, windowKind } = resolveWindow(opts);
  const request = buildKeyEventsByPageRequest({
    propertyId,
    startDate,
    endDate,
    japanOnly: opts.japanOnly,
  });
  const report = await runReportAll(client, request);
  const rows = parseKeyEventsByPageRows(report.rows, report.metricHeaders);
  return {
    meta: {
      startDate,
      endDate,
      windowKind,
      mode: "key-events-by-page",
      metrics: request.metrics.map((m) => m.name),
      japanOnly: opts.japanOnly,
      spamExcluded: true,
      propertyId,
      rowCount: report.rowCount,
      truncated: report.truncated,
      limited: isLimited(report.metadata),
    },
    rows,
  };
}

async function mainKeyEvents(client, propertyId, opts, stamp) {
  const data = await fetchKeyEventsByPage(client, propertyId, opts);
  console.log(`\n期間: ${data.meta.startDate} 〜 ${data.meta.endDate}`);
  console.log(`指標: ${data.meta.metrics.join(", ")}（pagePath 別）`);
  if (data.rows.length === 0) {
    // 取得は成功したのに 1 ページも返らない＝サイト全体 0 セッション。流入がある以上あり得ないので
    // 「計測 0」と扱わず、プロパティ ID・フィルタの異常として検査不成立にする（ファイルは書かない）。
    console.error(
      "[fetch-ga4-cta-clicks] key-events: 取得は成功したが 0 行（全ページ 0 セッション）。プロパティ ID・フィルタを確認。出力しない。",
    );
    process.exitCode = 1;
    return;
  }
  const outPath = join(OUTPUT_DIR, `ga4-key-events-by-page-${stamp}.json`);
  writeFileSync(outPath, JSON.stringify(data, null, 2));
  const sum = summarizeKeyEvents(data.rows);
  console.log(
    `件数: ${data.rows.length} / 全 ${data.meta.rowCount}${data.meta.truncated ? "（上限で打ち切り）" : ""}` +
      `${data.meta.limited ? "（しきい値/サンプリングあり）" : ""}`,
  );
  console.log(
    `キーイベントありのページ: ${sum.pagesWithKeyEvents} / ${sum.pages}・keyEvents 合計 ${sum.keyEvents}・sessions 延べ ${sum.sessions}`,
  );
  console.log(`出力: ${outPath}`);
}

async function main() {
  const opts = parseArgs();
  const { client, property: propertyId } = ga4FromEnv();
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  if (opts.keyEvents) {
    await mainKeyEvents(client, propertyId, opts, stamp);
    return;
  }
  const data = await fetchCtaClicks(client, propertyId, opts);

  const variant = opts.byPlacement
    ? "-by-placement"
    : opts.byLabel
      ? "-by-label"
      : opts.byDevice
        ? "-by-device"
        : "";
  const outPath = join(OUTPUT_DIR, `ga4-cta-clicks${variant}-${stamp}.json`);
  writeFileSync(outPath, JSON.stringify(data, null, 2));

  console.log(`\n期間: ${data.meta.startDate} 〜 ${data.meta.endDate}`);
  console.log(`イベント: ${EVENT_NAMES.join(", ")}`);
  console.log(`件数: ${data.rows.length} / 全 ${data.meta.rowCount}${data.meta.truncated ? "（上限で打ち切り）" : ""}`);
  if (data.rows.length === 0) {
    console.log(
      "（0 件。導入直後・未デプロイ・本番クリック未蓄積のいずれかなら正常）",
    );
  } else {
    const total = data.rows.reduce((s, r) => s + r.eventCount, 0);
    const note = data.rows
      .filter((r) => r.eventName === "note_cta_click")
      .reduce((s, r) => s + r.eventCount, 0);
    const noteImpressions = data.rows
      .filter((r) => r.eventName === "note_cta_impression")
      .reduce((s, r) => s + r.eventCount, 0);
    const affiliateImpressions = data.rows
      .filter((r) => r.eventName === "affiliate_cta_impression")
      .reduce((s, r) => s + r.eventCount, 0);
    const coconalaImpressions = data.rows
      .filter((r) => r.eventName === "coconala_cta_impression")
      .reduce((s, r) => s + r.eventCount, 0);
    console.log(
      `合計イベント: ${total}（note click ${note} / note impression ${noteImpressions} / affiliate impression ${affiliateImpressions} / coconala impression ${coconalaImpressions}）`,
    );
  }
  console.log(`出力: ${outPath}`);
}

main().catch((e) => {
  // --by-label はカスタムディメンション未登録だと GA4 が「customEvent:event_label」不明で失敗する。
  // その場合は登録手順を示して exit 0（CI の他 step を止めない・continue-on-error 前提だが明示）。
  const msg = String(e?.message || e);
  // カスタムディメンション未登録の救済は by-label / by-placement だけ。標準指標の --key-events の失敗は exit 1。
  if (!process.argv.includes("--key-events") && /customEvent:(event_label|cta_placement)|not.*valid.*dimension|did not match/i.test(msg)) {
    const parameter = process.argv.includes("--by-placement") ? "cta_placement" : "event_label";
    console.warn(
      `[fetch-ga4-cta-clicks] ${parameter} は GA4 カスタムディメンション未登録のためスキップ。\n` +
        "  GA4 管理画面 → 管理 → データ表示 → カスタム定義 → カスタムディメンション作成:\n" +
        `    範囲=イベント / イベントパラメータ=${parameter} / 表示名=${parameter}\n` +
        "  登録後 最大 48h で反映し、以降の by-label 取得が有効になる（登録前データは遡及不可）。",
    );
    process.exit(0);
  }
  console.error(e);
  process.exit(1);
});
