/**
 * NSM メトリクスリーダー（週次レビュー用）
 *
 * GA4 + GSC + PageSpeed Insights から今週・前週のデータを取得し、週次レビューに
 * 組み込むためのサマリ + 差分を計算する。`/weekly-review` スキル Phase 1 / Agent C から呼ばれる。
 *
 * 参照:
 *   - .claude/skills/management/nsm-experiment/references/definition.md
 *   - scripts/fetch-ga4-data.mjs / scripts/fetch-gsc-data.mjs / scripts/fetch-psi-data.mjs
 *
 * 必要な環境変数 (.env.local):
 *   GOOGLE_SERVICE_ACCOUNT_KEY_PATH
 *   GA4_PROPERTY_ID
 *   PSI_API_KEY                        (任意、指定すれば PSI を取得)
 */

import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { google } from "googleapis";
import { readFileSync, existsSync } from "node:fs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const GSC_SITE_URL = "sc-domain:doboku-note.com";
const GSC_DELAY_DAYS = 3; // GSC data has ~3 day delay
const PSI_TARGET_URL = "https://doboku-note.com/"; // デフォルトは root 1 URL のみ計測

// ── Date helpers ─────────────────────────────────────────────────

function formatDate(d) {
  return d.toISOString().split("T")[0];
}

/**
 * 今週と前週の期間を計算する。
 * - this: 昨日から遡る 7 日間 (GA4 基準)
 * - prev: さらに遡る 7 日間
 * GSC 用には delay を考慮した別範囲も返す。
 */
export function computeWeekRanges() {
  const today = new Date();
  const ga4End = new Date(today);
  ga4End.setDate(ga4End.getDate() - 1);
  const ga4Start = new Date(ga4End);
  ga4Start.setDate(ga4Start.getDate() - 6);
  const ga4PrevEnd = new Date(ga4Start);
  ga4PrevEnd.setDate(ga4PrevEnd.getDate() - 1);
  const ga4PrevStart = new Date(ga4PrevEnd);
  ga4PrevStart.setDate(ga4PrevStart.getDate() - 6);

  const gscEnd = new Date(today);
  gscEnd.setDate(gscEnd.getDate() - GSC_DELAY_DAYS);
  const gscStart = new Date(gscEnd);
  gscStart.setDate(gscStart.getDate() - 6);
  const gscPrevEnd = new Date(gscStart);
  gscPrevEnd.setDate(gscPrevEnd.getDate() - 1);
  const gscPrevStart = new Date(gscPrevEnd);
  gscPrevStart.setDate(gscPrevStart.getDate() - 6);

  return {
    ga4: {
      this: { start: formatDate(ga4Start), end: formatDate(ga4End) },
      prev: { start: formatDate(ga4PrevStart), end: formatDate(ga4PrevEnd) },
    },
    gsc: {
      this: { start: formatDate(gscStart), end: formatDate(gscEnd) },
      prev: { start: formatDate(gscPrevStart), end: formatDate(gscPrevEnd) },
    },
  };
}

// ── Credentials ───────────────────────────────────────────────────

function getCredentials() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  if (!keyPath || !existsSync(keyPath)) {
    throw new Error(
      `GOOGLE_SERVICE_ACCOUNT_KEY_PATH が未設定 or ファイル不在: ${keyPath || "(unset)"}`,
    );
  }
  return JSON.parse(readFileSync(keyPath, "utf-8"));
}

// ── GA4 ───────────────────────────────────────────────────────────

