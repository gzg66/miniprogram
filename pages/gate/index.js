// pages/gate/index.js —— 云端邀请码门禁页（启动首页）
const gate = require('../../utils/gate.js');
const cloud = require('../../utils/cloud.js');
const theme = require('../../utils/theme.js');

Page({
  data: { code: '', err: '', busy: false, theme: 'light' },
  onShow() {
    theme.apply(this);
    if (!cloud.hasToken()) return;
    this.setData({ busy: true, err: '' });
    cloud.verify().then(() => {
      wx.switchTab({ url: '/pages/home/index' });
    }).catch(() => {
      cloud.clearToken();
      gate.clearGate({ getSync: k => wx.getStorageSync(k), setSync: (k, v) => wx.setStorageSync(k, v) });
      this.setData({ busy: false });
    });
  },
  onInput(e) {
    this.setData({ code: e.detail.value, err: '' });
  },
  submit() {
    if (this.data.busy) return;
    const backend = {
      getSync: k => wx.getStorageSync(k),
      setSync: (k, v) => wx.setStorageSync(k, v),
    };
    if (!String(this.data.code || '').trim()) {
      this.setData({ err: '请输入邀请码' });
      return;
    }
    this.setData({ busy: true, err: '正在验证邀请码…' });
    cloud.activate(this.data.code).then((result) => {
      if (!result || !result.token) throw new Error('授权服务器未返回有效凭证');
      cloud.saveToken(result.token);
      backend.setSync(gate.gateKey(), '1');
      backend.setSync(gate.usedKey(), '1');
      wx.switchTab({ url: '/pages/home/index' });
    }).catch((error) => {
      const n = (this.fails || 0) + 1;
      this.fails = n;
      this.setData({ busy: false, err: error.message || '邀请码验证失败' });
    });
  },
});
