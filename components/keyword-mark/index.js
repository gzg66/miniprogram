// components/keyword-mark —— 重点标红（节点在 JS 构造，供 rich-text 渲染）
Component({
  properties: { text: { type: String, value: '' }, terms: { type: Array, value: [] } },
  data: { nodes: [] },
  observers: {
    'text, terms': function (text, terms) {
      this.setData({ nodes: buildNodes(text || '', terms || []) });
    },
  },
});

// 长词优先匹配，避免短词吃掉长词；返回 rich-text 可渲染的节点数组
function buildNodes(text, terms) {
  const list = (terms || []).filter(Boolean).sort((a, b) => b.length - a.length);
  const out = [];
  let buf = String(text);
  while (buf.length) {
    let hit = -1;
    let hitTerm = '';
    for (const t of list) {
      const i = buf.indexOf(t);
      if (i >= 0 && (hit < 0 || i < hit)) { hit = i; hitTerm = t; }
    }
    if (hit < 0) { out.push({ type: 'text', text: buf }); break; }
    if (hit > 0) out.push({ type: 'text', text: buf.slice(0, hit) });
    // rich-text 只有「元素节点」能承载样式：class 挂在 text 节点上不会生效，
    // 且组件内样式受隔离影响 → 用 span + 内联 style 才能稳定标红
    out.push({
      name: 'span',
      attrs: { style: 'color:#B2553F;font-weight:700' },
      children: [{ type: 'text', text: hitTerm }],
    });
    buf = buf.slice(hit + hitTerm.length);
  }
  return out;
}

module.exports = { buildNodes };
