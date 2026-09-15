/* =========================================================
   首页逻辑：渲染作品卡片、统计数字、卡片动效
   ========================================================= */

(function () {
  'use strict';

  /* ---------- 数字滚动动画 ---------- */
  function animateNumber(el, target, duration) {
    if (!el) return;
    var start = 0;
    var startTime = null;
    var dur = duration || 900;

    function step(timestamp) {
      if (startTime === null) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / dur, 1);
      // easeOutCubic：开始快，结尾慢
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = String(Math.round(start + (target - start) * eased));
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = String(target);
      }
    }
    requestAnimationFrame(step);
  }

  /* ---------- 统计区 ---------- */
  function renderStats() {
    var totalEps = 0;
    var totalSeconds = 0;

    WORKS.forEach(function (work) {
      totalEps += work.episodes.length;
      totalSeconds += calcTotalDuration(work);
    });

    animateNumber(document.getElementById('statWorks'), WORKS.length);
    animateNumber(document.getElementById('statEps'), totalEps);
    animateNumber(document.getElementById('statMinutes') ||
                  document.getElementById('statTime'),
                  Math.round(totalSeconds / 60), 1100);
  }

  /* ---------- 生成一张作品卡片 ---------- */
  function buildCard(work, index) {
    var card = document.createElement('a');
    card.className = 'work-card';
    // 链接带上版本号：这样更新网站后，访客不会卡在旧缓存里
    var ver = (typeof SITE_CONFIG !== 'undefined' && SITE_CONFIG.version) || '1';
    card.href = 'watch.html?work=' + encodeURIComponent(work.id) + '&v=' + ver;
    card.style.animationDelay = (index * 80) + 'ms';
    card.setAttribute('aria-label', work.title);

    var totalSeconds = calcTotalDuration(work);

    // ---- 封面区 ----
    var coverWrap = document.createElement('div');
    coverWrap.className = 'work-cover-wrap';

    var img = document.createElement('img');
    img.className = 'work-cover';
    img.src = work.cover;
    img.alt = work.title + ' 封面';
    img.loading = 'lazy';
    img.decoding = 'async';

    // 封面图缺失时，显示一个好看的占位（不影响功能）
    img.addEventListener('error', function () {
      img.style.display = 'none';
      if (!coverWrap.querySelector('.work-cover-fallback')) {
        var fb = document.createElement('div');
        fb.className = 'work-cover-fallback';
        fb.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" ' +
          'stroke-linecap="round" stroke-linejoin="round">' +
          '<rect x="2" y="4" width="20" height="16" rx="2"/>' +
          '<path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none"/></svg>' +
          '<span style="font-size:12.5px;letter-spacing:.05em">' + work.title + '</span>';
        coverWrap.appendChild(fb);
      }
    });

    coverWrap.appendChild(img);

    // 右上角角标：类型 + 年份
    var badges = document.createElement('div');
    badges.className = 'work-badges';
    if (work.type) {
      var b1 = document.createElement('span');
      b1.className = 'badge badge-primary';
      b1.textContent = work.type;
      badges.appendChild(b1);
    }
    if (work.year) {
      var b2 = document.createElement('span');
      b2.className = 'badge';
      b2.textContent = work.year;
      badges.appendChild(b2);
    }
    coverWrap.appendChild(badges);

    // 悬停时出现的播放按钮
    var playOverlay = document.createElement('div');
    playOverlay.className = 'work-play';
    playOverlay.innerHTML =
      '<div class="work-play-btn" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" fill="currentColor">' +
      '<path d="M8 5.5v13l11-6.5z"/></svg></div>';
    coverWrap.appendChild(playOverlay);

    card.appendChild(coverWrap);

    // ---- 文字区 ----
    var body = document.createElement('div');
    body.className = 'work-body';

    var h3 = document.createElement('h3');
    h3.className = 'work-title';
    h3.textContent = work.title;
    body.appendChild(h3);

    if (work.summary) {
      var sum = document.createElement('p');
      sum.className = 'work-summary';
      sum.textContent = work.summary;
      body.appendChild(sum);
    }

    if (work.tags && work.tags.length) {
      var tagBox = document.createElement('div');
      tagBox.className = 'work-tags';
      work.tags.forEach(function (t) {
        var tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = '#' + t;
        tagBox.appendChild(tag);
      });
      body.appendChild(tagBox);
    }

    // 底部信息条：集数 + 总时长
    var meta = document.createElement('div');
    meta.className = 'work-meta';

    var epCountNum = work.episodes.length;
    meta.innerHTML =
      '<span class="work-meta-item">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 11h20M8 6V4M16 6V4"/></svg>' +
      '共 ' + epCountNum + ' 集</span>' +
      '<span class="work-meta-item">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>' +
      formatDurationCN(totalSeconds) + '</span>';

    body.appendChild(meta);
    card.appendChild(body);

    return card;
  }

  /* ---------- 渲染作品列表 ---------- */
  function renderWorks() {
    var grid = document.getElementById('worksGrid');
    var empty = document.getElementById('emptyState');
    if (!grid) return;

    grid.innerHTML = '';

    if (!WORKS.length) {
      if (empty) empty.style.display = '';
      return;
    }
    if (empty) empty.style.display = 'none';

    WORKS.forEach(function (work, i) {
      grid.appendChild(buildCard(work, i));
    });
  }

  /* ---------- 继续观看：找出最近看到一半的那一集 ---------- */
  function findLastWatched() {
    var best = null;

    WORKS.forEach(function (work) {
      work.episodes.forEach(function (ep) {
        var key = 'wxm_progress_' + work.id + '_' + ep.ep;
        var data = WXM.store.getJSON(key, null);
        if (!data || typeof data.t !== 'number' || !data.at) return;

        var dur = data.d > 0 ? data.d : 0;
        if (!dur) return; // 没有时长信息就跳过

        var pct = data.t / dur;
        if (pct > 0.96) return; // 已经看完了
        if (data.t < 3) return; // 才看了开头几秒，不算

        if (!best || data.at > best.data.at) {
          best = { work: work, ep: ep, data: data, pct: pct, dur: dur };
        }
      });
    });

    return best;
  }

  function renderContinue() {
    var section = document.getElementById('continueSection');
    var card = document.getElementById('continueCard');
    if (!section || !card) return;

    var last = findLastWatched();

    // 没有观看记录，或者没有需要继续的，就藏起来
    if (!last) {
      section.style.display = 'none';
      return;
    }

    section.style.display = '';

    // 缩略图
    var thumb = document.getElementById('continueThumb');
    if (thumb) {
      thumb.src = last.work.cover;
      thumb.alt = last.work.title;
      thumb.addEventListener('error', function () {
        thumb.style.display = 'none';
      });
    }

    // 标题
    var titleEl = document.getElementById('continueTitle');
    if (titleEl) {
      titleEl.textContent = last.work.title + ' · ' + last.ep.title;
    }

    // 看到哪里了
    var metaEl = document.getElementById('continueMeta');
    if (metaEl) {
      metaEl.textContent =
        '看到 ' + formatTime(last.data.t) + ' / ' + formatTime(last.dur) +
        '（' + Math.round(last.pct * 100) + '%）';
    }

    // 进度条
    var fill = document.getElementById('continueBarFill');
    if (fill) {
      setTimeout(function () {
        fill.style.width = Math.round(last.pct * 100) + '%';
      }, 120);
    }

    // 跳转链接（带版本号，避免缓存）
    var ver = (typeof SITE_CONFIG !== 'undefined' && SITE_CONFIG.version) || '1';
    card.href =
      'watch.html?work=' + encodeURIComponent(last.work.id) +
      '&ep=' + last.ep.ep +
      '&v=' + ver;
  }

  /* ---------- 启动 ---------- */
  function boot() {
    renderStats();
    renderContinue();
    renderWorks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
