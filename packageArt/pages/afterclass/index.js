const gate = require('../../../utils/gate.js');
const theme = require('../../../utils/theme.js');
const BANK = require('../../data/art-after-class.js');

Page({
  data: { title: '艺术概论 · 课后题', blocks: BANK.blocks, active: '名词解释', items: [], theme: 'light' },
  onLoad() {
    const main = getApp().store.loadItems('艺术概论');
    const byQuestion = {};
    main.forEach(x => { byQuestion[x.question] = x; });
    this.rows = BANK.items.map(x => Object.assign({}, byQuestion[x.question] || {}, x));
    this.refresh('名词解释');
  },
  onShow() { gate.guardOrRedirect(); theme.apply(this); },
  back() { if (getCurrentPages().length > 1) wx.navigateBack({ delta: 1 }); else wx.switchTab({ url: '/pages/home/index' }); },
  switchBlock(e) { this.refresh(e.currentTarget.dataset.type); },
  refresh(type) {
    const items = (this.rows || BANK.items).filter(x => x.type === type);
    this.setData({ active: type, items });
  },
});
