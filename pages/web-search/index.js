// 网络兜底：题库与电脑文档均未命中时，打开网页搜索。
// 上线前需在小程序后台配置 web-view 业务域名；开发工具可临时关闭域名校验。
const gate = require('../../utils/gate.js');
Page({
  data: { url: '' },
  onShow() { gate.guardOrRedirect(); },
  onLoad(options) {
    const q = decodeURIComponent(options.q || '');
    this.setData({ url: 'https://www.baidu.com/s?wd=' + encodeURIComponent(q) });
  },
});
