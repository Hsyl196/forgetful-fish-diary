App({
  globalData: {
    theme: wx.getStorageSync('xinqing_theme') || 'tiffany'
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
  }
});
