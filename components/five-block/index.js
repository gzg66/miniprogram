// components/five-block —— 背诵内容展示 + 可保存的自由画笔
function cloneStrokes(value) {
  return (Array.isArray(value) ? value : []).map(stroke => ({
    color: stroke.color || '#D95F59',
    width: Number(stroke.width) || 8,
    points: (Array.isArray(stroke.points) ? stroke.points : []).map(p => ({ x: Number(p.x) || 0, y: Number(p.y) || 0 })),
  }));
}

function decorate(item) {
  const arr = (values, prefix) => (values || []).map((text, index) => ({ text, key: prefix + ':' + index }));
  return {
    answer: arr(item.answer, 'answer'),
    keyPoints: arr(item.keyPoints, 'keyPoint'),
    frameworkPoints: arr(item.framework && item.framework.points, 'framework'),
    cases: arr(item.cases, 'case'),
    mustWrite: (item.framework && item.framework.mustWrite) || [],
  };
}

Component({
  properties: {
    item: { type: Object, value: {} },
    highlights: { type: Object, value: {} },
    drawings: { type: Object, value: { strokes: [] } },
  },
  data: {
    view: { answer: [], keyPoints: [], frameworkPoints: [], cases: [], mustWrite: [] },
    color: '#D95F59',
    colors: ['#D95F59', '#E6A23C', '#4E8C74', '#4C78A8', '#8064A2', '#4A4A4A'],
    penMode: false,
    canvasHeight: 1,
    canUndo: false,
  },
  observers: {
    'item, drawings': function(item, drawings) {
      if (!item || item.id !== this.currentItemId) {
        this.currentItemId = item && item.id;
        this.history = [];
      }
      this.localStrokes = cloneStrokes(drawings && drawings.strokes);
      this.setData({ view: decorate(item || {}), canUndo: (this.history || []).length > 0 });
      if (this.data.penMode) this.initCanvas();
    },
  },
  lifetimes: {
    ready() { this.localStrokes = cloneStrokes(this.data.drawings && this.data.drawings.strokes); },
  },
  methods: {
    onColor(e) { this.setData({ color: e.currentTarget.dataset.color }); },
    togglePen() {
      const next = !this.data.penMode;
      this.penMode = next;
      this.setData({ penMode: next, canvasHeight: next ? 1 : this.data.canvasHeight }, () => {
        if (next) this.initCanvas();
      });
    },
    initCanvas() {
      wx.createSelectorQuery().in(this).select('#inkContent').fields({ size: true }).select('#inkCanvas').fields({ node: true, size: true }).exec(res => {
        const content = res && res[0];
        const canvasInfo = res && res[1];
        if (!content || !canvasInfo || !canvasInfo.node) return;
        this.canvas = canvasInfo.node;
        this.canvasWidth = content.width;
        this.canvasHeight = content.height;
        this.setData({ canvasHeight: Math.max(1, Math.ceil(content.height)) });
        const dpr = wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : (wx.getSystemInfoSync().pixelRatio || 1);
        this.dpr = dpr || 1;
        this.canvas.width = Math.max(1, Math.round(content.width * this.dpr));
        this.canvas.height = Math.max(1, Math.round(content.height * this.dpr));
        this.ctx = this.canvas.getContext('2d');
        this.ctx.scale(this.dpr, this.dpr);
        this.redraw();
      });
    },
    pointFromEvent(e) {
      const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
      return t ? { x: t.x, y: t.y } : null;
    },
    drawStroke(stroke) {
      if (!this.ctx || !stroke || !stroke.points || !stroke.points.length) return;
      const points = stroke.points;
      const ctx = this.ctx;
      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = Number(stroke.width) || 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (points.length === 1) {
        ctx.fillStyle = stroke.color;
        ctx.beginPath();
        ctx.arc(points[0].x, points[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
        ctx.stroke();
      }
      ctx.restore();
    },
    redraw() {
      if (!this.ctx) return;
      this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
      for (const stroke of this.localStrokes || []) this.drawStroke(stroke);
    },
    emitDrawingChange() {
      this.setData({ canUndo: this.history.length > 0 });
      this.triggerEvent('drawing', { strokes: cloneStrokes(this.localStrokes) });
    },
    onTouchStart(e) {
      const point = this.pointFromEvent(e);
      if (!point || !this.ctx) return;
      this.drawing = true;
      this.current = { color: this.data.color, width: 8, points: [point] };
      this.drawStroke(this.current);
    },
    onTouchMove(e) {
      if (!this.drawing || !this.current) return;
      const point = this.pointFromEvent(e);
      if (!point) return;
      const points = this.current.points;
      points.push(point);
      const ctx = this.ctx;
      ctx.save();
      ctx.strokeStyle = this.current.color;
      ctx.lineWidth = this.current.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(points[points.length - 2].x, points[points.length - 2].y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      ctx.restore();
    },
    onTouchEnd() {
      if (!this.drawing || !this.current) return;
      this.drawing = false;
      this.history = this.history || [];
      this.history.push(cloneStrokes(this.localStrokes));
      this.localStrokes.push(this.current);
      this.current = null;
      this.emitDrawingChange();
    },
    undoDrawing() {
      if (!this.history || !this.history.length) return;
      this.localStrokes = this.history.pop();
      this.redraw();
      this.emitDrawingChange();
    },
    clearDrawing() {
      if (!this.localStrokes.length) return;
      wx.showModal({
        title: '清空勾画',
        content: '确定清空本题背诵内容上的全部笔迹吗？',
        success: result => {
          if (!result.confirm) return;
          this.history = this.history || [];
          this.history.push(cloneStrokes(this.localStrokes));
          this.localStrokes = [];
          this.redraw();
          this.emitDrawingChange();
        },
      });
    },
  },
});
