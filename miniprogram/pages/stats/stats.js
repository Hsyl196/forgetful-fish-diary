const app = getApp();
const storeUtil = require('../../utils/store');
const { MOODS, faceImg } = require('../../utils/moods');

Page({
  data: {
    theme: 'tiffany',
    hasData: false,
    chips: [],
    legend: [],
    total: 0
  },

  onShow() {
    const theme = app.globalData.theme;
    app.applyTabBarColor(theme);
    this.setData({ theme });
    this.render();
  },

  render() {
    const store = storeUtil.loadStore();
    if (!store.length) {
      this.setData({ hasData: false, total: 0, legend: [] });
      return;
    }
    const total = store.length;
    const days = new Set(store.map(x => x.dateKey)).size;
    const pubCount = store.filter(x => x.public).length;
    const counts = {};
    store.forEach(x => { counts[x.mi] = (counts[x.mi] || 0) + 1; });
    const parts = Object.keys(counts).map(mi => ({ mi: +mi, cnt: counts[mi] }))
      .sort((a, b) => b.cnt - a.cnt);
    const legend = parts.map(p => ({
      mi: p.mi,
      img: faceImg(p.mi),
      name: MOODS[p.mi].n,
      cnt: p.cnt,
      pct: Math.round(p.cnt / total * 100),
      color: MOODS[p.mi].stroke
    }));
    this.setData({
      hasData: true, total,
      chips: [
        { label: '日记篇数', value: total },
        { label: '记录天数', value: days },
        { label: '公开篇数', value: pubCount },
        { label: '私密篇数', value: total - pubCount }
      ],
      legend
    });
    // 等 canvas 节点渲染完再画
    wx.nextTick(() => this.drawPie(parts, total));
  },

  drawPie(parts, total) {
    const query = wx.createSelectorQuery();
    query.select('#pie').fields({ node: true, size: true }).exec(res => {
      if (!res || !res[0]) return;
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = wx.getWindowInfo().pixelRatio || 2;
      canvas.width = res[0].width * dpr;
      canvas.height = res[0].height * dpr;
      ctx.scale(dpr, dpr);
      const w = res[0].width, h = res[0].height;
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 14;
      ctx.clearRect(0, 0, w, h);
      let start = -Math.PI / 2;
      parts.forEach(p => {
        const ang = p.cnt / total * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, start, start + ang);
        ctx.closePath();
        ctx.fillStyle = MOODS[p.mi].stroke;
        ctx.fill();
        start += ang;
      });
      // 中心挖空
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#333';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(total), cx, cy - 8);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#999';
      ctx.fillText('篇日记', cx, cy + 16);
    });
  }
});
