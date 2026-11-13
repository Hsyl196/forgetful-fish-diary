const app = getApp();
const storeUtil = require('../../utils/store');

const THEMES = [
  { key: 'tiffany', name: '蒂芙尼蓝', c1: '#078e89', c2: '#56d8cd' },
  { key: 'purple', name: '蓝紫极光', c1: '#5866ea', c2: '#9b8cff' },
  { key: 'pink', name: '樱花粉', c1: '#e8658f', c2: '#ffb0c6' },
  { key: 'blue', name: '浅蓝海风', c1: '#3d8fd9', c2: '#a4d8fb' }
];

Page({
  data: {
    theme: 'tiffany',
    themes: THEMES,
    avatar: '/assets/moods/m1.png',
    stats: null,
    locName: '未定位'
  },

  onShow() {
    const theme = app.globalData.theme;
    this.setData({ theme });
    this.render();
  },

  render() {
    const store = storeUtil.loadStore();
    const days = new Set(store.map(x => x.dateKey)).size;
    const photos = store.reduce((s, x) => s + (x.photos ? x.photos.length : 0), 0);
    const { todayKey, fmtKey } = require('../../utils/util');
    const has = k => store.some(x => x.dateKey === k);
    const cur = new Date();
    if (!has(fmtKey(cur))) cur.setDate(cur.getDate() - 1);
    let streak = 0;
    while (has(fmtKey(cur))) { streak++; cur.setDate(cur.getDate() - 1); }
    const loc = wx.getStorageSync('loc');
    this.setData({
      stats: { total: store.length, days, streak, photos },
      locName: loc && loc.name ? loc.name : '未定位'
    });
  },

  pickTheme(e) {
    const key = e.currentTarget.dataset.t;
    app.globalData.theme = key;
    wx.setStorageSync('xinqing_theme', key);
    app.applyTabBarColor(key);
    this.setData({ theme: key });
    wx.showToast({ title: '主题已切换 ✨', icon: 'none' });
  },

  exportData() {
    const store = storeUtil.loadStore();
    if (!store.length) { wx.showToast({ title: '还没有日记可以备份哦', icon: 'none' }); return; }
    wx.setClipboardData({
      data: JSON.stringify(store),
      success: () => wx.showToast({ title: '备份已复制到剪贴板 📤', icon: 'none' })
    });
  },

  importData() {
    wx.getClipboardData({
      success: res => {
        let arr;
        try { arr = JSON.parse(res.data); } catch (e) { arr = null; }
        if (!Array.isArray(arr)) { wx.showToast({ title: '剪贴板里没有备份内容', icon: 'none' }); return; }
        const valid = arr.filter(x => x && x.dateKey && typeof x.mi === 'number');
        if (!valid.length) { wx.showToast({ title: '备份里没有可导入的日记', icon: 'none' }); return; }
        const store = storeUtil.loadStore();
        const key = x => `${x.dateKey}|${x.time || ''}|${x.title || ''}|${(x.content || '').slice(0, 30)}`;
        const seenId = new Set(store.map(x => x.id));
        const seenKey = new Set(store.map(key));
        let added = 0, skipped = 0;
        valid.forEach(x => {
          if ((x.id && seenId.has(x.id)) || seenKey.has(key(x))) { skipped++; return; }
          store.push(Object.assign({}, x, {
            id: x.id || Date.now() + Math.floor(Math.random() * 1000),
            photos: Array.isArray(x.photos) ? x.photos : [],
            public: !!x.public
          }));
          added++;
        });
        if (!added) { wx.showToast({ title: '这 ' + skipped + ' 篇日记已经在设备里了', icon: 'none' }); return; }
        if (!storeUtil.saveStore(store)) { wx.showToast({ title: '存储空间不足，导入失败', icon: 'none' }); return; }
        wx.showToast({ title: `导入成功 ${added} 篇 🐟`, icon: 'none' });
        this.render();
      }
    });
  },

  clearData() {
    wx.showModal({
      title: '清空所有日记',
      content: '包含照片和语音记录，无法恢复！建议先「备份到剪贴板」。',
      confirmColor: '#ff5c5c',
      success: res => {
        if (!res.confirm) return;
        wx.removeStorageSync('xinqing_diary');
        wx.showToast({ title: '已清空，鱼的记忆重启了 🫧', icon: 'none' });
        this.render();
      }
    });
  }
});
