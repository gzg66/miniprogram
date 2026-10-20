// packageFilm/pages/timeline/index.js —— 电影史年份背诵卡（默认按精确年份分组，也可切回世纪轴）
const gate = require('../../../utils/gate.js');
const theme = require('../../../utils/theme.js');
const TL = require('../../../utils/timeline.js');

Page({
  data: {
    years: [],
    centuries: [],
    entries: [],
    total: 0,
    mode: 'memory',
    query: '',
    filter: { century: 0, country: '' },
    theme: 'light',
  },
  onShow() { gate.guardOrRedirect(); theme.apply(this); },
  onLoad() {
    const fs = wx.getFileSystemManager();
    const raw = JSON.parse(fs.readFileSync('packageFilm/data/film-timeline.json', 'utf8'));
    this.all = TL.flatten(raw.decades);
    this.setData({ total: this.all.length });
    this.render(this.all);
    wx.setNavigationBarTitle({ title: '电影史年份背诵' });
  },
  // 以单一列表为准渲染：年份卡与世纪轴都由当前结果重算，保证筛选即时生效
  render(list) {
    const byC = {};
    list.forEach(e => {
      if (!byC[e.century]) byC[e.century] = { century: e.century, entries: [] };
      byC[e.century].entries.push(e);
    });
    const centuries = Object.keys(byC).map(Number).sort((a, b) => a - b).map(c => byC[c]);
    this.setData({ entries: list, years: TL.groupByYear(list), centuries: centuries });
  },
  toggleMode(e) {
    this.setData({ mode: e.currentTarget.dataset.mode || 'memory' });
  },
  applyFilter() {
    const f = this.data.filter || {};
    let list = TL.filterEntries(this.all, {
      century: f.century ? Number(f.century) : undefined,
      country: f.country || undefined,
    });
    if (this.data.query) list = TL.searchEntries(list, this.data.query);
    this.render(list);
  },
  pickCentury(e) {
    const c = Number(e.currentTarget.dataset.century) || 0;
    const cur = Number(this.data.filter.century) || 0;
    this.setData({ filter: Object.assign({}, this.data.filter, { century: cur === c ? 0 : c }) });
    this.applyFilter();
  },
  pickCountry(e) {
    const c = String(e.currentTarget.dataset.country || '');
    const same = this.data.filter.country === c;
    this.setData({ filter: Object.assign({}, this.data.filter, { country: same ? '' : c }) });
    this.applyFilter();
  },
  onSearchInput(e) {
    this.setData({ query: e.detail.value });
    this.applyFilter();
  },
  clearFilter() {
    this.setData({ filter: { century: 0, country: '' }, query: '' });
    this.applyFilter();
  },
  // 点条目 → 进对应的流派专页（按名称解析，专页支持 id 或 name）
  openEntity(e) {
    const name = e.currentTarget.dataset.name || '';
    wx.navigateTo({ url: '/packageFilm/pages/entity/index?name=' + encodeURIComponent(name) });
  },
});
