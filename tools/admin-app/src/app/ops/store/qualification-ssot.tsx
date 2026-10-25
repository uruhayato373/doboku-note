import { readFileSync } from 'node:fs';

import { DataTable, PanelCard, StatusBadge, type DataTableColumn, type Tone } from '@/components/admin';
import { findRepoRoot, repoPath } from '@/lib/repo-root';
import { auditQualificationSsot, ALLOW_PATH, DERIVED_FILES } from '../../../../../../scripts/lib/qualification-ssot.mjs';
import { loadExamStages } from '../../../../../../scripts/lib/exam-stages.mjs';

/**
 * 資格の正本（qualification-registry.json）の中身と、名前の写しの検査結果。
 * 管理＞設定 で registry を開いたときに型の上へ出す（旧 /ops/ssot「正本の検査」をここへ統合・旧 URL は転送）。
 * 判定は npm run check-qualification-ssot と同じ scripts/lib/qualification-ssot.mjs を呼ぶだけで、ここで判定しない。
 * 正本の変更はファイル＋PR で行い、この画面からは書き換えない（管理画面からの直接編集は DB 再検討の条件・data-storage-decision.md）。
 */

interface Registry {
  portfolioStatuses: Record<string, string>;
  families: Record<string, string>;
  groups?: Record<string, { label: string; shortLabel?: string; badgeLabel?: string; members: string[] }>;
  qualifications: { id: string; label: string; shortLabel?: string; badgeLabel?: string; family: string; portfolio: string }[];
}
interface Audit {
  registry: Registry;
  aliases: string[];
  config: { files: number; violations: { file: string; path: string }[]; allowed: { file: string; path: string; reason: string }[] };
  derived: { files: number; diffs: { file: string; slug: string; current: string; want: string }[] };
  code: { files: number; hits: { file: string; line: number; text: string }[] };
}

const PORTFOLIO_TONE: Record<string, Tone> = { active: 'good', candidate: 'neutral', declined: 'neutral' };
const orName = (v: string | null | undefined, fallback: string) => v ?? <span className="text-muted-foreground">（{fallback}）</span>;

const QUALIFICATION_COLUMNS: DataTableColumn[] = [
  { key: 'order', label: '順', num: true },
  { key: 'label', label: '正式名' },
  { key: 'shortLabel', label: '短い名前' },
  { key: 'badgeLabel', label: 'ごく短い名前' },
  { key: 'id', label: 'id' },
  { key: 'family', label: 'ファミリー' },
  { key: 'portfolio', label: '展開' },
  { key: 'stages', label: '試験区分', wrap: true },
];
const GROUP_COLUMNS: DataTableColumn[] = [
  { key: 'label', label: '正式名' },
  { key: 'shortLabel', label: '短い名前' },
  { key: 'badgeLabel', label: 'ごく短い名前' },
  { key: 'id', label: 'id' },
  { key: 'members', label: '構成', wrap: true },
];
const ALLOW_COLUMNS: DataTableColumn[] = [
  { key: 'file', label: 'ファイル' },
  { key: 'path', label: '場所' },
  { key: 'count', label: '該当', num: true },
  { key: 'reason', label: '理由', wrap: true },
];

function load() {
  const root = findRepoRoot();
  const r = auditQualificationSsot(root) as unknown as Audit;
  const stages = loadExamStages(root) as Map<string, { id: string; label: string }[]>;
  const allowRules = (JSON.parse(readFileSync(repoPath(...ALLOW_PATH.split('/')), 'utf8')).allow ?? []) as { file: string; path: string; reason: string }[];
  return { ...r, stages, allowRules };
}

