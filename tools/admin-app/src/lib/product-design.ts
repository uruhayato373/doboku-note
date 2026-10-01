import { readFileSync } from 'node:fs';

import { loadLineupView, type LineupItem } from './lineup';
import { magazines } from './content';
import { repoPath } from './repo-root';

/**
 * product-design.ts — 管理画面「商品設計」（/product/design）の表示モデル（read-only）。
 *
 * 資格 × 試験区分ごとに、note 商品を「パック・マガジン・単品」の層に並べる。層は手で書かず、
 * note の実際の収録（.claude/state/note/magazines-snapshot.json・verify-note-magazines --contents --json が書く）から決める:
 *   - パック  … 同じ区分の別のマガジンの収録を丸ごと含む有料マガジン
 *   - マガジン … それ以外の有料マガジン
 *   - 単品    … マガジンに収録された有料記事と、単品の商品（note-magazines.ts の noteUrl が /n/）
 * 資格・区分の割り当ては商品ラインナップと同じ product-lineup.json。価格・題名は note-magazines.ts を読むだけで書き換えない。
 * 収録を読めなかったときは 0 件ではなく sourceErrors に出す（CLAUDE.md §9）。
 */

export type Tier = 'pack' | 'magazine';

export interface DesignMagazine {
  id: string;
  key: string | null;
  title: string;
  url: string | null;
  price: number | null;
  stage: string;
  stageLabel: string;
  tier: Tier;
  /** note 上の収録本数（有料記事のみ）。収録を読めない・未作成は null */
  count: number | null;
  /** パック: 丸ごと含むマガジン／マガジン: 自分を丸ごと含むパック */
  contains: Ref[];
  inPacks: Ref[];
}

/** 他の商品への参照（表示名は資格名を外した短い名前） */
export interface Ref {
  id: string;
  label: string;
}

export interface DesignSingle {
  key: string;
  title: string;
  price: number | null;
  url: string;
  inMagazines: Ref[];
  inPacks: Ref[];
}

export interface DesignStage {
  stageId: string;
  stageLabel: string;
  packs: DesignMagazine[];
  magazines: DesignMagazine[];
  singles: DesignSingle[];
  /** 単品のうち、どのマガジン（パックを除く）にも入っていないもの */
  noMagazine: number;
}

export interface DesignView {
  qualifications: { id: string; label: string }[];
  qualificationId: string | null;
  qualificationLabel: string | null;
  stages: DesignStage[];
  snapshotAt: string | null;
  sourceErrors: string[];
}

interface Snapshot {
  fetchedAt?: string;
  magazines: { key: string; name: string; price: number; notes?: { key: string; name: string; price: number }[] }[];
}

function readSnapshot(errors: string[]): Snapshot | null {
  try {
    return JSON.parse(readFileSync(repoPath('.claude', 'state', 'note', 'magazines-snapshot.json'), 'utf8')) as Snapshot;
  } catch (e) {
    errors.push(`note の収録（magazines-snapshot.json）を読めない: ${(e as Error).message}`);
    return null;
  }
}

/** 含む・含まれる欄に出す短い名前（先頭の資格名「2級土木 」などを外す） */
const short = (title: string) => title.replace(/^\S+\s+/, '');

/** a が b を丸ごと含み、b より多い */
const strictlyContains = (a: Set<string>, b: Set<string>) => b.size > 0 && a.size > b.size && [...b].every((k) => a.has(k));

/**
 * 試験区分ごとに別ページ（サイドバーの別の枝）に分ける資格。技術士が一次・部門別に分かれているのに合わせる。
 * 枝の id は「資格:区分」（例 civil-construction-1:first）、表示名は短い資格名＋区分（例「1級土木 第一次検定」）。
 */
const SPLIT_BY_STAGE = new Map([
  ['civil-construction-1', '1級土木'],
  ['civil-construction-2', '2級土木'],
]);

/** 商品を持つ資格（サイドバーの枝） */
export function designQualifications(): { id: string; label: string }[] {
  try {
    const view = loadLineupView();
    const seen = new Map<string, string>();
    for (const r of view.rows) {
      if (!(r.byChannel.note ?? []).some((i) => !i.ended)) continue;
      const prefix = SPLIT_BY_STAGE.get(r.qualificationId);
      if (prefix) seen.set(`${r.qualificationId}:${r.stageId}`, `${prefix} ${r.stageLabel}`);
      else seen.set(r.qualificationId, r.qualificationLabel);
    }
    return [...seen.entries()].map(([id, label]) => ({ id, label }));
  } catch {
    return [];
  }
}

