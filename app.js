// app.js —— 挂载 store 与 storage 单例
const storeMod = require('./utils/store');
const { createStorage } = require('./utils/storage');

// 真机分包中不能依赖 readdirSync 枚举目录，显式声明题库分片文件。
const ART_DATA_FILES = ['art-1.json', 'art-2.json', 'art-3.json', 'art-4.json', 'art-5.json', 'art-6.json', 'art-misc.json'];
const FILM_DATA_FILES = Array.from({ length: 46 }, (_, i) => 'film-' + (i + 1) + '.json');

App({
  globalData: { pendingSearch: null },
  onLaunch() {
    const fs = wx.getFileSystemManager();
    this.store = storeMod.createStore({
      dataRoot: '',
      readFile: p => fs.readFileSync(p, 'utf8'),
      listFiles: d => fs.readdirSync(d),
      fileMap: {
        'packageArt/data': ART_DATA_FILES,
        'packageFilm/data': FILM_DATA_FILES,
      },
    });
    this.storage = createStorage({
      getSync: k => wx.getStorageSync(k),
      setSync: (k, v) => wx.setStorageSync(k, v),
    });
  },
});
