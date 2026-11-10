# -*- coding: utf-8 -*-
"""
図クロップ監査(figure_crop_audit.workflow.js)用の章別ジョブファイルを書き出す。

使い方:
  python prep_audit_jobs.py <WORK_ROOT> [--only fig01-02,fig03-05 ...]

  manifest.json と bbox.json（locate 済み）を読み、**found かつ低確信度でない**図について
  {figId, chId, caption, chosenPage} の章別ジョブ audit_jobs_NN.json を書く。
  --only 指定時はその figId 群だけ（反復で不合格図だけ再監査するときに使う）。

出力:
  WORK_ROOT/audit_jobs_NN.json
  標準出力に jobFiles の JSON 配列（workflow の args.jobFiles にそのまま渡す）
"""
import sys, os, json, argparse
from collections import defaultdict

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('work'); ap.add_argument('--only', default=None)
    a = ap.parse_args()
    man = json.load(open(os.path.join(a.work, 'manifest.json'), encoding='utf-8'))
    bbox = json.load(open(os.path.join(a.work, 'bbox.json'), encoding='utf-8'))
    TH = man.get('confThreshold', 0.55)
    only = set(a.only.split(',')) if a.only else None

    byc = defaultdict(list)
    for r in bbox:
        if only is not None and r['figId'] not in only:
            continue
        if not (r.get('found') and r.get('chosenPage', -1) >= 0):
            continue
        conf = r.get('confidence')
        if conf is not None and conf < TH:
            continue
        byc[r['chId']].append({'figId': r['figId'], 'chId': r['chId'],
                               'caption': r.get('caption', ''), 'chosenPage': int(r['chosenPage'])})
    files = []
    for cid in sorted(byc):
        p = os.path.join(a.work, 'audit_jobs_%s.json' % cid)
        json.dump({'jobs': byc[cid]}, open(p, 'w', encoding='utf-8'), ensure_ascii=False)
        files.append(p)
    print('audit jobs:', sum(len(v) for v in byc.values()), 'figs /', len(files), 'chapters')
    print(json.dumps(files, ensure_ascii=False))

if __name__ == '__main__':
    main()
