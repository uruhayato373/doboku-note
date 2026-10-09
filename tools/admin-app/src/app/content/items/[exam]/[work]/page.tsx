import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  PanelCard, StatusBadge, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow, type Tone,
} from '@/components/admin';
import { PageHead } from '@/components/ui';
import CopyButton from '@/components/CopyButton';
import {
  examLabel, fmtJstAt, loadItemWork, loadMediaDetails, type ItemMedia, type ItemPublication, type MediaDetail,
} from '@/lib/content-items';

export const dynamic = 'force-dynamic';

/**
 * /content/items/<exam>/<work> — 作品 1 本と、その公開ごとの素材・文面・承認を 1 画面で見る（read-only）。
 * 素材は「画面が先、音声は後」の順（media-review.mjs の並び）。ボタンはコピーとリンクだけで、書き込みはしない。
 */

const ROLE_LABEL: Record<string, string> = {
  cover: '表紙', cta: '締め', 'preview-metrics': '無音プレビューの数値', preview: '無音プレビュー', video: '完成動画', subtitles: '字幕',
};
const roleLabel = (role: string) => ROLE_LABEL[role] ?? (/^contact-sheet(-\d+)?$/.test(role) ? `コンタクトシート${role.replace('contact-sheet', '') ? ` ${role.split('-').pop()}` : ''}` : role);

const STATUS_TONE: Record<string, Tone> = {
  published: 'good', scheduled: 'info', uploaded_private: 'info', draft: 'neutral', stopped: 'bad',
  qa_passed: 'warn', approved: 'warn', rendered: 'warn',
};
const flagTone = (f: string): Tone => (f === '要復元' ? 'bad' : f === '承認待ち' ? 'info' : 'warn');

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <TableRow>
      <TableHead className="w-40 align-top font-normal text-muted-foreground">{k}</TableHead>
      <TableCell className="whitespace-normal">{v}</TableCell>
    </TableRow>
  );
}

const short = (d: string | null) => (d ? d.slice(0, 12) : '—');
const bytesLabel = (n: number | null) => (n == null ? '' : `${n.toLocaleString('en-US')} B`);

function MissingNote({ examId, workId }: { examId: string; workId: string }) {
  const cmd = `npm run media -- pull --work ${examId}/${workId} --commit`;
  return (
    <span className="flex flex-wrap items-center gap-2">
      <StatusBadge tone="bad">要復元</StatusBadge>
      <code className="text-xs">{cmd}</code>
      <CopyButton text={cmd} label="コマンドをコピー" />
    </span>
  );
}

