'use client';

import { useState, type CSSProperties } from 'react';
import CopyButton from './CopyButton';
import type { readCharacterCatalog } from '../../../../scripts/lib/character-catalog.mjs';
import { FRAME_LABELS, frameGeometry } from '../../../../scripts/lib/character-frame-geometry.mjs';
import styles from './CharacterCatalog.module.css';

type Catalog = ReturnType<typeof readCharacterCatalog>;
type Pose = Catalog['poses'][number];

export default function CharacterCatalog({ catalog }: { catalog: Catalog }) {
  const [query, setQuery] = useState('');
  const [use, setUse] = useState('');
  const [placement, setPlacement] = useState('');
  const [crop, setCrop] = useState('');
  const [quality, setQuality] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [background, setBackground] = useState('checker');
  const [frame, setFrame] = useState('full');
  const [outputWidth, setOutputWidth] = useState(0);
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const v = catalog.vocabulary;
  const picked = catalog.poses.filter(p => selected.includes(p.slug));
  const filtered = catalog.poses.filter(p => {
    const c = p.composition;
    const search = [p.label, p.slug, c?.note, ...(c?.uses ?? []).map(k => v.uses[k])].join(' ').toLowerCase();
    return search.includes(query.trim().toLowerCase()) && (!use || c?.uses.includes(use)) &&
      (!placement || c?.placements.includes(placement)) && (!crop || c?.crops.includes(crop)) &&
      (!quality || (quality === 'missing' ? !p.available : (p.quality?.status ?? 'unreviewed') === quality));
  });
  function toggle(slug: string) {
    setSelected(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : prev.length < 3 ? [...prev, slug] : prev);
  }
  function picture(p: Pose) {
    const variant = p.framing?.variants[frame];
    const url = `/api/character-frame/${p.slug}?frame=${frame}&width=360&preview=1`;
    return <div className={`${styles.preview} ${styles[background]}`}>
      {!p.available ? <p>このPCに素材がありません<br />台帳には登録されています</p>
        : !variant?.box ? <p>{variant?.note ?? '切り取り位置が未登録です'}</p>
        : failedUrls.includes(url) ? <p role="alert">プレビューを生成できません。原画像の変更・欠損と切り取り設定を確認してください。</p>
        : <a href={url} target="_blank" rel="noreferrer" aria-label={`${p.label}の切り取りプレビューを開く`}>
          <img src={url} alt={`${p.label}・${FRAME_LABELS[frame as keyof typeof FRAME_LABELS]}`} loading="lazy" decoding="async"
            onError={() => setFailedUrls(prev => prev.includes(url) ? prev : [...prev, url])} />
        </a>}
    </div>;
  }
  function frameDetails(p: Pose) {
    const f = p.framing;
    const variant = f?.variants[frame];
    if (!f || !variant?.box) return null;
    const geometry = frameGeometry(f.source, variant.box, outputWidth);
    const ready = p.available && p.quality?.status === 'ready' && !failedUrls.some(url => url.startsWith(`/api/character-frame/${p.slug}?`));
    return <div className={styles.frameDetails}>
      <p>{variant.note}</p>
      <p>切り取り原寸 {geometry.rect.width} × {geometry.rect.height}px → 出力 {geometry.width} × {geometry.height}px</p>
      {geometry.limited && <p className={styles.issue}>指定幅に対して解像度不足です。拡大せず原寸で書き出します。大きく使う場合は高解像度の原画像が必要です。</p>}
      {ready ? <a href={`/api/character-frame/${p.slug}?frame=${frame}&width=${outputWidth}&download=1`} download>選択した切り取りを保存</a>
        : <p>原画像なし・要修正・未確認の素材は書き出しできません。</p>}
      <CopyButton text={JSON.stringify({ pose: p.slug, frame, width: outputWidth })} label="投稿用設定をコピー" />
    </div>;
  }
  return <div className={styles.catalog} style={{ '--character-paper': catalog.backgrounds.paper, '--character-navy': catalog.backgrounds.navy } as CSSProperties}>
    <div className={styles.toolbar}>
      <label>ポーズを検索<input type="search" value={query} placeholder="考え中、解説、pointing…" onChange={e => setQuery(e.target.value)} /></label>
      <label>用途<select aria-label="用途" value={use} onChange={e => setUse(e.target.value)}><option value="">すべての用途</option>{Object.entries(v.uses).map(([k, label]) => <option key={k} value={k}>{label}</option>)}</select></label>
      <label>推奨配置<select aria-label="推奨配置" value={placement} onChange={e => setPlacement(e.target.value)}><option value="">すべての配置</option>{Object.entries(v.placements).map(([k, label]) => <option key={k} value={k}>{label}</option>)}</select></label>
      <label>推奨トリミング<select aria-label="推奨トリミング" value={crop} onChange={e => setCrop(e.target.value)}><option value="">すべて</option>{Object.entries(v.crops).map(([k, label]) => <option key={k} value={k}>{label}</option>)}</select></label>
      <label>確認状態<select aria-label="確認状態" value={quality} onChange={e => setQuality(e.target.value)}><option value="">すべて</option>{Object.entries(v.qualities).map(([k, label]) => <option key={k} value={k}>{label}</option>)}<option value="missing">素材なし</option></select></label>
      <button className="chip" onClick={() => { setQuery(''); setUse(''); setPlacement(''); setCrop(''); setQuality(''); }}>条件をクリア</button>
    </div>
    <div className={styles.controls}>
      <p role="status">{filtered.length} / {catalog.poses.length} ポーズ · 比較 {selected.length} / 3</p>
      <label>背景<select aria-label="背景" value={background} onChange={e => setBackground(e.target.value)}><option value="checker">透過確認</option><option value="paper">明るい背景</option><option value="navy">紺の背景</option></select></label>
    </div>
    <div className={styles.controls}>
      <label>表示する切り取り<select aria-label="表示する切り取り" value={frame} onChange={e => setFrame(e.target.value)}>{Object.entries(FRAME_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>書き出し幅<select aria-label="書き出し幅" value={outputWidth} onChange={e => setOutputWidth(Number(e.target.value))}><option value={0}>原寸（拡大なし）</option>{[360, 720, 1080].map(w => <option key={w} value={w}>{w}px</option>)}</select></label>
    </div>
    {picked.length > 0 && <section className={styles.comparison} aria-label="選択ポーズの比較">
      <div className={styles.controls}><h2>選択したポーズを比較</h2><button className="chip" onClick={() => setSelected([])}>比較を解除</button></div>
      <div className={styles.compareGrid}>{picked.map(p => <article key={p.slug}>
        {picture(p)}<h3>{p.label}</h3><p>{p.composition?.placements.map(k => v.placements[k]).join('・') ?? '配置は未登録'}</p>
        <button className="chip" aria-label={`${p.label}を比較から外す`} onClick={() => toggle(p.slug)}>外す</button>
      </article>)}</div>
    </section>}
    <p className={styles.help}>各ポーズの原画像から、確認済みの位置で切り出します。推奨トリミングは用途の絞り込み、表示する切り取りは実画像の切り替えです。原画像は変更せず、左右反転・引き伸ばしもしません。書き出し幅は投稿全体ではなく人物素材の幅です。</p>
    {filtered.length === 0 ? <div className="empty">条件に合うポーズがありません。条件を変えてください。</div> : <div className={styles.grid}>
      {filtered.map(p => <article className={styles.card} key={p.slug} data-pose={p.slug}>
        {picture(p)}
        <div className={styles.body}>
          <div className={styles.controls}><span className={'badge ' + (p.quality?.status === 'ready' ? 'accent' : 'neutral')}>{v.qualities[p.quality?.status ?? 'unreviewed']}</span>{!p.available && <span className="badge neutral">素材なし</span>}</div>
          {p.quality?.status === 'needs-fix' && <p className={styles.issue}>{p.quality.note}</p>}
          <h2>{p.label}</h2>
          {frameDetails(p)}
          <div className={styles.tags}>{p.composition?.uses.map(k => <span className="badge neutral" key={k}>{v.uses[k]}</span>)}</div>
          {p.composition ? <>
            <dl><dt>配置</dt><dd>{p.composition.placements.map(k => v.placements[k]).join('・')}</dd>
              <dt>顔の向き</dt><dd>{v.facings[p.composition.facing]}</dd>
              <dt>示す方向</dt><dd>{v.gestures[p.composition.gestureDirection]}</dd>
              <dt>切り取り</dt><dd>{p.composition.crops.map(k => v.crops[k]).join('・')}</dd></dl>
            <p className={styles.note}>{p.composition.note}</p>
          </> : <p className={styles.note}>構図情報は未登録です</p>}
          <div className={styles.actions}>
            <label><input type="checkbox" checked={selected.includes(p.slug)} disabled={!selected.includes(p.slug) && selected.length >= 3} onChange={() => toggle(p.slug)} />比較する</label>
            {p.url && <a href={p.url} download={p.file}>PNGを保存</a>}
          </div>
          <details><summary>素材情報</summary><code className={styles.path}>{p.path}</code><CopyButton text={p.path} label="素材パスをコピー" /><p>ポーズID: {p.slug} · 名称照合: {p.verified ? '確認済み' : '未確認'}</p><p>構図確認: {p.composition?.reviewedAt ?? '未確認'}</p><p>画像品質確認: {p.quality?.reviewedAt ?? '未確認'}</p><p>{p.quality?.note}</p></details>
        </div>
      </article>)}
    </div>}
  </div>;
}
