const app = getApp();
const util = require('../../utils/util');
const storeUtil = require('../../utils/store');
const { MOODS, COMMON_COUNT, faceImg, fishImg } = require('../../utils/moods');

Page({
  data: {
    theme: 'tiffany',
    monthText: '', cells: [], selectedDay: '', selectedText: '',
    entries: [],
    searchQ: '', searchOpen: false, filterMi: -1, chips: [], results: [], resultCount: 0,
    weather: null, locName: '', locLoading: false,
    detail: null, detailShow: false,
    user: null
  },
  viewYear: new Date().getFullYear(),
  viewMonth: new Date().getMonth(),

  onLoad() {
    const todayK = util.todayKey();
    this.setData({ selectedDay: todayK });
    const loc = wx.getStorageSync('loc');
    if (loc && loc.lat) {
      this.setData({ locName: loc.name });
      this.loadWeather(loc.lat, loc.lon);
    } else {
      this.setData({ locName: '未定位' });
    }
  },
  onShow() {
    const theme = app.globalData.theme;
    app.applyTabBarColor(theme);
    this.setData({ theme, user: app.globalData.user || null });
    this.refresh();
  },
  onHide() { if (this.audio) { this.audio.destroy(); this.audio = null; } },

  /* 未登录时顶部提示条 → 一键去登录 */
  goLogin() {
    app.globalData.autoLogin = true;
    wx.switchTab({ url: '/pages/profile/profile' });
  },

  refresh() {
    this.buildCalendar();
    this.renderDayList();
    if (this.data.searchOpen) this.renderSearch();
  },

  /* ---------- 天气 ---------- */
  async loadWeather(lat, lon) {
    this.setData({ locLoading: true });
    try {
      const w = await storeUtil.fetchCurrentWeather(lat, lon);
      const wm = util.WEATHER_MAP[w.weather_code] || ['🌈', '未知'];
      this.setData({ weather: { icon: wm[0], temp: Math.round(w.temperature_2m) + '°', desc: wm[1] } });
    } catch (e) {
      this.setData({ weather: null });
      wx.showToast({ title: '天气获取失败', icon: 'none' });
    }
    this.setData({ locLoading: false });
  },
  async refreshLoc() {
    const that = this;
    wx.getLocation({
      type: 'wgs84',
      success(res) {
        const { latitude: lat, longitude: lon } = res.coords;
        storeUtil.reverseGeocode(lat, lon).then(name => {
          const loc = { lat, lon, name: name || `${lat.toFixed(2)}, ${lon.toFixed(2)}` };
          wx.setStorageSync('loc', loc);
          that.setData({ locName: loc.name });
          that.loadWeather(lat, lon);
        }).catch(() => that.loadWeather(lat, lon));
      },
      fail(err) {
        const msg = { 1: '定位权限被拒绝，可在设置中开启', 2: '位置不可用', 3: '定位超时' };
        wx.showToast({ title: msg[err.errMsg && err.errMsg.slice(-1)] || '定位失败，试试编辑页手动输入城市', icon: 'none' });
      }
    });
  },

  /* ---------- 日历 ---------- */
  buildCalendar() {
    const y = this.viewYear, m = this.viewMonth;
    const store = storeUtil.loadStore();
    const byDate = {};
    store.forEach(x => { (byDate[x.dateKey] = byDate[x.dateKey] || []).push(x); });
    const first = new Date(y, m, 1);
    const startBlanks = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const todayK = util.todayKey();
    const cells = [];
    for (let i = 0; i < startBlanks; i++) cells.push({ blank: true });
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const list = byDate[key] || [];
      const fest = util.getFestival(key);
      const plan = util.getDayPlan(key);
      cells.push({
        key, day: d,
        isToday: key === todayK,
        selected: key === this.data.selectedDay,
        fest: fest ? fest.name : '',
        legal: fest ? fest.legal : false,
        plan: plan ? plan.label : '',
        planName: plan ? (plan.name || '') : '',
        count: list.length,
        mi: list.length ? list[0].mi : -1
      });
    }
    this.setData({ cells, monthText: `${y}年${m + 1}月` });
  },
  prevMonth() {
    this.viewMonth--; if (this.viewMonth < 0) { this.viewMonth = 11; this.viewYear--; }
    this.buildCalendar();
  },
  nextMonth() {
    this.viewMonth++; if (this.viewMonth > 11) { this.viewMonth = 0; this.viewYear++; }
    this.buildCalendar();
  },
  tapDay(e) {
    const key = e.currentTarget.dataset.key;
    if (!key) return;
    this.setData({ selectedDay: key });
    this.buildCalendar();
    this.renderDayList();
  },
  renderDayList() {
    const key = this.data.selectedDay;
    const fest = util.getFestival(key);
    const plan = util.getDayPlan(key);
    let text = util.relLabel(key) + (fest ? ` · 🎉${fest.name}` : '');
    if (plan) text += plan.type === 'rest' ? '（休）' : `（${plan.name}，要上班）`;
    const store = storeUtil.loadStore();
    const entries = store.filter(x => x.dateKey === key).map(x => this.decorate(x));
    this.setData({ selectedText: text + '的日记', entries });
  },
  decorate(item) {
    return Object.assign({}, item, {
      moodImg: faceImg(item.mi),
      moodName: (MOODS[item.mi] || MOODS[1]).n
    });
  },

  /* ---------- 搜索 / 筛选 ---------- */
  onSearchInput(e) {
    const q = e.detail.value;
    this.setData({ searchQ: q, searchOpen: this.data.searchOpen || !!q });
    this.renderSearch();
  },
  onSearchFocus() {
    if (!this.data.searchOpen) { this.setData({ searchOpen: true }); this.renderSearch(); }
  },
  clearSearch() {
    this.setData({ searchQ: '', searchOpen: false });
    this.renderSearch();
  },
  renderSearch() {
    const q = this.data.searchQ.trim().toLowerCase();
    const store = storeUtil.loadStore();
    const counts = {};
    store.forEach(x => { counts[x.mi] = (counts[x.mi] || 0) + 1; });
    const chips = [{ mi: -1, name: '全部', count: store.length, img: '' }]
      .concat(Object.keys(counts).sort((a, b) => counts[b] - counts[a])
        .map(mi => ({ mi: +mi, name: MOODS[mi].n, count: counts[mi], img: faceImg(mi) })));
    this.setData({ chips });
    const active = this.data.searchOpen || q || this.data.filterMi >= 0;
    if (!active) { this.setData({ results: [], resultCount: 0 }); return; }
    const fmi = this.data.filterMi;
    let items = store.filter(x => (fmi < 0 || x.mi === fmi) &&
      (!q || (x.title || '').toLowerCase().includes(q) || (x.content || '').toLowerCase().includes(q)));
    items.sort((a, b) => (b.dateKey + (b.time || '')).localeCompare(a.dateKey + (a.time || '')));
    this.setData({
      results: items.map(x => Object.assign(this.decorate(x), { dateCN: util.dateCN(x.dateKey) })),
      resultCount: items.length
    });
  },
  tapChip(e) {
    const mi = e.currentTarget.dataset.mi;
    this.setData({ filterMi: mi });
    this.renderSearch();
  },

  /* ---------- 详情弹窗 ---------- */
  openDetail(e) {
    const id = +e.currentTarget.dataset.id;
    const item = storeUtil.loadStore().find(x => x.id === id);
    if (!item) return;
    const fest = util.getFestival(item.dateKey);
    const plan = util.getDayPlan(item.dateKey);
    const wm = item.weather || '';
    let meta = `${util.relLabel(item.dateKey)} ${item.time || ''} · ${wm}`;
    if (item.location) meta += ` · 📍${item.location}`;
    if (fest) meta += ` · 🎉${fest.name}`;
    if (plan) meta += plan.type === 'rest' ? '（休）' : `（${plan.name}）`;
    this.setData({
      detailShow: true,
      detail: Object.assign(this.decorate(item), {
        meta, moodName: (MOODS[item.mi] || MOODS[1]).n,
        weatherIcon: item.weatherIcon || ''
      })
    });
  },
  closeDetail() { this.setData({ detailShow: false }); },
  stopBubble() { },
  previewPhoto(e) {
    const urls = this.data.detail.photos;
    wx.previewImage({ current: e.currentTarget.dataset.url, urls });
  },
  playAudio() {
    if (!this.data.detail.audio) return;
    if (!this.audio) {
      this.audio = wx.createInnerAudioContext();
      this.audio.src = this.data.detail.audio;
    }
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
    this.refresh();
    wx.showToast({ title: it.public ? '已公开，小鱼游进海洋啦 🌊' : '已设回私密 🔒', icon: 'none' });
  },
  editEntry(e) {
    const id = e && e.currentTarget ? e.currentTarget.dataset.id : this.data.detail.id;
    this.closeDetail();
    wx.navigateTo({ url: '/pages/editor/editor?id=' + id });
  },
  deleteEntry(e) {
    const id = e.currentTarget ? e.currentTarget.dataset.id : this.data.detail.id;
    wx.showModal({
      title: '删除日记',
      content: '确定删除这篇日记吗？删除后无法恢复。',
      confirmColor: '#ff5c5c',
      success: res => {
        if (!res.confirm) return;
        let store = storeUtil.loadStore();
        store = store.filter(x => x.id !== id);
        storeUtil.saveStore(store);
        this.closeDetail();
        this.refresh();
        wx.showToast({ title: '已删除', icon: 'none' });
      }
    });
  },
  noop() { },

  /* ---------- 写日记入口 ---------- */
  newToday() {
    wx.navigateTo({ url: '/pages/editor/editor?date=' + util.todayKey() });
  },
  writeForDay() {
    wx.navigateTo({ url: '/pages/editor/editor?date=' + this.data.selectedDay });
  }
});
