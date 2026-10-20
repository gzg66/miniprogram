const { freqLabel } = require('../../utils/store');

Component({
  properties: { freq: { type: String, value: '' }, stars: { type: Number, value: 0 } },
  data: { label: '未分级', cls: 'tag-unrated' },
  observers: {
    freq: function (freq) {
      const map = {
        '高频必考': 'tag-high', '中频背诵': 'tag-mid',
        '低频了解': 'tag-low', '未分级': 'tag-unrated',
      };
      const label = freqLabel(freq);
      this.setData({ label, cls: map[label] });
    },
  },
});