async function fetchGa4Weekly(credentials, ranges, opts = {}) {
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) throw new Error("GA4_PROPERTY_ID 未設定");

  const client = new BetaAnalyticsDataClient({ credentials });

  // bot 流入対策: country=Japan に絞り込めるオプション。
  // .claude/knowledge/reference/measurement-incidents.md 2026-04-26 incident 参照。
  const dimensionFilter = opts.country
    ? {
        filter: {
          fieldName: "country",
          stringFilter: { matchType: "EXACT", value: opts.country },
        },
      }
    : undefined;

  // 期間比較: 2 つの dateRanges を渡すと、行ごとに dateRange ごとの metric が返る
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      { startDate: ranges.this.start, endDate: ranges.this.end, name: "this" },
      { startDate: ranges.prev.start, endDate: ranges.prev.end, name: "prev" },
    ],
    dimensions: [{ name: "sessionDefaultChannelGroup" }],
    metrics: [
      { name: "activeUsers" },
      { name: "sessions" },
      { name: "engagementRate" },
    ],
    ...(dimensionFilter ? { dimensionFilter } : {}),
    limit: 20,
  });

  // dateRanges を 2 つ渡した場合、行ごとに dateRange が区別されて返る
  // 各行に dimensionValues[-1] = 'date_range_0' or 'date_range_1' が自動付与される
  const byChannel = {};
  for (const row of response.rows || []) {
    const channel = row.dimensionValues[0]?.value || "(unknown)";
    // 最後の dimensionValue が dateRange 識別子
    const rangeIdx = row.dimensionValues[row.dimensionValues.length - 1]?.value;
    const bucket =
      rangeIdx === "date_range_0" || rangeIdx === "this" ? "this" : "prev";

    if (!byChannel[channel]) {
      byChannel[channel] = {
        this: { users: 0, sessions: 0, engagementRate: 0 },
        prev: { users: 0, sessions: 0, engagementRate: 0 },
      };
    }
    byChannel[channel][bucket] = {
      users: parseFloat(row.metricValues[0]?.value || "0"),
      sessions: parseFloat(row.metricValues[1]?.value || "0"),
      engagementRate: parseFloat(row.metricValues[2]?.value || "0"),
    };
  }

  // チャネル別集計 + 合計計算
  const channels = Object.entries(byChannel).map(([channel, data]) => ({
    channel,
    thisUsers: data.this.users,
    prevUsers: data.prev.users,
    userDelta: data.this.users - data.prev.users,
    userDeltaPct:
      data.prev.users > 0
        ? ((data.this.users - data.prev.users) / data.prev.users) * 100
        : null,
    thisSessions: data.this.sessions,
    prevSessions: data.prev.sessions,
    thisEngagementRate: data.this.engagementRate,
  }));
  channels.sort((a, b) => b.thisUsers - a.thisUsers);

  const total = channels.reduce(
    (acc, c) => ({
      thisUsers: acc.thisUsers + c.thisUsers,
      prevUsers: acc.prevUsers + c.prevUsers,
      thisSessions: acc.thisSessions + c.thisSessions,
      prevSessions: acc.prevSessions + c.prevSessions,
    }),
    { thisUsers: 0, prevUsers: 0, thisSessions: 0, prevSessions: 0 },
  );
  total.userDelta = total.thisUsers - total.prevUsers;
  total.userDeltaPct =
    total.prevUsers > 0 ? (total.userDelta / total.prevUsers) * 100 : null;

  const organic = channels.find((c) => c.channel === "Organic Search") || null;

  return { channels, total, organic };
}

// SNS 流入の source 集合を UTM SSOT (utm-templates.json) から読む（ハードコードしない）
function getSnsSources() {
  try {
    const cfg = JSON.parse(readFileSync(".claude/config/utm-templates.json", "utf-8"));
    const sources = Object.values(cfg.channels || {})
      .map((c) => c.source)
      .filter(Boolean);
    return [...new Set(sources)];
  } catch {
    return ["x", "instagram", "youtube", "note"];
  }
}

