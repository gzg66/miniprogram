// 云端授权接口：小程序使用邀请码，题库内容仍保留在本地包内。
const API_BASE = 'https://kaoyan-memorization-d0bl72591bdc-1506337511.ap-shanghai.app.tcloudbase.com';
const TOKEN_KEY = 'kaoyan-license-token';

function request(path, options) {
  const opt = options || {};
  const header = Object.assign({ 'content-type': 'application/json' }, opt.header || {});
  const token = wx.getStorageSync(TOKEN_KEY);
  if (token && !opt.skipToken) header['x-license-token'] = token;
  return new Promise((resolve, reject) => {
    wx.request({
      url: API_BASE + path,
      method: opt.method || 'GET',
      data: opt.data || {},
      header,
      success(res) {
        let data = res.data;
        if (typeof data === 'string') {
          try { data = JSON.parse(data); } catch (_) { data = {}; }
        }
        if (res.statusCode >= 200 && res.statusCode < 300) return resolve(data || {});
        reject(new Error((data && data.error) || '云端请求失败（' + res.statusCode + '）'));
      },
      fail(err) {
        const detail = err && (err.errMsg || err.message);
        reject(new Error(detail ? '授权请求失败：' + detail : '无法连接授权服务器，请检查小程序 request 合法域名配置'));
      },
    });
  });
}

function activate(code) {
  return request('/api/activate', {
    method: 'POST',
    data: { code, client: 'miniprogram' },
    header: { 'x-client': 'miniprogram' },
    skipToken: true,
  });
}

function verify() { return request('/api/license'); }

function submitFeedback(payload) {
  return request('/api/feedback', { method: 'POST', data: payload || {} });
}

function saveToken(token) {
  if (token) wx.setStorageSync(TOKEN_KEY, token);
}

function clearToken() { wx.removeStorageSync(TOKEN_KEY); }

function hasToken() { return !!wx.getStorageSync(TOKEN_KEY); }

module.exports = { API_BASE, TOKEN_KEY, activate, verify, submitFeedback, saveToken, clearToken, hasToken };
