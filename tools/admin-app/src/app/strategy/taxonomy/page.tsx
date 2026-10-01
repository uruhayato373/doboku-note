import Link from 'next/link';
import { numCol, PanelCard, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow } from '@/components/admin';
import { PageHead } from '@/components/ui';
import SectionTabs from '@/components/SectionTabs';
import { domainList, domainOverview } from '@/lib/domains';
import { findRepoRoot } from '@/lib/repo-root';
import { loadDomains } from '../../../../../../scripts/lib/domains.mjs';

export const dynamic = 'force-dynamic';

/**
 * /strategy/taxonomy — 事業の分類（役割 → 領域 → 画面の種類）。正本 config/domains.json を
 * そのまま表示する（写しを持たない）。考え方は docs/strategy/14_領域モデル.md。
 */
export default function TaxonomyPage() {
  const domains = domainList();
  const cfg = loadDomains(findRepoRoot()) as { navKinds?: Record<string, string>; navRules?: string[] };
  const kinds = cfg.navKinds ?? {};
  const roles = [...new Set(domains.map((d) => d.role))];

  return (
    <>
      <PageHead title="事業の分類" />
      <SectionTabs set="policy" current="/strategy/taxonomy" />
      <TableFrame>
        <TableHeader>
          <TableRow>
            <TableHead>役割</TableHead>
            <TableHead>領域</TableHead>
            <TableHead>管理するもの</TableHead>
            <TableHead className={numCol}>タスク</TableHead>
            <TableHead className={numCol}>スキル・エージェント</TableHead>
            <TableHead className={numCol}>文書</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.flatMap((role) =>
            domains
              .filter((d) => d.role === role)
              .map((d, i, arr) => {
                const o = domainOverview(d.id);
                return (
                  <TableRow key={d.id}>
                    {i === 0 && (
                      <TableCell rowSpan={arr.length} className="align-top">
                        <strong>{role}</strong>
                      </TableCell>
                    )}
                    <TableCell>
                      <Link href={`/domains/${d.id}`}>{d.label}</Link>
                    </TableCell>
                    <TableCell className="text-xs whitespace-normal">{d.manages}</TableCell>
                    <TableCell className={numCol}>{o?.cards.length ?? '—'}</TableCell>
                    <TableCell className={numCol}>{o ? o.skills.length + o.agents.length : '—'}</TableCell>
                    <TableCell className={numCol}>{o?.documents.length ?? '—'}</TableCell>
                  </TableRow>
                );
              }),
          )}
        </TableBody>
      </TableFrame>

      <PanelCard title="各領域の画面（種類別）" className="mt-4">
        <TableFrame>
          <TableHeader>
            <TableRow>
              <TableHead>領域</TableHead>
              {Object.entries(kinds).map(([k, v]) => (
                <TableHead key={k} title={v}>{v.split('（')[0]}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {domains.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{d.label}</TableCell>
                {Object.keys(kinds).map((k) => (
                  <TableCell key={k} className="text-xs whitespace-normal">
                    {d.nav
                      .filter((v) => v.kind === k)
                      .map((v) => (
                        <div key={v.href}>
                          <Link href={v.href}>{v.label}</Link>
                        </div>
                      ))}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </TableFrame>
      </PanelCard>

      {cfg.navRules?.length ? (
        <PanelCard title="分け方の規則" className="mt-4">
          <ul className="text-xs">
            {cfg.navRules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </PanelCard>
      ) : null}
    </>
  );
}
