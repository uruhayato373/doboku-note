/**
 * coconala-guards.mjs — ココナラ運用の「判断」部分を純関数に切り出したもの
 * ---------------------------------------------------------------------------
 * なぜ切り出すか:
 *   2026-08-05 のココナラ大改編（受注突合・統廃合・全件休止・アーカイブ）で追加した判定は、
 *   すべて**手動の変異テスト**でしか確認していなかった。判定はブラウザにも I/O にも依存しない
 *   純粋な条件分岐なので、`scripts/lib/report-honesty.mjs` と同じ流儀で関数に落とし、
 *   `tests/*.test.mjs`（`npm test` = node --test tests/*.test.mjs）で固定する。
 *
 * ここに置くもの: 入力→分類のみ。ファイル読み書き・Playwright・console 出力は呼び出し側。
 * ---------------------------------------------------------------------------
 */

/** 休止・再開・アーカイブの操作種別 */
export const PAUSE_REASONS = ['retired', 'absence'];

/**
 * 操作（休止/再開/アーカイブ）の対象を、カタログから選び分ける。
 *
 * カタログが常に「意図の真実源」なので、live の状態ではなくカタログ status で決める。
 *   休止    : status:'paused' のものだけ（listed の実売商品は構造的に休止できない）
 *   再開    : status:'listed' のものだけ（先にカタログを戻す運用）
 *   アーカイブ: status:'paused' かつ pauseReason:'retired' のものだけ
 *              （absence＝長期不在の一時休止を誤ってアーカイブしない）
 *
 * @param {Array<{id,status,pauseReason?}>} services カタログの全サービス
 * @param {{mode:'pause'|'resume'|'archive', ids?:string[], all?:boolean}} opts
 * @returns {{targets:Array, rejected:string[]}}
 */
export function selectTargets(services, { mode, ids, all = false } = {}) {
  const list = Array.isArray(services) ? services : [];
  const byId = new Map(list.map((s) => [s.id, s]));
  const wantStatus = mode === 'resume' ? 'listed' : 'paused';
  const label = mode === 'resume' ? '受付再開' : mode === 'archive' ? 'アーカイブ' : '受付休止';

  let candidates;
  if (all) {
    candidates = list
      .filter((s) => s.status === wantStatus)
      .filter((s) => (mode === 'archive' ? s.pauseReason === 'retired' : true))
      .map((s) => s.id);
  } else {
    candidates = Array.isArray(ids) ? ids : [];
  }

  const targets = [];
  const rejected = [];
  for (const id of candidates) {
    const svc = byId.get(id);
    if (!svc) { rejected.push(`${id}: カタログに存在しない`); continue; }
    if (svc.status !== wantStatus) {
      rejected.push(`${id}: status='${svc.status}' — ${label}できるのは status:'${wantStatus}' のものだけ`);
      continue;
    }
    if (mode === 'archive' && svc.pauseReason !== 'retired') {
      rejected.push(`${id}: pauseReason='${svc.pauseReason ?? 'なし'}' — アーカイブできるのは 'retired' だけ`);
      continue;
    }
    targets.push(svc);
  }
  return { targets, rejected };
}

/**
 * 「不在からの復帰」対象を選ぶ。pauseReason:'absence' だけを戻し、'retired' は据え置く。
 * pauseReason 未設定の paused があるときは**意味が判別できないので中断**（blocked）。
 * @returns {{absent:Array, retired:Array, unmarked:Array, blocked:boolean}}
 */
export function selectAbsenceResume(services) {
  const paused = (Array.isArray(services) ? services : []).filter((s) => s.status === 'paused');
  const absent = paused.filter((s) => s.pauseReason === 'absence');
  const retired = paused.filter((s) => s.pauseReason === 'retired');
  const unmarked = paused.filter((s) => !s.pauseReason);
  return { absent, retired, unmarked, blocked: unmarked.length > 0 };
}

/**
 * paused の表明（pauseReason / resumeOn）の健全性を検査する。
 * paused は「恒久廃止」と「一時休止」に多重化するので、区別が無いと一括復帰で廃止商品が復活する。
 * @returns {string[]} 違反メッセージ
 */
