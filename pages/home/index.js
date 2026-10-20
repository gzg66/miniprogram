const gate = require('../../utils/gate.js');
const theme = require('../../utils/theme.js');
const srsMod = require('../../utils/srs');
const BOOKS = [
  { key: 'art', book: '艺术概论', route: '/packageArt/pages/list/index', desc: '王宏建 · 六章高频题库' },
  { key: 'film', book: '电影概论', route: '/packageFilm/pages/list/index', desc: '教材笔记 · 国别电影 · 理论篇' },
];

Page({
  data: { cards: [], theme: 'light' },
  onShow() {
    gate.guardOrRedirect();
    theme.apply(this);
    const store = getApp().store;
    const storage = getApp().storage;
    const idx = store.loadIndex();
    const cards = BOOKS.map(b => {
      const items = idx.filter(r => r.book === b.book);
      const stats = storage.getStats(b.key);
      return Object.assign({}, b, {
        count: items.length,
        answered: stats.answered,
        rate: stats.answered ? Math.round(stats.known / stats.answered * 100) : 0,
        // 主包不能读分包文件：用已在主包的检索索引行（dueQueue 只需要 id）
        due: srsMod.dueCount(items, storage.getSrs(b.key), srsMod.todayStr()),
      });
    });
    this.setData({ cards });
  },
  onOpen(e) {
    wx.navigateTo({ url: e.currentTarget.dataset.route });
  },
  onTimeline() {
    wx.navigateTo({ url: '/packageFilm/pages/timeline/index' });
  },
  onContinue() {
    const storage = getApp().storage;
    const p = storage.getProgress('art') || storage.getProgress('film');
    if (!p) { wx.showToast({ title: '还没有刷题记录', icon: 'none' }); return; }
    const book = p.itemId && p.itemId.indexOf('FILM') === 0 ? 'film' : 'art';
    wx.navigateTo({
      url: (book === 'art' ? '/packageArt' : '/packageFilm') + '/pages/drill/index?mode=' + p.mode,
    });
  },
});
