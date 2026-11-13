/* 心情元数据 + 素材路径 */
const MOODS = [
  { n: '甜甜', fill: '#ffe3ec', stroke: '#e0708f' },
  { n: '开心', fill: '#fff3c4', stroke: '#d9a520' },
  { n: '抱抱', fill: '#ffe0d1', stroke: '#e08256' },
  { n: '哈哈', fill: '#ffe98a', stroke: '#cf8a1b' },
  { n: '满足', fill: '#dff5e1', stroke: '#6bbf73' },
  { n: '放松', fill: '#d7ecff', stroke: '#5a9bd4' },
  { n: '懵懵', fill: '#eee6ff', stroke: '#8f7bd0' },
  { n: '委屈', fill: '#dbe7ff', stroke: '#6f8fd6' },
  { n: '感动', fill: '#ffdfdf', stroke: '#d97a7a' },
  { n: '难过', fill: '#d5e6f7', stroke: '#5f8fc0' },
  { n: '哭哭', fill: '#cfe3f9', stroke: '#4f7fc0' },
  { n: '气鼓鼓', fill: '#ffd6d6', stroke: '#d95f5f' },
  { n: '晕乎乎', fill: '#efe3ff', stroke: '#9a7fd6' },
  { n: '困困', fill: '#e8e6f9', stroke: '#8c88c2' },
  { n: '不舒服', fill: '#e0f5ef', stroke: '#64b39b' },
  { n: '融化中', fill: '#ffe8d9', stroke: '#dd9a5f' }
];
const COMMON_COUNT = 6;
const faceImg = i => `/assets/moods/m${i}.png`;
const fishImg = i => `/assets/fish/f${i}.png`;

module.exports = { MOODS, COMMON_COUNT, faceImg, fishImg };
