/**
 * a8-scout-core.mjs — A8 scout の判定コア (純関数)。
 *
 * 責務 (ブラウザ非依存・決定的):
 *   - スコア式 (高単価 × 在庫ギャップ)
 *   - blocklist 判定 (NG ジャンル + doboku 廃止カテゴリ = 講座/教材/書籍/添削)
 *   - dedup (既存 creative との重複)
 *   - vertical 解決 (A8 ジャンル/プログラム名 → doboku career 軸)
 *   - 状態機械の遷移検証
 *
 * curated 値 (係数・上限・blocklist・vertical map) は data/a8-curated.json を読む
 * (ハードコードしない)。正典 = .claude/knowledge/reference/a8-affiliate-pipeline.md。
 */

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** curated data をロード (テストは curated を渡して差し替え可)。 */
export function loadCurated() {
  return require(path.resolve(__dirname, "../data/a8-curated.json"));
}

// ---------- blocklist ----------

/** program の名前/ジャンルに blocklist キーワードが含まれるか。 */
export function isBlocked(program, curated) {
  const hay = `${program.name ?? ""} ${program.genre ?? ""} ${program.subGenre ?? ""}`;
  return curated.blocklistKeywords.some((kw) => hay.includes(kw));
}

/**
 * 規約上は問題ないが doboku の読者（土木・建設の有資格者/受験者）と無関係な業種か。
 * blocklist（Red Line＝規約NG・note 有料商品とのカニバリ）とは意味が違うので分けている。
 * 例: 薬剤師の転職エージェントは「転職案件」なので Red Line には触れないが、この読者には無価値。
 */
export function isOffTarget(program, curated) {
  const list = curated.offTargetKeywords || [];
  if (list.length === 0) return false;
  const hay = `${program.name ?? ""} ${program.genre ?? ""} ${program.subGenre ?? ""}`;
  return list.some((kw) => hay.includes(kw));
}

// ---------- vertical 解決 ----------

/**
 * A8 ジャンル/プログラム名 → career vertical。
 * ヒットしたキーワードのうち**最長 (最も具体的) の一致**を採る。
 * これで「施工管理」(civil-career) が「転職」(career) を先取りされない (iteration order 非依存)。
 * ヒットなしは null (=pending-vertical)。
 */
export function resolveVertical(program, curated) {
  const hay = `${program.name ?? ""} ${program.genre ?? ""} ${program.subGenre ?? ""}`;
  let best = null;
  let bestLen = 0;
  for (const [vertical, keywords] of Object.entries(curated.verticalKeywords)) {
    for (const kw of keywords) {
      if (kw.length > bestLen && hay.includes(kw)) {
        best = vertical;
        bestLen = kw.length;
      }
    }
  }
  return best;
}

// ---------- dedup ----------

/**
 * 既存 creative と重複するか。
 * a8mat トークン一致 (同一プログラム) or title 完全一致 で重複とみなす。
 * @param {object} program - { name, a8mat }
 * @param {Array<{title?:string, htmlContent?:string}>} existingAds
 */
export function isDuplicate(program, existingAds) {
  const a8mat = program.a8mat ?? null;
  const name = (program.name ?? "").trim();
  return existingAds.some((ad) => {
    if (a8mat && typeof ad.htmlContent === "string" && ad.htmlContent.includes(`a8mat=${a8mat}`)) {
      return true;
    }
    if (name && typeof ad.title === "string" && ad.title.trim() === name) return true;
    return false;
  });
}

// ---------- スコア ----------

/** [0,1] にクランプ。 */
function clamp01(x) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

/**
 * 報酬の正規化値 [0,1]。定額 (円) と定率 (%) の両対応。
 * @param {{ rewardType?: "fixed"|"rate", rewardYen?: number, rewardRatePct?: number }} program
 */
export function rewardNorm(program, curated) {
  const { rewardCapYen, rewardRateCapPct } = curated.scoreNorm;
  if (program.rewardType === "rate" && Number.isFinite(program.rewardRatePct)) {
    return clamp01(program.rewardRatePct / rewardRateCapPct);
  }
  if (Number.isFinite(program.rewardYen)) {
    return clamp01(program.rewardYen / rewardCapYen);
  }
  return 0;
}

/** gap ボーナス: inventory の coverage を見て vertical の希少度で加点。 */
export function gapBonus(vertical, coverage, curated) {
  const b = curated.scoreNorm.gapBonus;
  if (!vertical) return b.other;
  const gap = coverage?.gapVerticals ?? [];
  const thin = coverage?.thinVerticals ?? [];
  if (gap.includes(vertical)) return b.gap;
  if (thin.includes(vertical)) return b.thin;
  return b.other;
}

/**
 * プログラムのスコア [0,1]。
 * score = w.reward·rewardNorm + w.epc·epcNorm + w.confirm·confirmNorm + w.gap·gapBonus
 * @param {object} program - { rewardType, rewardYen, rewardRatePct, epcYen, confirmRatePct }
 * @param {string|null} vertical
 * @param {object} coverage - inventory-latest.json の coverage
 */
