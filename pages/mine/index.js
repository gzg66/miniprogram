const gate = require('../../utils/gate.js');
const theme = require('../../utils/theme.js');
// 设计约束（评审 C3）：本页列表只用主包 search-index 渲染，点击再进分包详情，
// 避免主包页面读取分包资源。
const BOOKS = [{ key: 'art', book: '艺术概论' }, { key: 'film', book: '电影概论' }];

Page({
  data: { books: [], theme: 'light' },
  onShow() {
    gate.guardOrRedirect();
    theme.apply(this);
    const st = getApp().storage;
    const idx = getApp().store.loadIndex();
    const byId = {};
    for (const r of idx) byId[r.id] = r;
    const books = BOOKS.map(b => {
      const s = st.getStats(b.key);
      const wrongIds = st.getWrong(b.key);
      const favIds = st.getFav(b.key);
      const pick = ids => ids.map(id => byId[id]).filter(Boolean).slice(0, 20)
        .map(r => ({ id: r.id, question: r.title }));
      return {
        key: b.key, book: b.book, stats: s,
        wrongCount: wrongIds.length, favCount: favIds.length,
        wrongList: pick(wrongIds), favList: pick(favIds),
        rate: s.answered ? Math.round(s.known / s.answered * 100) : 0,
      };
    });
    this.setData({ books });
  },
  openItem(e) {
    const pkg = e.currentTarget.dataset.book === 'art' ? '/packageArt' : '/packageFilm';
    wx.navigateTo({ url: pkg + '/pages/detail/index?id=' + e.currentTarget.dataset.id });
  },
  clearGate() {
    gate.clearGate({
      getSync: k => wx.getStorageSync(k),
      setSync: (k, v) => wx.setStorageSync(k, v),
    });
    wx.redirectTo({ url: '/pages/gate/index' });
  },
  toggleTheme() { theme.toggle(this); },
  openFeedback() { wx.navigateTo({ url: '/pages/feedback/index' }); },
  clear(e) {
    const key = e.currentTarget.dataset.key;
    wx.showModal({
      title: '清空记录', content: '将清空该书的进度、错题与收藏，且无法恢复。',
      success: r => { if (r.confirm) { getApp().storage.clear(key); this.onShow(); } },
    });
  },
});
