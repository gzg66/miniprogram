// utils/timeline.js —— 双轴时间轴纯函数（无 wx 依赖，可在小程序、预览与测试中复用）
//
// 设计：数据形如 { decades: [{ century, label, entries: [{ year, country, movement, place, memory, people[], films[], claim, source }] }] }
// 本模块只做「分组 / 筛选 / 搜索 / 标签」这类纯计算，渲染交给页面。

function centuryOf(year) {
  return Math.floor(Number(year) / 100) + 1;
}

function decadeLabel(year) {
  return String(Math.floor(Number(year) / 10) * 10) + 's';
}

// 把 decades 摊平为条目数组，并补上 century / decade 字段
function flatten(decades) {
  var out = [];
  (decades || []).forEach(function (dec) {
    var label = dec.label || decadeLabel((dec.entries || [{}])[0].year || 0);
    (dec.entries || []).forEach(function (e) {
      out.push({
        year: e.year,
        country: e.country,
        movement: e.movement,
        kind: e.kind || 'movement',
        people: e.people || [],
        films: e.films || [],
        claim: e.claim,
        source: e.source,
        place: e.place || e.country,
        memory: e.memory || (String(e.year) + '年｜' + String(e.place || e.country) + '｜' + String(e.movement)),
        century: typeof dec.century === 'number' ? dec.century : centuryOf(e.year),
        decade: label,
      });
    });
  });
  out.sort(function (a, b) { return a.year - b.year; });
  return out;
}

// 背诵视图：按精确年份分组。一个年份只出现一次，同年发生多件事时在同一张年份卡中并列。
function groupByYear(entries) {
  var nodes = {};
  (entries || []).forEach(function (e) {
    var year = Number(e.year);
    if (!nodes[year]) nodes[year] = { year: year, entries: [] };
    nodes[year].entries.push(e);
  });
  return Object.keys(nodes).map(Number).sort(function (a, b) { return a - b; }).map(function (year) {
    nodes[year].entries.sort(function (a, b) {
      return String(a.country).localeCompare(String(b.country), 'zh-CN') || String(a.movement).localeCompare(String(b.movement), 'zh-CN');
    });
    return nodes[year];
  });
}

// 纵轴：按世纪分组，世纪升序；每个节点带上它自己的年代带与摊平条目
function groupByCentury(decades) {
  var nodes = {};
  (decades || []).forEach(function (dec) {
    var c = typeof dec.century === 'number' ? dec.century : centuryOf((dec.entries || [{}])[0].year || 0);
    if (!nodes[c]) nodes[c] = { century: c, decades: [], entries: [] };
    nodes[c].decades.push(dec);
    nodes[c].entries = nodes[c].entries.concat(flatten([dec]));
  });
  return Object.keys(nodes).map(Number).sort(function (a, b) { return a - b; }).map(function (c) {
    var n = nodes[c];
    n.entries.sort(function (a, b) { return a.year - b.year; });
    n.decades.sort(function (a, b) {
      return String(a.label) < String(b.label) ? -1 : 1;
    });
    return n;
  });
}

// 筛选：country / movement 用子串匹配（教材里国别名常带附注，如「英国·美国」），
// century 精确匹配，from / to 为闭区间
function filterEntries(entries, opts) {
  var o = opts || {};
  var list = entries || [];
  return list.filter(function (e) {
    if (o.country && String(e.country).indexOf(o.country) < 0) return false;
    if (o.movement && String(e.movement).indexOf(o.movement) < 0) return false;
    if (typeof o.century === 'number' && e.century !== o.century) return false;
    if (typeof o.from === 'number' && e.year < o.from) return false;
    if (typeof o.to === 'number' && e.year > o.to) return false;
    return true;
  });
}

// 搜索：流派 / 国别 / 人物 / 片名 / 主张 都参与匹配
function searchEntries(entries, q) {
  var needle = String(q == null ? '' : q).trim();
  if (!needle) return [];
  return (entries || []).filter(function (e) {
    if (String(e.year).indexOf(needle) >= 0) return true;
    if (String(e.movement).indexOf(needle) >= 0) return true;
    if (String(e.country).indexOf(needle) >= 0) return true;
    if (String(e.claim || '').indexOf(needle) >= 0) return true;
    if ((e.people || []).some(function (p) { return String(p).indexOf(needle) >= 0; })) return true;
    if ((e.films || []).some(function (f) { return String(f).indexOf(needle) >= 0; })) return true;
    return false;
  });
}

module.exports = {
  centuryOf: centuryOf,
  decadeLabel: decadeLabel,
  flatten: flatten,
  groupByYear: groupByYear,
  groupByCentury: groupByCentury,
  filterEntries: filterEntries,
  searchEntries: searchEntries,
};
