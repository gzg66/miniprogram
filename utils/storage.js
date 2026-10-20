// utils/storage.js —— 本地记录（进度/错题/收藏/统计），后端可注入便于测试
//
// key 规范（spec §7.2）：drill|wrong|fav|stats|today : art|film
// book 经 store.bookKey 归一，未知值抛错（避免写入 wrong:艺术概论 这类互不可见的键）
const { bookKey } = require('./store');

function createStorage(backend) {
  const key = (kind, book) => kind + ':' + bookKey(book);
  const read = (k, dft) => {
    const v = backend.getSync(k);
    return v === '' || v === undefined || v === null ? dft : v;
  };
  const write = (k, v) => backend.setSync(k, v);
  const mkStats = () => ({ answered: 0, known: 0, unknown: 0, byChapter: {} });
  const needId = id => {
    if (typeof id !== 'string' || !id) throw new Error('storage: bad item id ' + id);
    return id;
  };

  const getProgress = book => read(key('drill', book), null);
  const setProgress = (book, obj) => write(key('drill', book), obj);

  const getWrong = book => read(key('wrong', book), []);
  const addWrong = (book, id) => {
    const arr = getWrong(book);
    const v = needId(id);
    if (arr.indexOf(v) < 0) { arr.push(v); write(key('wrong', book), arr); }
  };
  const removeWrong = (book, id) => write(key('wrong', book), getWrong(book).filter(x => x !== id));

  const getFav = book => read(key('fav', book), []);
  const toggleFav = (book, id) => {
    const v = needId(id);
    const arr = getFav(book);
    const i = arr.indexOf(v);
    if (i >= 0) { arr.splice(i, 1); write(key('fav', book), arr); return false; }
    arr.push(v); write(key('fav', book), arr); return true;
  };

  const annotationKey = (kind, book, id) => kind + ':' + bookKey(book) + ':' + needId(id);
  const getNote = (book, id) => read(annotationKey('note', book, id), '');
  const setNote = (book, id, note) => write(annotationKey('note', book, id), String(note || '').trim());
  const getHighlights = (book, id) => read(annotationKey('highlight', book, id), {});
  const toggleHighlight = (book, id, part) => {
    const highlights = getHighlights(book, id);
    const k = String(part || '');
    if (!k) return highlights;
    if (highlights[k]) delete highlights[k]; else highlights[k] = true;
    write(annotationKey('highlight', book, id), highlights);
    return highlights;
  };
  const setHighlights = (book, id, highlights) => {
    const next = highlights && typeof highlights === 'object' ? highlights : {};
    write(annotationKey('highlight', book, id), next);
  };
  const clearHighlights = (book, id) => setHighlights(book, id, {});
  const getDrawings = (book, id) => {
    const v = read(annotationKey('drawing', book, id), { strokes: [] });
    return v && Array.isArray(v.strokes) ? v : { strokes: [] };
  };
  const setDrawings = (book, id, drawings) => {
    const strokes = drawings && Array.isArray(drawings.strokes) ? drawings.strokes : [];
    write(annotationKey('drawing', book, id), { strokes });
  };

  const getSrs = book => read(key('srs', book), {});
  const setSrs = (book, obj) => write(key('srs', book), obj);

  const getStats = book => read(key('stats', book), mkStats());
  const bumpStats = (book, rec) => {
    const s = getStats(book);
    s.byChapter = s.byChapter || {};
    s.answered += 1;
    if (rec.known) s.known += 1; else s.unknown += 1;
    const c = String(rec.chapterNo === undefined || rec.chapterNo === null ? 0 : rec.chapterNo);
    const cur = s.byChapter[c] || { answered: 0, known: 0, unknown: 0, seenIds: [] };
    cur.answered += 1;
    if (rec.known) cur.known += 1; else cur.unknown += 1;
    if (rec.itemId) {
      cur.seenIds = Array.isArray(cur.seenIds) ? cur.seenIds : [];
      if (cur.seenIds.indexOf(rec.itemId) < 0) cur.seenIds.push(rec.itemId);
      cur.completed = cur.seenIds.length;
    }
    s.byChapter[c] = cur;
    write(key('stats', book), s);
    bumpToday(book, !!rec.known);
    return s;
  };

  // 今日维度（首页「今日已刷 / 记住率」用；跨日自动归零）
  const todayStr = () => {
    const d = new Date();
    const p = n => (n < 10 ? '0' + n : String(n));
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  };
  const mkToday = () => ({ date: todayStr(), answered: 0, known: 0 });
  const getToday = book => {
    const t = read(key('today', book), null);
    if (!t || t.date !== todayStr()) return mkToday();
    return t;
  };
  const bumpToday = (book, known) => {
    const t = getToday(book);
    t.answered += 1;
    if (known) t.known += 1;
    write(key('today', book), t);
  };

  const clear = book => {
    write(key('drill', book), '');
    write(key('wrong', book), []);
    write(key('fav', book), []);
    write(key('stats', book), mkStats());
    write(key('srs', book), {});
  };

  return {
    getToday, key, getSrs, setSrs, getProgress, setProgress, getWrong, addWrong, removeWrong,
    getFav, toggleFav, getNote, setNote, getHighlights, toggleHighlight, setHighlights, clearHighlights,
    getDrawings, setDrawings,
    getStats, bumpStats, clear };
}

module.exports = { createStorage };
