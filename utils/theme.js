const KEY = 'kaoyan-theme';

function get() {
  return wx.getStorageSync(KEY) === 'dark' ? 'dark' : 'light';
}

function apply(page) {
  const value = get();
  if (page && page.data && page.data.theme !== value) page.setData({ theme: value });
  wx.setNavigationBarColor({
    frontColor: value === 'dark' ? '#FFFFFF' : '#000000',
    backgroundColor: value === 'dark' ? '#202522' : '#F5F3EF',
    animation: { duration: 0, timingFunc: 'linear' },
  });
  wx.setBackgroundColor({ backgroundColor: value === 'dark' ? '#202522' : '#F3F0EC', backgroundColorTop: value === 'dark' ? '#202522' : '#F3F0EC', backgroundColorBottom: value === 'dark' ? '#202522' : '#F3F0EC' });
  wx.setTabBarStyle({
    color: value === 'dark' ? '#AEB8AF' : '#8C8880',
    selectedColor: value === 'dark' ? '#C8D9CB' : '#8A9A8B',
    backgroundColor: value === 'dark' ? '#202522' : '#FFFFFF',
    borderStyle: value === 'dark' ? 'black' : 'white',
  });
  return value;
}

function toggle(page) {
  const value = get() === 'dark' ? 'light' : 'dark';
  wx.setStorageSync(KEY, value);
  apply(page);
  return value;
}

module.exports = { KEY, get, apply, toggle };
