/* =========================================================
   《温馨小木屋》作品数据配置文件
   ---------------------------------------------------------
   【怎么加新作品？】
   看 README.md 里的"加新作品"章节，或者直接告诉 AI 帮你加。
   只需要照着下面的格式，往 works 数组里加一段就行。

   【字段说明】
   id        : 作品编号，只能用英文字母和数字，不能重复
   title     : 作品名（显示在网站上的标题）
   type      : 类型标签，比如 "2D动画" / "3D动画"
   year      : 年份
   cover     : 封面图路径（放在 assets/covers/ 里）
   summary   : 一句话简介（显示在卡片和简介区）
   synopsis  : 详细简介（显示在播放页的"简介"标签里）
   tags      : 标签数组，会显示成小圆角标签
   episodes  : 剧集列表，每一项是一集
       ep        : 第几集（数字）
       title     : 这一集的小标题
       file      : 视频文件路径（放在 videos/ 文件夹里）
       duration  : 时长，格式 "分:秒"（显示在选集列表右边）
   ========================================================= */

const SITE_CONFIG = {
  // 网站名字（显示在浏览器标签页和网站顶部）
  siteName: '温馨小木屋',
  // 网站副标题
  tagline: '把喜欢的故事，一间一间收好',
  // 站长名字
  author: 'hi3612',
  // GitHub 用户名（评论区会用到，改成你的用户名）
  githubUser: 'hi3612',
  // 网站网址
  siteUrl: 'https://hi3612.github.io',

  /* ---------------------------------------------------------
     版本号 —— 改了网站之后，把这个数字 +1
     作用：让访客的浏览器不再用旧缓存，立刻看到新版
     （首页链接会自动带上这个版本号）
     --------------------------------------------------------- */
  version: '7',
};

/* ---------------------------------------------------------
   作品列表：新作品加在最前面，网站上就会排在最前面
   --------------------------------------------------------- */
const WORKS = [
  {
    id: 'xiaocao',
    title: '报告，校草总想社死',
    type: '3D动画',
    year: '2026',
    cover: 'assets/covers/xiaocao.jpg',
    summary: '一心只想安静度日的少女，偏偏被全校最耀眼的人盯上了。',
    synopsis:
      '她是那种把"低调"刻进骨子里的女生，最大的愿望就是平平淡淡度过高中三年。可命运显然没打算让她如愿——那个站在走廊尽头、被全校女生围着的校草，总能在最要命的时刻精准地出现在她面前，然后用最社死的方式把她拽进各种麻烦里。' +
      '\n\n' +
      '本作共 2 集，每集约 1 分 30 秒。用 AI 生成画面，逐帧打磨分镜，讲述一个关于"想藏起来的人"和"偏要找上门的麻烦"之间的故事。',
    tags: ['校园', '日常', '轻喜剧', 'AI生成'],
    episodes: [
      {
        ep: 1,
        title: '第一集 · 躲不掉的人',
        file: 'videos/xiaocao/ep01.mp4',
        duration: '1:30',
      },
      {
        ep: 2,
        title: '第二集 · 社死倒计时',
        file: 'videos/xiaocao/ep02.mp4',
        duration: '1:30',
      },
    ],
  },
];

/* ---------------------------------------------------------
   下面是辅助函数，一般不用改
   --------------------------------------------------------- */

// 按 id 找作品
function findWorkById(id) {
  return WORKS.find((w) => w.id === id) || null;
}

// 计算作品总时长（秒），用于首页显示
function calcTotalDuration(work) {
  let total = 0;
  for (const ep of work.episodes) {
    const parts = String(ep.duration).split(':');
    if (parts.length === 2) {
      total += parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
  }
  return total;
}

// 秒 -> "X分Y秒" 的中文格式
function formatDurationCN(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}秒`;
  if (s === 0) return `${m}分钟`;
  return `${m}分${s}秒`;
}

// 秒 -> "M:SS" 播放器用格式
function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
