const app = getApp();
const util = require('../../utils/util');
const storeUtil = require('../../utils/store');
const userUtil = require('../../utils/user');
const { MOODS, COMMON_COUNT, faceImg } = require('../../utils/moods');
const { fmtKey } = util;

Page({
  data: {
    theme: 'tiffany',
    editing: false, editId: null,
    dateKey: '', dateText: '', today: '',
    selMi: null, moodExpanded: false,
    title: '', content: '',
    photos: [], audioPath: '', recording: false, recTime: '00:00',
    locName: '未定位',
    weatherText: '', weatherIcon: '',
    maxPhotos: 6
  },
  recorder: null, recTimer: null, recSec: 0, audio: null,
  wxCache: null,

  goBack() { wx.navigateBack(); },
  onTitle(e) { this.setData({ title: e.detail.value }); },
  onContent(e) { this.setData({ content: e.detail.value }); },

  onLoad(options) {
    const theme = app.globalData.theme;
    const todayK = util.todayKey();
    const allMoods = MOODS.map((m, i) => ({ mi: i, name: m.n, img: faceImg(i) }));
    const data = { theme, today: todayK, allMoods, commonMoods: allMoods.slice(0, COMMON_COUNT) };
    const loc = wx.getStorageSync('loc');
    if (loc && loc.name) data.locName = loc.name;

    if (options.id) {
      const store = storeUtil.loadStore();
      const it = store.find(x => x.id === +options.id);
      if (it) {
        data.editing = true;
        data.editId = it.id;
        data.dateKey = it.dateKey;
        data.selMi = it.mi;
        data.title = it.title === '无题' ? '' : it.title;
        data.content = it.content || '';
        data.photos = (it.photos || []).slice();
        data.audioPath = it.audio || '';
        data.moodExpanded = it.mi >= COMMON_COUNT;
        data.weatherText = it.weather || '';
        data.weatherIcon = it.weatherIcon || '🌤️';
        this.initRecorder();
      }
    } else {
      data.dateKey = options.date || todayK;
    }
    data.dateText = this.buildDateText(data.dateKey);
    this.setData(data);
    if (!options.id && loc && loc.lat) this.loadDayWeather(loc.lat, loc.lon);
  },
  onUnload() {
    if (this.recTimer) clearInterval(this.recTimer);
    if (this.audio) this.audio.destroy();
    if (this.recorder) this.recorder.stop();
  },

  buildDateText(key) {
    const fest = util.getFestival(key);
    const plan = util.getDayPlan(key);
    let t = util.dateCN(key);
    if (fest) t += ` · 🎉${fest.name}`;
    if (plan) t += plan.type === 'rest' ? '（休）' : `（${plan.name}）`;
    return t;
  },
  changeDate(e) {
    const key = e.detail.value;
    this.setData({ dateKey: key, dateText: this.buildDateText(key) });
    const loc = wx.getStorageSync('loc');
    if (loc && loc.lat) this.loadDayWeather(loc.lat, loc.lon);
  },

  /* ---------- 心情 ---------- */
  expandMood() { this.setData({ moodExpanded: !this.data.moodExpanded }); },
  pickMood(e) { this.setData({ selMi: +e.currentTarget.dataset.mi }); },

  /* ---------- 定位 + 天气 ---------- */
  async manualCity() {
    const that = this;
    wx.showModal({
      title: '输入城市名',
      editable: true,
      placeholderText: '如：上海、成都',
      success(res) {
        if (!res.confirm || !res.content) return;
        storeUtil.geocode(res.content.trim()).then(r0 => {
          if (!r0) { wx.showToast({ title: '没找到这个城市', icon: 'none' }); return; }
          const loc = { lat: r0.latitude, lon: r0.longitude, name: r0.name + (r0.admin1 && r0.admin1 !== r0.name ? ` · ${r0.admin1}` : '') };
          wx.setStorageSync('loc', loc);
          that.setData({ locName: loc.name });
          that.loadDayWeather(loc.lat, loc.lon);
        }).catch(() => wx.showToast({ title: '查询失败，请检查网络', icon: 'none' }));
      }
    });
  },
  async autoLoc() {
    wx.showLoading({ title: '定位中…' });
    try {
      const pos = await storeUtil.getLocation();
      let name = `${pos.latitude.toFixed(2)}, ${pos.longitude.toFixed(2)}`;
      try { name = (await storeUtil.reverseGeocode(pos.latitude, pos.longitude)) || name; } catch (e) { }
      const loc = { lat: pos.latitude, lon: pos.longitude, name };
      wx.setStorageSync('loc', loc);
      this.setData({ locName: name });
      wx.hideLoading();
      this.loadDayWeather(loc.lat, loc.lon);
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '定位失败，可手动输入城市', icon: 'none' });
    }
  },
  async loadDayWeather(lat, lon) {
    const key = this.data.dateKey;
    if (this.wxCache && this.wxCache.key === key + '|' + lat.toFixed(2) + ',' + lon.toFixed(2)) return;
    this.setData({ weatherText: '正在查询当天天气…' });
    try {
      const w = await storeUtil.fetchDayWeather(lat, lon, key);
      if (!w) { this.setData({ weatherText: '', weatherIcon: '' }); return; }
      const wm = util.WEATHER_MAP[w.code] || ['🌈', '未知'];
      this.wxCache = { key: key + '|' + lat.toFixed(2) + ',' + lon.toFixed(2), icon: wm[0], text: `${wm[1]} · ${w.text}` };
      this.setData({ weatherIcon: wm[0], weatherText: this.wxCache.text });
    } catch (e) {
      this.setData({ weatherText: '' });
      wx.showToast({ title: '天气查询失败', icon: 'none' });
    }
  },

  /* ---------- 照片 ---------- */
  addPhoto() {
    const left = this.data.maxPhotos - this.data.photos.length;
    if (left <= 0) { wx.showToast({ title: '最多 6 张照片', icon: 'none' }); return; }
    wx.chooseMedia({
      count: left, mediaType: ['image'], sizeType: ['compressed'],
      success: res => {
        const fs = wx.getFileSystemManager();
        const saved = [];
        let done = 0;
        res.tempFiles.forEach(f => {
          fs.saveFile({
            tempFilePath: f.tempFilePath,
            success: r => { saved.push(r.savedFilePath); this.finishAdd(saved, res.tempFiles.length, () => done++); },
            fail: () => { saved.push(f.tempFilePath); this.finishAdd(saved, res.tempFiles.length, () => done++); }
          });
        });
      }
    });
  },
  finishAdd(saved, total, tick) {
    tick();
    if (saved.length === total) {
      this.setData({ photos: this.data.photos.concat(saved).slice(0, this.data.maxPhotos) });
    }
  },
  previewPhoto(e) {
    wx.previewImage({ current: e.currentTarget.dataset.url, urls: this.data.photos });
  },
  delPhoto(e) {
    const i = e.currentTarget.dataset.i;
    const photos = this.data.photos.slice();
    photos.splice(i, 1);
    this.setData({ photos });
  },

  /* ---------- 录音 ---------- */
  initRecorder() {
    if (this.recorder) return;
    const rm = wx.getRecorderManager();
    const that = this;
    rm.onStop(res => {
      clearInterval(that.recTimer);
      that.setData({ recording: false, recTime: '00:00' });
      if (res.duration < 800) { wx.showToast({ title: '录音太短啦', icon: 'none' }); return; }
      wx.getFileSystemManager().saveFile({
        tempFilePath: res.tempFilePath,
        success: r => that.setData({ audioPath: r.savedFilePath }),
        fail: () => that.setData({ audioPath: res.tempFilePath })
      });
      wx.showToast({ title: '录音完成，可试听', icon: 'none' });
    });
    this.recorder = rm;
  },
  toggleRecord() {
    this.initRecorder();
    if (this.data.recording) {
      this.recorder.stop();
      return;
    }
    this.recSec = 0;
    this.setData({ recording: true, recTime: '00:00' });
    this.recorder.start({ format: 'aac', duration: 60000 });
    this.recTimer = setInterval(() => {
      this.recSec++;
      this.setData({ recTime: String(Math.floor(this.recSec / 60)).padStart(2, '0') + ':' + String(this.recSec % 60).padStart(2, '0') });
    }, 1000);
  },
  playAudio() {
    if (!this.data.audioPath) return;
    if (!this.audio) {
      this.audio = wx.createInnerAudioContext();
      this.audio.src = this.data.audioPath;
    }
    this.audio.play();
  },
  delAudio() {
    this.setData({ audioPath: '' });
    if (this.audio) { this.audio.destroy(); this.audio = null; }
  },

  /* ---------- 保存 ---------- */
  save() {
    if (this.data.selMi === null) { wx.showToast({ title: '先选一个心情小脸吧', icon: 'none' }); return; }
    if (!this.data.content.trim() && !this.data.photos.length) {
      wx.showToast({ title: '写点什么或放张照片吧', icon: 'none' }); return;
    }
    const store = storeUtil.loadStore();
    const editing = this.data.editing ? store.find(x => x.id === this.data.editId) : null;
    const me = userUtil.getUser();
    const fields = {
      dateKey: this.data.dateKey,
      title: this.data.title.trim() || '无题',
      content: this.data.content.trim(),
      mi: this.data.selMi,
      photos: this.data.photos,
      location: this.data.locName === '未定位' ? '' : this.data.locName,
      weather: this.data.weatherText || '',
      weatherIcon: this.data.weatherIcon || '',
      /* 作者信息：新日记记当前登录用户，编辑时保留原作者 */
      author: editing ? (editing.author || null)
        : (me ? { name: me.nick, avatar: me.avatar, uid: me.uid } : null)
    };
    let entry;
    if (editing) {
      Object.assign(editing, fields);
      entry = editing;
    } else {
      const n = new Date();
      entry = Object.assign({
        id: Date.now(),
        time: `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`,
        public: false,
        audio: null
      }, fields);
    }
    const finish = () => {
      if (!editing) store.unshift(entry);
      if (!storeUtil.saveStore(store)) {
        if (!editing) store.shift();
        wx.showToast({ title: '存储空间不足，保存失败', icon: 'none' });
        return;
      }
      wx.showToast({ title: editing ? '日记已更新 ✨' : '日记已保存 🐟', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 600);
    };
    if (!editing && this.data.audioPath) {
      entry.audio = this.data.audioPath;
    } else if (editing && this.data.audioPath) {
      entry.audio = this.data.audioPath;
    }
    finish();
  }
});
