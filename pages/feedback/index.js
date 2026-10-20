const gate = require('../../utils/gate.js');
const theme = require('../../utils/theme.js');
const cloud = require('../../utils/cloud.js');

Page({
  data: { theme: 'light', type: '补充题目', book: '电影概论', chapter: '', title: '', content: '', busy: false, message: '' },
  onShow() { gate.guardOrRedirect(); theme.apply(this); },
  back() { wx.navigateBack({ delta: 1 }); },
  chooseType(e) { this.setData({ type: e.currentTarget.dataset.type }); },
  chooseBook(e) { this.setData({ book: e.currentTarget.dataset.book }); },
  onInput(e) { this.setData({ [e.currentTarget.dataset.field]: e.detail.value }); },
  submit() {
    const d = this.data;
    if (!String(d.content || '').trim()) { this.setData({ message: '请先填写具体内容' }); return; }
    this.setData({ busy: true, message: '' });
    cloud.submitFeedback({ type: d.type, book: d.book, chapter: d.chapter, title: d.title, content: d.content })
      .then(() => this.setData({ busy: false, title: '', chapter: '', content: '', message: '已提交，感谢你的补充！' }))
      .catch(err => this.setData({ busy: false, message: err.message || '提交失败，请稍后重试' }));
  },
});
