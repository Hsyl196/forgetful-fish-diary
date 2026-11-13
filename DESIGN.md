# DESIGN.md — 鱼的记忆设计令牌

> 单一事实源。页面里不允许出现裸色值 / 阶梯外字号 / 阶梯外圆角。
> Web 版以 px 落地（`index.html` 内 CSS 变量），小程序版按 1px = 2rpx 换算。

## 1. 颜色角色

| 角色 | 变量 | 蒂芙尼蓝（默认） | 用途 |
|---|---|---|---|
| canvas | `--bg / --bg1 / --bg3` | `#eef7f6 / #e9f5f3 / #f6fbfa` | 页面底色（纵向渐变） |
| surface | `--card` | `#ffffff` | 卡片、弹层、导航底 |
| surface-variant | `--surface-2` | `#f4f8f7` | 输入框底、chip、禁用底 |
| ink | `--text` | `#22302e` | 主文字（不用纯黑） |
| ink-secondary | `--text-sub` | `#637977` | 次文字，白底对比 ≈ 5.5:1 |
| ink-muted | `--text-muted` | `#93a5a3` | 占位符、脚注 |
| divider | `--divider` | `rgba(34,48,46,.075)` | 1px 分割线、卡描边 |
| primary | `--primary` | `#0abab5` | 主行动色（一页一个） |
| primary-press | `--primary-deep` | `#078e89` | 按压态、渐变深端 |
| primary-tint | `--primary-light` | `#e6f7f5` | 选中底、标签底 |
| danger | `--danger` | `#e05252` | 删除、录音中、警示 |

主题包：蓝紫极光 `#6c7cff`、樱花粉 `#f4769c`、浅蓝海风 `#4ea5ea`。换主题只换变量，不改组件。

## 2. 字号（7 档，一页 ≤5 档）

| 角色 | px | rpx | 字重 | 用途 |
|---|---|---|---|---|
| display | 23 | 46 | 600 | 首页标题（唯一） |
| title | 17 | 34 | 600 | 卡片标题、昵称 |
| body-strong | 15 | 30 | 600 | 列表主标题、按钮 |
| body | 15 | 30 | 400 | 正文 |
| caption | 13 | 26 | 400 | 次要说明、图例 |
| micro | 11 | 22 | 400 | 时间戳、标签、tab 文字 |
| numeral | 30 | 60 | 700 | 统计大数字（tabular-nums） |

铁律：输入框字号 ≥16px（防 iOS 聚焦放大）；数字用 `font-variant-numeric: tabular-nums`。

## 3. 间距（8 的倍数）

`4 / 8 / 12 / 16 / 24 / 32px`（8/16/24/32/48/64rpx）。
页面左右边距 16px；卡片间距 16px；卡片内边距 16px；模块之间靠留白分组，不堆分割线。

## 4. 圆角（3 档 + 胶囊）

`--r-sm 10px(20rpx)` 小标签、日历格 · `--r-md 14px(28rpx)` 按钮、输入框 · `--r-lg 20px(40rpx)` 卡片、弹层、页头 · `--r-pill` 头像、chip、分段控件。

## 5. 阴影（2 档）

- `--shadow-1`：卡片默认 `0 1px 2px rgba(24,58,55,.04), 0 6px 16px -8px rgba(24,58,55,.10)`
- `--shadow-2`：弹层 `0 14px 34px -16px rgba(24,58,55,.30)`
- 页头/FAB 用品牌色深端投影，不另立档位。

## 6. 组件四态

| 组件 | 默认 | 按压 | 禁用 | 加载/选中 |
|---|---|---|---|---|
| 主按钮 | primary 渐变 + shadow | scale(.985) + brightness(.97) | surface-2 底 + muted 字 | 文案前加 ⏳，防重复提交 |
| 分段控件 | surface 底 muted 字 | — | 到达最新周期时 ‹ › 禁用(透明度 .32) | active: primary 渐变白字 |
| 日历格 | 透明 | surface-2 | — | today: tint 底；selected: tint 底 + inset 1.5px ring |
| 心情格 | surface-2 底 | scale(.96) | — | active: tint 底 + primary 描边 |
| 列表项 | 卡片 shadow-1 | scale(.993) | — | — |
| 输入框 | surface-2 底 + divider 描边 | — | — | focus: primary 描边 + surface 底 |

空状态：表情 + 一句引导 + 行动入口（如「写一篇，鱼就有记忆了 🫧」）。
错误态：一句原因 + 重试入口（天气卡「暂无天气 → 重新定位/手动输入」）。

## 7. 触控与安全区

- 热区 ≥ 44×44pt：日历格 aspect-ratio 1、导航按钮、FAB 56px
- 底部导航 `padding-bottom: env(safe-area-inset-bottom)`；弹层底部同样处理
- 相邻热区间隔 ≥ 8px

## 8. 小程序映射备忘

- CSS 变量块直接搬进 `app.wxss`，长度 ×2 转 rpx
- 涂鸦心情 SVG → 预生成图片资源（`/assets/mood-0.png` … `mood-15.png`），主题色部分用两套即可
- 底部导航改原生 `custom tabBar` 或自绘（保留胶囊 active 形态）
- 玻璃拟态（backdrop-filter）在小程序用半透明纯色降级

## 9. 心情海洋页规格（v2）

- **景深三层**：远（54px · 透明度 .5 · blur 1px · 26-34s）/ 中（78px · .78 / 17-24s）/ 近（100px · 1 / 12-17s），层内 ±4px 随机
- **双向游动**：约 45% 的鱼反向（`animation-direction` 反放 + svg `scaleX(-1)`），速度与方向由日记 id 的伪随机决定 → 重渲染不跳位
- **点击反馈**：svg `:active` scale(1.18) rotate(-6deg)，转场 .18s
- **HUD 标签**：顶部居中玻璃胶囊「🌊 N 条小鱼正在游」，避开底部海草装饰
- **光柱**：3 条 112° 白色渐变（透明度 .13/.09/.07），静态不加动画
- **管理列表**：紧凑单行（心情脸 36px + 标题/日期·地点 + 「设回私密」胶囊按钮），行分隔 divider，点行开详情

## 10. 涂鸦小鱼 v2（仅海洋页使用）

- 结构：双瓣尾巴（`.tail`）→ 背鳍 → 身体椭圆（96×60 viewBox）→ 侧鳍（`.fin`）→ 白色肚皮高光（.3）→ 表情（`faceInner` ×0.55，靠向鱼头）→ 两枚腮红 `#ff9db0 @ .4`
- 动画：尾巴 `tailwag` ±7~9°、侧鳍 `finflap` -8~16°，`transform-box: fill-box`，周期 `--wag`（≈鱼上下浮动周期的 .24 倍），按鱼各异
- 反向鱼：`scaleX(-1)` 通过 `--fx` 变量与 `:active` 缩放共存
- 转小程序：鱼身拆层后预渲染帧图或用 CSS `transform-origin` + `rotate` 关键帧实现（wxml 内联 SVG 不支持动画，需改用 image 帧序列或 lottie）
