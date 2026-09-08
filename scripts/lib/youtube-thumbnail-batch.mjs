import { thumbnailInput, updateThumbnail } from './youtube-thumbnail-update.mjs';
import { digest } from './youtube-cover-rollout.mjs';

/** Serial writes. Persist every phase; never retry ambiguous thumbnails.set outcomes. */
export async function updateThumbnailBatch(youtube, plan, {
  commit=false, expectedPlanSha256, start=0, limit=1, onlyVideoId, publicOnly=false,
  render, fetchImage, compare, record,
}) {
  if (!expectedPlanSha256 || expectedPlanSha256 !== plan.sha256) throw new Error('Frozen plan digest mismatch');
  if (!Number.isInteger(start)||start<0||!Number.isInteger(limit)||limit<1||limit>400) throw new Error('Invalid batch bounds');
  const ordered=plan.entries.filter(e=>!publicOnly||e.privacy==='public').sort((a,b)=>a.videoId.localeCompare(b.videoId,'en'));
  const entries=onlyVideoId?ordered.filter(e=>e.videoId===onlyVideoId):ordered.slice(start,start+limit);
  if (!entries.length) throw new Error('Selected zero videos');
  const reports=[];
  for(const entry of entries){
    const buffer=await render(entry.spec);
    if(digest(buffer)!==entry.sha256)throw new Error('Rendered image differs from reviewed image');
    const input=await thumbnailInput(buffer,{videoId:entry.videoId,channel:plan.channel,expectedSha256:entry.sha256,commit});
    let backup, report;
    const persist=async update=>{
      report={...update,sourceKey:entry.sourceKey,planSha256:plan.sha256,
        backup:backup?{...backup,data:backup.data.toString('base64')}:undefined};
      if(update.phase==='checked'){
        if(update.before.snippet.title!==entry.title)throw new Error('Title changed since inventory');
        backup=await fetchImage(update.before);
        report.backup={...backup,data:backup.data.toString('base64')};
      }
      await record(report);
    };
    // A read-only preflight supplies an encrypted backup before the first write.
    await updateThumbnail(youtube,input,buffer,{commit:false,record:persist});
    const existing=await compare(buffer,backup.data);
    if(existing.matched){
      report={...report,phase:'already-matching',comparison:existing};
      await record(report);reports.push(report);continue;
    }
    if(!commit){reports.push(report);continue;}
    await updateThumbnail(youtube,input,buffer,{commit:true,record:persist});
    // CDN propagation can lag an accepted write. Record pending instead of resending.
    try{
      const served=await fetchImage(report.after);
      const comparison=await compare(buffer,served.data);
      report={...report,phase:comparison.matched?'cdn-matched':'accepted-cdn-pending',comparison,
        served:{...served,data:served.data.toString('base64')}};
    }catch(error){report={...report,phase:'accepted-cdn-pending',verificationError:error.message};}
    await record(report);reports.push(report);
  }
  return {selected:entries.length,apiAccepted:reports.filter(r=>r.apiAccepted).length,
    alreadyMatching:reports.filter(r=>r.phase==='already-matching').length,
    cdnMatched:reports.filter(r=>r.comparison?.matched).length,
    pending:reports.filter(r=>r.phase==='accepted-cdn-pending').length};
}