export function checkPauseReasons(services) {
  const out = [];
  for (const s of Array.isArray(services) ? services : []) {
    if (s.status === 'paused') {
      if (!s.pauseReason) {
        out.push(`[${s.id}] status:'paused' なのに pauseReason がありません（'retired' / 'absence' を明記）`);
      } else if (!PAUSE_REASONS.includes(s.pauseReason)) {
        out.push(`[${s.id}] 未知の pauseReason: "${s.pauseReason}"（${PAUSE_REASONS.join(' / ')} のいずれか）`);
      }
    } else if (s.pauseReason) {
      out.push(`[${s.id}] status:'${s.status}' なのに pauseReason が残っています（復帰時に消し忘れ）`);
    }
  }
  return out;
}

/**
 * 復帰忘れの検知。pauseReason:'absence' で resumeOn を過ぎているのに休止のままなら要対応。
 * 「不在中は全件休止」運用の**最後の輪**（戻し忘れると売上がゼロのまま気づかない）。
 * @param {Array} services カタログ
 * @param {string} today ISO 日付（'2026-08-18' 等）
 * @returns {Array<{id,resumeOn,overdueDays}>}
 */
export function findOverdueResume(services, today) {
  const t = Date.parse(today);
  const out = [];
  for (const s of Array.isArray(services) ? services : []) {
    if (s.status !== 'paused' || s.pauseReason !== 'absence' || !s.resumeOn) continue;
    const due = Date.parse(s.resumeOn);
    if (!Number.isFinite(due) || !Number.isFinite(t)) continue;
    if (t > due) out.push({ id: s.id, resumeOn: s.resumeOn, overdueDays: Math.floor((t - due) / 86_400_000) });
  }
  return out;
}

/**
 * snapshot（ココナラ側の実体）と orders-log（こちらの記録）を talkroomId で突合する。
 * @returns {{violations:string[], warnings:string[]}}
 */
export function reconcileOrders(snapOrders, logOrders) {
  const snaps = Array.isArray(snapOrders) ? snapOrders : [];
  const logs = Array.isArray(logOrders) ? logOrders : [];
  const byRoom = new Map(logs.filter((o) => o.talkroomId).map((o) => [String(o.talkroomId), o]));
  const violations = [];
  const warnings = [];

  for (const s of snaps) {
    const l = byRoom.get(String(s.talkroomId));
    if (!l) {
      violations.push(
        `ココナラに取引があるのに orders-log に記録がありません: room ${s.talkroomId}` +
          `（${s.serviceId ?? String(s.listingText ?? '').slice(0, 24)} / ¥${s.priceYen} / ${s.soldOn}）`
      );
      continue;
    }
    if (s.serviceId && l.serviceId !== s.serviceId) {
      violations.push(`room ${s.talkroomId}: serviceId 不一致（記録 "${l.serviceId}" vs 実体 "${s.serviceId}"）`);
    }
    if (typeof s.priceYen === 'number' && typeof l.priceYen === 'number' && s.priceYen !== l.priceYen) {
      violations.push(`room ${s.talkroomId}: priceYen 不一致（記録 ${l.priceYen} vs 実体 ${s.priceYen}）`);
    }
    if (s.soldOn && l.date && s.soldOn !== l.date) {
      violations.push(`room ${s.talkroomId}: 販売日 不一致（記録 ${l.date} vs 実体 ${s.soldOn}）`);
    }
  }

  const snapRooms = new Set(snaps.map((s) => String(s.talkroomId)));
  for (const l of logs) {
    if (!l.talkroomId) {
      warnings.push(`orders-log: ${l.serviceId}（${l.date}）に talkroomId がありません — 取引を追跡できません`);
      continue;
    }
    if (!snapRooms.has(String(l.talkroomId))) {
      warnings.push(`orders-log: room ${l.talkroomId}（${l.serviceId}）がココナラ側の一覧にありません`);
    }
  }
  return { violations, warnings };
}

