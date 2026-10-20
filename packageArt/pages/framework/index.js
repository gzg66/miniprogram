const gate = require('../../../utils/gate.js');
const theme = require('../../../utils/theme.js');
// 使用静态 JS 模块让微信把数据稳定打进分包；真机不依赖文件系统路径。
const FRAMEWORKS = require('../../data/art-frameworks.js');

Page({
  data: { chapters: [], visible: [], activeChapter: 0, theme: 'light' },
  onShow() { gate.guardOrRedirect(); theme.apply(this); },
  onLoad(q) {
    this.all = Array.isArray(FRAMEWORKS.chapters) ? FRAMEWORKS.chapters : [];
    const active = Number(q && q.chapterNo) || 0;
    this.setData({ chapters: this.all, activeChapter: active, visible: [] });
    this.render(active);
    wx.setNavigationBarTitle({ title: '艺术概论知识框架' });
  },
  render(no) {
    const visible = no ? this.all.filter(x => x.chapterNo === no) : this.all;
    this.setData({ visible, activeChapter: no || 0 });
  },
  pickChapter(e) {
    const no = Number(e.currentTarget.dataset.no) || 0;
    this.render(this.data.activeChapter === no ? 0 : no);
  },
  previewImage(e) {
    const src = e.currentTarget.dataset.src;
    const no = Number(e.currentTarget.dataset.chapter) || 0;
    const chapter = this.all.find(x => x.chapterNo === no);
    wx.previewImage({ current: src, urls: (chapter && chapter.images) || [src] });
  },
  onImageError(e) {
    // 留下可见提示，避免真机资源路径/格式异常时只显示一块空白。
    wx.showToast({ title: '框架图加载失败，请重新编译', icon: 'none' });
  },
});
