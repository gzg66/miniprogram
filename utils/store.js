// utils/store.js —— 题库装载与考频映射（单一真源 + 两书严格隔离）
//
// 两书标识的唯一真源：页面/存储/路由一律使用 'art' | 'film'（BOOK_ART / BOOK_FILM），
// 接受中文书名只为兼容调用方，未知值一律抛错——绝不静默兜底成另一本书（否则会串数据）。
const BOOK_ART = 'art';
const BOOK_FILM = 'film';
const BOOKS = {
  art: { key: 'art', name: '艺术概论', package: 'packageArt' },
  film: { key: 'film', name: '电影概论', package: 'packageFilm' },
};

// 五级源 → 四级展示（spec §5.2）
const LABEL = { '高频': '高频必考', '较高频': '高频必考', '中频': '中频背诵',
                '较低频': '低频了解', '低频': '低频了解' };
const LEVEL = { '高频': 3, '较高频': 3, '中频': 2, '较低频': 1, '低频': 1 };

function freqLabel(freq) { return LABEL[freq] || '未分级'; }
function freqLevel(freq) { return LEVEL[freq] || 0; }

function bookKey(book) {
  if (book === BOOK_ART || book === BOOKS.art.name) return BOOK_ART;
  if (book === BOOK_FILM || book === BOOKS.film.name) return BOOK_FILM;
  throw new Error('unknown book: ' + book);
}
function bookName(book) { return BOOKS[bookKey(book)].name; }
function packageOf(book) { return BOOKS[bookKey(book)].package; }

function createStore(opts) {
  const dataRoot = opts.dataRoot;
  const readFile = opts.readFile;
  const cache = { index: null, docs: null, items: {}, byId: {} };

  function readJson(p) { return JSON.parse(readFile(p)); }

  // dataRoot 为空时表示「代码包根」：路径不带前导斜杠（与 packageArt/pages/paper 的
  // 'data/mock-papers.json' 一致）；非空时（测试注入绝对路径）才补斜杠。
  function joinPath(root, rest) {
    if (!root) return rest;
    return root.charAt(root.length - 1) === '/' ? root + rest : root + '/' + rest;
  }

  function loadIndex() {
    if (!cache.index) cache.index = readJson(joinPath(dataRoot, 'data/search-index.json'));
    return cache.index;
  }

  // 题库未命中时使用的电脑文档补充层。文档索引缺失时静默返回空数组，
  // 这样旧包仍可正常启动，搜索页再进入网络兜底。
  function loadDocIndex() {
    if (cache.docs) return cache.docs;
    try {
      const raw = readJson(joinPath(dataRoot, 'data/doc-index.json'));
      cache.docs = raw.rows || [];
    } catch (e) {
      cache.docs = [];
    }
    return cache.docs;
  }

  function loadItems(book) {
    const b = bookKey(book);
    if (cache.items[b]) return cache.items[b].map(it => Object.assign({}, it));
    const dir = joinPath(dataRoot, packageOf(b) + '/data');
    // 真机分包环境不保证 readdirSync 能列出代码包目录；优先使用构建时声明的文件清单。
    // 测试与浏览器预览未提供 fileMap 时，继续沿用目录扫描。
    const declared = opts.fileMap && opts.fileMap[dir];
    const prefix = b === BOOK_ART ? /^art-(?:\d+|misc)\.json$/ : /^film-\d+\.json$/;
    const files = (declared || opts.listFiles(dir))
      .filter(f => prefix.test(f))
      .sort();
    const out = [];
    for (const f of files) out.push.apply(out, readJson(dir + '/' + f));
    // 章节顺序：按 chapterNo 升序（未分章 chapterNo=0 排最前），同章保持源顺序
    const decorated = out.map((it, i) => [it, i]);
    decorated.sort((a, b2) => (a[0].chapterNo - b2[0].chapterNo) || (a[1] - b2[1]));
    const sorted = decorated.map(pair => pair[0]);
    cache.items[b] = sorted;
    for (const it of sorted) cache.byId[it.id] = it;
    // 返回条目副本：页面里 item.xxx = ... / arr.sort(...) 不得污染会话缓存（评审 I11）
    return sorted.map(it => Object.assign({}, it));
  }

  function getItem(id) {
    if (cache.byId[id]) return Object.assign({}, cache.byId[id]);
    for (const b of [BOOK_ART, BOOK_FILM]) {
      loadItems(b);
      if (cache.byId[id]) return Object.assign({}, cache.byId[id]);
    }
    return null;
  }

  /** 按章取条目；chapterNo 允许字符串（路由参数）与 0（未分章） */
  function byChapter(book, chapterNo) {
    const n = Number(chapterNo);
    if (!isFinite(n)) throw new Error('byChapter: bad chapterNo ' + chapterNo);
    return loadItems(book).filter(i => i.chapterNo === n);
  }

  return {
    loadIndex, loadDocIndex, loadItems, getItem, byChapter,
    BOOK_ART, BOOK_FILM, bookKey, bookName, packageOf,
  };
}

module.exports = { freqLabel, freqLevel, createStore, bookKey, bookName, packageOf,
                   BOOK_ART, BOOK_FILM, BOOKS };
