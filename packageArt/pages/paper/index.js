const gate = require('../../../utils/gate.js');
const theme = require('../../../utils/theme.js');
// packageArt/pages/paper/index.js —— 模拟卷：180 分钟严格计时，结束后才开放答案
const EXAM_PREFIX = 'paperExam:';

Page({
  onShow() { gate.guardOrRedirect(); theme.apply(this); this.syncExam(); },
  onHide() { this.stopTimer(); },
  onUnload() { this.stopTimer(); },
  data: { papers: [], no: 1, mode: 'paper', paper: null, examStatus: 'idle', remainingSeconds: 0, remainingText: '03:00:00', theme: 'light' },
  onLoad(q) {
    const fs = wx.getFileSystemManager();
    const papers = JSON.parse(fs.readFileSync('data/mock-papers.json', 'utf8'));
    const no = Math.min(Math.max(Number(q.no) || 1, 1), papers.length);
    this.papers = papers;
    this.setData({
      papers: papers.map((p, i) => ({ no: i + 1, title: p.title })),
      no,
      mode: 'paper',
      paper: papers[no - 1],
    });
    wx.setNavigationBarTitle({ title: '模拟卷 ' + no });
    this.syncExam();
  },
  pick(e) {
    if (this.data.examStatus === 'running') {
      wx.showToast({ title: '考试进行中，不能切换试卷', icon: 'none' });
      return;
    }
    const no = Number(e.currentTarget.dataset.no);
    const saved = this.readExam(no);
    this.setData({ no, paper: this.papers[no - 1], mode: saved && saved.status === 'finished' ? 'answer' : 'paper' });
    wx.setNavigationBarTitle({ title: '模拟卷 ' + no });
    this.syncExam();
  },
  examKey(no) { return EXAM_PREFIX + no; },
  readExam(no) {
    const saved = wx.getStorageSync(this.examKey(no));
    return saved && Number(saved.paper) === Number(no) && saved.endAt ? saved : null;
  },
  saveExam(saved) { wx.setStorageSync(this.examKey(saved.paper), saved); },
  formatTime(sec) {
    sec = Math.max(0, Number(sec) || 0);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return [h, m, s].map(x => String(x).padStart(2, '0')).join(':');
  },
  syncExam() {
    if (!this.papers || !this.data.paper) return;
    const saved = this.readExam(this.data.no);
    if (saved && saved.status === 'running' && Date.now() >= Number(saved.endAt)) {
      saved.status = 'finished';
      saved.remainingSeconds = 0;
      this.saveExam(saved);
      this.setData({ examStatus: 'finished', remainingSeconds: 0, remainingText: '00:00:00', mode: 'answer' });
      this.stopTimer();
      return;
    }
    const status = saved ? saved.status : 'idle';
    const remaining = saved && status === 'running'
      ? Math.max(0, Math.ceil((Number(saved.endAt) - Date.now()) / 1000)) : 0;
    this.setData({
      examStatus: status,
      remainingSeconds: remaining,
      remainingText: status === 'running' ? this.formatTime(remaining) : (status === 'finished' ? '00:00:00' : '03:00:00'),
      mode: status === 'finished' ? 'answer' : (status === 'running' ? 'paper' : this.data.mode),
    });
    if (status === 'running') this.startTimer();
    else this.stopTimer();
  },
  startExam() {
    const old = this.readExam(this.data.no);
    if (old && old.status === 'finished') {
      this.setData({ examStatus: 'finished', mode: 'answer', remainingText: '00:00:00' });
      return;
    }
    if (old && old.status === 'running') { this.syncExam(); return; }
    const now = Date.now();
    const seconds = (this.data.paper.durationMinutes || 180) * 60;
    const saved = { paper: this.data.no, status: 'running', startedAt: now, endAt: now + seconds * 1000 };
    this.saveExam(saved);
    this.setData({ examStatus: 'running', mode: 'paper', remainingSeconds: seconds, remainingText: this.formatTime(seconds) });
    this.startTimer();
  },
  startTimer() {
    if (this.timer) return;
    this.timer = setInterval(() => this.syncExam(), 1000);
  },
  stopTimer() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  },
  setMode(e) {
    const mode = e.currentTarget.dataset.mode;
    if (mode === 'answer' && this.data.examStatus !== 'finished') {
      wx.showToast({ title: '计时结束后才能查看答案', icon: 'none' });
      return;
    }
    this.setData({ mode: mode === 'answer' ? 'answer' : 'paper' });
  },
});
