// utils/drill.js —— 刷题队列与判定（纯函数 + 注入 storage）
const { freqLevel, bookKey } = require('./store');
const srs = require('./srs');

// mulberry32：确定性伪随机，便于测试复现与「随机但可回放」
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function num(v) { const n = Number(v); return isFinite(n) ? n : null; }

/**
 * 生成刷题队列（返回 itemId 数组）
 * @param {Array} items 题库条目
 * @param {Object} opts { mode, chapterNo, type, count, seed, wrongIds, favIds, gradedOnly }
 *   mode: 'sequence'（含自测式）| 'random' | 'frequency' | 'wrong' | 'fav'
 *   chapterNo 接受数字或字符串（路由参数），0 表示未分章
 *   frequency 模式默认只含有分级条目（spec §7.1）；传 gradedOnly:false 可包含未分级
 */
function buildQueue(items, opts) {
  const o = opts || {};
  const mode = o.mode || 'sequence';
  let pool = items.slice();
  if (o.chapterNo !== undefined && o.chapterNo !== null && o.chapterNo !== '') {
    const n = num(o.chapterNo);
    if (n === null) throw new Error('buildQueue: bad chapterNo ' + o.chapterNo);
    pool = pool.filter(i => i.chapterNo === n);
  }
  if (o.type) pool = pool.filter(i => i.type === o.type);

  if (mode === 'review') {
    // 今日复习：队列 = 该书到期条目（due <= today，按到期升序；新题不算待复习）
    return srs.dueQueue(pool, o.srs || {}, o.today || srs.todayStr());
  }
  if (mode === 'wrong') {
    const ids = o.wrongIds || [];
    return pool.filter(i => ids.indexOf(i.id) >= 0).map(i => i.id);
  }
  if (mode === 'fav') {
    const ids = o.favIds || [];
    return pool.filter(i => ids.indexOf(i.id) >= 0).map(i => i.id);
  }
  if (mode === 'frequency') {
    const graded = pool.filter(i => freqLevel(i.frequency) > 0)
      .sort((a, b) => freqLevel(b.frequency) - freqLevel(a.frequency)
        || (b.stars || 0) - (a.stars || 0));
    if (o.gradedOnly !== false) return graded.map(i => i.id);
    const ungraded = pool.filter(i => freqLevel(i.frequency) === 0);
    return graded.map(i => i.id).concat(ungraded.map(i => i.id));
  }
  if (mode === 'random') {
    const rnd = mulberry32(typeof o.seed === 'number' ? o.seed : Date.now());
    const arr = pool.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    const n = typeof o.count === 'number' && o.count > 0
      ? Math.min(o.count, arr.length) : arr.length;
    return arr.slice(0, n).map(i => i.id);
  }
  // sequence（顺序浏览 / 自测式共用此队列）
  return pool.map(i => i.id);
}

/**
 * 自评一次作答：记累计统计与本轮统计，不会则写入错题本，并按需写入进度游标
 * @param {string[]} queue 队列
 * @param {number} index 当前下标
 * @param {boolean} known 是否记住
 * @param {Object} ctx { storage, book, chapterNo, mode?, round? }
 *   round：可选，传入同一对象的引用以累计「本轮」统计（页面显示本轮正确率用）
 * @returns {{next:number|null, stats:object, round:object}}
 */
function judge(queue, index, gradeOrKnown, ctx) {
  const id = queue[index];
  if (typeof id !== 'string' || !id) {
    throw new Error('judge: invalid index ' + index + ' (queue length ' + queue.length + ')');
  }
  // 四档：fail / vague / ok / easy；为兼容旧接口，布尔 true→ok、false→fail
  const grade = srs.normalizeGrade(gradeOrKnown);
  const known = grade !== 'fail';
  const book = bookKey(ctx.book);
  const storage = ctx.storage;
  storage.bumpStats(book, { known: known, chapterNo: num(ctx.chapterNo) || 0, itemId: id });
  // 只有「完全不会」进错题本（有点印象/记住了/非常熟练都不进）
  if (grade === 'fail') storage.addWrong(book, id);
  // 间隔重复排期：写入 srs:<book>
  if (typeof storage.getSrs === 'function' && typeof storage.setSrs === 'function') {
    const today = ctx.today || srs.todayStr();
    const map = storage.getSrs(book);
    map[id] = srs.schedule(map[id], grade, today);
    storage.setSrs(book, map);
  }
  // 进度游标（spec §7.2）：{ mode, itemId, index }
  if (ctx.mode) {
    storage.setProgress(book, { mode: ctx.mode, itemId: id, index: index, at: Date.now() });
  }
  const round = ctx.round || (ctx.round = { answered: 0, known: 0, unknown: 0 });
  round.answered += 1;
  if (known) round.known += 1; else round.unknown += 1;
  const next = index + 1 < queue.length ? index + 1 : null;
  const s = storage.getStats(book);
  return {
    next,
    stats: { answered: s.answered, known: s.known, unknown: s.unknown },
    round: { answered: round.answered, known: round.known, unknown: round.unknown },
  };
}

module.exports = { buildQueue, mulberry32, judge };