// SNS 流入の source 別 WoW（sessionSource を SNS source 集合＋Japan に絞る）。
// fetchGa4Weekly と同じ 2-dateRange 比較パターン。SNS 流入の週次可視化用。
async function fetchGa4SnsWeekly(credentials, ranges) {
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) throw new Error("GA4_PROPERTY_ID 未設定");

  const client = new BetaAnalyticsDataClient({ credentials });
  const snsSources = getSnsSources();

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      { startDate: ranges.this.start, endDate: ranges.this.end, name: "this" },
      { startDate: ranges.prev.start, endDate: ranges.prev.end, name: "prev" },
    ],
    dimensions: [{ name: "sessionSource" }],
    metrics: [{ name: "activeUsers" }, { name: "sessions" }],
    dimensionFilter: {
      andGroup: {
        expressions: [
          {
            filter: {
              fieldName: "sessionSource",
              inListFilter: { values: snsSources },
            },
          },
          {
            filter: {
              fieldName: "country",
              stringFilter: { matchType: "EXACT", value: "Japan" },
            },
          },
        ],
      },
    },
    limit: 50,
  });

  const bySource = {};
  for (const row of response.rows || []) {
    const source = row.dimensionValues[0]?.value || "(unknown)";
    const rangeIdx = row.dimensionValues[row.dimensionValues.length - 1]?.value;
    const bucket = rangeIdx === "date_range_0" || rangeIdx === "this" ? "this" : "prev";
    if (!bySource[source]) {
      bySource[source] = { this: { users: 0, sessions: 0 }, prev: { users: 0, sessions: 0 } };
    }
    bySource[source][bucket] = {
      users: parseFloat(row.metricValues[0]?.value || "0"),
      sessions: parseFloat(row.metricValues[1]?.value || "0"),
    };
  }

  const sources = Object.entries(bySource).map(([source, data]) => ({
    source,
    thisUsers: data.this.users,
    prevUsers: data.prev.users,
    userDelta: data.this.users - data.prev.users,
    userDeltaPct:
      data.prev.users > 0 ? ((data.this.users - data.prev.users) / data.prev.users) * 100 : null,
    thisSessions: data.this.sessions,
    prevSessions: data.prev.sessions,
  }));
  sources.sort((a, b) => b.thisUsers - a.thisUsers);

  const total = sources.reduce(
    (acc, s) => ({
      thisUsers: acc.thisUsers + s.thisUsers,
      prevUsers: acc.prevUsers + s.prevUsers,
      thisSessions: acc.thisSessions + s.thisSessions,
    }),
    { thisUsers: 0, prevUsers: 0, thisSessions: 0 },
  );
  total.userDelta = total.thisUsers - total.prevUsers;
  total.userDeltaPct = total.prevUsers > 0 ? (total.userDelta / total.prevUsers) * 100 : null;

  return { sources, total, snsSources };
}

// ── GSC ───────────────────────────────────────────────────────────

async function fetchGscAnalytics(auth, siteUrl, startDate, endDate, opts = {}) {
  const searchconsole = google.searchconsole({ version: "v1", auth });
  const res = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: opts.dimensions || [],
      rowLimit: opts.rowLimit || 10,
    },
  });
  return res.data.rows || [];
}

async function fetchGscWeekly(credentials, ranges) {
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });

  const [thisTotal, prevTotal, topQueries] = await Promise.all([
    fetchGscAnalytics(auth, GSC_SITE_URL, ranges.this.start, ranges.this.end),
    fetchGscAnalytics(auth, GSC_SITE_URL, ranges.prev.start, ranges.prev.end),
    fetchGscAnalytics(auth, GSC_SITE_URL, ranges.this.start, ranges.this.end, {
      dimensions: ["query"],
      rowLimit: 10,
    }),
  ]);

  const normalize = (row) =>
    row
      ? {
          clicks: row.clicks || 0,
          impressions: row.impressions || 0,
          ctr: row.ctr || 0,
          position: row.position || 0,
        }
      : { clicks: 0, impressions: 0, ctr: 0, position: 0 };

  const thisData = normalize(thisTotal[0]);
  const prevData = normalize(prevTotal[0]);

  return {
    total: {
      thisClicks: thisData.clicks,
      prevClicks: prevData.clicks,
      clickDelta: thisData.clicks - prevData.clicks,
      clickDeltaPct:
        prevData.clicks > 0
          ? ((thisData.clicks - prevData.clicks) / prevData.clicks) * 100
          : null,
      thisImpressions: thisData.impressions,
      prevImpressions: prevData.impressions,
      impressionDelta: thisData.impressions - prevData.impressions,
      thisCtr: thisData.ctr,
      prevCtr: prevData.ctr,
      thisPosition: thisData.position,
      prevPosition: prevData.position,
    },
    topQueries: topQueries.map((r) => ({
      query: r.keys[0],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    })),
  };
}

// ── PSI ──────────────────────────────────────────────────────────

