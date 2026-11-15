/** 施工管理基準の表示用投影。原文照合済みの表だけを受け、配布用Markdownには触れない。 */
import { overrideParts, overrideTexts, resolveTablePart } from './standards-table.mjs';

export const GROUPED_EXCEPTIONS = new Set([
  'ca5f0c2db24112d7', '9064d57a26078f7d', '1afa7fe58fbb8c5e',
  '1c67cc73d3d47582', '0cc13e23cfad408e', 'fe8f808b4a34cb16', '1937ba6d73a14b92',
]);
const compact = (s) => String(s).replace(/[\s\u3000]+/gu, '');
const digits = (s) => String(s).replace(/[０-９]/gu, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
const numbered = (s) => String(s).replace(/^([０-９0-9]+)[\s\u3000]*(?=[^０-９0-9\s])/u, '$1 ');
const escape = (s) => String(s).replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;')
  .replace(/\{/gu, '&#123;').replace(/\}/gu, '&#125;').replace(/\|/gu, '&#124;')
  .replace(/([\\`*_[\]])/gu, '\\$1').replace(/\r?\n/gu, ' ');
const table = (headers, rows) => [headers, headers.map(() => '---'), ...rows]
  .map((row) => `| ${row.map(escape).join(' | ')} |`).join('\n');
const unique = (values) => [...new Set(values.filter(Boolean))];

/** 空の継続列も直前の列の意味を継承する。セルの値は空欄のまま保つ。 */
export function classifyGroupedTable(part) {
  let last = '';
  const names = part.header[0].map((name) => { last = compact(name) || last; return last; });
  const quality = names.includes('試験項目');
  const roles = names.map((name) => {
    if ((quality ? ['工種', '種別', '試験区分'] : ['編', '章', '節', '条', '枝番', '工種']).includes(name)) return 'group';
    if (['測定項目', '試験項目', '規格値'].includes(name)) return 'body';
    if (name === '測定箇所') return 'figure';
    if (name === '摘要' && !quality) return 'code';
    if (['測定基準', '試験方法', '試験時期・頻度', '摘要', '試験成績表等による確認'].includes(name)) return 'note';
    return 'unknown';
  });
  const values = names.flatMap((name, i) => name === '規格値' ? [i] : []);
  const items = names.flatMap((name, i) => name === (quality ? '試験項目' : '測定項目') ? [i] : []);
  const valueHeaders = part.header[0].filter((name) => compact(name) === '規格値').length;
  const type = quality ? 'quality' : valueHeaders > 2 ? 'dekigata_scale' : valueHeaders === 2 ? 'dekigata_dual' : 'dekigata';
  return { names, roles, values, items, type, ok: !roles.includes('unknown') && items.length > 0 && values.length > 0 };
}

export function prepareGroupedTable(override, lookup) {
  const raw = overrideParts(override);
  const parts = raw.map((p) => p.kind === 'table' ? resolveTablePart(p, lookup, { abbreviate: false }) : p);
  const sourceText = unique([...(override.kind === 'verbatim' ? override.layout : []), ...overrideTexts(raw), ...parts.flatMap((p) => p.kind === 'table' && !p.error ? [...p.header, ...p.rows].flat() : [])]).join('\n');
  if (GROUPED_EXCEPTIONS.has(override.key)) return { ok: false, reason: 'review-required', sourceText };
  if (override.kind === 'verbatim') return { ok: false, reason: 'verbatim', sourceText: override.layout.join('\n') };
  for (const part of parts) {
    if (part.error) return { ok: false, reason: part.error, sourceText };
    if (part.kind === 'table' && !classifyGroupedTable(part).ok) return { ok: false, reason: 'unknown-columns', sourceText };
    if (part.kind === 'verbatim' && override.key !== '39a76733f2e3e2fa') return { ok: false, reason: 'unhandled-part', sourceText };
    if (!['table', 'note', 'text', 'caption', 'verbatim'].includes(part.kind)) return { ok: false, reason: 'unhandled-part', sourceText };
  }
  if (!parts.some((p) => p.kind === 'table')) return { ok: false, reason: 'no-table', sourceText };
  return { ok: true, parts, raw, sourceText };
}

function varyingGroups(records) {
  const values = new Map();
  for (const { prepared } of records) {
    if (!prepared.ok) continue;
    for (const part of prepared.parts.filter((p) => p.kind === 'table')) {
      const { names, roles } = classifyGroupedTable(part);
      for (const row of part.rows) names.forEach((name, c) => {
        if (roles[c] !== 'group') return;
        if (!values.has(name)) values.set(name, new Set());
        values.get(name).add(row[c]);
      });
    }
  }
  return new Set([...values].filter(([, v]) => v.size > 1).map(([name]) => name));
}

function headings(row, names, varying, key) {
  const get = (name) => row[names.indexOf(name)] ?? '';
  if (names.includes('試験項目')) return ['工種', '種別', '試験区分'].filter((name) => varying.has(name)).map((name) => get(name)).filter(Boolean);
  const result = [];
  const parents = ['編', '章', '節'].filter((name) => varying.has(name)).map((name) => numbered(get(name))).filter(Boolean);
  // 編・章が変わる場合も節までを1つにまとめ、工種と規模にH3/H4を残す。
  if (parents.length) result.push(parents.join(' ／ '));
  let clause = digits(get('条'));
  if (['8e381b9466efaa15', 'a64c9206a7b8f4e5'].includes(key) && clause === '34') clause = '3・4';
  const title = [clause, digits(get('枝番'))].filter(Boolean).join('-');
  result.push([title, get('工種'), get('摘要') && `（${get('摘要')}）`].filter(Boolean).join(' '));
  return result.filter(Boolean);
}

const FULLWIDTH_DIGITS = '０１２３４５６７８９';
const toFullwidth = (n) => String(n).split('').map((d) => FULLWIDTH_DIGITS[Number(d)]).join('');

/**
 * 「１．…２．…３．…」と番号付きで 1 つのセルに詰まった注記を、番号ごとの箇条に分ける（スマホで 1 段落に詰まって読めなかった）。
 * 番号は 1 から連番で現れたものだけを区切りにする（文中の「２．５m」のような数を誤って切らない）。文字は 1 つも足し引きしない。
 */
export function numberedNoteItems(text) {
  if (!text.startsWith('１．')) return text;
  const cuts = [0];
  let from = 2;
  for (let n = 2; ; n += 1) {
    let at = text.indexOf(`${toFullwidth(n)}．`, from);
    // 番号の直後が数字なら小数（「２．５m」）なので区切りにしない
    while (at >= 0 && /[0-9０-９]/u.test(text[at + 2] ?? '')) at = text.indexOf(`${toFullwidth(n)}．`, at + 1);
    if (at < 0) break;
    cuts.push(at);
    from = at + 2;
  }
  if (cuts.length < 2) return text;
  return cuts.map((start, i) => `- ${text.slice(start, cuts[i + 1] ?? text.length).trim()}`).join('\n');
}

function renderPart(part, raw, { varying, key, unit, previous }) {
  const { names, roles, items, values, type } = classifyGroupedTable(part);
  const blocks = [];
  const coverage = [];
  const displayCell = (row, c) => compact(row[c]) === '同左' && c > 0 ? `${row[c]}（${names[c - 1]}欄）` : row[c];
  const groupCols = roles.flatMap((role, c) => ['group', 'code'].includes(role) ? [c] : []);
  const groups = [];
  part.rows.forEach((row, r) => {
    const identity = JSON.stringify(groupCols.map((c) => row[c]));
    if (groups.at(-1)?.identity !== identity) groups.push({ identity, rows: [] });
    groups.at(-1).rows.push({ row, r });
    row.forEach((text, c) => {
      const destination = roles[c] === 'figure' || (roles[c] === 'group' && !varying.has(names[c]) && !['条', '枝番', '工種'].includes(names[c])) ? 'source' : 'display';
      coverage.push({ row: r, column: c, text, destination });
    });
  });
  const headerLabels = (indices) => indices.map((c) => unique(part.header.slice(1).map((h) => h[c])).join(' ／ ') || '規格値');
  for (const group of groups) {
    const hs = headings(group.rows[0].row, names, varying, key);
    hs.forEach((h, i) => {
      if (previous[i] !== h) blocks.push(`${'#'.repeat(i + 2)} ${escape(h)}`);
      if (previous[i] !== h) previous.splice(i);
      previous[i] = h;
    });
    previous.splice(hs.length);
    let labels = headerLabels(values);
    const data = [];
    const notes = [];
    for (const entry of group.rows) {
      const { row } = entry;
      const name = items.filter((c) => raw.rows[entry.r][c]?.same !== 'left').map((c) => row[c]).filter(Boolean).join(' ／ ');
      if (values.length === 2 && ((!name && row[values[0]] === '平均値' && row[values[1]] === '個々の計測値') || (row[values[0]] === 'コンクリート橋' && row[values[1]] === '鋼橋'))) {
        labels = values.map((c) => row[c]);
        continue;
      }
      if (name.startsWith('※') && values.every((c) => !row[c])) { notes.push(name); continue; }
      data.push({ ...entry, name, valueLabels: [...labels] });
    }
    const noteCols = roles.flatMap((role, c) => role === 'note' && names[c] !== '試験時期・頻度' ? [c] : []);
    const differingNotes = noteCols.filter((c) => new Set(data.map(({ row }) => row[c])).size > 1);
    const numberedRows = differingNotes.length > 0;
    const renderRows = (cols, columnLabels, scale = '') => {
      if (scale) blocks.push(`${'#'.repeat(Math.min(4, hs.length + 2))} ${escape(scale)}`);
      // 規格値空欄の試験は行を保持し、その連続範囲だけ空の列を取り除く。
      const runs = [];
      for (const [index, entry] of data.entries()) {
        const active = cols.filter((c) => entry.row[c] !== '' && !(type !== 'quality' && raw.rows[entry.r][c]?.same === 'left' && cols.includes(c - 1)));
        const labels = active.map((c) => {
          if (type === 'quality' || scale) return columnLabels[cols.indexOf(c)];
          if (active.length === 1 && cols.length > 1) return '規格値';
          return entry.valueLabels[values.indexOf(c)];
        });
        const identity = JSON.stringify([active, labels]);
        if (runs.at(-1)?.identity !== identity) runs.push({ identity, active, labels, rows: [] });
        const suffix = numberedRows ? `〔${index + 1}〕` : '';
        runs.at(-1).rows.push([entry.name + suffix, ...active.map((c) => displayCell(entry.row, c))]);
      }
      for (const run of runs) {
        if (unit) blocks.push(escape(unit));
        blocks.push(table([type === 'quality' ? '試験項目' : '測定項目', ...run.labels], run.rows));
      }
    };
    if (type === 'quality') {
      const frequency = names.indexOf('試験時期・頻度');
      const cols = [...values, ...(frequency >= 0 ? [frequency] : [])];
      renderRows(cols, [...values.map(() => '規格値'), ...(frequency >= 0 ? ['試験時期・頻度'] : [])]);
    } else if (type === 'dekigata_scale') {
      const scales = unique(values.map((c) => part.header.at(-1)[c]));
      if (!scales.length) return { ok: false, reason: 'unknown-scale' };
      for (const scale of scales) {
        const cols = values.filter((c) => part.header.at(-1)[c] === scale);
        if (cols.length > 2) return { ok: false, reason: 'too-many-values' };
        cols.sort((a, b) => Number(!/平均/u.test(part.header[1][a])) - Number(!/平均/u.test(part.header[1][b])));
        renderRows(cols, cols.map((c) => part.header.slice(1, -1).map((h) => h[c]).filter(Boolean).join(' ／ ')), scale);
      }
    } else {
      // 横結合だけの規格値なら「平均／個々」を前の工種から持ち越さない。
      const merged = values.length === 2 && data.every(({ r }) => raw.rows[r][values[1]]?.same === 'left');
      const cols = merged ? values.slice(0, 1) : [...values];
      if (!merged) cols.sort((a, b) => Number(!/平均/u.test(labels[values.indexOf(a)])) - Number(!/平均/u.test(labels[values.indexOf(b)])));
      renderRows(cols, merged ? ['規格値'] : cols.map((c) => labels[values.indexOf(c)]));
    }
    for (const c of noteCols) {
      const label = unique(part.header.map((h) => h[c])).join(' ／ ');
      if (!data.some(({ row }) => row[c])) continue;
      blocks.push(`**${escape(label)}**`);
      if (!differingNotes.includes(c)) blocks.push(numberedNoteItems(escape(displayCell(data[0].row, c))));
      else blocks.push(data.flatMap(({ row, name }, index) => row[c] ? [`- 〔${index + 1}〕${escape(name)}：${escape(displayCell(row, c))}`] : []).join('\n'));
    }
    blocks.push(...unique(notes).map(escape));
    const figures = roles.flatMap((role, c) => role === 'figure' ? group.rows.map(({ row }) => row[c]) : []);
    for (const text of unique(figures)) {
      // 図ラベルの後ろの説明文は捨てない。かぶりの定義等は段落にする。
      const definition = text.match(/※[\s\S]+/u)?.[0];
      if (definition) blocks.push(escape(definition));
    }
    // 図ラベルの代わりの原本リンクは表ごとに出さない（同じ PDF への繰り返しになる。2026-11-15 運営者判断）。
    // 原本へはページ末の出典表示（StandardsAttribution）の「原本PDF（p.N〜M）」1 か所から開く。
  }
  return { ok: true, markdown: blocks.join('\n\n'), coverage };
}

/** canonical の marker を保持したまま表示だけ差し替える。records は生成器の照合成功順。 */
export function projectGroupedChapter(markdown, records, { sourceUrl }) {
  const varying = varyingGroups(records);
  const previous = [];
  const tables = [];
  let cursor = 0;
  let previousEnd = 0;
  const output = markdown.replace(/\{\/\* table-override: ([a-f0-9]{16}) \*\/\}\n([\s\S]*?)(<SourceRef pages="([^"]+)" kind="table" \/>)/gu, (whole, key, body, ref, pages, offset) => {
    if (markdown.slice(previousEnd, offset).replace(/\{\/\*[\s\S]*?\*\/\}/gu, '').trim()) previous.length = 0;
    previousEnd = offset + whole.length;
    const record = records[cursor++];
    if (!record || record.key !== key) throw new Error(`grouped occurrence mismatch: ${key}`);
    const prepared = record.prepared;
    const id = `standard-table-${key}-${cursor}`;
    const result = { key, id, pages, ok: prepared.ok, reason: prepared.reason ?? 'grouped', sourceText: prepared.sourceText, coverage: [] };
    const blocks = [];
    if (prepared.ok) {
      const unit = prepared.parts.find((p) => p.kind !== 'table' && /^単位[：:]/u.test(p.text ?? ''))?.text ?? (prepared.parts.some((p) => p.kind === 'table' && classifyGroupedTable(p).type !== 'quality') ? '単位：mm' : null);
      for (const [index, part] of prepared.parts.entries()) {
        if (part.kind === 'table') {
          const rendered = renderPart(part, prepared.raw[index], { varying, key, sourceUrl, pages, unit, previous });
          if (!rendered.ok) { result.ok = false; result.reason = rendered.reason; break; }
          blocks.push(rendered.markdown);
          result.coverage.push(...rendered.coverage.map((cell) => ({ part: index, ...cell })));
        } else if (part.kind === 'verbatim') blocks.push('d＝D÷(n－1)');
        else if (part.text !== unit) blocks.push(escape(part.text));
      }
    }
    if (!result.ok) previous.length = 0;
    result.markdown = result.ok ? blocks.filter(Boolean).join('\n\n') : body.trim();
    tables.push(result);
    // 例外は元のブロックをバイト単位で保持。検索用の全文は元表のままでも補完する。
    if (!result.ok) return `<section id="${id}" data-standard-table="${id}">\n\n${whole}\n\n</section>`;
    return `{/* table-override: ${key} */}\n\n<section id="${id}" data-standard-table="${id}">\n\n${result.markdown}\n\n</section>\n\n${ref}`;
  });
  if (cursor !== records.length) throw new Error(`grouped unmatched records: ${records.length - cursor}`);
  let textIndex = 0;
  const text = markdown.replace(/\{\/\* table-override: [a-f0-9]{16} \*\/\}\n[\s\S]*?<SourceRef[^>]*\/>/gu, () => tables[textIndex++].sourceText)
    .replace(/\{\/\*[\s\S]*?\*\/\}/gu, '').replace(/<SourceRef[^>]*\/>/gu, '');
  return { markdown: output, text, tables };
}

/** 表示の省略は図ラベル・章内固定groupだけ。JSONの全セルはsourceTextにも必ず残す。 */
export function groupedCoverageErrors(presentation) {
  const normalize = (s) => digits(s).replace(/&lt;/gu, '<').replace(/&gt;/gu, '>').replace(/&amp;/gu, '&')
    .replace(/&#(\d+);/gu, (_, n) => String.fromCharCode(Number(n))).replace(/[\s\\／・-]/gu, '');
  const errors = [];
  for (const t of presentation.tables.filter((t) => t.ok)) {
    for (const cell of t.coverage) {
      const expected = normalize(cell.text);
      if (expected && !normalize(t.sourceText).includes(expected)) errors.push(`${t.key}: source ${cell.part}/${cell.row}/${cell.column}`);
      // 見出しは直前の表から継続することがあるため章全体で照合。
      if (cell.destination === 'display' && expected && !normalize(presentation.markdown).includes(expected)) errors.push(`${t.key}: display ${cell.part}/${cell.row}/${cell.column}: ${cell.text}`);
    }
  }
  return errors;
}

/** セル割当は検査時に再計算する。配信用ファイルに重複した表本文・割当台帳を積まない。 */
export function groupedArtifact(presentation) {
  return { ...presentation, tables: presentation.tables.map(({ coverage: _coverage, markdown: _markdown, ...table }) => table) };
}
