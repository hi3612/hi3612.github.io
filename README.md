# 🏡 温馨小木屋

我的 AI 动画作品网站。网址：**https://hi3612.github.io**

---

## 📖 这个网站是干什么的

把自己用 AI 做的动画短片放在网上，任何人打开网址都能看。
支持选集、记忆播放进度、自动连播、评论区。

---

## 🗂 文件都是干嘛的

```
温馨小木屋/
├── index.html          首页（作品封面墙）
├── watch.html          播放页（看视频的地方）
│
├── css/
│   ├── style.css       网站整体样式
│   └── player.css      播放器控件样式
│
├── js/
│   ├── data.js         ⭐ 作品数据（加新作品主要改这里）
│   ├── common.js       公共功能（主题切换等）
│   ├── home.js         首页逻辑
│   └── watch.js        播放页逻辑
│
├── assets/
│   └── covers/         作品封面图
│
└── videos/             视频文件
    └── xiaocao/        《报告，校草总想社死》
        ├── ep01.mp4
        └── ep02.mp4
```

---

## ➕ 怎么加新作品

### 方式一：让 AI 帮你加（推荐）

把新做的视频放到一个文件夹里，然后跟 AI 说：

> "我要加新作品，视频在 D:\xxx 文件夹里，作品名叫《xxx》"

AI 会自动帮你压缩视频、生成封面、改好配置文件、上传。

### 方式二：自己动手

1. **压缩视频**（原始视频通常很大，需要压一压）
2. 把视频放进 `videos/` 下的新文件夹，命名成 `ep01.mp4`、`ep02.mp4`…
3. 把封面图（16:9，建议 1280×720）放进 `assets/covers/`
4. 打开 `js/data.js`，照着已有作品的格式，往 `WORKS` 数组最前面加一段：

```javascript
{
  id: 'xinzuopin',              // 只能用英文字母数字，不能和别的重复
  title: '新作品名字',
  type: '2D动画',
  year: '2026',
  cover: 'assets/covers/xinzuopin.jpg',
  summary: '一句话简介，显示在卡片上',
  synopsis: '详细简介，显示在播放页。\n\n可以换行。',
  tags: ['标签1', '标签2'],
  episodes: [
    { ep: 1, title: '第一集 · 小标题', file: 'videos/xinzuopin/ep01.mp4', duration: '1:30' },
    { ep: 2, title: '第二集 · 小标题', file: 'videos/xinzuopin/ep02.mp4', duration: '1:30' },
  ],
},
```

5. 保存后，双击 `一键发布.bat`（或按下面的"怎么发布"操作）

---

## 🚀 怎么发布（把改动传到网上）

### 最简单：双击根目录的 `一键发布.bat`

它会自动把改动传到 GitHub，等 1-2 分钟网站就更新了。

### 或者手动敲命令

```bash
git add .
git commit -m "更新内容"
git push
```

---

## 💬 开启评论区（可选，一次性设置）

评论区用的是 **Giscus**（免费，基于 GitHub Discussions），访客用 GitHub 账号就能留言。

**设置步骤：**

1. 打开 https://github.com/apps/giscus ，点 **Install**，授权给 `hi3612.github.io` 仓库
2. 打开这个仓库的 **Settings → General → Features**，勾选 **Discussions**
3. 在当前仓库新建一个 Discussion（随便写点什么，比如"欢迎来到温馨小木屋"）
4. 打开 https://giscus.app/zh-CN ，在 **仓库** 那一栏填 `hi3612/hi3612.github.io`
5. 页面下方会生成三段配置代码，记下这三个值：
   - `data-repo-id="..."` 引号里的内容
   - `data-category-id="..."` 引号里的内容
6. 打开网站的播放页，在浏览器控制台里执行（按 **F12** 打开控制台）：

```javascript
localStorage.setItem('wxm_giscus_repo', 'hi3612/hi3612.github.io');
localStorage.setItem('wxm_giscus_repo_id', '这里填 data-repo-id 的值');
localStorage.setItem('wxm_giscus_category_id', '这里填 data-category-id 的值');
```

7. 刷新页面，点"评论"标签，评论区就出来了

> ⚠️ 注意：第 6 步是把配置存在**你这台电脑的浏览器**里。
> 如果想让**所有访客**都能看到评论区，需要把这三个值直接写进 `js/watch.js` 的 `loadGiscus` 函数里（把 `WXM.store.get(...)` 换成直接写字符串）。跟 AI 说一声，它会帮你改。

---

## 🎨 换配色 / 改名字

- **改网站名**：打开 `js/data.js`，改 `SITE_CONFIG.siteName`
- **改标语**：改 `SITE_CONFIG.tagline`
- **改配色**：打开 `css/style.css`，改开头 `:root` 里的颜色变量
  - `--primary` 是主色调（现在是暖木橙 `#e0a869`）
  - 改这一个值，整站颜色都会跟着变

---

## 🛠 常见问题

**Q：网站打不开 / 显示 404？**
A：刚推送完需要等 1-2 分钟。去仓库的 **Actions** 标签看部署进度。还不行就等 5 分钟。

**Q：视频加载很慢？**
A：GitHub 在国内访问速度不稳定。如果慢，可以考虑把视频放到 B 站，然后在网站里嵌入 B 站播放器。跟 AI 说一声就行。

**Q：手机上能看吗？**
A：能。网站做了完整的手机适配，竖屏手机上会自动变成"上面视频、下面选集"的布局。

**Q：播放进度会保存吗？**
A：会。用的是浏览器的本地存储，换设备不同步（每个人各自记各自的）。

---

## 📄 技术说明

- 纯静态网站，无后端、无数据库、零成本
- 托管：GitHub Pages（免费）
- 视频存储：GitHub 仓库（单文件限制 100MB）
- 不依赖任何框架，打开就是原生 HTML/CSS/JS，加载快、好维护