function MediaBlock({ m, detail, examId, workId }: { m: ItemMedia; detail: MediaDetail; examId: string; workId: string }) {
  const label = roleLabel(m.role);
  const size = m.width && m.height ? `${m.width}×${m.height}` : null;
  const meta = [size, m.durationSec != null ? `${m.durationSec} 秒` : null, bytesLabel(m.bytes) || null, m.availability === 'vault' ? 'Drive から配信' : null]
    .filter(Boolean).join(' · ');
  const isImage = m.role === 'cover' || m.role === 'cta' || /^contact-sheet(-\d+)?$/.test(m.role);

  let body: ReactNode;
  if (m.role === 'preview-metrics') {
    body = detail.metrics ? (
      <>
        {detail.metrics.notes.length ? (
          <ul className="mb-2 list-disc pl-5 text-sm">
            {detail.metrics.notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        ) : null}
        <TableFrame>
          <TableBody>
            {detail.metrics.rows.map((r) => <Row key={r.key} k={r.key} v={r.value} />)}
          </TableBody>
        </TableFrame>
      </>
    ) : m.availability === 'missing' || detail.textMissing ? <MissingNote examId={examId} workId={workId} /> : <span className="text-sm text-muted-foreground">中身を読めない</span>;
  } else if (m.role === 'subtitles') {
    body = detail.subtitles ? (
      <>
        <p className="mb-1 text-sm text-muted-foreground">全 {detail.subtitles.total} 行（先頭 {detail.subtitles.lines.length} 行を表示）</p>
        <TableFrame>
          <TableHeader>
            <TableRow>
              <TableHead>開始</TableHead>
              <TableHead>終了</TableHead>
              <TableHead>本文</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.subtitles.lines.map((l, i) => (
              <TableRow key={i}>
                <TableCell className="whitespace-nowrap tabular-nums">{l.start}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{l.end}</TableCell>
                <TableCell className="whitespace-normal">{l.text}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableFrame>
      </>
    ) : m.availability === 'missing' || detail.textMissing ? <MissingNote examId={examId} workId={workId} /> : <span className="text-sm text-muted-foreground">中身を読めない</span>;
  } else if (!m.src) {
    body = <MissingNote examId={examId} workId={workId} />;
  } else if (isImage) {
    body = (
      <a href={m.src} target="_blank" rel="noopener noreferrer">
        <img src={m.src} alt={label} width={360} loading="lazy" className="max-w-full border" />
      </a>
    );
  } else if (m.role === 'preview') {
    body = <video src={m.src} controls preload="none" muted width={360} className="max-w-full" />;
  } else if (m.role === 'video') {
    body = <video src={m.src} controls preload="none" width={360} className="max-w-full" />;
  } else {
    body = <a href={m.src} target="_blank" rel="noopener noreferrer">開く</a>;
  }

  return (
    <div className="flex flex-col gap-1">
      <h4 className="m-0 text-sm font-semibold">
        {label}
        {meta ? <span className="ml-2 font-normal text-muted-foreground">{meta}</span> : null}
        {m.src && isImage ? <a className="ml-2 text-xs font-normal" href={m.src} target="_blank" rel="noopener noreferrer">原寸</a> : null}
      </h4>
      {body}
    </div>
  );
}

function Publication({ p, detail, examId, workId }: { p: ItemPublication; detail: MediaDetail; examId: string; workId: string }) {
  const copy = p.copy;
  const prov = p.media.filter((m) => m.provenance);
  return (
    <section className="flex flex-col gap-4 border-t pt-4 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="m-0 font-semibold">{p.format}{p.variant ? `・${p.variant}` : ''}</h3>
        <StatusBadge tone={STATUS_TONE[p.status] ?? 'neutral'}>{p.status}</StatusBadge>
        {p.flags.map((x) => <StatusBadge key={x} tone={flagTone(x)}>{x}</StatusBadge>)}
        <code className="text-xs text-muted-foreground">{p.id}</code>
      </div>

      <TableFrame>
        <TableBody>
          <Row k="公開予定（JST）" v={p.publishAtJst ?? '—'} />
          <Row k="アカウント" v={p.account} />
          {p.stopReason ? <Row k="止めた理由" v={p.stopReason} /> : null}
          <Row
            k="外部 ID・URL"
            v={p.platform?.id || p.platform?.url ? (
              <>
                {p.platform.id ? <code>{p.platform.id}</code> : null}
                {p.platform.privacy ? <> <StatusBadge tone="neutral">{p.platform.privacy}</StatusBadge></> : null}
                {p.platform.url ? <> <a href={p.platform.url} target="_blank" rel="noopener noreferrer">開く</a></> : null}
              </>
            ) : '—'}
          />
        </TableBody>
      </TableFrame>

      <div className="flex flex-col gap-4">
        <h3 className="m-0 font-semibold">素材（画面が先、音声は後）</h3>
        {p.media.length === 0 ? <p className="text-sm text-muted-foreground">素材の行がない。</p> : null}
        {p.media.map((m) => <MediaBlock key={m.role} m={m} detail={detail} examId={examId} workId={workId} />)}
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="m-0 font-semibold">文面</h3>
        {copy ? (
          <TableFrame>
            <TableBody>
              {copy.title ? <Row k="タイトル" v={copy.title} /> : null}
              {copy.description ? <Row k="説明" v={<pre className="m-0 whitespace-pre-wrap text-sm">{copy.description}</pre>} /> : null}
              {copy.tags?.length ? <Row k="タグ" v={copy.tags.join(' / ')} /> : null}
              {copy.caption ? <Row k="キャプション" v={<pre className="m-0 whitespace-pre-wrap text-sm">{copy.caption}</pre>} /> : null}
              {copy.text ? <Row k="本文" v={<pre className="m-0 whitespace-pre-wrap text-sm">{copy.text}</pre>} /> : null}
            </TableBody>
          </TableFrame>
        ) : <p className="text-sm text-muted-foreground">文面を読めない。</p>}
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="m-0 font-semibold">承認</h3>
        <TableFrame>
          <TableBody>
            <Row
              k="画面確認"
              v={
                <>
                  <StatusBadge tone={p.approval.visual.valid ? 'good' : 'warn'}>{p.approval.visual.status}</StatusBadge>
                  {p.approval.visual.at ? <> {fmtJstAt(p.approval.visual.at)}</> : null}
                  <div className="text-xs text-muted-foreground">
                    承認した digest <code>{short(p.approval.visual.digest)}</code> / 今の digest <code>{short(p.approval.visual.current)}</code>
                  </div>
                  {p.approval.visual.reason ? <div className="text-sm">無効の理由: {p.approval.visual.reason}</div> : null}
                </>
              }
            />
            <Row
              k="最終承認"
              v={
                <>
                  <StatusBadge tone={p.approval.final.valid ? 'good' : 'warn'}>
                    {p.approval.final.valid ? '有効' : p.approval.final.by ? '無効' : '未承認'}
                  </StatusBadge>
                  {p.approval.final.by ? <> {p.approval.final.by} {fmtJstAt(p.approval.final.at)}</> : null}
                  <div className="text-xs text-muted-foreground">
                    承認した digest <code>{short(p.approval.final.contentSha256)}</code> / 今の digest <code>{short(p.approval.final.current)}</code>
                  </div>
                  {p.approval.final.reason ? <div className="text-sm">無効の理由: {p.approval.final.reason}</div> : null}
                </>
              }
            />
          </TableBody>
        </TableFrame>
      </div>

      {p.commands.length ? (
        <div className="flex flex-col gap-2">
          <h3 className="m-0 font-semibold">次のコマンド（コピーして実行する）</h3>
          {p.commands.map((c) => (
            <div key={c.cmd} className="flex flex-wrap items-center gap-2 text-sm">
              <span>{c.label}</span>
              <code className="text-xs">{c.cmd}</code>
              <CopyButton text={c.cmd} label="コピー" />
            </div>
          ))}
        </div>
      ) : null}

      {prov.length ? (
        <div className="flex flex-col gap-1">
          <h3 className="m-0 font-semibold">来歴</h3>
          <TableFrame>
            <TableHeader>
              <TableRow>
                <TableHead>素材</TableHead>
                <TableHead>kind</TableHead>
                <TableHead>by</TableHead>
                <TableHead>spec</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prov.map((m) => (
                <TableRow key={m.role}>
                  <TableCell>{roleLabel(m.role)}</TableCell>
                  <TableCell>{m.provenance?.kind ?? '—'}</TableCell>
                  <TableCell>{m.provenance?.by ?? '—'}</TableCell>
                  <TableCell className="whitespace-normal break-all text-xs">{m.provenance?.spec ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TableFrame>
        </div>
      ) : null}
    </section>
  );
}

export default async function ItemDetailPage({ params }: { params: Promise<{ exam: string; work: string }> }) {
  // Next の params はデコード済み（二重に decodeURIComponent すると不正な % で 500 になる）
  const { exam, work: workId } = await params;
  const w = loadItemWork(exam, workId);
  if (!w) notFound();
  const details = await loadMediaDetails(w);
  const qa = w.work.qa;

  return (
    <>
      <PageHead title={w.title} />
      <p className="mb-4 flex flex-wrap items-center gap-2">
        <Link href="/content/items">← 作品と公開</Link>
        <StatusBadge tone="neutral">{examLabel(exam)}</StatusBadge>
        <StatusBadge tone="neutral">{w.work.kind}</StatusBadge>
      </p>

      <PanelCard title="作品" className="mb-4">
        <TableFrame>
          <TableBody>
            <Row k="ID" v={<code>{exam}/{w.work.id}</code>} />
            <Row k="kind" v={w.work.kind + (w.work.format ? `・${w.work.format}` : '')} />
            <Row k="definition" v={<code className="break-all text-xs">{w.work.definition}</code>} />
            <Row k="QA" v={qa ? `平均 ${qa.avg ?? '—'} · ブロック ${qa.blocks ?? '—'} · ${fmtJstAt(qa.at)} ${qa.by ?? ''}` : '—'} />
          </TableBody>
        </TableFrame>
      </PanelCard>

      <div className="flex flex-col gap-4">
        {w.channels.map((ch) => (
          <PanelCard key={ch.channel} title={ch.channel} description={`公開 ${ch.publications.length} 件`}>
            <div className="flex flex-col gap-4">
              {ch.publications.map((p) => (
                <Publication key={p.id} p={p} detail={details[p.id] ?? {}} examId={exam} workId={w.work.id} />
              ))}
            </div>
          </PanelCard>
        ))}
      </div>
    </>
  );
}
