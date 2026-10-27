/** 個別改訂版専用。旧動画・R2・自動配信へ書かず、外部操作前にintentを台帳へ保存する。 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { canonicalJson, loadRegistry, parsePubId } from './content-registry.mjs';
import { publicationWriteSession } from './content-registry-write.mjs';
import { readDataset } from './dataset-io.mjs';
import { readJson } from './json-io.mjs';
import { approvalState } from './media-review.mjs';
import { longformInputHash } from './longform-render-integrity.mjs';
import { requirePopDiagramStandard } from './longform-pop-images.mjs';
import { findDuplicateLongforms } from './video-duplicate-check.mjs';
import { assertChannel, assertProcessed, getVideo, sameSnippet, writableStatus } from './youtube-migration.mjs';
import { channelInventory } from './youtube-channel-inventory.mjs';
import sharp from 'sharp';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const same = (a, b) => canonicalJson(a) === canonicalJson(b);
const videoIdValid = id => /^[\w-]{11}$/.test(id ?? '');
const urls = thumbnails => Object.values(thumbnails ?? {}).map(x => x?.url).filter(Boolean);

function verifiedBytes(root, asset) {
  const bytes = readFileSync(join(root, asset.path));
  if (sha(bytes) !== asset.sha256) throw new Error(`素材SHA不一致: ${asset.id}`);
  return bytes;
}

export async function thumbnailUpload(root, asset) {
  const source = verifiedBytes(root, asset);
  const compressed = source.length > 2_097_152;
  const bytes = compressed ? await sharp(source).jpeg({ quality: 93, mozjpeg: true }).toBuffer() : source;
  if (bytes.length > 2_097_152) throw new Error('YouTube表紙の2MB制限を超える');
  return { bytes, mimeType: compressed ? 'image/jpeg' : 'image/png' };
}

/** 常にローカルだけで検査。承認・未来日時の不足を返し、外部クライアントを作らない。 */
export function revisionPublishPlan(root, pubId, now = Date.now()) {
  const reg = loadRegistry(root), pub = reg.publications.find(p => p.id === pubId);
  const parsed = parsePubId(pubId), source = reg.publications.find(p => p.id === pub?.revisionOf);
  if (!pub || !source || pub.channel !== 'youtube' || !parsed?.variant || source.revisionOf || source.id === pub.id ||
      source.exam !== pub.exam || source.work !== pub.work || source.format !== pub.format || source.account !== pub.account || pub.account !== 'youtube:main' ||
      parsed.exam !== pub.exam || parsed.work !== pub.work || parsed.format !== pub.format || parsed.variant !== pub.variant) throw new Error('改訂公開ID・作品・改訂元の対応が不正');
  if (!['longform', 'short'].includes(pub.format) || ['stopped', 'failed'].includes(pub.status)) throw new Error('投入できない形式・停止状態');
  const work = reg.works.find(w => w.id === pub.work && w.exam === pub.exam);
  if (work?.kind !== 'video-pack' || !pub.copy?.startsWith(`${work.definition}/youtube.revision-`) || !pub.copy.endsWith('.json')) throw new Error('改訂投稿入力の置き場が作品と一致しない');
  const input = readJson(root, pub.copy), byId = new Map(reg.media.map(m => [m.id, m]));
  if (input.publicationId !== pub.id || input.revisionOf !== source.id || input.format !== pub.format || input.account !== pub.account ||
      input.publishAt !== pub.publishAt || input.relatedTo !== pub.relatedTo) throw new Error('改訂投稿入力と公開行が一致しない');
  const assets = {}, facts = {};
  let checkedFiles = 0;
  for (const [role, id] of Object.entries(input.media ?? {}).map(([role, asset]) => [role, asset.id])) {
    if (pub.media?.[role] !== id) throw new Error(`${role}: 公開行と改訂入力の素材IDが一致しない`);
    const m = byId.get(id);
    const expectedId = `${pub.exam}/${pub.work}/work/candidate-${pub.format === 'short' ? `${source.variant}-` : ''}${role}`;
    if (!m || id !== expectedId) throw new Error('素材が別作品・別variant・別の役割を指している');
    assets[role] = { id, path: m.store.path, sha256: m.sha256 };
    if (!same(input.media?.[role], assets[role])) throw new Error('素材ID・SHA・サイズが一致しない');
    if (['video', 'cover'].includes(role) || existsSync(join(root, assets[role].path))) {
      if (verifiedBytes(root, assets[role]).length !== m.bytes) throw new Error('素材ID・SHA・サイズが一致しない');
      checkedFiles++;
    }
    facts[role] = { bytes: m.bytes, width: m.width, height: m.height, durationSec: m.durationSec, provenance: m.provenance };
  }
  if (!same(input.media, assets) || !assets.video || !assets.cover || !assets.subtitles || input.sha256 !== assets.video.sha256 || input.localFile !== assets.video.path ||
      input.thumbnailSha256 !== assets.cover.sha256 || input.thumbnailLocalFile !== assets.cover.path) throw new Error('MP4・表紙・字幕の結線が不正');
  if (!(facts.video.durationSec > 0) || !(facts.cover.width > 0) || !(facts.cover.height > 0)) throw new Error('動画の実尺・画面寸法・表紙サイズが不正');
  if (pub.format === 'longform') {
    requirePopDiagramStandard(root, join(root, work.definition));
    if (facts.video.provenance.renderInputSha256 !== longformInputHash(join(root, work.definition))) throw new Error('完成動画の制作入力が古い');
  } else {
    if (!assets.recipe) throw new Error('Shorts再現記録が無い');
    const recipe = readJson(root, assets.recipe.path);
    if (recipe.verifiedOutput?.sha256 !== assets.video.sha256) throw new Error('Shorts再現記録とMP4が一致しない');
    const target = reg.publications.find(p => p.id === pub.relatedTo);
    if (!target || target.work !== pub.work || target.exam !== pub.exam || target.format !== 'longform' || target.revisionOf !== source.relatedTo || target.account !== pub.account) throw new Error('Shorts関連先が同じ作品の改訂通常動画ではない');
  }
  const channel = readDataset(root, 'config.youtube-formats').channel;
  const disclosure = readDataset(root, 'config.youtube-production-disclosure');
  const utm = readDataset(root, 'config.utm-templates').channels[`youtube.${pub.format === 'short' ? 'shorts' : 'longform'}`];
  if (!input.title || input.title.length > 100 || !input.description || input.description.length > 5000 ||
      !input.description.includes(disclosure.authorityNotice) || ![`utm_source=${utm.source}`, `utm_medium=${utm.medium}`, `utm_campaign=${pub.work}`].every(x => input.description.includes(x))) throw new Error('投稿文面・UTM・制作開示が不正');
  const digest = sha(canonicalJson({ input, facts, channel, disclosure }));
  const marker = `dn-revision-${sha(`${pub.id}:${digest}`).slice(0, 40)}`;
  const snippet = { title: input.title, description: input.description, tags: [...(input.tags ?? []), marker], categoryId: '27', defaultLanguage: 'ja', defaultAudioLanguage: 'ja' };
  if (snippet.tags.some(t => typeof t !== 'string') || snippet.tags.join(',').length > 500) throw new Error('タグが不正または上限超過');
  const approval = approvalState(root, pub, byId), blockers = [];
  if (!['approved', 'rendered', 'uploaded_private', 'scheduled', 'published'].includes(pub.status)) blockers.push('revision-not-approved');
  if (!approval.visual.valid || !approval.final.valid || !pub.approval?.contentSha256 || pub.approval.grandfathered) blockers.push('current-revision-approval-missing');
  if (!(work.qa?.avg >= 2) || work.qa.blocks !== 0) blockers.push('work-qa-not-passed');
  if (!pub.publishAt || !(Date.parse(pub.publishAt) > now + 300000)) blockers.push('future-slot-missing-or-expired');
  if (findDuplicateLongforms(root, reg, { candidateId: pub.id }).pairs.length) blockers.push('duplicate-longform');
  if (reg.publications.some(p => p.id !== pub.id && p.channel === 'youtube' && p.account === pub.account &&
      (p.platform?.id || p.delivery?.uploadRequestedAt) && byId.get(p.media?.video)?.sha256 === input.sha256)) blockers.push('duplicate-media-publication');
  if (pub.delivery && (pub.delivery.inputSha256 !== digest || pub.delivery.marker !== marker)) throw new Error('実行開始後に改訂入力が変わっている');
  if (pub.platform?.id && !pub.delivery?.videoId) throw new Error('外部IDのある改訂行に実行記録が無い。自動投稿しない');
  if (pub.delivery?.videoId && pub.platform?.id && pub.delivery.videoId !== pub.platform.id) throw new Error('実行記録と外部IDが不一致');
  return { pub, source, input, channel, disclosure, assets, facts, digest, marker, snippet, blockers, checkedMedia: Object.keys(assets).length, checkedFiles };
}