export function scoreProgram(program, vertical, coverage, curated) {
  const w = curated.scoreWeights;
  const { epcCapYen } = curated.scoreNorm;
  const rNorm = rewardNorm(program, curated);
  const eNorm = clamp01((program.epcYen ?? 0) / epcCapYen);
  const cNorm = clamp01((program.confirmRatePct ?? 0) / 100);
  const gNorm = gapBonus(vertical, coverage, curated);
  return (
    w.reward * rNorm + w.epc * eNorm + w.confirm * cNorm + w.gap * gNorm
  );
}

/**
 * 生プログラム配列 → scored candidate 配列 (score 降順)。
 * blocked / duplicate は理由付きで除外リストに分ける。
 * @returns {{ candidates: object[], blocked: object[], duplicates: object[] }}
 */
export function scoreAndRank(programs, { coverage, existingAds, curated }) {
  const candidates = [];
  const blocked = [];
  const duplicates = [];
  // 閾値未満も**捨てずに返す**。以前は continue で黙って消えており、呼び出し側の
  // 「candidate 0 件 (blocked 0 / dup 0)」が「該当なし」に見えていた（実際はヒットしていた）。
  // 判断材料（何がいくつで、スコアはいくらだったか）を人に見せるための第4バケット。
  const belowThreshold = [];
  // vertical を doboku の 3 軸（civil-career / pe-career / career）に写像できないものは
  // candidate にしない。状態機械には pending-vertical という分岐が定義されているのに
  // 実際には未解決のまま candidate 化されており、IT フリーランスや薬剤師の案件が
  // 建設サイトの候補として並んでいた（2026-07-27 の scout 実行で発覚）。
  const pendingVertical = [];
  // 規約NGではないが読者と無関係な業種（薬剤師・看護・介護 等）。blocklist と分けて数える。
  const offTarget = [];
  for (const p of programs) {
    if (isBlocked(p, curated)) {
      blocked.push({ ...p, reason: "blocklist" });
      continue;
    }
    if (isDuplicate(p, existingAds)) {
      duplicates.push({ ...p, reason: "duplicate" });
      continue;
    }
    if (isOffTarget(p, curated)) {
      offTarget.push({ ...p, reason: "off-target-industry" });
      continue;
    }
    const vertical = resolveVertical(p, curated);
    const score = scoreProgram(p, vertical, coverage, curated);
    if (!vertical) {
      pendingVertical.push({ ...p, vertical: null, score, reason: "pending-vertical" });
      continue;
    }
    if (score < curated.minScore) {
      belowThreshold.push({ ...p, vertical, score, reason: "below-min-score" });
      continue;
    }
    candidates.push({ ...p, vertical, score });
  }
  candidates.sort((a, b) => b.score - a.score);
  belowThreshold.sort((a, b) => b.score - a.score);
  pendingVertical.sort((a, b) => b.score - a.score);
  return { candidates, blocked, duplicates, belowThreshold, pendingVertical, offTarget };
}

// ---------- 状態機械 ----------

/**
 * catalog エントリの状態遷移。
 *   candidate → applied → approved → harvested → registered → published
 * 分岐: blocked / rejected / pending-vertical / error
 */
export const A8_STATES = [
  "candidate",
  "applied",
  "approved",
  "harvested",
  "pending-vertical",
  "registered",
  "published",
  "rejected",
  "blocked",
  "error",
];

const ALLOWED_TRANSITIONS = {
  candidate: ["applied", "blocked", "error"],
  applied: ["approved", "rejected", "error"],
  approved: ["harvested", "error"],
  harvested: ["registered", "pending-vertical", "error"],
  "pending-vertical": ["harvested", "registered", "error"],
  registered: ["published", "error"],
  published: [],
  rejected: [],
  blocked: [],
  // error からは復帰 (再走査) を許す: リトライで元経路の次段へ戻せる
  error: A8_STATES,
};