/**
 * 返信期限（48時間の自動キャンセル）の分類。
 * `unreplied` では判定しない——納品予定日を登録するだけで coconala の未返信フラグは false に
 * 反転する一方、期限バナーは残るため（2026-08-05 実測）。**期限が採れている限り surface する**。
 *
 * ★「返信期限」は正式な納品の前後で**意味が反転する**（2026-08-06 実測）:
 *   - 納品前 = 出品者の連絡期限。無連絡で**取引が自動キャンセル**（＝売上が消える。要対応）
 *   - 納品後（statusLabel:'納品確認待ち'）= 買い手の承諾/差し戻し期限。
 *     無回答なら自動的に「承諾」＝出品者の作業は無い（＝要対応ではない）
 *   同じ枠・同じ文字列なので、区別しないと**不在中に偽の要対応が立つ**。
 *   未知の statusLabel は出品者側の期限として扱う（surface する方が安全）。
 * @returns {{level:'expired'|'urgent'|'notice'|'buyer-confirm'|'unknown', hoursLeft:number|null, order}[]}
 */
export const BUYER_CONFIRM_STATUS = '納品確認待ち';

export function classifyReplyDeadlines(snapOrders, nowMs, { warnHours = 24 } = {}) {
  const out = [];
  for (const s of Array.isArray(snapOrders) ? snapOrders : []) {
    if (!s.unreplied && !s.replyDueAt) continue;
    if (!s.replyDueAt) { out.push({ level: 'unknown', hoursLeft: null, order: s }); continue; }
    const left = (Date.parse(s.replyDueAt) - nowMs) / 3_600_000;
    if (s.statusLabel === BUYER_CONFIRM_STATUS) {
      out.push({ level: 'buyer-confirm', hoursLeft: left, order: s });
      continue;
    }
    const level = left < 0 ? 'expired' : left <= warnHours ? 'urgent' : 'notice';
    out.push({ level, hoursLeft: left, order: s });
  }
  return out;
}

/**
 * snapshot が検査に使える状態かを判定する（「検査ゼロを PASS と呼ばない」）。
 * @returns {{ok:boolean, reason?:string, ageDays:number|null}}
 */
export function assessSnapshot(snap, nowMs, { staleDays = 7, checkFreshness = true } = {}) {
  if (!snap || snap.__parseError) return { ok: false, reason: 'snapshot がありません', ageDays: null };
  if (snap.status !== 'ok') return { ok: false, reason: `snapshot.status="${snap.status}"（取得できなかったタブがある）`, ageDays: null };
  const ageDays = (nowMs - Date.parse(snap.fetchedAt)) / 86_400_000;
  if (!Number.isFinite(ageDays)) return { ok: false, reason: 'fetchedAt が不正', ageDays: null };
  if (checkFreshness && !(ageDays < staleDays)) {
    return { ok: false, reason: `snapshot が古い（${ageDays.toFixed(1)} 日前・上限 ${staleDays} 日）`, ageDays };
  }
  return { ok: true, ageDays };
}

/**
 * DM（問い合わせ）を「返信が要るか」で仕分ける。
 *
 * 背景（2026-08-17）: check-coconala-orders は既読 DM を無条件で「要対応」に積んでいたため、
 * 決着済みの 4 件が毎週出続け、**本物の警告を埋もれさせていた**（W33 レビューと W34 計画の
 * 両方がこの偽陽性に引っかかった）。X の陳腐化下書きと同じ「退役しない surfacer はノイズになる」構図。
 *
 * 落とす条件は **構造的に返信できないもの**に限る（実機で確認した 3 形）:
 *   - fromStaff:         送信者が「ココナラ 運営スタッフ」＝運営からの一方向通知
 *   - oneWay:            本文に「返信は行なっていない」（運営通知の定型文）
 *   - violationRemoved:  本文が「規約違反のため削除されました」＝相手はアカウント制限済み
 * これらは actions ではなく **infos に残す**。出品取り下げのような重要通知はここにしか来ず
 * （メールは出品アカウント宛にしか届かない）、黙って消すと気づく経路が無くなる。
 *
 * 人が決着させた DM は resolved リスト（.claude/config/coconala/resolved-inquiries.json）で除外し、
 * **除外件数を必ず呼び出し側へ返す**（黙って消すと「検査ゼロを PASS と呼ぶ」ことになる）。
 *
 * @param {Array} inquiries snapshot.inquiries
 * @param {Array} resolved  [{dmId, reason}] 人が決着と判断した DM
 * @returns {{actions:Array, infos:Array, excluded:Array}}
 */
