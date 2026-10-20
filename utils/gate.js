// utils/gate.js —— 邀请码门禁
//
// 【安全边界，务必知悉】本模块是「软门禁」：纯本地小程序无法做到不可绕过 ——
// 拿到代码包的人可以反编译、跳过校验或直接伪造通过状态。本模块能挡住普通使用者，
// 并让使用者处处看到私人作品声明；**真正拦住外人靠的是微信平台的「体验成员白名单」
// + 不对外发布**（见 miniprogram/README.md 的「访问控制」一节）。
//
// 【换码方法】改下面 CODE_HASH 一行（用新码的 SHA-256），重新提交版本即可；
// 旧码自动失效（storage key 里带哈希前缀）。邀请码明文不得写进本文件。

var CODE_HASH = '2635fb7bb3d1343fed8d93fc9336a440e4ed9523cbb5a0a3b732e5643af84fa1';

var K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }

function utf8Bytes(str) {
  var out = [];
  for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c < 0x80) {
      out.push(c);
    } else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
      var cp = 0x10000 + ((c - 0xd800) << 10) + (str.charCodeAt(++i) - 0xdc00);
      out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    } else {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
  }
  return out;
}

// 纯 JS SHA-256（小程序无 Node crypto，且需可在测试环境运行）
function sha256(text) {
  var bytes = utf8Bytes(String(text == null ? '' : text));
  var bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  var hi = Math.floor(bitLen / 4294967296);
  var lo = bitLen >>> 0;
  bytes.push((hi >>> 24) & 255, (hi >>> 16) & 255, (hi >>> 8) & 255, hi & 255);
  bytes.push((lo >>> 24) & 255, (lo >>> 16) & 255, (lo >>> 8) & 255, lo & 255);

  var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
           0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  var w = new Array(64);

  for (var off = 0; off < bytes.length; off += 64) {
    var i;
    for (i = 0; i < 16; i++) {
      w[i] = (bytes[off + i * 4] << 24) | (bytes[off + i * 4 + 1] << 16)
           | (bytes[off + i * 4 + 2] << 8) | bytes[off + i * 4 + 3];
    }
    for (i = 16; i < 64; i++) {
      var s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      var s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (i = 0; i < 64; i++) {
      var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      var ch = (e & f) ^ (~e & g);
      var t1 = (h + S1 + ch + K[i] + w[i]) | 0;
      var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      var maj = (a & b) ^ (a & c) ^ (b & c);
      var t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0;
      d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  var out = '';
  for (var j = 0; j < 8; j++) out += ('00000000' + (H[j] >>> 0).toString(16)).slice(-8);
  return out;
}

// 输入规整：忽略大小写、连字符、空格等分隔符
function normalize(input) {
  return String(input == null ? '' : input).toUpperCase().replace(/[^0-9A-Z]/g, '');
}

function isValidCode(input) {
  var n = normalize(input);
  return n.length > 0 && sha256(n) === CODE_HASH;
}

// storage key 带哈希前缀：换码后旧的「已通过」状态自动失效
function gateKey() { return 'gate:' + CODE_HASH.slice(0, 8); }

function usedKey() { return 'gate-used:' + CODE_HASH.slice(0, 8); }
function isConsumed(backend) { return backend.getSync(usedKey()) === '1'; }
const REMOTE_TOKEN_KEY = 'kaoyan-license-token';
function isUnlocked(backend) {
  return !!backend.getSync(REMOTE_TOKEN_KEY) || backend.getSync(gateKey()) === '1';
}

// 一次性消费只在当前设备的本地存储内成立；要跨设备全局一次性，必须接入服务端/云函数。
function unlock(backend) {
  if (isConsumed(backend)) return false;
  backend.setSync(gateKey(), '1');
  backend.setSync(usedKey(), '1');
  return true;
}

// 退出授权时只锁定，不清除 used 标记，避免同一邀请码被再次输入。
function clearGate(backend) {
  backend.setSync(gateKey(), '');
  // usedKey 不能清掉：邀请码的“一次性”不能因为用户退出授权而失效。
  backend.setSync(REMOTE_TOKEN_KEY, '');
}

/**
 * 页面守卫：未解锁则执行 redirect（注入以便测试）
 * @returns {boolean} true = 已解锁可继续
 */
function guard(backend, redirect) {
  if (isUnlocked(backend)) return true;
  if (typeof redirect === 'function') redirect();
  return false;
}

// wx 版便捷守卫：页面 onShow 一行调用（不传 backend 时自动用 wx 本地存储）
function guardOrRedirect(backend) {
  var b = backend || {
    getSync: function (k) { return wx.getStorageSync(k); },
    setSync: function (k, v) { wx.setStorageSync(k, v); },
  };
  return guard(b, function () { wx.redirectTo({ url: '/pages/gate/index' }); });
}

module.exports = {
  CODE_HASH: CODE_HASH,
  REMOTE_TOKEN_KEY: REMOTE_TOKEN_KEY,
  sha256: sha256,
  normalize: normalize,
  isValidCode: isValidCode,
  gateKey: gateKey,
  usedKey: usedKey,
  isConsumed: isConsumed,
  isUnlocked: isUnlocked,
  unlock: unlock,
  clearGate: clearGate,
  guard: guard,
  guardOrRedirect: guardOrRedirect,
};
