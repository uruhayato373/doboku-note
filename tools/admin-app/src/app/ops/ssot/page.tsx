import { EmptyRow, numCol, PanelCard, StatusBadge, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow, type Tone } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { loadSsotView } from '@/lib/ssot';

export const dynamic = 'force-dynamic';

const PORTFOLIO_TONE: Record<string, Tone> = { active: 'good', candidate: 'neutral', declined: 'neutral' };

/**
 * /ops/ssot — 正本の検査（read-only）。資格の正本（qualification-registry.json）の中身と、
 * 名前・並び順の写しの検査結果（npm run check-qualification-ssot と同じ判定）を並べる。
 * 正本の変更はファイル＋PR で行う（この画面からは書き換えない）。
 */
export default function SsotPage() {
  const v = loadSsotView();
  const fail = v.config.violations.length + v.code.over.length;
  const debt = Object.values(v.code.counts).reduce((a, b) => a + b, 0);
  const allowedCount = (file: string, path: string) => v.config.allowed.filter((a) => a.file === file && a.reason === v.allowRules.find((r) => r.file === file && r.path === path)?.reason).length;

  return (
    <>
      <PageHead
        title="正本の検査"
        sub="資格の名前・短い名前・並び順は qualification-registry.json だけが持ち、ほかの設定・コード・画面は id で引く。ここは正本の中身と、写しが無いかの検査結果（npm run check-qualification-ssot と同じ）を見る画面で、書き換えはファイルと PR で行う"
      />
      <Stack>
        {v.error && <p className="project-warning-text text-sm">検査を実行できなかった: {v.error}</p>}

        <PanelCard
          title="検査結果"
          description={`設定 ${v.config.files} ファイル・コード ${v.code.files} ファイルを実検査。pre-commit と CI（quality-audit）でも同じ検査が止める`}
        >
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {v.error ? <StatusBadge tone="bad">検査不成立</StatusBadge> : fail ? <StatusBadge tone="bad">違反 {fail} 件</StatusBadge> : <StatusBadge tone="good">合格</StatusBadge>}
            <span>設定の写し {v.config.violations.length} 件</span>
            <span>コードの対応表 {debt} 件（{Object.keys(v.code.counts).length} ファイル・既存の負債。基準を超えると違反）</span>
            <span>許可した例外 {v.config.allowed.length} 件</span>
          </div>
          {v.config.violations.length > 0 && (
            <ul className="mt-3 text-sm">
              {v.config.violations.map((x) => (
                <li key={`${x.file}${x.path}`}>
                  <code>{x.file}</code> <code>{x.path}</code> — 名前を消して id だけにする（名前は registry から引く）
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard title="資格の正本" description="qualification-registry.json の中身。並び順＝この表の順で、商品設計・コンテンツ台帳のメニューも同じ順・同じ短い名前で並ぶ。試験区分は exam-formats.json">
          <TableFrame>
            <TableHeader>
              <TableRow>
                <TableHead className={numCol}>順</TableHead>
                <TableHead>正式名</TableHead>
                <TableHead>短い名前</TableHead>
                <TableHead>id</TableHead>
                <TableHead>ファミリー</TableHead>
                <TableHead>展開</TableHead>
                <TableHead>試験区分</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {v.qualifications.length === 0 && <EmptyRow colSpan={7}>読めなかった</EmptyRow>}
              {v.qualifications.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className={numCol}>{q.order}</TableCell>
                  <TableCell>{q.label}</TableCell>
                  <TableCell>{q.shortLabel ?? <span className="text-muted-foreground">（正式名）</span>}</TableCell>
                  <TableCell><code className="text-xs">{q.id}</code></TableCell>
                  <TableCell>{q.familyLabel}{v.familyShortLabels[q.family] ? <span className="text-muted-foreground">（{v.familyShortLabels[q.family]}）</span> : null}</TableCell>
                  <TableCell><StatusBadge tone={PORTFOLIO_TONE[q.portfolio] ?? 'neutral'} title={q.portfolioLabel}>{q.portfolio}</StatusBadge></TableCell>
                  <TableCell className="whitespace-normal text-sm">{q.stages.join('・') || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TableFrame>
        </PanelCard>

        <PanelCard title="コードに残っている対応表（負債）" description={`資格 id → 日本語名を直書きしている箇所。${v.baselinePath} の件数を超えると止まる。registry から引く形に直したら基準を下げる`}>
          <TableFrame>
            <TableHeader>
              <TableRow>
                <TableHead>ファイル</TableHead>
                <TableHead className={numCol}>件数</TableHead>
                <TableHead className={numCol}>基準</TableHead>
                <TableHead>状態</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.keys(v.code.counts).length === 0 && <EmptyRow colSpan={4}>なし</EmptyRow>}
              {Object.entries(v.code.counts).map(([file, n]) => {
                const over = v.code.over.find((o) => o.file === file);
                const under = v.code.under.find((u) => u.file === file);
                return (
                  <TableRow key={file}>
                    <TableCell><code className="text-xs">{file}</code></TableCell>
                    <TableCell className={numCol}>{n}</TableCell>
                    <TableCell className={numCol}>{over ? over.baseline : under ? under.baseline : n}</TableCell>
                    <TableCell>{over ? <StatusBadge tone="bad">基準超え</StatusBadge> : under ? <StatusBadge tone="info">基準を下げる</StatusBadge> : <StatusBadge tone="warn">返済待ち</StatusBadge>}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </TableFrame>
        </PanelCard>

        <PanelCard title="許可した例外" description={`資格名とは別の属性なので残してよい箇所（${v.allowPath}）`}>
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
                  <TableCell className={numCol}>{allowedCount(a.file, a.path)}</TableCell>
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
