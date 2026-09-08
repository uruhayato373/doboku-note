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
  const source = await sharp(expected).metadata();
  const width = 640, height = Math.round(width * meta.height / meta.width);
  if (height > 1200 || height < 200) throw new Error('Unexpected thumbnail aspect ratio');
  const live = await sharp(actual).resize(width,height).removeAlpha().toColourspace('srgb').raw().toBuffer();
  const scores = [];
  const score = (rendered, pixels, w, h, fit) => {
    let sum=0, worstTile=0;
    for(let y=0;y<h;y+=16)for(let x=0;x<w;x+=16){
      let tile=0,n=0;
      for(let yy=y;yy<Math.min(y+16,h);yy++)for(let xx=x;xx<Math.min(x+16,w);xx++)for(let c=0;c<3;c++){
        const d=Math.abs(rendered[(yy*w+xx)*3+c]-pixels[(yy*w+xx)*3+c]);tile+=d;sum+=d;n++;
      }
      worstTile=Math.max(worstTile,tile/n);
    }
    scores.push({fit,mean:sum/pixels.length,worstTile});
  };
  for (const fit of ['contain','cover','fill']) {
    const rendered = await sharp(expected).resize(width,height,{fit,background:'#000000'}).removeAlpha().toColourspace('srgb').raw().toBuffer();
    score(rendered,live,width,height,fit);
  }
  // Shorts CDN adds dark enlarged side panels. Compare the ENTIRE authored
  // portrait, not those YouTube-generated panels; never crop away headline/body.
  if(source.width<source.height && meta.width>meta.height){
    const w=Math.round(meta.height*source.width/source.height),h=meta.height;
    const rw=320,rh=Math.round(rw*source.height/source.width);
    const rendered=await sharp(expected).resize(rw,rh).removeAlpha().toColourspace('srgb').raw().toBuffer();
    for(const cw of [w-1,w,w+1])for(const left of new Set([Math.floor((meta.width-cw)/2),Math.ceil((meta.width-cw)/2)])){
      const pixels=await sharp(actual).extract({left,top:0,width:cw,height:h}).resize(rw,rh).removeAlpha().toColourspace('srgb').raw().toBuffer();
      score(rendered,pixels,rw,rh,'portrait-center');
    }
  }
  const best=scores.sort((a,b)=>a.mean-b.mean)[0];
  const maxTileError=best.fit==='portrait-center'?22:15;
  return {...best, matched: best.mean < 3 && best.worstTile < maxTileError,
    thresholds:{mean:3,worstTile:maxTileError},method:'cdn-pixel-comparison-v2',publicFeedVerified:false};
}
