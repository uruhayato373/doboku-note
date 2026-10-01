import { EmptyRow, numCol, PanelCard, StatusBadge, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow, type Tone } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { loadSsotView } from '@/lib/ssot';

export const dynamic = 'force-dynamic';

const PORTFOLIO_TONE: Record<string, Tone> = { active: 'good', candidate: 'neutral', declined: 'neutral' };
const orName = (v: string | null, fallback: string) => v ?? <span className="text-muted-foreground">（{fallback}）</span>;

/**
 * /ops/ssot — 正本の検査（read-only）。資格の正本（qualification-registry.json）の中身と、
 * 名前・並び順の写しの検査結果（npm run check-qualification-ssot と同じ判定）を並べる。
 * 正本の変更はファイル＋PR で行う（この画面からは書き換えない）。
 */
export default function SsotPage() {
  const v = loadSsotView();
  const fail = v.config.violations.length + v.derived.diffs.length + v.code.hits.length;
  const allowedCount = (file: string, reason: string) => v.config.allowed.filter((a) => a.file === file && a.reason === reason).length;

  return (
    <>
      <PageHead
        title="正本の検査"
        sub="資格の名前（正式名・短い名前・ごく短い名前）・まとまり・並び順は qualification-registry.json だけが持ち、ほかの設定・コード・画面は id で引く。ここは正本の中身と、写しが無いかの検査結果（npm run check-qualification-ssot と同じ）を見る画面で、書き換えはファイルと PR で行う"
      />
      <Stack>
        {v.error && <p className="project-warning-text text-sm">検査を実行できなかった: {v.error}</p>}

        <PanelCard
          title="検査結果"
          description={`設定 ${v.config.files}・書き込み先 ${v.derived.files}・コード ${v.code.files} ファイルを実検査。pre-commit と CI（quality-audit）でも同じ検査が止める`}
        >
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {v.error ? <StatusBadge tone="bad">検査不成立</StatusBadge> : fail ? <StatusBadge tone="bad">違反 {fail} 件</StatusBadge> : <StatusBadge tone="good">合格</StatusBadge>}
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

        <PanelCard title="資格の正本" description="qualification-registry.json の中身。並び順＝この表の順で、商品設計・コンテンツ台帳のメニューも同じ順・同じ短い名前で並ぶ。ごく短い名前はバッジ・カバー・狭い列用。試験区分は exam-formats.json">
          <TableFrame>
            <TableHeader>
              <TableRow>
                <TableHead className={numCol}>順</TableHead>
                <TableHead>正式名</TableHead>
                <TableHead>短い名前</TableHead>
                <TableHead>ごく短い名前</TableHead>
                <TableHead>id</TableHead>
                <TableHead>ファミリー</TableHead>
                <TableHead>展開</TableHead>
                <TableHead>試験区分</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {v.qualifications.length === 0 && <EmptyRow colSpan={8}>読めなかった</EmptyRow>}
              {v.qualifications.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className={numCol}>{q.order}</TableCell>
                  <TableCell>{q.label}</TableCell>
                  <TableCell>{orName(q.shortLabel, '正式名')}</TableCell>
                  <TableCell>{orName(q.badgeLabel, '短い名前')}</TableCell>
                  <TableCell><code className="text-xs">{q.id}</code></TableCell>
                  <TableCell>{q.familyLabel}</TableCell>
                  <TableCell><StatusBadge tone={PORTFOLIO_TONE[q.portfolio] ?? 'neutral'} title={q.portfolioLabel}>{q.portfolio}</StatusBadge></TableCell>
                  <TableCell className="whitespace-normal text-sm">{q.stages.join('・') || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TableFrame>
        </PanelCard>

        <PanelCard title="まとまり（groups）" description={`複数資格をまとめて扱う単位。カバーのトークン・note 導線・サイトのカテゴリは名前を書かず qualification: でこの id を指す。設定の別名キー（${v.aliases.join('・') || 'なし'}）も検査の対象`}>
          <TableFrame>
            <TableHeader>
              <TableRow>
                <TableHead>正式名</TableHead>
                <TableHead>短い名前</TableHead>
                <TableHead>ごく短い名前</TableHead>
                <TableHead>id</TableHead>
                <TableHead>構成</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {v.groups.length === 0 && <EmptyRow colSpan={5}>なし</EmptyRow>}
              {v.groups.map((g) => (
                <TableRow key={g.id}>
                  <TableCell>{g.label}</TableCell>
                  <TableCell>{orName(g.shortLabel, '正式名')}</TableCell>
                  <TableCell>{orName(g.badgeLabel, '短い名前')}</TableCell>
                  <TableCell><code className="text-xs">{g.id}</code></TableCell>
                  <TableCell className="whitespace-normal text-sm">{g.members.join('・')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TableFrame>
        </PanelCard>

        <PanelCard title="許可した例外" description={`資格名とは別の属性なので残してよい箇所（${v.allowPath}）。コードの誤検出は行に「qualification-ssot: allow 理由」を書く。名前を書き込んで使うファイル（${v.derivedFiles.join('・')}）は npm run sync-qualification-names が registry から書く`}>
          <TableFrame>
            <TableHeader>
              <TableRow>
                <TableHead>ファイル</TableHead>
                <TableHead>場所</TableHead>
                <TableHead className={numCol}>該当</TableHead>
                <TableHead>理由</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {v.allowRules.length === 0 && <EmptyRow colSpan={4}>なし</EmptyRow>}
              {v.allowRules.map((a) => (
                <TableRow key={`${a.file}${a.path}`} className="align-top">
                  <TableCell><code className="text-xs">{a.file}</code></TableCell>
                  <TableCell><code className="text-xs">{a.path}</code></TableCell>
                  <TableCell className={numCol}>{allowedCount(a.file, a.reason)}</TableCell>
                  <TableCell className="whitespace-normal text-sm">{a.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TableFrame>
        </PanelCard>
      </Stack>
    </>
  );
}
