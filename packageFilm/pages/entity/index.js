// packageFilm/pages/entity/index.js —— 导演 / 流派专页（搜索直达；支持 ?id= 或 ?name=）
const gate = require('../../../utils/gate.js');
const theme = require('../../../utils/theme.js');

Page({
  data: { kind: 'notfound', entity: null, id: '', theme: 'light' },
  onShow() { gate.guardOrRedirect(); theme.apply(this); },
  onLoad(q) {
    const fs = wx.getFileSystemManager();
    const data = JSON.parse(fs.readFileSync('packageFilm/data/film-directors.json', 'utf8'));
    const byId = {};
    (data.directors || []).forEach(d => { byId[d.id] = { kind: 'director', item: d }; });
    (data.movements || []).forEach(m => { byId[m.id] = { kind: 'movement', item: m }; });

    let hit = null;
    if (q && q.id && byId[q.id]) {
      hit = byId[q.id];
    } else if (q && q.name) {
      const name = decodeURIComponent(q.name);
      (data.movements || []).some(m => {
        if (m.name === name) { hit = { kind: 'movement', item: m }; return true; }
        return false;
      });
      if (!hit) {
        (data.directors || []).some(d => {
          if (d.name === name) { hit = { kind: 'director', item: d }; return true; }
          return false;
        });
      }
    }

    if (!hit) {
      this.setData({ kind: 'notfound', entity: null, id: (q && q.id) || '' });
      wx.setNavigationBarTitle({ title: '未找到该条目' });
      return;
    }
    const item = hit.item;
    // related 源数据保留教材中的自然语言名称；页面统一转成可显示、可选跳转的对象。
    const index = JSON.parse(fs.readFileSync('../data/search-index.json', 'utf8'));
    item.related = (item.related || []).map(label => {
      const row = index.find(r => r.title === label || r.title.indexOf(label) >= 0 || label.indexOf(r.title) >= 0);
      return { id: row ? row.id : '', question: label };
    });
    if (hit.kind === 'director') {
      // 作品按年份升序（用户要求「作品按时间罗列」）
      item.films = (item.films || []).slice().sort((a, b) => a.year - b.year);
    }
    this.setData({ kind: hit.kind, entity: item, id: item.id });
    wx.setNavigationBarTitle({ title: item.name });
  },
  openRelated(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/packageFilm/pages/detail/index?id=' + id });
  },
});
