const gate = require('../../../utils/gate.js');
const theme = require('../../../utils/theme.js');
const BOOK = '艺术概论';
const KEY = 'art';

Page({
  data: { tab: 'recite', chapters: [], supplement: null, filter: { type: '' }, drillType: '', items: [], modes: [], theme: 'light' },
  onLoad(q) { this.setData({ tab: (q && q.tab) || 'recite' }); },
  backPrevious() {
    if (this.chapterNo) {
      this.chapterNo = 0;
      this.setData({ items: [], filter: { type: '' } });
      return;
    }
    if (getCurrentPages().length > 1) wx.navigateBack({ delta: 1 });
    else wx.switchTab({ url: '/pages/home/index' });
  },
  openPapers() { wx.navigateTo({ url: '/packageArt/pages/paper/index?no=1&mode=paper' }); },
  openAfterClass() { wx.navigateTo({ url: '/packageArt/pages/afterclass/index' }); },
  openFramework(e) {
    const n = Number(e && e.currentTarget && e.currentTarget.dataset.no) || this.chapterNo || 0;
    wx.navigateTo({ url: '/packageArt/pages/framework/index' + (n ? '?chapterNo=' + n : '') });
  },
  onShow() {
    gate.guardOrRedirect();
    theme.apply(this);
    const store = getApp().store;
    const st = getApp().storage;
    const items = store.loadItems(BOOK);
    this.items = items;
    const byCh = {};
    const stats = st.getStats(KEY) || {};
    stats.byChapter = stats.byChapter || {};
    for (const it of items) {
      const k = it.chapterNo || 0;
      if (!byCh[k]) byCh[k] = { chapterNo: k, chapter: it.chapter || '未分章', count: 0, answered: 0, completed: 0, rate: 0, completion: 0 };
      byCh[k].count += 1;
    }
    const all = Object.keys(byCh).map(k => byCh[k]).sort((a, b) => a.chapterNo - b.chapterNo);
    for (const chapter of all) {
      const rec = stats.byChapter[String(chapter.chapterNo)] || {};
      chapter.answered = rec.answered || 0;
      chapter.completed = rec.completed || (Array.isArray(rec.seenIds) ? rec.seenIds.length : 0);
      chapter.completion = chapter.count ? Math.min(100, Math.round(chapter.completed * 100 / chapter.count)) : 0;
      chapter.rate = chapter.answered ? Math.round((rec.known || 0) * 100 / chapter.answered) : 0;
    }
    const chapters = all.filter(c => c.chapterNo > 0);
    const supplement = all.find(c => c.chapterNo === 0) || null;
    this.setData({
      chapters,
      supplement,
      items: [],
      modes: [
        { mode: 'sequence', name: '顺序刷题', desc: '按章或题型逐题过' },
        { mode: 'review', name: '今日复习', desc: '只刷今天到期的题目' },
        { mode: 'random', name: '随机抽题', desc: '默认 20 题，可选 10/20/50' },
        { mode: 'frequency', name: '按考频刷', desc: '高频必考优先（仅分级条目）' },
        { mode: 'wrong', name: '错题本', desc: '共 ' + st.getWrong(KEY).length + ' 题' },
        { mode: 'fav', name: '收藏夹', desc: '共 ' + st.getFav(KEY).length + ' 题' },
      ],
    });
    if (this.chapterNo) {
      const type = this.data.filter.type || '';
      this.setData({ items: this.items.filter(i => (i.chapterNo || 0) === this.chapterNo && (!type || i.type === type)) });
    }
  },
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ tab, items: tab === 'recite' ? this.data.items : [] });
  },
  openChapter(e) {
    const n = Number(e.currentTarget.dataset.no) || 0;
    this.chapterNo = n;
    const items = this.items.filter(i => (i.chapterNo || 0) === n);
    this.setData({ items, filter: { type: '' } });
  },
  filterType(e) {
    const t = e.currentTarget.dataset.type || '';
    const n = this.chapterNo || 0;
    const items = this.items.filter(i => (i.chapterNo || 0) === n && (!t || i.type === t));
    this.setData({ 'filter.type': t, items });
  },
  openDetail(e) {
    const item = this.items.find(i => i.id === e.detail.id);
    const type = this.data.filter.type ? '&type=' + encodeURIComponent(this.data.filter.type) : '';
    wx.navigateTo({ url: '/packageArt/pages/detail/index?id=' + e.detail.id
      + '&chapterNo=' + ((item && item.chapterNo) || this.chapterNo || 0) + type });
  },
  startDrill(e) {
    const type = this.data.drillType ? '&type=' + encodeURIComponent(this.data.drillType) : '';
    wx.navigateTo({ url: '/packageArt/pages/drill/index?mode=' + e.currentTarget.dataset.mode + type });
  },
  filterDrillType(e) { this.setData({ drillType: e.currentTarget.dataset.type || '' }); },
  inBookSearch(e) {
    // /pages/search/index 是 tabBar 页，navigateTo 会被微信拒绝 → switchTab + globalData 中转
    getApp().globalData.pendingSearch = { book: BOOK, q: e.detail.value || '' };
    wx.switchTab({ url: '/pages/search/index' });
  },
});
