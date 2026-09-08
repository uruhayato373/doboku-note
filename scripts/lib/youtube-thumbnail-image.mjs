import sharp from 'sharp';
import { digest } from './youtube-cover-rollout.mjs';

export async function fetchThumbnail(video, fetcher = fetch) {
  const thumbs = Object.values(video.snippet?.thumbnails ?? {}).filter(t => t.url && t.width >= 480)
    .sort((a,b) => (b.width*b.height)-(a.width*a.height));
  if (!thumbs.length) throw new Error('No usable live thumbnail');
  for (const thumb of thumbs) {
    const url = new URL(thumb.url);
    if (url.protocol !== 'https:' || !/^i\d*\.ytimg\.com$/.test(url.hostname) ||
        !url.pathname.startsWith(`/vi/${video.id}/`)) throw new Error('Unexpected thumbnail host/video');
    const response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(30000), headers: { 'Cache-Control': 'no-cache' } });
    if (!response.ok) continue;
    const data = Buffer.from(await response.arrayBuffer());
    if (data.length > 8*1024*1024) throw new Error('Thumbnail response exceeds safety limit');
    const meta = await sharp(data).metadata();
    if (!['png','jpeg','webp'].includes(meta.format) || meta.width < 480) throw new Error('Thumbnail image unusable');
    return { data, url: url.href, sha256: digest(data), width: meta.width, height: meta.height };
  }
  throw new Error('Live thumbnail could not be fetched');
}

/** JPEG/resize tolerant but text-sensitive: maximum local tile error as well as mean. */
export async function compareThumbnail(expected, actual) {
  const meta = await sharp(actual).metadata();
  const width = 640, height = Math.round(width * meta.height / meta.width);
  if (height > 1200 || height < 200) throw new Error('Unexpected thumbnail aspect ratio');
  const live = await sharp(actual).resize(width,height).removeAlpha().toColourspace('srgb').raw().toBuffer();
  const scores = [];
  for (const fit of ['contain','cover','fill']) {
    const rendered = await sharp(expected).resize(width,height,{fit,background:'#000000'}).removeAlpha().toColourspace('srgb').raw().toBuffer();
    let sum=0, worstTile=0;
    for(let y=0;y<height;y+=16)for(let x=0;x<width;x+=16){
      let tile=0,n=0;
      for(let yy=y;yy<Math.min(y+16,height);yy++)for(let xx=x;xx<Math.min(x+16,width);xx++)for(let c=0;c<3;c++){
        const d=Math.abs(rendered[(yy*width+xx)*3+c]-live[(yy*width+xx)*3+c]);tile+=d;sum+=d;n++;
      }
      worstTile=Math.max(worstTile,tile/n);
    }
    scores.push({fit,mean:sum/live.length,worstTile});
  }
  const best=scores.sort((a,b)=>a.mean-b.mean)[0];
  return {...best, matched: best.mean < 3 && best.worstTile < 15, method:'cdn-pixel-comparison-v1', publicFeedVerified:false};
}
