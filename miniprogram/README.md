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
| 👤 微信登录 + 头像昵称 | `button open-type="chooseAvatar"` + `input type="nickname"` |

## 账号与头像昵称

- **入口**：底部「我的」→ 卡片上的「微信一键登录」；日历首页顶部也有提示条，点一下直达
- **头像**：点圆形虚线框，调起微信头像选择器（`chooseAvatar`），选完自动转存为永久文件
- **昵称**：点输入框，键盘上方会出现「使用微信昵称」，一键填入（微信官方 `type="nickname"`）
- **数据隔离**：游客数据和各账号数据分开存储；首次登录会把本机已有的游客日记自动「认领」到该账号下（去重合并），不会丢
- **退出登录**：日记留在原账号下，重新登录即可看到；退出后进入游客模式
- **公开日记作者**：登录后写的日记会记录作者昵称头像，在「心情海洋」的公开列表里显示

> **关于真正的账号体系**：当前 `wx.login` 只能拿到临时 code，换 openid 必须由服务端做（appsecret 不能放前端），
> 所以默认用本机生成的 uid 作为账号标识，数据存在本设备。
> 若开通了**微信云开发**，把环境 ID 填到 `app.js` 的 `globalData.cloudEnv`，
> 登录时会自动调用云函数 `login` 换真实 openid，uid 即变成跨设备一致的账号 ID。
> 再配合云数据库存日记，就能实现多设备同步（这步需要你注册云开发环境后我再帮你接）。

### 云函数 `login`（接入云开发时创建）

```js
// cloudfunctions/login/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  return { openid: OPENID };
};
```

## 注意事项

1. **天气/定位接口域名**：正式发布前需在小程序管理后台把以下域名加入 request 合法域名：
   - `https://api.open-meteo.com`
   - `https://geocoding-api.open-meteo.com`
   - `https://api.bigdatacloud.net`
   - 开发阶段在开发者工具「详情 → 本地设置」勾选**不校验合法域名**即可直接用
2. **定位权限**：`app.json` 已声明 `scope.userLocation`；正式发布还需在管理后台填写「用户隐私保护指引」
3. **测试号限制**：游客模式无法上传体验版，需注册小程序账号（个人主体免费）获得正式 AppID
4. 照片/录音使用 `wx.saveFile` 持久化（总配额约 10MB），超出会提示存储不足
