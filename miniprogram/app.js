const userUtil = require('./utils/user');

App({
  globalData: {
    theme: wx.getStorageSync('xinqing_theme') || 'tiffany',
    user: userUtil.getUser(),
    /* 若以后开通微信云开发，把环境 ID 填这里，
       登录时会自动用云函数换真实 openid（真正的跨设备账号） */
    cloudEnv: '',
    cloudInited: false
  },
  themeColors: {
    tiffany: '#0abab5',
    purple: '#6c7cff',
    pink: '#ff7fa5',
    blue: '#58aef2'
  },
  applyTabBarColor(theme) {
    const c = this.themeColors[theme] || this.themeColors.tiffany;
    try {
      wx.setTabBarStyle({ selectedColor: c });
      wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: c });
    } catch (e) { /* 非 tabBar 页面会失败，忽略 */ }
  },
  setUser(user) {
    this.globalData.user = user;
  }
});
