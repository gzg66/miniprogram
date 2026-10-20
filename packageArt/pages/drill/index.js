const gate = require('../../../utils/gate.js');
const theme = require('../../../utils/theme.js');
const { buildQueue, judge } = require('../../../utils/drill');
const srsMod = require('../../../utils/srs');
const GRADES = ['fail', 'vague', 'ok', 'easy'];

const BOOK = '艺术概论';
const KEY = 'art';

Page({
  onShow() { gate.guardOrRedirect(); theme.apply(this); },
  data: { q: null, i: 0, total: 0, reveal: false, done: false, stats: null, empty: false, fav: false, theme: 'light' },
  onLoad(q) {
    this.query = q || {};
    this.store = getApp().store;
    this.st = getApp().storage;
    this.build();
  },
  // 计划缺陷修复：WXML 绑定了 onRestart 但原计划未定义，会导致「再刷一轮」无响应
  onRestart() { this.build(); },
  build() {
    const q = this.query;
    const items = this.store.loadItems(BOOK);
    const queue = buildQueue(items, {
      mode: q.mode || 'sequence',
      // 未显式传章号时不得传 0：0 表示「未分章」，会把五种模式全部切成未分章切片
      chapterNo: (q.chapterNo === undefined || q.chapterNo === '') ? undefined : Number(q.chapterNo),
      type: q.type || '',
      count: q.count ? Number(q.count) : 20,
      wrongIds: this.st.getWrong(KEY),
      favIds: this.st.getFav(KEY),
      srs: this.st.getSrs(KEY),
      today: srsMod.todayStr(),
    });
    this.queue = queue;
    this.byId = {};
    for (const it of items) this.byId[it.id] = it;
    if (!queue.length) {
      this.setData({ empty: true, done: false, q: null, reveal: false });
      return;
    }
    this.setData({
      empty: false, done: false, reveal: false,
      q: this.byId[queue[0]], i: 0, total: queue.length,
      fav: this.st.getFav(KEY).indexOf(queue[0]) >= 0,
    });
  },
  onReveal() { this.setData({ reveal: true }); },
  onFav() {
    const fav = this.st.toggleFav(KEY, this.data.q.id);
    this.setData({ fav });
    wx.showToast({ title: fav ? '已收藏' : '已取消收藏', icon: 'none' });
  },
  onJudge(e) {
    // 四档自评（fail/vague/ok/easy）→ srs 排期；旧布尔接口由 drill.js 兼容
    const grade = e.currentTarget.dataset.grade || 'ok';
    const item = this.data.q;
    const r = judge(this.queue, this.data.i, grade, {
      storage: this.st, book: KEY, chapterNo: item.chapterNo,
      mode: this.query.mode || 'sequence',
      today: srsMod.todayStr(),
    });
    if (r.next === null) { this.setData({ done: true, stats: r.stats }); return; }
    const nextId = this.queue[r.next];
    this.setData({ q: this.byId[nextId], i: r.next, reveal: false, stats: r.stats,
      fav: this.st.getFav(KEY).indexOf(nextId) >= 0 });
  },
  // 「今日复习」：只取到期条目（srs.dueQueue），空队列落回 empty 提示
  onReview() {
    const items = this.store.loadItems(BOOK);
    const queue = buildQueue(items, {
      mode: 'review', srs: this.st.getSrs(KEY), today: srsMod.todayStr(),
    });
    this.queue = queue;
    this.byId = {};
    for (const it of items) this.byId[it.id] = it;
    if (!queue.length) {
      this.setData({ empty: true, done: false, q: null, reveal: false });
      return;
    }
    this.setData({
      empty: false, done: false, reveal: false,
      q: this.byId[queue[0]], i: 0, total: queue.length,
      fav: this.st.getFav(KEY).indexOf(queue[0]) >= 0,
    });
  },
});
