/* ================= 账号：微信登录 + 头像昵称 =================
 * 说明：
 *  - 头像走 <button open-type="chooseAvatar">，昵称走 <input type="nickname">，
 *    这是目前微信官方唯一可用的头像昵称获取方式（wx.getUserProfile 已废弃）。
 *  - 没有后端时无法用 code 换 openid（appsecret 不能放前端），
 *    所以默认生成一个本机 uid 作为账号标识；如果之后开通了云开发，
 *    把 app.globalData.cloudEnv 填上，会自动改用云函数换真实 openid。
 */
const USER_KEY = 'xinqing_user';
const GUEST_KEY = 'xinqing_diary';

function getUser() {
  const u = wx.getStorageSync(USER_KEY);
  return u && u.uid ? u : null;
}

function saveUser(u) {
  wx.setStorageSync(USER_KEY, u);
}

function clearUser() {
  wx.removeStorageSync(USER_KEY);
}

/* 当前账号对应的日记存储键（游客与各账号数据互相隔离） */
function storeKey() {
  const u = getUser();
  return u ? 'xinqing_diary_' + u.uid : GUEST_KEY;
}

/* 调起微信登录，拿 code（可用于后端换 openid） */
function loginByWechat() {
  return new Promise(resolve => {
    wx.login({
      success: res => resolve(res.code || ''),
      fail: () => resolve('')
    });
  });
}

/* 若已接入云开发，用云函数换 openid；否则返回空 */
async function resolveOpenid(code) {
  const app = getApp();
  const env = app && app.globalData && app.globalData.cloudEnv;
  if (!env || !wx.cloud) return '';
  try {
    if (!app.globalData.cloudInited) {
      wx.cloud.init({ env, traceUser: true });
      app.globalData.cloudInited = true;
    }
    const r = await wx.cloud.callFunction({ name: 'login', data: { code } });
    return (r && r.result && r.result.openid) || '';
  } catch (e) {
    return '';
  }
}

/* 头像临时路径 → 永久路径（临时文件重启后会失效） */
function persistAvatar(tempPath) {
  return new Promise(resolve => {
    if (!tempPath) return resolve('');
    // 已经是永久路径（USER_DATA_PATH 下的文件）就直接用
    if (tempPath.indexOf(wx.env.USER_DATA_PATH) === 0) return resolve(tempPath);
    wx.saveFile({
      tempFilePath: tempPath,
      success: r => resolve(r.savedFilePath),
      fail: () => {
        try {
          const fs = wx.getFileSystemManager();
          const dest = `${wx.env.USER_DATA_PATH}/avatar_${Date.now()}.png`;
          fs.copyFile({
            srcPath: tempPath,
            destPath: dest,
            success: () => resolve(dest),
            fail: () => resolve(tempPath)
          });
        } catch (e) {
          resolve(tempPath);
        }
      }
    });
  });
}

/* 换头像后清掉旧的头像文件，避免占满本地空间 */
function removeOldAvatar(oldPath, newPath) {
  if (!oldPath || oldPath === newPath) return;
  if (oldPath.indexOf(wx.env.USER_DATA_PATH) !== 0) return;
  try {
    wx.getFileSystemManager().unlink({ filePath: oldPath, fail: () => { } });
  } catch (e) { /* ignore */ }
}

/* 把游客状态下已有日记认领到该账号下（去重合并） */
function claimGuestData(uid) {
  const target = 'xinqing_diary_' + uid;
  const guest = wx.getStorageSync(GUEST_KEY);
  if (!Array.isArray(guest) || !guest.length) return 0;
  const cur = wx.getStorageSync(target);
  const list = Array.isArray(cur) ? cur : [];
  const seenId = new Set(list.map(x => x.id));
  const seenKey = new Set(list.map(x => `${x.dateKey}|${x.time || ''}|${x.title || ''}`));
  let n = 0;
  guest.forEach(x => {
    if (!x || !x.dateKey) return;
    const k = `${x.dateKey}|${x.time || ''}|${x.title || ''}`;
    if (seenId.has(x.id) || seenKey.has(k)) return;
    list.push(x);
    seenId.add(x.id);
    seenKey.add(k);
    n++;
  });
  try {
    wx.setStorageSync(target, list);
    wx.removeStorageSync(GUEST_KEY);
  } catch (e) { return 0; }
  return n;
}

module.exports = {
  getUser, saveUser, clearUser, storeKey,
  loginByWechat, resolveOpenid, persistAvatar, removeOldAvatar, claimGuestData
};
