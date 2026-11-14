const app = getApp();
const util = require('../../utils/util');
const storeUtil = require('../../utils/store');
const { MOODS, faceImg, fishImg } = require('../../utils/moods');

Page({
  data: {
    theme: 'tiffany',
    fishes: [], bubbles: [], pubList: [],
    detail: null, detailShow: false, oceanBg: '/assets/ocean-bg.jpg'
  },

  onShow() {
    const theme = app.globalData.theme;
    app.applyTabBarColor(theme);
    this.setData({ theme });
    this.render();
  },
  onHide() { if (this.audio) { this.audio.destroy(); this.audio = null; } },

  render() {
    const pub = storeUtil.loadStore().filter(x => x.public);
    const fishes = pub.map((item, i) => ({
      id: item.id,
      img: fishImg(item.mi),
      title: item.title,
      top: 8 + (i * 37 + Math.floor(Math.random() * 15)) % 72,
      dur: 16 + (i * 5) % 14,
      delay: -(i * 3.7),
      bobDur: 2.6 + (i % 3) * 0.7,
      w: 170 + (i % 3) * 40
    }));
    const bubbles = [];
    for (let i = 0; i < 10; i++) {
      bubbles.push({
        left: Math.floor(Math.random() * 92),
        s: 8 + Math.floor(Math.random() * 14),
        dur: 6 + Math.random() * 8,
        delay: -Math.random() * 10
      });
    }
    const pubList = pub.map(x => Object.assign({}, x, {
      moodImg: faceImg(x.mi),
      authorName: (x.author && x.author.name) || '',
      authorAvatar: (x.author && x.author.avatar) || ''
    }));
    this.setData({ fishes, bubbles, pubList });
  },

  openFish(e) {
    const id = +e.currentTarget.dataset.id;
    this.openById(id);
  },
  openDetail(e) {
    this.openById(+e.currentTarget.dataset.id);
  },
  openById(id) {
    const item = storeUtil.loadStore().find(x => x.id === id);
    if (!item) return;
    const fest = util.getFestival(item.dateKey);
    let meta = `${util.relLabel(item.dateKey)} ${item.time || ''} · ${item.weather || ''}`;
    if (item.location) meta += ` · 📍${item.location}`;
    if (item.author && item.author.name) meta += ` · 🐟${item.author.name}`;
    if (fest) meta += ` · 🎉${fest.name}`;
    this.setData({
      detailShow: true,
      detail: Object.assign({}, item, {
        moodImg: faceImg(item.mi), meta
      })
    });
  },
  closeDetail() { this.setData({ detailShow: false }); },
  stopBubble() { },
  previewPhoto(e) {
    wx.previewImage({ current: e.currentTarget.dataset.url, urls: this.data.detail.photos });
  },
  playAudio() {
    if (!this.data.detail.audio) return;
    if (!this.audio) { this.audio = wx.createInnerAudioContext(); this.audio.src = this.data.detail.audio; }
    this.audio.play();
  },
  togglePrivacy() {
    const id = this.data.detail.id;
    const store = storeUtil.loadStore();
    const it = store.find(x => x.id === id);
    if (!it) return;
    it.public = !it.public;
    storeUtil.saveStore(store);
    this.closeDetail();
    this.render();
    wx.showToast({ title: it.public ? '已公开 🌊' : '已设回私密 🔒', icon: 'none' });
  },
  editEntry(e) {
    this.setData({ detailShow: false });
    wx.navigateTo({ url: '/pages/editor/editor?id=' + (e.currentTarget ? e.currentTarget.dataset.id : this.data.detail.id) });
  },
  deleteEntry(e) {
    const id = e.currentTarget ? e.currentTarget.dataset.id : this.data.detail.id;
    wx.showModal({
      title: '删除日记', content: '确定删除这篇日记吗？', confirmColor: '#ff5c5c',
      success: res => {
        if (!res.confirm) return;
        let store = storeUtil.loadStore();
        store = store.filter(x => x.id !== id);
        storeUtil.saveStore(store);
        this.setData({ detailShow: false });
        this.render();
      }
    });
  },
  noop() { }
});