/**
 * DM 一覧の日付表記（相対『19時間前』/ 絶対『8月12日』）を概算の epoch ms へ直す。
 * 決着済み DM に新着が入ったかを判定するためだけに使うので、日単位の粗さで足りる。
 * 解釈できないときは null を返し、呼び出し側は『隠さない』側へ倒す。
 */
export function parseInquiryDate(dateText, nowMs) {
  const text = String(dateText ?? '').trim();
  if (!text) return null;
  if (/たった今|今すぐ/.test(text)) return nowMs;
  const rel = /^(\d+)\s*(分|時間|日|週間|か月|ヶ月)前$/.exec(text);
  if (rel) {
    const n = Number(rel[1]);
    const unit = { 分: 60e3, 時間: 3600e3, 日: 86400e3, 週間: 7 * 86400e3, 'か月': 30 * 86400e3, 'ヶ月': 30 * 86400e3 }[rel[2]];
    return unit ? nowMs - n * unit : null;
  }
  const abs = /^(\d{1,2})月(\d{1,2})日$/.exec(text);
  if (abs) {
    const now = new Date(nowMs);
    let t = Date.UTC(now.getUTCFullYear(), Number(abs[1]) - 1, Number(abs[2]));
    // 年をまたぐ表記（12月◯日 を 1 月に見る）は前年扱いにする
    if (t > nowMs + 86400e3) t = Date.UTC(now.getUTCFullYear() - 1, Number(abs[1]) - 1, Number(abs[2]));
    return t;
  }
  const ymd = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(text);
  if (ymd) return Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
  return null;
}

export function classifyInquiries(inquiries, resolved = [], nowMs = Date.now()) {
  const resolvedMap = new Map(
    (Array.isArray(resolved) ? resolved : []).map((r) => [
      String(r?.dmId ?? ''),
      { reason: r?.reason || '決着済み', resolvedOn: r?.resolvedOn ?? null },
    ]),
  );
  const actions = [];
  const infos = [];
  const excluded = [];
  for (const q of Array.isArray(inquiries) ? inquiries : []) {
    if (!q || !q.dmId) continue;
    const id = String(q.dmId);
    if (resolvedMap.has(id)) {
      // 決着は『その時点まで』の判断でしかない。同じスレッドに新着が入ったら再オープンする。
      // dmId 単位で永久に除外していたため、2026-08-30 に既存顧客（room 18091375・¥7,500）の
      // 問い合わせが要対応から消えていた（人が画面で気づいて発覚）。
      const entry = resolvedMap.get(id);
      const hasDate = String(q.dateText ?? '').trim() !== '';
      const lastMs = hasDate ? parseInquiryDate(q.dateText, nowMs) : null;
      const resolvedMs = entry.resolvedOn ? Date.parse(entry.resolvedOn) : null;
      // 手がかりが何も無いときだけ従来どおり除外する。日付があるのに読めない／いつ決着
      // したか分からない場合は「比較できなかった」ので隠さない側へ倒す。
      const undecidable = hasDate && (lastMs === null || resolvedMs === null);
      const newer = lastMs !== null && resolvedMs !== null && lastMs > resolvedMs;
      if (!undecidable && !newer) {
        excluded.push({ ...q, why: entry.reason });
        continue;
      }
      actions.push({
        ...q,
        reopened: true,
        why: newer
          ? `決着済み（${entry.resolvedOn}）の後に新着（${q.dateText}）`
          : `決着済み（${entry.reason}）だが新旧を判定できないため隠さない（${q.dateText}）`,
      });
      continue;
    }
    if (q.violationRemoved) {
      infos.push({ ...q, why: '規約違反として削除済み（相手はアカウント制限中で返信不可）' });
      continue;
    }
    if (q.fromStaff || q.oneWay) {
      infos.push({ ...q, why: 'ココナラ運営からの一方向通知（返信不可・問い合わせフォームへ）' });
      continue;
    }
    actions.push(q);
  }
  return { actions, infos, excluded };
}
