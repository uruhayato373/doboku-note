'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RecordPanel({ strategy, period, cadence, existingReview, observations }: { strategy: any; period: any; cadence: string; existingReview: any; observations: any[] }) {
  const router = useRouter();
  const [kind, setKind] = useState('measurement'), [metric, setMetric] = useState('notePv'), [qualification, setQualification] = useState('all');
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const definition = strategy.metrics.find((m: any) => m.id === metric);
  async function post(data: any) {
    const response = await fetch('/metrics/business/record', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    return result;
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const form = new FormData(event.currentTarget), get = (key: string) => String(form.get(key) ?? '');
    try {
      let data: any = { kind, qualification, period };
      if (kind === 'measurement') {
        const previous = observations.find((r: any) => r.qualification === qualification && r.channel === definition.channel && r.subject === get('subject') && r.period.startDate === period.startDate && r.period.endDate === period.endDate);
        data = { ...data, channel: definition.channel, subject: get('subject'), source: get('source'), coverage: get('coverage'), values: { ...(previous?.values ?? {}), [metric]: get('value') === '' ? null : Number(get('value')) }, ...(get('supersedes') || previous?.file ? { supersedes: get('supersedes') || previous.file } : {}) };
      }
      else {
        const baseline = await post({ operation: 'snapshot', period });
        if (kind === 'target') data = { ...data, metric, value: Number(get('value')), direction: get('direction'), effectiveDate: get('effectiveDate'), reviewDate: get('nextReviewDate'), reason: get('reason'), snapshot: baseline.file };
        else data = { ...data, qualification: 'all', cadence, status: get('status'), findings: get('findings'), decision: get('decision'), nextAction: get('nextAction'), nextReviewDate: get('nextReviewDate'), snapshot: baseline.file, qualificationsReviewed: form.getAll('qualificationsReviewed'), experimentIds: get('experimentIds').split(/[\s,、]+/).filter(Boolean), ...(existingReview ? { supersedes: existingReview.file } : {}) };
      }
      const result = await post(data);
      setMessage(`保存しました: ${result.file}。Gitへの記録は運用スキルが行います。`); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : '記録に失敗しました'); }
    finally { setBusy(false); }
  }
  return <details className="card"><summary>計測・目標・レビューを記録する</summary>
    <p className="small">期間 {period.startDate}〜{period.endDate}。顧客名・メール・認証情報は入力しません。訂正は新しい記録として残ります。</p>
    <form onSubmit={submit} className="business-form">
      <label>記録するもの<select value={kind} onChange={e => setKind(e.target.value)}><option value="measurement">計測値</option><option value="target">実測に基づく目標</option><option value="review">{cadence === 'monthly' ? '月次' : '週次'}レビュー{existingReview ? 'の追記訂正' : ''}</option></select></label>
      {kind !== 'review' && <><label>資格<select value={qualification} onChange={e => setQualification(e.target.value)}><option value="all">全体（重点資格外・未帰属を含む）</option>{strategy.qualifications.map((q: any) => <option value={q.id} key={q.id}>{q.label}</option>)}</select></label>
        <label>指標<select value={metric} onChange={e => setMetric(e.target.value)}>{strategy.metrics.map((m: any) => <option key={m.id} value={m.id}>{m.label}（{m.unit}）</option>)}</select></label><p className="small">{definition.definition}</p>
        <label>値{kind === 'measurement' ? '（未計測は空欄）' : ''}<input name="value" type="number" min="0" step="1" required={kind === 'target'} /></label></>}
      {kind === 'measurement' && <><label>集計対象<input name="subject" defaultValue="aggregate" required /><span className="small">対象資格全体の集計は aggregate。特定の記事・サービスだけなら商品IDを記入し、全体の合計と混ぜません。</span></label>
        <label>計測範囲<select name="coverage"><option value="partial">一部・網羅性未確認</option><option value="complete">対象全体を確認済み</option></select></label><label>出典と範囲<input name="source" required placeholder="note新ダッシュボード・対象記事全件・確認日など" maxLength={500} /></label><label>訂正先（同じ期間・対象の記録がある場合）<input name="supersedes" placeholder=".claude/state/metrics/business/measurement-…json" /></label></>}
      {kind === 'target' && <><label>目標の方向<select name="direction"><option value="at-least">以上を目指す</option><option value="at-most">以下に抑える</option></select></label><label>適用開始日<input name="effectiveDate" type="date" required /></label><label>設定理由<textarea name="reason" required /></label><label>見直し日<input name="nextReviewDate" type="date" required /></label><p className="small">この期間・資格の完全な実測がある指標だけ設定できます。</p></>}
      {kind === 'review' && <><label>計測状況<select name="status"><option value="provisional">欠測を含む暫定レビュー</option><option value="complete">資格別の実測を確認したレビュー</option></select></label><fieldset><legend>確認した資格（全資格の欠測も確認）</legend>{strategy.qualifications.map((q: any) => <label key={q.id}><input type="checkbox" name="qualificationsReviewed" value={q.id} />{q.label}</label>)}</fieldset><label>実測から分かったこと・分からないこと<textarea name="findings" required defaultValue={existingReview?.findings} /></label><label>判断と根拠<textarea name="decision" required defaultValue={existingReview?.decision} /></label><label>次の一手・対象資格・読者の課題・評価指標<textarea name="nextAction" required defaultValue={existingReview?.nextAction} /></label><label>対応する既存実験ID<input name="experimentIds" placeholder="EXP-007（実験を行わない場合は空欄）" defaultValue={existingReview?.experimentIds?.join(', ')} /></label><label>次回確認日<input name="nextReviewDate" type="date" required /></label><p className="small">改善の開始・実施・効果判定は既存の実験台帳へ記録します。このフォームで実験の状態は変わりません。</p></>}
      <button type="submit" disabled={busy}>{busy ? '記録中…' : '履歴へ保存'}</button>
      <p role="status" className="small">{message}</p>
    </form>
  </details>;
}