async function fetchPsiSummary(targetUrl = PSI_TARGET_URL) {
  if (!process.env.PSI_API_KEY) {
    return { skipped: true, reason: "PSI_API_KEY 未設定" };
  }
  const params = new URLSearchParams({
    url: targetUrl,
    strategy: "mobile",
    key: process.env.PSI_API_KEY,
  });
  ["performance", "accessibility", "best-practices", "seo"].forEach((c) =>
    params.append("category", c),
  );
  const endpoint = `https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`PSI ${res.status}`);
  const data = await res.json();

  const categories = data.lighthouseResult?.categories || {};
  const audits = data.lighthouseResult?.audits || {};
  const pick = (k) =>
    categories[k]?.score != null ? Math.round(categories[k].score * 100) : null;
  const lab = (k) => audits[k]?.numericValue ?? null;

  return {
    url: targetUrl,
    strategy: "mobile",
    scores: {
      performance: pick("performance"),
      accessibility: pick("accessibility"),
      best_practices: pick("best-practices"),
      seo: pick("seo"),
    },
    lab_data: {
      LCP_ms: lab("largest-contentful-paint"),
      TBT_ms: lab("total-blocking-time"),
      CLS: lab("cumulative-layout-shift"),
      FCP_ms: lab("first-contentful-paint"),
      TTI_ms: lab("interactive"),
    },
  };
}

// ── Main entry ────────────────────────────────────────────────────

export async function fetchWeeklyNsmMetrics() {
  const credentials = getCredentials();
  const ranges = computeWeekRanges();

  const [ga4, ga4Jp, sns, gsc, psi] = await Promise.all([
    fetchGa4Weekly(credentials, ranges.ga4).catch((e) => ({
      error: `GA4 取得失敗: ${e.message}`,
    })),
    fetchGa4Weekly(credentials, ranges.ga4, { country: "Japan" }).catch((e) => ({
      error: `GA4 (Japan) 取得失敗: ${e.message}`,
    })),
    fetchGa4SnsWeekly(credentials, ranges.ga4).catch((e) => ({
      error: `GA4 (SNS) 取得失敗: ${e.message}`,
    })),
    fetchGscWeekly(credentials, ranges.gsc).catch((e) => ({
      error: `GSC 取得失敗: ${e.message}`,
    })),
    fetchPsiSummary().catch((e) => ({ error: `PSI 取得失敗: ${e.message}` })),
  ]);

  return {
    generated_at: new Date().toISOString(),
    ranges,
    ga4,
    ga4_jp: ga4Jp,
    sns,
    psi,
    gsc,
    notes: [
      `GSC データは 3 日遅延のため、直近期間は ${ranges.gsc.this.start} 〜 ${ranges.gsc.this.end} を採用`,
      "NSM = Organic Search の activeUsers (definition.md 準拠)",
      "ga4_jp は country=Japan フィルタ版（bot 流入の影響を受けにくい母数）。incident 2026-04-26 を参照",
      "sns は sessionSource を SNS source 集合(utm-templates.json)+Japan に絞った source 別 WoW",
      "PSI は site root 1 URL をモバイル計測（trafficが増えたら field_data も出現）",
    ],
  };
}

// ── Markdown formatter ───────────────────────────────────────────

function fmtDelta(delta, pct) {
  if (delta == null) return "-";
  const sign = delta > 0 ? "+" : "";
  const pctStr = pct != null ? ` (${sign}${pct.toFixed(1)}%)` : "";
  return `${sign}${delta}${pctStr}`;
}

export function formatNsmSection(metrics) {
  const lines = [];
  lines.push("## NSM（オーガニック検索流入）");
  lines.push("");

  // GA4
  if (metrics.ga4.error) {
    lines.push(`⚠️ GA4: ${metrics.ga4.error}`);
  } else {
    const r = metrics.ranges.ga4;
    lines.push(`### GA4 (${r.this.start} 〜 ${r.this.end} vs ${r.prev.start} 〜 ${r.prev.end})`);
    lines.push("");
    lines.push("| 指標 | 今週 | 前週 | 増減 |");
    lines.push("|---|---:|---:|---:|");
    const t = metrics.ga4.total;
    lines.push(
      `| 全体 activeUsers | ${t.thisUsers} | ${t.prevUsers} | ${fmtDelta(t.userDelta, t.userDeltaPct)} |`,
    );
    lines.push(
      `| 全体 sessions | ${t.thisSessions} | ${t.prevSessions} | ${fmtDelta(t.thisSessions - t.prevSessions, t.prevSessions > 0 ? ((t.thisSessions - t.prevSessions) / t.prevSessions) * 100 : null)} |`,
    );
    if (metrics.ga4.organic) {
      const o = metrics.ga4.organic;
      lines.push(
        `| **Organic Search users (★NSM)** | **${o.thisUsers}** | ${o.prevUsers} | ${fmtDelta(o.userDelta, o.userDeltaPct)} |`,
      );
    }
    lines.push("");
    lines.push("#### チャネル別");
    lines.push("| channel | users | prev | delta | engagement |");
    lines.push("|---|---:|---:|---:|---:|");
    for (const c of metrics.ga4.channels) {
      lines.push(
        `| ${c.channel} | ${c.thisUsers} | ${c.prevUsers} | ${fmtDelta(c.userDelta, c.userDeltaPct)} | ${(c.thisEngagementRate * 100).toFixed(1)}% |`,
      );
    }
    lines.push("");
  }

  // GA4 (Japan only) — bot 流入を除いた実ユーザー寄りの母数
  if (metrics.ga4_jp) {
    if (metrics.ga4_jp.error) {
      lines.push(`⚠️ GA4 (Japan): ${metrics.ga4_jp.error}`);
      lines.push("");
    } else {
      lines.push("### GA4 (Japan only / bot 影響を抑えた母数)");
      lines.push("");
      lines.push("| 指標 | 今週 | 前週 | 増減 |");
      lines.push("|---|---:|---:|---:|");
      const t = metrics.ga4_jp.total;
      lines.push(
        `| 全体 activeUsers (JP) | ${t.thisUsers} | ${t.prevUsers} | ${fmtDelta(t.userDelta, t.userDeltaPct)} |`,
      );
      if (metrics.ga4_jp.organic) {
        const o = metrics.ga4_jp.organic;
        lines.push(
          `| **Organic Search users (JP, ★NSM)** | **${o.thisUsers}** | ${o.prevUsers} | ${fmtDelta(o.userDelta, o.userDeltaPct)} |`,
        );
      }
      lines.push("");
    }
  }

  // SNS 流入（source 別 WoW）— weekly-review の SNS フェーズが参照
  if (metrics.sns) {
    if (metrics.sns.error) {
      lines.push(`⚠️ GA4 (SNS): ${metrics.sns.error}`);
      lines.push("");
    } else {
      lines.push("### SNS 流入（source 別 WoW・Japan）");
      lines.push("");
      const st = metrics.sns.total;
      lines.push("| source | users | prev | delta | sessions |");
      lines.push("|---|---:|---:|---:|---:|");
      lines.push(
        `| **合計** | **${st.thisUsers}** | ${st.prevUsers} | ${fmtDelta(st.userDelta, st.userDeltaPct)} | ${st.thisSessions} |`,
      );
      for (const s of metrics.sns.sources) {
        lines.push(
          `| ${s.source} | ${s.thisUsers} | ${s.prevUsers} | ${fmtDelta(s.userDelta, s.userDeltaPct)} | ${s.thisSessions} |`,
        );
      }
      if (metrics.sns.sources.length === 0) {
        lines.push("| (SNS 流入なし) | 0 | 0 | - | 0 |");
      }
      lines.push("");
      lines.push("> 初週は前週データが無いため delta は参考値。SNS の source は utm-templates.json 由来。");
      lines.push("");
    }
  }

  // GSC
  if (metrics.gsc.error) {
    lines.push(`⚠️ GSC: ${metrics.gsc.error}`);
  } else {
    const r = metrics.ranges.gsc;
    lines.push(`### GSC (${r.this.start} 〜 ${r.this.end} vs ${r.prev.start} 〜 ${r.prev.end})`);
    lines.push("");
    lines.push("| 指標 | 今週 | 前週 | 増減 |");
    lines.push("|---|---:|---:|---:|");
    const t = metrics.gsc.total;
    lines.push(`| clicks | ${t.thisClicks} | ${t.prevClicks} | ${fmtDelta(t.clickDelta, t.clickDeltaPct)} |`);
    lines.push(
      `| impressions | ${t.thisImpressions} | ${t.prevImpressions} | ${fmtDelta(t.impressionDelta, t.prevImpressions > 0 ? (t.impressionDelta / t.prevImpressions) * 100 : null)} |`,
    );
    lines.push(
      `| CTR | ${(t.thisCtr * 100).toFixed(2)}% | ${(t.prevCtr * 100).toFixed(2)}% | ${((t.thisCtr - t.prevCtr) * 100).toFixed(2)}pt |`,
    );
    lines.push(
      `| 平均順位 | ${t.thisPosition.toFixed(1)} | ${t.prevPosition.toFixed(1)} | ${(t.thisPosition - t.prevPosition).toFixed(1)} |`,
    );
    lines.push("");

    if (metrics.gsc.topQueries.length > 0) {
      lines.push("#### トップクエリ（今週）");
      lines.push("| # | query | clicks | impr | CTR | pos |");
      lines.push("|---:|---|---:|---:|---:|---:|");
      metrics.gsc.topQueries.forEach((q, i) => {
        lines.push(
          `| ${i + 1} | ${q.query} | ${q.clicks} | ${q.impressions} | ${(q.ctr * 100).toFixed(1)}% | ${q.position.toFixed(1)} |`,
        );
      });
      lines.push("");
    }
  }

  // PSI セクション
  if (metrics.psi) {
    if (metrics.psi.error) {
      lines.push(`⚠️ PSI: ${metrics.psi.error}`);
    } else if (metrics.psi.skipped) {
      lines.push(`_PSI: ${metrics.psi.reason}_`);
    } else {
      lines.push(`### PageSpeed Insights (${metrics.psi.url}, ${metrics.psi.strategy})`);
      lines.push("");
      lines.push("| カテゴリ | スコア |");
      lines.push("|---|---:|");
      const s = metrics.psi.scores;
      lines.push(`| Performance | ${s.performance ?? "N/A"} |`);
      lines.push(`| Accessibility | ${s.accessibility ?? "N/A"} |`);
      lines.push(`| Best Practices | ${s.best_practices ?? "N/A"} |`);
      lines.push(`| SEO | ${s.seo ?? "N/A"} |`);
      lines.push("");
      const lab = metrics.psi.lab_data;
      lines.push("| Core Web Vitals (Lab) | 値 | 判定 |");
      lines.push("|---|---:|---|");
      const lcpVerdict = lab.LCP_ms == null ? "N/A" : lab.LCP_ms <= 2500 ? "✓" : lab.LCP_ms <= 4000 ? "⚠" : "✗";
      const clsVerdict = lab.CLS == null ? "N/A" : lab.CLS <= 0.1 ? "✓" : lab.CLS <= 0.25 ? "⚠" : "✗";
      const tbtVerdict = lab.TBT_ms == null ? "N/A" : lab.TBT_ms <= 200 ? "✓" : lab.TBT_ms <= 600 ? "⚠" : "✗";
      lines.push(`| LCP | ${lab.LCP_ms != null ? Math.round(lab.LCP_ms) + " ms" : "N/A"} | ${lcpVerdict} |`);
      lines.push(`| TBT | ${lab.TBT_ms != null ? Math.round(lab.TBT_ms) + " ms" : "N/A"} | ${tbtVerdict} |`);
      lines.push(`| CLS | ${lab.CLS != null ? lab.CLS.toFixed(3) : "N/A"} | ${clsVerdict} |`);
      lines.push("");
    }
  }

  if (metrics.notes?.length) {
    lines.push("> 備考:");
    for (const n of metrics.notes) lines.push(`> - ${n}`);
    lines.push("");
  }

  return lines.join("\n");
}

// CLI 直接実行時は JSON or markdown を標準出力に
if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv.includes("--json") ? "json" : "markdown";
  const metrics = await fetchWeeklyNsmMetrics();
  if (mode === "json") {
    console.log(JSON.stringify(metrics, null, 2));
  } else {
    console.log(formatNsmSection(metrics));
  }
}
