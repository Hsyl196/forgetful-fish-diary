/* 数据存储 + 天气请求 */
const { fmtKey, todayKey } = require('./util');

function loadStore() {
  const s = wx.getStorageSync('xinqing_diary');
  if (!s || !Array.isArray(s)) return [];
  s.forEach(it => {
    if (!it.dateKey) {
      const d = it.id ? new Date(it.id) : new Date();
      it.dateKey = fmtKey(d);
    }
    it.photos = Array.isArray(it.photos) ? it.photos : [];
  });
  return s;
}
function saveStore(store) {
  try {
    wx.setStorageSync('xinqing_diary', JSON.parse(JSON.stringify(store)));
    return true;
  } catch (e) { return false; }
}

function request(url) {
  return new Promise((resolve, reject) => {
    wx.request({
      url, timeout: 8000,
      success: r => (r.statusCode === 200 ? resolve(r.data) : reject(new Error('HTTP ' + r.statusCode))),
      fail: reject
    });
  });
}

/* 当前天气 */
async function fetchCurrentWeather(lat, lon) {
  const w = await request(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`);
  return w.current;
}
/* 某日期的天气（覆盖今天前后共约 108 天） */
async function fetchDayWeather(lat, lon, dateKey) {
  const w = await request(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&past_days=92&forecast_days=16`);
  const idx = w.daily.time.indexOf(dateKey);
  if (idx < 0) return null;
  return {
    code: w.daily.weather_code[idx],
    text: `${Math.round(w.daily.temperature_2m_min[idx])}~${Math.round(w.daily.temperature_2m_max[idx])}°C`
  };
}
/* 城市名 → 经纬度 */
async function geocode(name) {
  const r = await request(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=zh&format=json`);
  if (r.results && r.results.length) return r.results[0];
  return null;
}
/* 经纬度 → 城市名 */
async function reverseGeocode(lat, lon) {
  const r = await request(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh`);
  return r.city || r.locality || r.principalSubdivision || '';
}
/* 定位（Promise 化） */
function getLocation() {
  return new Promise((resolve, reject) => {
    wx.getLocation({
      type: 'wgs84',
      success: resolve,
      fail: reject
    });
  });
}

module.exports = { loadStore, saveStore, request, fetchCurrentWeather, fetchDayWeather, geocode, reverseGeocode, getLocation };