/** 初回の通常動画も改訂版と同じ intent・marker・API 実査の経路で扱う。 */
export function singlePublishPlan(root, pubId, now = Date.now()) {
  const reg = loadRegistry(root), pub = reg.publications.find(p => p.id === pubId);
  const parsed = parsePubId(pubId);
  if (!pub || pub.revisionOf || pub.channel !== 'youtube' || pub.format !== 'longform' || pub.variant ||
      pub.account !== 'youtube:main' || parsed?.exam !== pub.exam || parsed.work !== pub.work || parsed.format !== 'longform' || parsed.variant) {
    throw new Error('初回通常動画の公開ID・アカウントが不正');
  }
  const work = reg.works.find(w => w.id === pub.work && w.exam === pub.exam);
  if (work?.kind !== 'video-pack' || pub.copy !== `${work.definition}/youtube.json#longform`) throw new Error('投稿文面の置き場が作品と一致しない');
  const release = readJson(root, `${work.definition}/youtube.json`);
  const input = release.longform, byId = new Map(reg.media.map(m => [m.id, m]));
  const assets = {}, facts = {};
  for (const role of ['video', 'cover']) {
    const id = pub.media?.[role], m = byId.get(id);
    if (!m || id !== `${pub.id}/${role}`) throw new Error(`${role}: 公開行と素材IDが一致しない`);
    assets[role] = { id, path: m.store.path, sha256: m.sha256 };
    if (verifiedBytes(root, assets[role]).length !== m.bytes) throw new Error(`${role}: 素材サイズが違う`);
    facts[role] = { bytes: m.bytes, width: m.width, height: m.height, durationSec: m.durationSec, provenance: m.provenance };
  }
  requirePopDiagramStandard(root, join(root, work.definition));
  if (release.channel?.id !== readDataset(root, 'config.youtube-formats').channel.id ||
      release.channel?.title !== readDataset(root, 'config.youtube-formats').channel.title ||
      input.sha256 !== assets.video.sha256 || input.thumbnailSha256 !== assets.cover.sha256 ||
      !input.r2Key || !input.thumbnailR2Key || Date.parse(input.publishAt) !== Date.parse(pub.publishAt) ||
      !(facts.video.durationSec > 0) ||
      facts.cover.width !== 1920 || facts.cover.height !== 1080 ||
      facts.video.provenance.renderInputSha256 !== longformInputHash(join(root, work.definition))) throw new Error('投稿入力・完成動画・表紙の結線が不正');
  const channel = readDataset(root, 'config.youtube-formats').channel;
  const disclosure = readDataset(root, 'config.youtube-production-disclosure');
  const utm = readDataset(root, 'config.utm-templates').channels['youtube.longform'];
  if (!input.title || input.title.length > 100 || !input.description || input.description.length > 5000 ||
      !input.description.includes(disclosure.authorityNotice) ||
      ![`utm_source=${utm.source}`, `utm_medium=${utm.medium}`, `utm_campaign=${pub.work}`].every(x => input.description.includes(x))) throw new Error('投稿文面・UTM・制作開示が不正');
  const digest = sha(canonicalJson({ pubId, input, facts, channel, disclosure }));
  const marker = `dn-single-${sha(`${pub.id}:${digest}`).slice(0, 40)}`;
  const snippet = { title: input.title, description: input.description, tags: [...(input.tags ?? []), marker], categoryId: input.categoryId ?? '27', defaultLanguage: 'ja', defaultAudioLanguage: 'ja' };
  if (snippet.tags.some(t => typeof t !== 'string') || snippet.tags.join(',').length > 500) throw new Error('タグが不正または上限超過');
  const approval = approvalState(root, pub, byId), blockers = [];
  if (!['rendered', 'uploaded_private', 'scheduled', 'published'].includes(pub.status)) blockers.push('rendered-state-required');
  if (!approval.visual.valid || !approval.final.valid || pub.approval?.by !== 'user' || pub.approval.grandfathered) blockers.push('current-approval-missing');
  if (!(work.qa?.avg >= 2) || work.qa.blocks !== 0) blockers.push('work-qa-not-passed');
  if (!pub.publishAt || !(Date.parse(pub.publishAt) > now + 300000)) blockers.push('future-slot-missing-or-expired');
  if (findDuplicateLongforms(root, reg, { candidateId: pub.id }).pairs.length) blockers.push('duplicate-longform');
  if (reg.publications.some(p => p.id !== pub.id && p.channel === 'youtube' && p.account === pub.account &&
      (p.platform?.id || p.delivery?.uploadRequestedAt) && byId.get(p.media?.video)?.sha256 === input.sha256)) blockers.push('duplicate-media-publication');
  if (pub.delivery && (pub.delivery.inputSha256 !== digest || pub.delivery.marker !== marker)) throw new Error('実行開始後に投稿入力が変わっている');
  if (pub.platform?.id && !pub.delivery?.videoId) throw new Error('外部IDに実行記録が無い。自動投稿しない');
  return { pub, source: { platform: {} }, input, channel, disclosure, assets, facts, digest, marker, snippet, blockers, checkedMedia: 2 };
}

