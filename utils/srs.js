// utils/srs.js —— 间隔重复引擎（纯函数；小程序与浏览器预览共用同一份）
//
// 用户批准的排期（四档自评）：
//   完全不会 → 今天再看（interval 0）
//   有点印象 → 1 天
//   记住了   → 3 天
//   非常熟练 → 7 天；连续两次非常熟练后升到 15 天并封顶
// 记录形如 { due: 'YYYY-MM-DD', interval: 天数, streak: 连续熟练次数, last: 'YYYY-MM-DD' }
// 存储键由 storage.js 统一为 srs:<book>（两书隔离）。

var DAY = 86400000;
var GRADES = ['fail', 'vague', 'ok', 'easy'];
var LABELS = { fail: '完全不会', vague: '有点印象', ok: '记住了', easy: '非常熟练' };

function pad2(n) { return (n < 10 ? '0' : '') + n; }

// 本地日期 → 'YYYY-MM-DD'（不用 toISOString，避免时区把日期推到前一天/后一天）
function todayStr(d) {
  var x = (d instanceof Date) ? d : new Date();
  return x.getFullYear() + '-' + pad2(x.getMonth() + 1) + '-' + pad2(x.getDate());
}

function parse(s) {
  var p = String(s).split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}

function addDays(day, n) {
  var d = parse(day);
  d.setDate(d.getDate() + Number(n));
  return todayStr(d);
}

function daysBetween(a, b) {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / DAY);
}

// 布尔档位（旧接口）→ 四档：true 视为「记住了」，false 视为「完全不会」
function normalizeGrade(g) {
  if (g === true) return 'ok';
  if (g === false) return 'fail';
  return GRADES.indexOf(g) >= 0 ? g : 'ok';
}

function gradeLabel(g) { return LABELS[normalizeGrade(g)]; }

function schedule(rec, grade, today) {
  var g = normalizeGrade(grade);
  var prev = rec || {};
  var interval;
  var streak;
  if (g === 'fail') {
    interval = 0;
    streak = 0;
  } else if (g === 'vague') {
    interval = 1;
    streak = 0;
  } else if (g === 'ok') {
    interval = 3;
    streak = 0;
  } else {
    interval = (prev.interval || 0) >= 7 ? 15 : 7;
    streak = (prev.streak || 0) + 1;
  }
  return { due: addDays(today, interval), interval: interval, streak: streak, last: today };
}

function isDue(rec, today) {
  return !!(rec && rec.due && rec.due <= today);
}

// 到期队列：含到期与今天、按到期升序；没有记录的新题不算待复习
function dueQueue(items, map, today) {
  var m = map || {};
  return (items || []).filter(function (i) { return isDue(m[i.id], today); })
    .sort(function (a, b) {
      if (m[a.id].due === m[b.id].due) return 0;
      return m[a.id].due < m[b.id].due ? -1 : 1;
    })
    .map(function (i) { return i.id; });
}

function dueCount(items, map, today) {
  return dueQueue(items, map, today).length;
}

module.exports = {
  GRADES: GRADES,
  gradeLabel: gradeLabel,
  normalizeGrade: normalizeGrade,
  todayStr: todayStr,
  addDays: addDays,
  daysBetween: daysBetween,
  schedule: schedule,
  isDue: isDue,
  dueQueue: dueQueue,
  dueCount: dueCount,
};
