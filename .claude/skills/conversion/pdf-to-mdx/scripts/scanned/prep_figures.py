# -*- coding: utf-8 -*-
"""
図クロップの前処理: 800px サムネイル生成 ＋ 図ジョブ抽出（候補ページ窓つき）。

使い方:
  python prep_figures.py <WORK_ROOT>

  manifest.json と destDir の章別 .md を読み、各 `（図: …）` プレースホルダに対し
  「候補ページ画像の窓（±figWindow）」を持つ図ジョブを作る。

出力:
  WORK_ROOT/thumbs/chNN/pXX.png      bbox 判定用サムネ（thumbWidth）
  WORK_ROOT/figjobs_compact.json     全図ジョブ（{thumbDir, jobs:[...]}）
  WORK_ROOT/figjobs_NN.json          章別ジョブ（figure_bbox.workflow.js が読む単位）

なぜ候補窓方式か（今回の知見）:
  - `<!-- p.NN -->` マーカーは PDF ページと 1:1 でない（重複/無番/誤番のため位置がズレる）。
    位置で図ページを決め打ちせず、エージェントに候補窓を渡してキャプション照合で当てさせる。
  - まずマーカー数とページ数のズレ(drift)を見て窓幅を決める（drift<=±1 なら window=2 で十分）。
  - キャプションは短縮して args 肥大を防ぐ（図番号＋先頭~48字で照合は足りる）。
"""
import sys, os, re, json

def short_cap(line):
    s = re.sub(r'^（図:\s*', '', line.strip()).rstrip('）').replace('　', ' ')
    return '（図: ' + s[:48] + '）'

def main():
    work = sys.argv[1]
    man = json.load(open(os.path.join(work, 'manifest.json'), encoding='utf-8'))
    dest = man['destDir']; WIN = man.get('figWindow', 2); TW = man.get('thumbWidth', 800)
    thumb = os.path.join(work, 'thumbs'); os.makedirs(thumb, exist_ok=True)
    import fitz

    jobs = []
    from collections import defaultdict
    byc = defaultdict(list)
    for ch in man['chapters']:
        cid, P = ch['id'], ch['pages']
        tdir = os.path.join(thumb, 'ch' + cid); os.makedirs(tdir, exist_ok=True)
        d = fitz.open(os.path.join(dest, ch['pdf'] + '.pdf'))
        for i in range(P):
            pg = d[i]; z = TW / pg.rect.width
            pg.get_pixmap(matrix=fitz.Matrix(z, z)).save(os.path.join(tdir, 'p%02d.png' % i))
        md = open(os.path.join(dest, ch['pdf'] + '.md'), encoding='utf-8').read().split('\n')
        markers = sum(1 for l in md if re.match(r'^<!-- (p\.|pdf )', l.strip()))
        print('ch%s: pages=%d markers=%d drift=%+d' % (cid, P, markers, markers - P))
        mc = 0; seq = 0
        for line in md:
            s = line.strip()
            if re.match(r'^<!-- (p\.|pdf )', s):
                mc += 1
            if s.startswith('（図:'):
                seq += 1
                est = max(1, min(P - 1, mc - 1))
                lo = max(1, est - WIN); hi = min(P - 1, est + WIN)
                j = {'figId': '%s-%02d' % (cid, seq), 'chId': cid,
                     'caption': short_cap(line), 'candPages': list(range(lo, hi + 1))}
                jobs.append(j); byc[cid].append(j)
        print('  -> %d figures' % seq)

    json.dump({'thumbDir': thumb, 'jobs': jobs},
              open(os.path.join(work, 'figjobs_compact.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    files = []
    for cid in sorted(byc):
        p = os.path.join(work, 'figjobs_%s.json' % cid)
        json.dump({'jobs': byc[cid]}, open(p, 'w', encoding='utf-8'), ensure_ascii=False)
        files.append(p)
    print('total figures:', len(jobs))
    print('章別ジョブファイル(figure_bbox.workflow.js の jobFiles に渡す):')
    print(json.dumps(files, ensure_ascii=False))

if __name__ == '__main__':
    main()