/** from → to が正当な遷移か。 */
export function canTransition(from, to) {
  if (from == null) return to === "candidate"; // 初期投入
  if (!A8_STATES.includes(to)) return false;
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

/**
 * catalog エントリの状態を遷移させる (不正なら throw)。純関数: 新オブジェクトを返す。
 * @param {object} entry - { status, history?, ... }
 * @param {string} to
 * @param {object} [meta] - { at, error, screenshotPath, ... } を history に残す
 */
export function transition(entry, to, meta = {}) {
  const from = entry?.status ?? null;
  if (!canTransition(from, to)) {
    throw new Error(`invalid transition: ${from} -> ${to}`);
  }
  const history = Array.isArray(entry?.history) ? entry.history : [];
  return {
    ...entry,
    status: to,
    history: [...history, { from, to, ...meta }],
  };
}

/**
 * catalog に candidate を upsert。
 * 既存 programId は status を巻き戻さない (後段 status を尊重)。新規のみ candidate で追加。
 * @param {object} catalog - { entries: { [programId]: entry } }
 * @param {object[]} candidates - scoreAndRank の candidates (programId 必須)
 * @param {object} [meta] - { at }
 */
export function upsertCandidates(catalog, candidates, meta = {}) {
  const entries = { ...(catalog?.entries ?? {}) };
  for (const c of candidates) {
    const id = c.programId;
    if (!id) continue;
    const existing = entries[id];
    if (existing) {
      // score/vertical は最新に更新 (status は保持 = 後段を巻き戻さない)
      entries[id] = { ...existing, score: c.score, vertical: c.vertical ?? existing.vertical };
    } else {
      entries[id] = {
        programId: id,
        name: c.name ?? null,
        genre: c.genre ?? null,
        a8mat: c.a8mat ?? null,
        vertical: c.vertical ?? null,
        score: c.score,
        status: "candidate",
        history: [{ from: null, to: "candidate", ...meta }],
      };
    }
  }
  return { ...(catalog ?? {}), entries };
}

/** 確定 EPC = EPC × 確定率。欠損は 0。 */
export function confirmedEpc(entry) {
  const epc = Number(entry?.epcYen) || 0;
  const cr = Number(entry?.confirmRatePct) || 0;
  return epc * (cr / 100);
}

/**
 * 登録時 priority をバンド式で決定的に算出 (a8-curated の priorityBands)。
 * 確定 EPC が高いほど上位。targetRankingKeys 付与案件は文脈一致で +bonus。
 * @param {object} entry - { epcYen, confirmRatePct, targetRankingKeys? }
 * @param {object} curated
 */
export function computePriority(entry, curated) {
  const ce = confirmedEpc(entry);
  const bands = curated?.priorityBands ?? [{ minConfirmedEpc: 0, priority: 10 }];
  let base = 10;
  for (const b of bands) {
    if (ce >= b.minConfirmedEpc) {
      base = b.priority;
      break;
    }
  }
  const hasTarget = Array.isArray(entry?.targetRankingKeys) && entry.targetRankingKeys.length > 0;
  return base + (hasTarget ? (curated?.priorityTargetBonus ?? 0) : 0);
}

/** program から priority 算出に使う数値メトリクスを取り出す (undefined は落とす)。 */
export function metricFields(p) {
  const out = {};
  for (const k of ["epcYen", "confirmRatePct", "rewardYen", "rewardRatePct", "rewardType"]) {
    if (p[k] !== undefined && p[k] !== null) out[k] = p[k];
  }
  return out;
}

/** 既存エントリに数値メトリクスを欠損補完する (既存値は上書きしない = 手調整を尊重)。 */
function fillMetrics(existing, p) {
  const m = metricFields(p);
  const out = { ...existing };
  for (const [k, v] of Object.entries(m)) {
    if (out[k] === undefined || out[k] === null) out[k] = v;
  }
  return out;
}

/**
 * 既存提携 (A8 で既に提携中 = 承認済み) を catalog に approved で直接取り込む。
 * scout→apply→approve のフローを経ずに承認済みとして登録する正規の入口 (import-partnered / list 用)。
 * 既存エントリは registered/published/approved を巻き戻さず、candidate/applied のみ approved に昇格。
 * EPC/確定率/報酬 (priority 算出に使う) を保存する。既存は欠損補完のみ (手調整を上書きしない)。
 * @param {object} catalog
 * @param {object[]} programs - { programId, name, vertical?, score?, company?, genre?, epcYen?, confirmRatePct?, rewardYen?, rewardRatePct?, rewardType? }
 * @param {object} [meta] - { at, note }
 */
export function upsertApproved(catalog, programs, meta = {}) {
  const entries = { ...(catalog?.entries ?? {}) };
  for (const p of programs) {
    const id = p.programId;
    if (!id) continue;
    const existing = entries[id];
    if (existing) {
      if (existing.status === "candidate" || existing.status === "applied") {
        entries[id] = {
          ...fillMetrics(existing, p),
          status: "approved",
          vertical: p.vertical ?? existing.vertical,
          history: [...(existing.history ?? []), { from: existing.status, to: "approved", ...meta }],
        };
      } else {
        // approved/harvested/registered/published は据え置き (vertical・数値だけ欠損補完)。
        const filled = fillMetrics(existing, p);
        filled.vertical = existing.vertical ?? p.vertical ?? null;
        entries[id] = filled;
      }
    } else {
      entries[id] = {
        programId: id,
        name: p.name ?? null,
        genre: p.genre ?? null,
        company: p.company ?? null,
        vertical: p.vertical ?? null,
        score: p.score ?? null,
        ...metricFields(p),
        status: "approved",
        source: "existing-partnership",
        history: [{ from: null, to: "approved", ...meta }],
      };
    }
  }
  return { ...(catalog ?? {}), entries };
}

/** status ごとの件数を集計 (status モード用)。 */
export function summarize(catalog) {
  const out = {};
  for (const e of Object.values(catalog?.entries ?? {})) {
    out[e.status] = (out[e.status] ?? 0) + 1;
  }
  return out;
}

/** 指定 status のエントリを score 降順で返す (--next 払い出し)。 */
export function entriesByStatus(catalog, status) {
  return Object.values(catalog?.entries ?? {})
    .filter((e) => e.status === status)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}
