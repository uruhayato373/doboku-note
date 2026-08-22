# -*- coding: utf-8 -*-
"""
図領域(bbox)結果でページを高解像度クロップし、章別 .md に画像を埋め込む。

使い方:
  1. figure_bbox.workflow.js の結果（results 配列）を WORK_ROOT/bbox.json に保存しておく
     （各要素: figId, chId, found, chosenPage, x, y, w, h, confidence, caption）
  2. python crop_embed_figures.py <WORK_ROOT> [--crop-only]
     --crop-only: クロップ画像を img/ に出すだけで MD への埋め込みはしない
       （audit/refine ループの初期クロップ用。タイト化が収束してから埋め込み無しで回す）。

出力:
  destDir/img/{figId}.png             高解像度クロップ（cropWidth）
  destDir/{pdf}.md                    各 `（図: …）` 直前に ![図番号](img/{figId}.png) を挿入
  WORK_ROOT/embed_report.json         埋込数・未検出一覧

重要（今回の知見）:
  - **冪等でない**: 章 .md に挿入するため、再実行前に concat_chapters.py でクリーンな
    章 .md を再生成すること（さもないと ![..] が二重挿入される）。
  - **確信度しきい値**: confidence < confThreshold は誤クロップになりがちなので未埋め込み扱い
    （誤った図を貼るより貼らない方を選ぶ）。manifest.confThreshold（既定0.55）。
  - 図番号/表番号/写真番号は埋め込み先のプレースホルダ行から抽出して alt にする。
"""
import sys, os, re, json, argparse

def alt_of(s):
    m = re.search(r'(図|表|写真)\s*([0-9]+\.[0-9]+(?:の[0-9]+)?)', s)
    return (m.group(1) + m.group(2)) if m else '図'

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('work'); ap.add_argument('--crop-only', action='store_true')
    a = ap.parse_args()
    work = a.work; crop_only = a.crop_only
    man = json.load(open(os.path.join(work, 'manifest.json'), encoding='utf-8'))
    dest = man['destDir']; CROP_W = man.get('cropWidth', 2600); TH = man.get('confThreshold', 0.55)
    img = os.path.join(dest, 'img'); os.makedirs(img, exist_ok=True)
    bbox = {r['figId']: r for r in json.load(open(os.path.join(work, 'bbox.json'), encoding='utf-8'))}
    import fitz

    rep = {'embedded': 0, 'notfound': [], 'perch': {}}
    for ch in man['chapters']:
        cid = ch['id']
        mdpath = os.path.join(dest, ch['pdf'] + '.md')
        lines = open(mdpath, encoding='utf-8').read().split('\n')
        figseq = sorted([k for k in bbox if k.startswith(cid + '-')], key=lambda k: int(k.split('-')[1]))
        d = fitz.open(os.path.join(dest, ch['pdf'] + '.pdf'))
        embed = {}
        for fid in figseq:
            r = bbox[fid]; seq = int(fid.split('-')[1])
            if not (r.get('found') and 0 <= int(r.get('chosenPage', -1)) < ch['pages']):
                rep['notfound'].append(fid); continue
            conf = r.get('confidence')
            if conf is not None and conf < TH:
                rep['notfound'].append(fid); continue
            x, y, w, h = float(r['x']), float(r['y']), float(r['w']), float(r['h'])
            pad = 0.012
            x0 = max(0.0, x - pad); y0 = max(0.0, y - pad)
            x1 = min(1.0, x + w + pad); y1 = min(1.0, y + h + pad)
            if x1 - x0 < 0.03 or y1 - y0 < 0.03:
                rep['notfound'].append(fid); continue
            pg = d[int(r['chosenPage'])]; pw, ph = pg.rect.width, pg.rect.height
            rect = fitz.Rect(x0 * pw, y0 * ph, x1 * pw, y1 * ph)
            pg.get_pixmap(matrix=fitz.Matrix(CROP_W / pw, CROP_W / pw), clip=rect).save(os.path.join(img, fid + '.png'))
            embed[seq] = 'img/' + fid + '.png'; rep['embedded'] += 1
        if not crop_only:
            out = []; sc = 0
            for ln in lines:
                if ln.strip().startswith('（図:'):
                    sc += 1
                    if sc in embed:
                        out.append('![%s](%s)' % (alt_of(ln), embed[sc]))
                out.append(ln)
            open(mdpath, 'w', encoding='utf-8', newline='\n').write('\n'.join(out))
        rep['perch'][cid] = {'figs': len(figseq), 'embedded': len(embed)}
        print('ch%s: %d figs, embedded %d' % (cid, len(figseq), len(embed)))
    print('TOTAL embedded:', rep['embedded'], 'notfound:', len(rep['notfound']), rep['notfound'])
    json.dump(rep, open(os.path.join(work, 'embed_report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

if __name__ == '__main__':
    main()
