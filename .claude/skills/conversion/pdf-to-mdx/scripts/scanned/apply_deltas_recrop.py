# -*- coding: utf-8 -*-
"""
図クロップ監査結果(audit.json)の adjust_bbox を bbox.json に算術適用し、変更図だけ再クロップする。
audit/refine ループの「適用」側。

使い方:
  python apply_deltas_recrop.py <WORK_ROOT> <AUDIT_JSON>

  AUDIT_JSON = figure_crop_audit.workflow.js の返り値 results を保存したファイル
  （各要素: figId, pass, adjust_bbox{top,bottom,left,right}, relocate, reason）

動作:
  - pass=true の図は据え置き。
  - relocate=true の図は **locate やり直し要** として needs_relocate に積む（自動調整しない）。
  - それ以外（不合格）は adjust_bbox を現 bbox に適用して bbox.json を更新し、その図を高解像度で再クロップ。
    adjust は page 比率の相対値。＋＝内側へ詰める / −＝外側へ広げる。
  - 次反復で再監査すべき figId を WORK/audit_retry_ids.txt に出力（prep_audit_jobs.py --only に渡す）。

ダンピング（--damp、既定0.7）: 提案デルタをそのまま適用すると over/under shoot で振動し反復数が増える
  （施工管理編パイロットで観測）。0.7 倍程度に減衰させると収束が速まる＝トークン削減。1.0 で減衰なし。
"""
import sys, os, json, argparse

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('work'); ap.add_argument('audit'); ap.add_argument('--damp', type=float, default=0.7)
    a = ap.parse_args()
    work, auditp, DAMP = a.work, a.audit, a.damp
    man = json.load(open(os.path.join(work, 'manifest.json'), encoding='utf-8'))
    dest = man['destDir']; CROP_W = man.get('cropWidth', 2600)
    bbox = {r['figId']: r for r in json.load(open(os.path.join(work, 'bbox.json'), encoding='utf-8'))}
    audit = json.load(open(auditp, encoding='utf-8'))
    audres = audit['results'] if isinstance(audit, dict) and 'results' in audit else audit
    import fitz

    # chId -> pdf path（再クロップ用に開く）
    pdfof = {c['id']: os.path.join(dest, c['pdf'] + '.pdf') for c in man['chapters']}
    opened = {}
    def page(cid, idx):
        if cid not in opened:
            opened[cid] = fitz.open(pdfof[cid])
        return opened[cid][idx]

    adjusted, passed, relocate = [], 0, []
    for a in audres:
        fid = a['figId']; r = bbox.get(fid)
        if r is None:
            continue
        if a.get('relocate'):
            relocate.append(fid); continue
        if a.get('pass'):
            passed += 1; continue
        d = a.get('adjust_bbox') or {}
        if not any(abs(d.get(k, 0)) > 1e-6 for k in ('top', 'bottom', 'left', 'right')):
            passed += 1; continue  # 不合格だが調整0＝据え置き
        x0, y0 = float(r['x']), float(r['y'])
        x1, y1 = x0 + float(r['w']), y0 + float(r['h'])
        x0 += d.get('left', 0) * DAMP; x1 -= d.get('right', 0) * DAMP
        y0 += d.get('top', 0) * DAMP; y1 -= d.get('bottom', 0) * DAMP
        x0 = min(max(0.0, x0), 0.97); y0 = min(max(0.0, y0), 0.97)
        x1 = max(min(1.0, x1), x0 + 0.03); y1 = max(min(1.0, y1), y0 + 0.03)
        r['x'], r['y'], r['w'], r['h'] = x0, y0, x1 - x0, y1 - y0
        # 再クロップ
        pg = page(r['chId'], int(r['chosenPage'])); pw, ph = pg.rect.width, pg.rect.height
        pad = 0.012
        cx0 = max(0.0, x0 - pad); cy0 = max(0.0, y0 - pad)
        cx1 = min(1.0, x1 + pad); cy1 = min(1.0, y1 + pad)
        rect = fitz.Rect(cx0 * pw, cy0 * ph, cx1 * pw, cy1 * ph)
        pg.get_pixmap(matrix=fitz.Matrix(CROP_W / pw, CROP_W / pw), clip=rect).save(
            os.path.join(dest, 'img', fid + '.png'))
        adjusted.append(fid)

    json.dump(list(bbox.values()), open(os.path.join(work, 'bbox.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    open(os.path.join(work, 'audit_retry_ids.txt'), 'w', encoding='utf-8').write(','.join(adjusted))
    print('pass=%d / adjusted(recropped)=%d / relocate=%d' % (passed, len(adjusted), len(relocate)))
    if relocate:
        print('要locateやり直し:', relocate)
    if adjusted:
        print('次反復 --only:', ','.join(adjusted))

if __name__ == '__main__':
    main()
