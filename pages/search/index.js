const gate = require('../../utils/gate.js');
const theme = require('../../utils/theme.js');
const searchMod = require('../../utils/search');
const { search } = searchMod;

Page({
  data: { q: '', book: '', type: '', results: [], layer: '', searchingWeb: false, theme: 'light' },
  onLoad(q) {
    const app = getApp();
    this.idx = app.store.loadIndex();
    this.docs = app.store.loadDocIndex();
    if (q && q.book) this.setData({ book: q.book });
    if (q && q.q) { this.setData({ q: q.q }); this.run(q.q); }
  },
  onShow() {
    gate.guardOrRedirect();
    theme.apply(this);
    // 板块内搜索经 switchTab 中转（tabBar 页不能 navigateTo 带参跳转）
    const app = getApp();
    const p = app.globalData && app.globalData.pendingSearch;
    if (!p) return;
    app.globalData.pendingSearch = null;
    this.idx = this.idx || app.store.loadIndex();
    this.setData({ book: p.book || '', q: p.q || '' });
    this.run(p.q || '');
  },
  onInput(e) {
    const q = e.detail.value;
    this.setData({ q });
    clearTimeout(this.t);
    this.t = setTimeout(() => this.run(q, false), 200);
  },
  onConfirm(e) {
    const q = e.detail.value || this.data.q;
    this.setData({ q });
    this.run(q, true);
  },
  setBook(e) {
    const b = e.currentTarget.dataset.book || '';
    this.setData({ book: b });
    this.run(this.data.q, false);
  },
  setType(e) {
    const t = e.currentTarget.dataset.type || '';
    this.setData({ type: this.data.type === t ? '' : t });   // 再点一次取消筛选
    this.run(this.data.q, false);
  },
  run(q, allowWeb) {
    const hits = search(this.idx, q, {
      book: this.data.book || null, type: this.data.type || null, limit: 100,
    });
    const docHits = hits.length ? [] : searchMod.searchDocs(this.docs, q, {
      book: this.data.book || null, limit: 50,
    });
    const chosen = hits.length ? hits : docHits;
    // wx:key 需要顶层唯一字段（不支持嵌套路径），故把 row.id 提升到结果项
    this.setData({
      results: chosen.map(h => ({ id: h.row.id, row: h.row })),
      layer: hits.length ? '题库' : (docHits.length ? '电脑文档' : ''),
    });
    if (allowWeb && q && !hits.length && !docHits.length) this.openWebSearch(q);
  },
  open(e) {
    const row = e.currentTarget.dataset.row;
    if (row.source === 'document' || row.type === '电脑文档') {
      wx.showModal({
        title: row.source || '电脑文档',
        content: (row.locator ? row.locator + '\n' : '') + (row.snippet || '已找到相关文档片段。'),
        showCancel: false,
      });
      return;
    }
    // 导演/流派行（entity）的 book 也是「电影概论」，必须直达专页，
    // 否则会被送进条目详情页（那里没有该 id）
    if (row.type === 'entity') {
      wx.navigateTo({ url: '/packageFilm/pages/entity/index?id=' + row.id });
      return;
    }
    const pkg = row.book === '艺术概论' ? '/packageArt' : '/packageFilm';
    wx.navigateTo({ url: pkg + '/pages/detail/index?id=' + row.id });
  },
  openWebSearch(q) {
    const text = q || this.data.q;
    if (!text) return;
    wx.navigateTo({ url: '/pages/web-search/index?q=' + encodeURIComponent(text) });
  },
});
