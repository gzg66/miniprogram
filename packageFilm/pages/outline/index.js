const gate = require('../../../utils/gate.js');
const theme = require('../../../utils/theme.js');
const NOTES = require('../../data/film-exam-notes.js');

Page({
  data: { modules: NOTES.modules || [], chapters: NOTES.chapters || [], selected: null, theme: 'light' },
  onShow() { gate.guardOrRedirect(); theme.apply(this); },
  openChapter(e) {
    const no = Number(e.currentTarget.dataset.no) || 0;
    const selected = (NOTES.chapters || []).find(c => c.chapterNo === no) || null;
    this.setData({ selected });
  },
  back() {
    if (this.data.selected) this.setData({ selected: null });
    else wx.navigateBack({ delta: 1 });
  },
});
