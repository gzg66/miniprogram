const gate = require('../../../utils/gate.js');
const theme = require('../../../utils/theme.js');
const BANK = require('../../data/film-after-class.js');

Page({
  data: { title: '电影概论 · 课后题目录', view: 'chapters', chapters: [], chapterNo: 0, chapter: '', items: [], selected: null, theme: 'light' },
  onLoad() { this.buildCatalog(); },
  onShow() { gate.guardOrRedirect(); theme.apply(this); },
  back() {
    if (this.data.view === 'detail') {
      this.setData({ view: 'items', selected: null });
      return;
    }
    if (this.data.chapterNo) {
      this.setData({ view: 'chapters', chapterNo: 0, chapter: '', items: [], selected: null });
      return;
    }
    if (getCurrentPages().length > 1) wx.navigateBack({ delta: 1 });
    else wx.switchTab({ url: '/pages/home/index' });
  },
  buildCatalog() {
    const digit = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
    const numberOf = token => {
      if (!token) return 0;
      if (token === '十') return 10;
      if (token.indexOf('十') >= 0) {
        const parts = token.split('十');
        return (parts[0] ? (digit[parts[0]] || 0) * 10 : 10) + (parts[1] ? (digit[parts[1]] || 0) : 0);
      }
      return digit[token] || 0;
    };
    const groups = {};
    for (const item of BANK.items) {
      const explicitNo = Number(item.chapterNo) || 0;
      const source = item.sourceTitle || '';
      const match = source.match(/^第([一二三四五六七八九十]+)章\s*([^/／]*)/);
      const no = explicitNo || (match ? numberOf(match[1]) : 0);
      const name = item.chapter || (match ? '第' + no + '章 ' + match[2].trim() : '待归章补充题');
      if (!groups[no]) groups[no] = { chapterNo: no, chapter: name, count: 0, items: [] };
      groups[no].count += 1;
      groups[no].items.push(item);
    }
    this.catalog = Object.keys(groups).map(k => groups[k]).sort((a, b) => a.chapterNo - b.chapterNo);
    this.setData({ chapters: this.catalog });
  },
  openChapter(e) {
    const no = Number(e.currentTarget.dataset.no) || 0;
    const chapter = this.catalog.find(x => x.chapterNo === no);
    this.setData({ view: 'items', chapterNo: no, chapter: chapter ? chapter.chapter : '', items: chapter ? chapter.items : [] });
  },
  openItem(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.items.find(row => row.id === id);
    if (!item) {
      wx.showToast({ title: '题目暂不可用', icon: 'none' });
      return;
    }
    this.setData({ view: 'detail', selected: item });
  },
});
