const gate = require('../../../utils/gate.js');
const theme = require('../../../utils/theme.js');
const BOOK = '电影概论';
const KEY = 'film';

Page({
  onShow() { gate.guardOrRedirect(); theme.apply(this); },
  data: { item: null, fav: false, chapterItems: [], idx: 0, revealed: false, note: '', highlights: {}, highlightCount: 0, drawings: { strokes: [] }, theme: 'light' },
  onLoad(q) {
    this.store = getApp().store;
    this.st = getApp().storage;
    this.chapterNo = Number(q && q.chapterNo) || 0;
    this.filterType = (q && q.type) || '';
    this.show((q && q.id) || '');
  },
  backToChapter() {
    const pages = getCurrentPages();
    const previous = pages.length > 1 ? pages[pages.length - 2] : null;
    const isFilmList = previous && previous.route === 'packageFilm/pages/list/index';
    if (isFilmList) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    const type = this.filterType ? '&type=' + encodeURIComponent(this.filterType) : '';
    wx.redirectTo({
      url: '/packageFilm/pages/list/index?chapterNo=' + (this.chapterNo || (this.data.item && this.data.item.chapterNo) || 0) + type,
    });
  },
  show(id) {
    const item = this.store.getItem(id);
    if (!item) { wx.showToast({ title: '条目不存在', icon: 'none' }); return; }
    let chapterItems = this.store.byChapter(BOOK, item.chapterNo);
    if (this.filterType) chapterItems = chapterItems.filter(i => i.type === this.filterType);
    const idx = chapterItems.findIndex(i => i.id === id);
    const highlights = this.st.getHighlights(KEY, id);
    const drawings = this.st.getDrawings(KEY, id);
    this.setData({ item, chapterItems, idx, revealed: false, fav: this.st.getFav(KEY).indexOf(id) >= 0,
      note: this.st.getNote(KEY, id), highlights, highlightCount: Object.keys(highlights).length, drawings });
    wx.setNavigationBarTitle({ title: item.topic || item.question });
  },
  onFav() {
    const fav = this.st.toggleFav(KEY, this.data.item.id);
    this.setData({ fav });
    wx.showToast({ title: fav ? '已收藏' : '已取消收藏', icon: 'none' });
  },
  onWrong() {
    this.st.addWrong(KEY, this.data.item.id);
    wx.showToast({ title: '已加入错题本', icon: 'none' });
  },
  toggleAnswer() { this.setData({ revealed: !this.data.revealed }); },
  editNote() {
    wx.showModal({ title: '题目备注', editable: true, content: this.data.note || '', placeholderText: '写下记忆提示、易错点或补充内容',
      success: r => { if (r.confirm) { this.st.setNote(KEY, this.data.item.id, r.content || ''); this.setData({ note: (r.content || '').trim() }); } } });
  },
  onHighlight(e) {
    const highlights = e.detail && e.detail.highlights ? e.detail.highlights : {};
    this.st.setHighlights(KEY, this.data.item.id, highlights);
    this.setData({ highlights, highlightCount: Object.keys(highlights).length });
  },
  onDrawingChange(e) {
    const drawings = { strokes: Array.isArray(e.detail && e.detail.strokes) ? e.detail.strokes : [] };
    this.st.setDrawings(KEY, this.data.item.id, drawings);
    this.setData({ drawings });
  },
  clearHighlights() {
    const highlights = {};
    this.st.clearHighlights(KEY, this.data.item.id);
    this.setData({ highlights, highlightCount: 0 });
  },
  prev() {
    const i = this.data.idx - 1;
    if (i >= 0) this.show(this.data.chapterItems[i].id);
  },
  next() {
    const i = this.data.idx + 1;
    if (i < this.data.chapterItems.length) this.show(this.data.chapterItems[i].id);
  },
});
