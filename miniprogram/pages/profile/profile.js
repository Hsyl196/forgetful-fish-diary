const app = getApp();
const storeUtil = require('../../utils/store');
const userUtil = require('../../utils/user');

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
    user: null,
    stats: null,
    locName: '未定位',
    /* 登录浮层 */
    loginOpen: false,
    form: { avatar: '', nick: '' },
    logging: false
  },

  onShow() {
    const theme = app.globalData.theme;
    const user = app.globalData.user || userUtil.getUser();
    app.setUser(user);
    this.setData({ theme, user });
    this.render();
    /* 从日历页提示条「去登录」跳转过来，自动打开登录浮层 */
    if (app.globalData.autoLogin) {
      app.globalData.autoLogin = false;
      if (!user) this.openLogin();
    }
  },

  render() {
    const store = storeUtil.loadStore();
    const days = new Set(store.map(x => x.dateKey)).size;
    const photos = store.reduce((s, x) => s + (x.photos ? x.photos.length : 0), 0);
    const { fmtKey } = require('../../utils/util');
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

  /* ---------- 登录相关 ---------- */
  openLogin() {
    const u = this.data.user;
    this.setData({
      loginOpen: true,
      form: { avatar: u ? u.avatar : '', nick: u ? u.nick : '' }
    });
  },
  closeLogin() {
    this.setData({ loginOpen: false });
  },
  noop() { },

  /* 选择微信头像（open-type="chooseAvatar" 回调） */
  onChooseAvatar(e) {
    const url = e.detail && e.detail.avatarUrl;
    if (url) this.setData({ 'form.avatar': url });
  },

  /* 昵称输入（type="nickname"，键盘上方会提示"使用微信昵称"） */
  onNickInput(e) {
    this.setData({ 'form.nick': e.detail.value || '' });
  },
  clearNick() {
    this.setData({ 'form.nick': '' });
  },

  async doLogin() {
    if (this.data.logging) return;
    const nick = (this.data.form.nick || '').trim();
    if (!nick) {
      wx.showToast({ title: '先填个昵称吧', icon: 'none' });
      return;
    }
    this.setData({ logging: true });
    wx.showLoading({ title: '登录中…', mask: true });

    const old = this.data.user;
    const uid = (old && old.uid) || 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    let code = '';
    try { code = await userUtil.loginByWechat(); } catch (e) { code = ''; }

    try {
      const openid = await userUtil.resolveOpenid(code);
      const avatar = await userUtil.persistAvatar(this.data.form.avatar);

      const user = {
        uid: openid || uid,
        openid: openid || '',
        nick,
        avatar,
        loginAt: (old && old.loginAt) || Date.now(),
        updatedAt: Date.now()
      };
      userUtil.saveUser(user);
      app.setUser(user);
      if (old) userUtil.removeOldAvatar(old.avatar, avatar);

      let claimed = 0;
      if (!old) claimed = userUtil.claimGuestData(user.uid);

      wx.hideLoading();
      this.setData({ user, loginOpen: false, logging: false });
      this.render();
      wx.showToast({
        title: claimed ? `登录成功，${claimed} 篇日记已归到你名下 🐟` : '登录成功 🐟',
        icon: 'none'
      });
    } catch (e) {
      wx.hideLoading();
      this.setData({ logging: false });
      wx.showToast({ title: '登录失败，请重试', icon: 'none' });
    }
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '日记会保留在这个账号下，重新登录即可看到。退出后进入游客模式（游客数据独立）。',
      success: res => {
        if (!res.confirm) return;
        userUtil.clearUser();
        app.setUser(null);
        this.setData({ user: null });
        this.render();
        wx.showToast({ title: '已退出登录', icon: 'none' });
      }
    });
  },

  /* ---------- 主题 / 数据 ---------- */
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
        storeUtil.clearStore();
        wx.showToast({ title: '已清空，鱼的记忆重启了 🫧', icon: 'none' });
        this.render();
      }
    });
  }
});