/** 依存はYouTube API形のオブジェクト。テストは全てmock。defaultは外部通信なし。 */
export async function publishYoutubePublication(root, { pubId, phase = 'upload', commit = false, expect }, { youtube, journal, now = () => Date.now(), wait = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  if (!['upload', 'schedule', 'verify'].includes(phase)) throw new Error('phaseはupload|schedule|verify');
  const publication = loadRegistry(root).publications.find(p => p.id === pubId);
  const planFor = publication?.revisionOf ? revisionPublishPlan : singlePublishPlan;
  let plan = planFor(root, pubId, now());
  const thumbnail = await thumbnailUpload(root, plan.assets.cover);
  const summary = { publicationId: pubId, phase, digest: plan.digest, checkedMedia: plan.checkedMedia, checkedFiles: plan.checkedFiles ?? plan.checkedMedia, blockers: plan.blockers, dryRun: !commit, externalActions: 0 };
  if (!commit) return summary;
  if (expect !== plan.digest) throw new Error('確認した改訂入力digestと一致しない');
  // verifyは読み取りで既知結果を回収できる。新規外部書き込みは承認と未来日時が必須。
  if (phase !== 'verify' && plan.blockers.length) throw new Error(`投稿不可: ${plan.blockers.join(', ')}`);
  if (!youtube) throw new Error('YouTubeクライアントが必要');
  if (!publication.revisionOf && !journal) throw new Error('初回投稿には非公開R2の実行記録が必要');
  const session = publicationWriteSession(root, 'youtube', plan.pub.exam);
  const at = () => new Date(now()).toISOString();
  let pub = structuredClone(plan.pub);
  const journalSave = async () => { if (journal) await journal.save({ pubId, delivery: pub.delivery }); };
  const current = () => {
    session.assertUnchanged();
    const latest = planFor(root, pubId, now());
    if (latest.digest !== plan.digest) throw new Error('処理中に素材または投稿入力が変わった');
    if (phase !== 'verify' && latest.blockers.length) throw new Error(`投稿不可: ${latest.blockers.join(', ')}`);
    return latest;
  };
  const save = () => { current(); session.save(pub); };
  const claimId = id => {
    if (!videoIdValid(id) || id === plan.source.platform?.id || loadRegistry(root).publications.some(p => p.id !== pub.id && p.platform?.id === id)) throw new Error('旧動画または別公開行の外部IDは採用しない');
    pub.delivery.videoId = id;
  };
  const verifyIdentity = actual => {
    const fields = {
      id: actual?.id === pub.delivery.videoId,
      channel: actual?.snippet?.channelId === plan.channel.id,
      title: actual?.snippet?.title === plan.snippet.title,
      description: actual?.snippet?.description === plan.snippet.description,
      tags: same((actual?.snippet?.tags ?? []).slice().sort(), plan.snippet.tags.slice().sort()),
      category: actual?.snippet?.categoryId === plan.snippet.categoryId,
      language: actual?.snippet?.defaultLanguage === plan.snippet.defaultLanguage,
      audioLanguage: actual?.snippet?.defaultAudioLanguage === plan.snippet.defaultAudioLanguage,
      syntheticMedia: (actual?.status?.containsSyntheticMedia ?? false) === plan.disclosure.containsSyntheticMedia,
    };
    fields.snippet = actual ? sameSnippet(actual.snippet, plan.snippet) : false;
    if (!actual || !fields.id || !fields.channel || !fields.snippet || !fields.syntheticMedia) {
      throw new Error(`新動画のID・チャンネル・文面・制作開示が不一致: ${Object.entries(fields).filter(([, ok]) => !ok).map(([key]) => key).join(',')}`);
    }
    if (!['private', 'public'].includes(actual.status?.privacyStatus)) throw new Error('想定外の公開状態');
  };
  try {
    current();
    if (journal) {
      const remote = await journal.load();
      if (remote) {
        if (remote.pubId !== pubId || remote.delivery?.inputSha256 !== plan.digest || remote.delivery?.marker !== plan.marker) throw new Error('非公開投稿意図と今の入力が不一致');
        if (pub.delivery && !same(pub.delivery, remote.delivery)) {
          // R2 は CI が途中停止した後の実行状態。台帳に新しい動画IDがあり R2 だけ古い場合は止める。
          if (pub.delivery.videoId && remote.delivery.videoId !== pub.delivery.videoId) throw new Error('台帳と非公開投稿意図の動画IDが不一致');
        }
        pub.delivery = remote.delivery;
        save();
      }
    }
    await assertChannel(youtube, plan.channel);
    if (!pub.delivery?.videoId) {
      // タイトルだけで旧版を選ばない。全件照合できない場合もinsertしない。
      const inventory = await channelInventory(youtube, plan.channel);
      const hits = inventory.videos.filter(v => v.snippet?.tags?.includes(plan.marker));
      if (hits.length > 1) throw new Error('投稿markerが複数動画にあるため停止');
      if (hits.length === 1) {
        if (!pub.delivery?.uploadRequestedAt) throw new Error('実行記録のない同marker動画。自動採用しない');
        claimId(hits[0].id); await journalSave(); save();
      } else {
        if (pub.delivery?.uploadRequestedAt) throw new Error('upload結果不明。再投稿せずmarkerの実体確認が必要');
        if (phase !== 'upload') throw new Error('先に改訂版を非公開アップロードする');
        const bytes = verifiedBytes(root, plan.assets.video);
        pub.delivery = { inputSha256: plan.digest, marker: plan.marker, uploadRequestedAt: at() }; await journalSave(); save();
        let response;
        try {
          response = await youtube.videos.insert({ part: 'snippet,status', notifySubscribers: false,
            requestBody: { snippet: plan.snippet, status: { privacyStatus: 'private', selfDeclaredMadeForKids: false, containsSyntheticMedia: plan.disclosure.containsSyntheticMedia } },
            media: { mimeType: 'video/mp4', body: Readable.from([bytes]) } }, { retry: false });
        } catch { throw new Error('upload結果不明。intentを保持し、再投稿せずverifyで照合する'); }
        summary.externalActions++;
        claimId(response.data?.id); await journalSave(); save();
      }
    }
    claimId(pub.delivery.videoId);
    let actual = await getVideo(youtube, pub.delivery.videoId, true);
    verifyIdentity(actual);
    if (['failed', 'terminated'].includes(actual.processingDetails?.processingStatus) || ['failed', 'rejected', 'deleted'].includes(actual.status?.uploadStatus)) throw new Error('動画処理失敗。旧動画を変更せず新規再投稿もしない');
    const media = { bytes: plan.facts.video.bytes, duration: plan.facts.video.durationSec, width: plan.facts.cover.width, height: plan.facts.cover.height };
    if (!assertProcessed(actual, { oldVideo: { id: plan.source.platform?.id, snippet: { channelId: plan.channel.id } }, media })) return { ...summary, result: 'processing-pending' };
    pub.delivery.processedAt ??= at(); await journalSave();
    let scheduled = actual.status.publishAt && Date.parse(actual.status.publishAt) === Date.parse(pub.publishAt);
    if (actual.status.privacyStatus === 'public') {
      if (!pub.delivery.scheduledVerifiedAt || now() < Date.parse(pub.delivery.scheduleAt)) throw new Error('予定外の即時公開。変更せず停止');
      pub.status = 'published'; pub.platform = { ...pub.platform, privacy: 'public', evidence: { kind: 'publisher-live-check', ref: pub.copy } }; save();
      return { ...summary, result: 'published-verified' };
    }
    if (actual.status.publishAt && (!scheduled || !pub.delivery.scheduleRequestedAt)) throw new Error('要求していない予約が存在する');
    pub.platform = { ...pub.platform, id: pub.delivery.videoId, url: `https://www.youtube.com/watch?v=${pub.delivery.videoId}`, privacy: 'private', evidence: { kind: 'publisher-live-check', ref: pub.copy } };
    pub.times = { ...pub.times, uploaded: pub.times?.uploaded ?? at() };
    if (!scheduled) pub.status = 'uploaded_private';
    save();
    if (['upload', 'schedule'].includes(phase) && !pub.delivery.thumbnailAcceptedAt) {
      if (pub.delivery.thumbnailRequestedAt) throw new Error('表紙(thumbnail)結果不明。自動再送しない');
      pub.delivery.thumbnailRequestedAt = at(); await journalSave(); save();
      let response;
        try { response = await youtube.thumbnails.set({ videoId: pub.delivery.videoId, media: { mimeType: thumbnail.mimeType, body: Readable.from([thumbnail.bytes]) } }, { retry: false }); }
      catch { throw new Error('thumbnail結果不明。intentを保持して停止'); }
      summary.externalActions++;
      pub.delivery.thumbnailUrls = (response.data?.items ?? []).flatMap(urls);
      if (!pub.delivery.thumbnailUrls.length) throw new Error('thumbnail応答を確認できない。再送しない');
      pub.delivery.thumbnailAcceptedAt = at(); await journalSave(); save();
      actual = await getVideo(youtube, pub.delivery.videoId, true); verifyIdentity(actual);
      scheduled = actual.status.publishAt && Date.parse(actual.status.publishAt) === Date.parse(pub.publishAt);
      if (actual.status.privacyStatus !== 'private' || (actual.status.publishAt && (!scheduled || !pub.delivery.scheduleRequestedAt))) throw new Error('表紙設定中に公開状態・予約が変わったため停止');
    }
    const thumbnailVerified = pub.delivery.thumbnailAcceptedAt && pub.delivery.thumbnailUrls?.some(url => urls(actual.snippet.thumbnails).includes(url));
    if (thumbnailVerified) { pub.thumbnail = { ...pub.thumbnail, status: 'set', setAt: pub.delivery.thumbnailAcceptedAt }; save(); }
    if (scheduled) {
      if (!thumbnailVerified) throw new Error('予約実体の表紙読取が未確認');
      pub.status = 'scheduled'; pub.delivery.scheduledVerifiedAt = at(); pub.times.scheduled ??= at(); await journalSave(); save();
      return { ...summary, result: 'scheduled-verified', publishAt: actual.status.publishAt };
    }
    if (phase !== 'schedule') return { ...summary, result: thumbnailVerified ? 'private-ready' : 'private-thumbnail-unverified' };
    if (!thumbnailVerified) throw new Error('表紙のAPI応答・読取が未確認');
    if (pub.delivery.scheduleRequestedAt) throw new Error('schedule結果不明。再送せずverifyで照合する');
    if (pub.format === 'short') {
      const related = loadRegistry(root).publications.find(p => p.id === pub.relatedTo);
      if (!videoIdValid(related?.platform?.id) || pub.platform.relatedVideoId !== related.platform.id || pub.platform.desiredRelatedVideoId !== related.platform.id) throw new Error('Shortsの新版関連動画のStudio確認記録が必要');
      const parent = await getVideo(youtube, related.platform.id);
      if (!parent || parent.snippet?.channelId !== plan.channel.id || !['public', 'unlisted'].includes(parent.status?.privacyStatus)) throw new Error('新版の関連動画を視聴できない');
    }
    actual = await getVideo(youtube, pub.delivery.videoId, true); verifyIdentity(actual);
    if (actual.status.privacyStatus !== 'private' || actual.status.publishAt) throw new Error('予約直前に公開状態・予約が変わったため停止');
    current();
    pub.delivery.scheduleRequestedAt = at(); pub.delivery.scheduleAt = pub.publishAt; await journalSave(); save();
    try {
      await youtube.videos.update({ part: 'status', requestBody: { id: pub.delivery.videoId,
        status: { ...writableStatus(actual), privacyStatus: 'private', publishAt: pub.publishAt } } }, { retry: false });
    } catch { throw new Error('schedule結果不明。intentを保持し、再送せずverifyで照合する'); }
    summary.externalActions++;
    for (let attempt = 0; attempt < 5; attempt++) {
      if (attempt) await wait(2000);
      actual = await getVideo(youtube, pub.delivery.videoId, true); verifyIdentity(actual);
      if (actual.status.privacyStatus === 'private' && Date.parse(actual.status.publishAt) === Date.parse(pub.publishAt)) break;
    }
    if (actual.status.privacyStatus !== 'private' || Date.parse(actual.status.publishAt) !== Date.parse(pub.publishAt)) throw new Error('予約応答の読取不一致。再送せずverifyで照合する');
    pub.status = 'scheduled'; pub.delivery.scheduledVerifiedAt = at(); pub.times.scheduled = at(); await journalSave(); save();
    return { ...summary, result: 'scheduled-verified', publishAt: actual.status.publishAt };
  } finally { session.close(); }
}

export async function publishYoutubeRevision(root, options, dependencies) {
  revisionPublishPlan(root, options.pubId, dependencies?.now?.() ?? Date.now());
  return publishYoutubePublication(root, options, dependencies);
}