export function QualificationSsot() {
  let v: ReturnType<typeof load>;
  try {
    v = load();
  } catch (e) {
    return <p className="project-warning-text text-sm">検査を実行できなかった: {(e as Error).message}</p>;
  }
  const reg = v.registry;
  const nameOf = (id: string) => reg.qualifications.find((q) => q.id === id)?.shortLabel ?? reg.qualifications.find((q) => q.id === id)?.label ?? id;
  const fail = v.config.violations.length + v.derived.diffs.length + v.code.hits.length;
  const allowedCount = (file: string, reason: string) => v.config.allowed.filter((a) => a.file === file && a.reason === reason).length;
  const derivedFiles = (DERIVED_FILES as { file: string }[]).map((d) => d.file);

  return (
    <>
      <PanelCard
        title="名前の写しの検査"
        description={`資格の名前・まとまり・並び順はこのファイルだけが持ち、ほかは id で引く。設定 ${v.config.files}・書き込み先 ${v.derived.files}・コード ${v.code.files} ファイルを実検査（npm run check-qualification-ssot と同じ。pre-commit と CI でも止める）`}
      >
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {fail ? <StatusBadge tone="bad">違反 {fail} 件</StatusBadge> : <StatusBadge tone="good">合格</StatusBadge>}
          <span>設定の写し {v.config.violations.length} 件</span>
          <span>書き込み先の食い違い {v.derived.diffs.length} 件</span>
          <span>コードの直書き {v.code.hits.length} 件</span>
          <span>許可した例外 {v.config.allowed.length} 件</span>
        </div>
        {fail > 0 && (
          <ul className="mt-3 text-sm">
            {v.config.violations.map((x) => (
              <li key={`c${x.file}${x.path}`}><code>{x.file}</code> <code>{x.path}</code> — 名前を消して qualification: で指す</li>
            ))}
            {v.derived.diffs.map((d) => (
              <li key={`d${d.file}${d.slug}`}><code>{d.file}</code> {d.slug}: 「{d.current}」→「{d.want}」— <code>npm run sync-qualification-names</code></li>
            ))}
            {v.code.hits.map((h) => (
              <li key={`h${h.file}${h.line}`}><code>{h.file}:{h.line}</code> {h.text}</li>
            ))}
          </ul>
        )}
      </PanelCard>

      <PanelCard title="資格" description="並び順＝この表の順で、商品設計・コンテンツ台帳のメニューも同じ順・同じ短い名前で並ぶ。ごく短い名前はバッジ・カバー・狭い列用。試験区分は exam-formats.json">
        <DataTable
          columns={QUALIFICATION_COLUMNS}
          rows={reg.qualifications.map((q, i) => {
            const stages = (v.stages.get(q.id) ?? []).map((s) => s.label).join('・');
            return {
              id: q.id,
              values: {
                order: i + 1,
                label: q.label,
                shortLabel: q.shortLabel ?? null,
                badgeLabel: q.badgeLabel ?? null,
                id: q.id,
                family: reg.families[q.family] ?? q.family,
                portfolio: q.portfolio,
                stages: stages || null,
              },
              cells: {
                shortLabel: orName(q.shortLabel, '正式名'),
                badgeLabel: orName(q.badgeLabel, '短い名前'),
                id: <code className="text-xs">{q.id}</code>,
                portfolio: <StatusBadge tone={PORTFOLIO_TONE[q.portfolio] ?? 'neutral'} title={reg.portfolioStatuses[q.portfolio] ?? q.portfolio}>{q.portfolio}</StatusBadge>,
              },
            };
          })}
          pageSize={100}
          emptyText="読めなかった"
        />
      </PanelCard>

      <PanelCard title="まとまり（groups）" description={`複数資格をまとめて扱う単位。カバーのトークン・note 導線・サイトのカテゴリは名前を書かず qualification: でこの id を指す。設定の別名キー（${v.aliases.join('・') || 'なし'}）も検査の対象`}>
        <DataTable
          columns={GROUP_COLUMNS}
          rows={Object.entries(reg.groups ?? {}).map(([id, g]) => ({
            id,
            values: { label: g.label, shortLabel: g.shortLabel ?? null, badgeLabel: g.badgeLabel ?? null, id, members: g.members.map(nameOf).join('・') },
            cells: {
              shortLabel: orName(g.shortLabel, '正式名'),
              badgeLabel: orName(g.badgeLabel, '短い名前'),
              id: <code className="text-xs">{id}</code>,
            },
          }))}
          pageSize={100}
          emptyText="なし"
        />
      </PanelCard>

      <PanelCard title="許可した例外" description={`資格名とは別の属性なので残してよい箇所（${ALLOW_PATH}）。コードの誤検出は行に「qualification-ssot: allow 理由」を書く。名前を書き込んで使うファイル（${derivedFiles.join('・')}）は npm run sync-qualification-names が registry から書く`}>
        <DataTable
          columns={ALLOW_COLUMNS}
          rows={v.allowRules.map((a) => ({
            id: `${a.file}${a.path}`,
            values: { file: a.file, path: a.path, count: allowedCount(a.file, a.reason), reason: a.reason },
            cells: { file: <code className="text-xs">{a.file}</code>, path: <code className="text-xs">{a.path}</code> },
          }))}
          pageSize={100}
          filter={v.allowRules.length > 30 ? 'ファイル・場所・理由で絞り込む' : undefined}
          emptyText="なし"
        />
      </PanelCard>
    </>
  );
}
