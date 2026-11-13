# 鱼的记忆 · 微信小程序版

原生微信小程序版本，与网页版功能对应。

## 导入运行

1. 下载安装「微信开发者工具」（https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html）
2. 打开工具 → 导入项目 → 选择本文件夹（或解压 `fish-diary-miniprogram.zip`）
3. AppID 选择「使用测试号」（游客模式）即可直接预览
4. 详见项目内 `project.config.json`（已配置 touristappid）

## 功能对照

| 功能 | 实现方式 |
|------|----------|
| 📅 日历 + 节假日/调休标注 | 与网页版同一套数据（2024–2030 农历节日 + 国务院放假安排） |
| 😊 16 个涂鸦心情脸 | SVG 已预渲染为 PNG 素材（assets/moods） |
| 🌊 心情海洋 | 同款手绘海底背景 + 小鱼素材，CSS 动画游动 |
| 📊 统计饼图 | Canvas 2D 绘制环形图 |
| 🌤 定位 + 天气 | wx.getLocation + Open-Meteo 接口 |
| 🎤 录音 | wx.getRecorderManager（AAC 格式，最长 1 分钟） |
| 📸 照片 | wx.chooseMedia + 永久存储 |
| 🎨 四套主题 | CSS 变量 + wx.setTabBarStyle 动态换色 |
| ✏️ 编辑日记 / 🔍 搜索筛选 / 📥 备份导入 | 与网页版对齐（备份走剪贴板） |

## 注意事项

1. **天气/定位接口域名**：正式发布前需在小程序管理后台把以下域名加入 request 合法域名：
   - `https://api.open-meteo.com`
   - `https://geocoding-api.open-meteo.com`
   - `https://api.bigdatacloud.net`
   - 开发阶段在开发者工具「详情 → 本地设置」勾选**不校验合法域名**即可直接用
2. **定位权限**：`app.json` 已声明 `scope.userLocation`；正式发布还需在管理后台填写「用户隐私保护指引」
3. **测试号限制**：游客模式无法上传体验版，需注册小程序账号（个人主体免费）获得正式 AppID
4. 照片/录音使用 `wx.saveFile` 持久化（总配额约 10MB），超出会提示存储不足
