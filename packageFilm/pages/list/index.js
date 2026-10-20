const gate = require('../../../utils/gate.js');
const theme = require('../../../utils/theme.js');
const CHAPTERS = require('../../data/film-chapters.js');
const BOOK = '电影概论';
const KEY = 'film';

Page({
  data: { tab: 'recite', viewMode: 'chapters', basicChapters: [], chapters: [], historyChapters: [], theoryChapters: [], filter: { type: '' }, drillType: '', items: [], modes: [], theme: 'light' },
  onLoad(q) {
    this.restoreChapterNo = Number(q && q.chapterNo) || 0;
    this.restoreType = (q && q.type) || '';
    this.setData({ tab: (q && q.tab) || 'recite' });
  },
  backPrevious() {
    // 章节题目目录是同一页面的第二层：先返回电影概论章节目录，
    // 不要直接退回首页。
    if (this.chapterNo) {
      this.chapterNo = 0;
      this.setData({ viewMode: 'chapters', items: [], filter: { type: '' } });
      return;
    }
    if (getCurrentPages().length > 1) wx.navigateBack({ delta: 1 });
    else wx.switchTab({ url: '/pages/home/index' });
  },
  onShow() {
    gate.guardOrRedirect();
    theme.apply(this);
    const store = getApp().store;
    const st = getApp().storage;
    const items = store.loadItems(BOOK);
    this.items = items;
    const byCh = {};
    for (const row of CHAPTERS) {
      byCh[row.chapterNo] = { chapterNo: row.chapterNo, chapter: row.chapter, count: 0, answered: 0, completed: 0, rate: 0, completion: 0 };
    }
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
    // 目录按教材原始章节连续展示，空章节也保留，避免目录“失踪”。
    const chapters = all.filter(c => c.chapterNo >= 1 && c.chapterNo <= 46);
    const historyChapters = [];
    const theoryChapters = [];
    this.setData({
      basicChapters: chapters,
      chapters,
      historyChapters,
      theoryChapters,
      viewMode: 'chapters', items: [],
      modes: [
        { mode: 'sequence', name: '顺序刷题', desc: '按章或题型逐题过' },
        { mode: 'review', name: '今日复习', desc: '只刷今天到期的题目' },
        { mode: 'random', name: '随机抽题', desc: '默认 20 题，可选 10/20/50' },
        { mode: 'frequency', name: '按考频刷', desc: '高频必考优先（仅分级条目）' },
        { mode: 'wrong', name: '错题本', desc: '共 ' + st.getWrong(KEY).length + ' 题' },
        { mode: 'fav', name: '收藏夹', desc: '共 ' + st.getFav(KEY).length + ' 题' },
      ],
    });
    if (this.restoreChapterNo) {
      this.openChapterByNo(this.restoreChapterNo, this.restoreType);
      this.restoreChapterNo = 0;
      this.restoreType = '';
    } else if (this.chapterNo) {
      // 从题目详情返回时，保留原来的章节目录和题型筛选。
      this.openChapterByNo(this.chapterNo, this.data.filter.type || '');
    }
  },
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ tab, items: tab === 'recite' ? this.data.items : [] });
  },
  openBasicCatalog() {
    this.chapterNo = 0;
    this.setData({ tab: 'recite', viewMode: 'chapters', items: [], filter: { type: '' } });
  },
  openChapter(e) {
    const n = Number(e.currentTarget.dataset.no) || 0;
    this.openChapterByNo(n, '');
  },
  openChapterByNo(n, type) {
    this.chapterNo = Number(n) || 0;
    const t = type || '';
    const items = this.items.filter(i => (i.chapterNo || 0) === this.chapterNo && (!t || i.type === t));
    this.setData({ viewMode: 'items', items, filter: { type: t } });
  },
  filterType(e) {
    const t = e.currentTarget.dataset.type || '';
    const n = this.chapterNo || 0;
    const items = this.items.filter(i => (i.chapterNo || 0) === n && (!t || i.type === t));
    this.setData({ 'filter.type': t, items });
  },
  openDetail(e) {
    const type = this.data.filter.type ? '&type=' + encodeURIComponent(this.data.filter.type) : '';
    wx.navigateTo({
      url: '/packageFilm/pages/detail/index?id=' + encodeURIComponent(e.detail.id)
        + '&chapterNo=' + (this.chapterNo || 0) + type,
    });
  },
  openExamOutline() { wx.navigateTo({ url: '/packageFilm/pages/outline/index' }); },
  openAfterClass() { wx.navigateTo({ url: '/packageFilm/pages/afterclass/index' }); },
  startDrill(e) {
    const type = this.data.drillType ? '&type=' + encodeURIComponent(this.data.drillType) : '';
    wx.navigateTo({ url: '/packageFilm/pages/drill/index?mode=' + e.currentTarget.dataset.mode + type });
  },
  filterDrillType(e) { this.setData({ drillType: e.currentTarget.dataset.type || '' }); },
  inBookSearch(e) {
    // /pages/search/index 是 tabBar 页，navigateTo 会被微信拒绝 → switchTab + globalData 中转
    getApp().globalData.pendingSearch = { book: BOOK, q: e.detail.value || '' };
    wx.switchTab({ url: '/pages/search/index' });
  },
});