export function loadDesignView(q: string | null): DesignView {
  const sourceErrors: string[] = [];
  const lineup = loadLineupView();
  for (const e of lineup.sourceErrors) if (e.channel === 'note') sourceErrors.push(`note の商品台帳: ${e.message}`);
  const qualifications = designQualifications();
  const qualificationId = q && qualifications.some((x) => x.id === q) ? q : null;
  const qualificationLabel = qualifications.find((x) => x.id === qualificationId)?.label ?? null;
  if (!qualificationId) return { qualifications, qualificationId, qualificationLabel, stages: [], snapshotAt: null, sourceErrors };

  const snapshot = readSnapshot(sourceErrors);
  const notesByMag = new Map<string, { key: string; name: string; price: number }[]>();
  for (const m of snapshot?.magazines ?? []) notesByMag.set(m.key, (m.notes ?? []).filter((n) => n.price > 0));
  const catalog = new Map(magazines().map((m) => [m.id, m]));

  const stages: DesignStage[] = [];
  const [baseId, onlyStage] = qualificationId.split(':');
  for (const row of lineup.rows.filter((r) => r.qualificationId === baseId && (!onlyStage || r.stageId === onlyStage))) {
    const items = (row.byChannel.note ?? []).filter((i: LineupItem) => !i.ended);
    if (items.length === 0) continue;
    const mags: (DesignMagazine & { set: Set<string> })[] = [];
    const singleSkus: DesignSingle[] = [];
    for (const it of items) {
      const c = catalog.get(it.id);
      const url = c?.noteUrl || null;
      const singleKey = url?.match(/\/n\/(n[0-9a-f]+)/)?.[1];
      if (singleKey) {
        singleSkus.push({ key: singleKey, title: it.title, price: c?.priceNum ?? null, url: url!, inMagazines: [], inPacks: [] });
        continue;
      }
      // note のマガジン（/m/）で価格のあるものだけ。会員プラン・会員特典は層に入れない
      if (!c?.key || !c.priceNum) continue;
      const notes = c.key ? notesByMag.get(c.key) : undefined;
      mags.push({
        id: it.id,
        key: c.key,
        title: c.noteTitle ?? it.title,
        url,
        price: c.priceNum,
        stage: it.stage,
        stageLabel: it.stageLabel,
        tier: 'magazine',
        count: notes ? notes.length : null,
        contains: [],
        inPacks: [],
        set: new Set((notes ?? []).map((n) => n.key)),
      });
    }
    // 含む・含まれるは 1 段ずつ（まるごと → バンク → 各ペルソナ）。間に別のマガジンを挟む関係は出さない
    const within = (a: (typeof mags)[number], b: (typeof mags)[number]) => a !== b && strictlyContains(a.set, b.set);
    for (const a of mags) {
      const inner = mags.filter((b) => within(a, b));
      if (inner.length === 0) continue;
      a.tier = 'pack';
      for (const b of inner) {
        if (inner.some((mid) => within(mid, b))) continue;
        a.contains.push({ id: b.id, label: short(b.title) });
        b.inPacks.push({ id: a.id, label: short(a.title) });
      }
    }

    const singles = new Map<string, DesignSingle>();
    for (const s of singleSkus) singles.set(s.key, s);
    for (const m of mags) {
      for (const n of (m.key && notesByMag.get(m.key)) || []) {
        const s = singles.get(n.key) ?? { key: n.key, title: n.name, price: n.price, url: `https://note.com/dobokunote/n/${n.key}`, inMagazines: [], inPacks: [] };
        (m.tier === 'pack' ? s.inPacks : s.inMagazines).push({ id: m.id, label: short(m.title) });
        singles.set(n.key, s);
      }
    }
    // マガジンに入っていない単品を先に出す
    const list = [...singles.values()].sort(
      (a, b) => Number(a.inMagazines.length > 0) - Number(b.inMagazines.length > 0) || a.title.localeCompare(b.title, 'ja'),
    );
    const strip = ({ set, ...rest }: DesignMagazine & { set: Set<string> }): DesignMagazine => (void set, rest);
    stages.push({
      stageId: row.stageId,
      stageLabel: row.stageLabel,
      packs: mags.filter((m) => m.tier === 'pack').sort((a, b) => (b.count ?? 0) - (a.count ?? 0)).map(strip),
      magazines: mags.filter((m) => m.tier === 'magazine').map(strip),
      singles: list,
      noMagazine: list.filter((s) => s.inMagazines.length === 0).length,
    });
  }
  return { qualifications, qualificationId, qualificationLabel, stages, snapshotAt: snapshot?.fetchedAt ?? null, sourceErrors };
}
