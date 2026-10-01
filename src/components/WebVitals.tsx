"use client";

import { useReportWebVitals } from "next/web-vitals";
import { event } from "@/lib/gtag";

// 実ユーザー計測（RUM）: Core Web Vitals（LCP・INP・CLS）を GA4 の web_vitals イベントとして送る。
// CrUX は訪問が少なく供給されないため、自前で実ユーザーの値を取る（集計・判定は scripts/lib/web-vitals-rum.mjs）。
// metric_name / metric_rating は GA4 のイベントスコープのカスタムディメンション（config/ga4-admin-desired-state.json）。
// 送信の可否（本番のみ・pages.dev 除外・gtag 未ロード時は何もしない）は gtag.ts の event が決める。
const SENT = new Set(["LCP", "INP", "CLS"]);

export default function WebVitals() {
  useReportWebVitals((metric) => {
    if (!SENT.has(metric.name)) return;
    event({
      action: "web_vitals",
      category: "web-vitals",
      label: metric.name,
      // GA4 の value は整数。CLS は 1000 倍して送る
      value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
      params: {
        metric_name: metric.name,
        metric_rating: metric.rating,
        metric_id: metric.id,
        non_interaction: true,
      },
    });
  });
  return null;
}
