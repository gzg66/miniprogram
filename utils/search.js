// utils/search.js —— 本地索引检索（标题 > 关键词 > 正文）
// 评分：标题命中 100、terms 命中 60、snippet 命中 20，标题全等再 +40；
// 同分按 stars 降序。book/type 为可选的硬过滤，limit 为可选的截断长度。
function scoreRow(row, q) {
  const title = row.title || '';
  const type = row.type || '';
  const kind = row.kind || '';
  const terms = (row.terms || []).join(' ');
  const snip = row.snippet || '';
  let score = 0;
  const matched = [];
  if (title.indexOf(q) >= 0) { score += 100; matched.push('title'); }
  if (title === q) score += 40;
  if (type.indexOf(q) >= 0) { score += 80; matched.push('type'); }
  if (kind.indexOf(q) >= 0) { score += 70; matched.push('kind'); }
  if (terms.indexOf(q) >= 0) { score += 60; matched.push('terms'); }
  if (snip.indexOf(q) >= 0) { score += 20; matched.push('snippet'); }
  return { score, matched };
}

// 页面路由有时使用 art/film，索引记录使用中文书名；两种写法都允许，
// 避免预览版或跨页面搜索把正确结果误过滤掉。
function normalizeBook(book) {
  if (book === 'art') return '艺术概论';
  if (book === 'film') return '电影概论';
  return book || '';
}

function search(index, query, opts) {
  const o = opts || {};
  const q = (query || '').trim();
  if (!q) return [];
  const wantedBook = normalizeBook(o.book);
  const out = [];
  for (const row of index) {
    if (wantedBook && row.book !== wantedBook) continue;
    if (o.type && row.type !== o.type) continue;
    const r = scoreRow(row, q);
    if (r.score > 0) out.push({ row, score: r.score, matched: r.matched });
  }
  out.sort((a, b) => b.score - a.score || (b.row.stars || 0) - (a.row.stars || 0));
  return typeof o.limit === 'number' ? out.slice(0, o.limit) : out;
}

function scoreDoc(row, q) {
  const title = row.title || '';
  const terms = (row.terms || []).join(' ');
  const text = row.text || row.snippet || '';
  let score = 0;
  const matched = [];
  if (title.indexOf(q) >= 0) { score += 80; matched.push('title'); }
  if (terms.indexOf(q) >= 0) { score += 30; matched.push('terms'); }
  if (text.indexOf(q) >= 0) { score += 20; matched.push('text'); }
  return { score, matched };
}

// 只有题库搜索为空时才由页面调用，避免电脑文档重复淹没高质量题库结果。
function searchDocs(index, query, opts) {
  const o = opts || {};
  const q = (query || '').trim();
  if (!q) return [];
  const wantedBook = normalizeBook(o.book);
  const out = [];
  for (const row of (index || [])) {
    if (wantedBook && row.book !== wantedBook) continue;
    const r = scoreDoc(row, q);
    if (r.score > 0) out.push({ row, score: r.score, matched: r.matched });
  }
  out.sort((a, b) => b.score - a.score);
  return typeof o.limit === 'number' ? out.slice(0, o.limit) : out;
}

module.exports = { search, scoreRow, searchDocs, scoreDoc };
