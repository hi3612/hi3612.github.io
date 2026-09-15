/* =========================================================
   播放页逻辑
   功能：播放控制、选集切换、进度记忆、自动连播、
         键盘快捷键、点赞收藏分享、评论加载
   ========================================================= */

(function () {
  'use strict';

  /* ---------- 全局状态 ---------- */
  var state = {
    work: null, // 当前作品对象
    epIndex: 0, // 当前第几集（0 开始）
    autonextTimer: null, // 自动连播倒计时
    autonextLeft: 5, // 还剩几秒
    hideBarTimer: null, // 控制条自动隐藏
    isSeeking: false, // 是否正在拖动进度条
    lastSaveTime: 0, // 上次保存进度的时间戳（节流）
    // 是否触摸设备（手机 / 平板）
    // 触摸设备上要屏蔽鼠标事件，否则点一下会触发模拟的 mousemove，控制条就收不回去了
    isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
  };

  /* ---------- 常用元素 ---------- */
  var el = {};

  function grabElements() {
    var ids = [
      'video', 'playerShell', 'playerLoading', 'loadingText', 'playerError', 'errorPath',
      'watchTitle', 'watchSubline', 'episodeList', 'epCount',
      'synopsisMeta', 'synopsisText', 'authorAvatar', 'authorName',
      'likeBtn', 'likeCount', 'favBtn', 'favCount', 'shareBtn', 'copyToast',
      'prevEpBtn', 'nextEpBtn',
      'pcBar', 'pcProgress', 'pcBuffer', 'pcPlayed', 'pcTooltip', 'pcPlay', 'pcPrev',
      'pcNext', 'pcCur', 'pcDur', 'pcMute', 'pcVolume', 'pcSpeed', 'pcPip', 'pcFull',
      'pcTheater', 'pcBigPlay', 'autonextToast', 'autonextCount', 'autonextNow',
      'autonextCancel', 'pcTapFlash', 'tabIntro', 'tabComments', 'panelIntro',
      'panelComments',
      'commentsWrap', 'giscusHint',
    ];
    ids.forEach(function (id) {
      el[id] = document.getElementById(id);
    });
  }

  /* =========================================================
     一、读取网址参数
     ========================================================= */
  function readParams() {
    var params = new URLSearchParams(window.location.search);
    var workId = params.get('work');
    var epParam = parseInt(params.get('ep'), 10);

    var work = workId ? findWorkById(workId) : null;

    // 网址里没写作品 id，就默认显示第一个作品
    if (!work && WORKS.length) {
      work = WORKS[0];
    }

    if (!work) {
      showFatalError('网站上还没有作品');
      return null;
    }

    var epIndex = 0;
    if (!isNaN(epParam) && epParam >= 1 && epParam <= work.episodes.length) {
      epIndex = epParam - 1;
    }

    return { work: work, epIndex: epIndex };
  }

  /* =========================================================
     二、进度记忆
     ========================================================= */
  function progressKey(workId, ep) {
    return 'wxm_progress_' + workId + '_' + ep;
  }

  function saveProgress() {
    if (!state.work || !el.video) return;
    var v = el.video;
    if (!isFinite(v.currentTime) || v.currentTime < 1) return;

    var ep = state.work.episodes[state.epIndex];
    var data = {
      t: v.currentTime,
      d: v.duration || 0,
      at: Date.now(),
    };
    WXM.store.setJSON(progressKey(state.work.id, ep.ep), data);
  }

  function loadProgress() {
    if (!state.work) return 0;
    var ep = state.work.episodes[state.epIndex];
    var data = WXM.store.getJSON(progressKey(state.work.id, ep.ep), null);
    if (!data || typeof data.t !== 'number') return 0;

    // 已经看到 96% 以上，就当作看完了，从头开始
    if (data.d > 0 && data.t / data.d > 0.96) return 0;
    // 只看了不到 3 秒，也从头开始
    if (data.t < 3) return 0;

    return data.t;
  }

  /* =========================================================
     三、渲染页面信息
     ========================================================= */
  function renderWorkInfo() {
    var work = state.work;
    var ep = work.episodes[state.epIndex];

    document.title = work.title + ' 第' + ep.ep + '集 · ' + SITE_CONFIG.siteName;

    el.watchTitle.textContent = work.title + ' · ' + ep.title;

    // 副标题：类型 / 年份 / 总集数 / 作者
    var subHtml = '';
    if (work.type) {
      subHtml += sublineItem(
        '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 11h20M8 6V4M16 6V4"/>',
        work.type
      );
    }
    if (work.year) {
      subHtml += sublineItem(
        '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
        work.year + ' 年'
      );
    }
    subHtml += sublineItem(
      '<path d="M4 6h16v12H4z"/><path d="M4 10h16"/>',
      '共 ' + work.episodes.length + ' 集'
    );
    subHtml += sublineItem(
      '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
      '正在看第 ' + ep.ep + ' 集 · ' + ep.duration
    );
    el.watchSubline.innerHTML = subHtml;

    // 简介面板
    var metaHtml = '';
    if (work.type) metaHtml += '<span class="tag">' + work.type + '</span>';
    if (work.year) metaHtml += '<span class="tag">' + work.year + '</span>';
    (work.tags || []).forEach(function (t) {
      metaHtml += '<span class="tag">#' + t + '</span>';
    });
    el.synopsisMeta.innerHTML = metaHtml;

    el.synopsisText.textContent = work.synopsis || work.summary || '（暂无简介）';

    if (SITE_CONFIG.githubUser) {
      el.authorName.textContent = SITE_CONFIG.githubUser;
      el.authorAvatar.textContent = SITE_CONFIG.githubUser.slice(0, 1).toUpperCase();
    }

    // 选集数量
    el.epCount.textContent = work.episodes.length + ' 集';
  }

  function sublineItem(pathD, text) {
    return (
      '<span class="watch-subline-item">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
      'stroke-linecap="round" stroke-linejoin="round">' + pathD + '</svg>' +
      escapeHtml(text) +
      '</span>'
    );
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* =========================================================
     四、选集列表
     ========================================================= */
  function renderEpisodes() {
    var work = state.work;
    el.episodeList.innerHTML = '';

    work.episodes.forEach(function (ep, i) {
      var item = document.createElement('button');
      item.className = 'episode-item';
      item.type = 'button';
      if (i === state.epIndex) item.classList.add('active');

      // 看过的标记
      var saved = WXM.store.getJSON(progressKey(work.id, ep.ep), null);
      if (saved && saved.d > 0 && saved.t / saved.d > 0.96) {
        item.classList.add('watched');
      }

      item.innerHTML =
        '<span class="episode-num">' + ep.ep + '</span>' +
        '<span class="episode-info">' +
        '<span class="episode-name">' + escapeHtml(ep.title) + '</span>' +
        '</span>' +
        '<span class="episode-playing"><span></span><span></span><span></span></span>' +
        '<span class="episode-duration">' + escapeHtml(ep.duration) + '</span>';

      item.addEventListener('click', function () {
        switchEpisode(i, true);
      });

      el.episodeList.appendChild(item);
    });
  }

  function highlightEpisode() {
    var items = el.episodeList.querySelectorAll('.episode-item');
    items.forEach(function (item, i) {
      if (i === state.epIndex) {
        item.classList.add('active');
        // 滚动到可见区域
        var listRect = el.episodeList.getBoundingClientRect();
        var itemRect = item.getBoundingClientRect();
        if (itemRect.top < listRect.top || itemRect.bottom > listRect.bottom) {
          item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      } else {
        item.classList.remove('active');
      }
    });
  }

  /* =========================================================
     五、切换集数
     ========================================================= */
  function switchEpisode(index, autoplay) {
    if (!state.work) return;
    if (index < 0 || index >= state.work.episodes.length) return;

    // 切集前先保存当前进度
    saveProgress();
    cancelAutonext();

    state.epIndex = index;
    var ep = state.work.episodes[state.epIndex];

    // 更新网址（不刷新页面，这样分享出去就是当前集）
    var newUrl =
      window.location.pathname +
      '?work=' + encodeURIComponent(state.work.id) +
      '&ep=' + ep.ep;
    history.replaceState(null, '', newUrl);

    // 更新界面
    renderWorkInfo();
    highlightEpisode();
    updateEpNavButtons();

    // 换视频
    loadVideo(ep.file, autoplay);
  }

  function updateEpNavButtons() {
    var total = state.work.episodes.length;
    var hasPrev = state.epIndex > 0;
    var hasNext = state.epIndex < total - 1;

    if (el.prevEpBtn) el.prevEpBtn.disabled = !hasPrev;
    if (el.nextEpBtn) el.nextEpBtn.disabled = !hasNext;
    if (el.pcPrev) el.pcPrev.disabled = !hasPrev;
    if (el.pcNext) el.pcNext.disabled = !hasNext;
  }

  function goPrev() {
    if (state.epIndex > 0) switchEpisode(state.epIndex - 1, true);
  }

  function goNext() {
    if (state.epIndex < state.work.episodes.length - 1) {
      switchEpisode(state.epIndex + 1, true);
    }
  }

  /* =========================================================
     六、加载视频
     ========================================================= */
  function loadVideo(src, autoplay) {
    var v = el.video;

    hideError();
    showLoading('正在加载视频…');

    // 重置播放器状态
    v.pause();
    v.removeAttribute('src');
    v.load();

    v.src = src;

    var resumeAt = loadProgress();
    var started = false;

    function onLoaded() {
      if (started) return;
      started = true;
      hideLoading();

      // 恢复上次进度
      if (resumeAt > 0) {
        try {
          v.currentTime = resumeAt;
        } catch (e) {}
      }

      updateDuration();
      el.playerShell.classList.add('pc-ready');

      if (autoplay) {
        var p = v.play();
        if (p && p.catch) {
          p.catch(function () {
            // 浏览器可能拦截自动播放，那就等用户点一下
            el.playerShell.classList.add('paused');
            el.playerShell.classList.remove('pc-hidden');
          });
        }
      } else {
        el.playerShell.classList.add('paused');
      }
    }

    v.addEventListener('loadedmetadata', onLoaded, { once: true });

    // 加载超时保护：12 秒还没好就提示
    var timeoutId = setTimeout(function () {
      if (!started) {
        hideLoading();
        // 不要立刻报错，可能只是慢
        el.loadingText.textContent = '视频有点大，还在加载…';
      }
    }, 12000);

    v.addEventListener('error', function onErr() {
      clearTimeout(timeoutId);
      hideLoading();
      showError(src);
      v.removeEventListener('error', onErr);
    });
  }

  function showLoading(text) {
    if (el.loadingText) el.loadingText.textContent = text || '正在加载视频…';
    if (el.playerLoading) el.playerLoading.classList.add('show');
  }

  function hideLoading() {
    if (el.playerLoading) el.playerLoading.classList.remove('show');
  }

  function showError(src) {
    if (el.errorPath) el.errorPath.textContent = src;
    if (el.playerError) el.playerError.classList.add('show');
  }

  function hideError() {
    if (el.playerError) el.playerError.classList.remove('show');
  }

  function showFatalError(msg) {
    if (el.watchTitle) el.watchTitle.textContent = msg;
  }

  /* =========================================================
     七、播放器控制条
     ========================================================= */
  function updateDuration() {
    var v = el.video;
    var d = v.duration;
    if (isFinite(d) && d > 0) {
      el.pcDur.textContent = formatTime(d);
    } else {
      el.pcDur.textContent = '0:00';
    }
  }

  function updateProgressUI() {
    var v = el.video;
    if (!isFinite(v.duration) || v.duration <= 0) return;

    var pct = (v.currentTime / v.duration) * 100;
    el.pcPlayed.style.width = pct + '%';
    el.pcCur.textContent = formatTime(v.currentTime);

    if (el.pcProgress) {
      el.pcProgress.setAttribute('aria-valuenow', String(Math.round(pct)));
    }

    // 已缓冲进度
    try {
      if (v.buffered.length > 0) {
        var bufEnd = v.buffered.end(v.buffered.length - 1);
        var bufPct = (bufEnd / v.duration) * 100;
        el.pcBuffer.style.width = Math.min(bufPct, 100) + '%';
      }
    } catch (e) {}

    // 进度节流保存（每 4 秒存一次）
    var now = Date.now();
    if (now - state.lastSaveTime > 4000) {
      state.lastSaveTime = now;
      saveProgress();
    }
  }

  function togglePlay() {
    var v = el.video;
    if (v.paused) {
      v.play().catch(function () {});
    } else {
      v.pause();
    }
  }

  function seekBy(seconds) {
    var v = el.video;
    if (!isFinite(v.duration)) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + seconds));
  }

  /* ---------- 进度条拖动 ---------- */
  function initProgressBar() {
    var bar = el.pcProgress;
    if (!bar) return;

    function pctFromEvent(e) {
      var rect = bar.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      return Math.max(0, Math.min(1, x / rect.width));
    }

    function previewTime(e) {
      var pct = pctFromEvent(e);
      var d = el.video.duration;
      if (!isFinite(d) || d <= 0) return;

      el.pcTooltip.textContent = formatTime(pct * d);
      el.pcTooltip.style.left = pct * 100 + '%';
    }

    bar.addEventListener('mousemove', previewTime);
    bar.addEventListener('touchstart', previewTime, { passive: true });

    function startDrag(e) {
      if (!isFinite(el.video.duration) || el.video.duration <= 0) return;
      state.isSeeking = true;
      bar.classList.add('dragging');
      onDrag(e);
    }

    function onDrag(e) {
      if (!state.isSeeking) return;
      var pct = pctFromEvent(e);
      var d = el.video.duration;
      // 拖动时实时更新界面
      el.pcPlayed.style.width = pct * 100 + '%';
      el.pcTooltip.textContent = formatTime(pct * d);
      el.pcTooltip.style.left = pct * 100 + '%';
      el.pcCur.textContent = formatTime(pct * d);
    }

    function endDrag(e) {
      if (!state.isSeeking) return;
      state.isSeeking = false;
      bar.classList.remove('dragging');

      var pct = pctFromEvent(e.changedTouches ? { clientX: e.changedTouches[0].clientX } : e);
      var d = el.video.duration;
      if (isFinite(d) && d > 0) {
        el.video.currentTime = pct * d;
      }
    }

    bar.addEventListener('mousedown', function (e) {
      e.preventDefault();
      startDrag(e);
    });
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', endDrag);

    bar.addEventListener(
      'touchstart',
      function (e) {
        startDrag(e);
      },
      { passive: true }
    );
    document.addEventListener('touchmove', onDrag, { passive: true });
    document.addEventListener('touchend', endDrag);

    // 键盘操作进度条（无障碍）
    bar.addEventListener('keydown', function (e) {
      var v = el.video;
      if (!isFinite(v.duration)) return;
      if (e.key === 'ArrowLeft') {
        v.currentTime = Math.max(0, v.currentTime - 5);
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        v.currentTime = Math.min(v.duration, v.currentTime + 5);
        e.preventDefault();
      }
    });
  }

  /* ---------- 控制条自动隐藏 ---------- */
  function showBarTemporarily() {
    var shell = el.playerShell;
    shell.classList.remove('pc-hidden');
    clearTimeout(state.hideBarTimer);
    if (!el.video.paused) {
      state.hideBarTimer = setTimeout(function () {
        if (!el.video.paused) shell.classList.add('pc-hidden');
      }, 2800);
    }
  }

  /* ---------- 立刻收起控制条（手机上单击用）---------- */
  function hideBar() {
    clearTimeout(state.hideBarTimer);
    el.playerShell.classList.add('pc-hidden');
  }

  /* ---------- 切换控制条显示 / 隐藏（手机上单击用）---------- */
  function toggleBar() {
    if (el.playerShell.classList.contains('pc-hidden')) {
      showBarTemporarily();
    } else {
      hideBar();
    }
  }

  /* ---------- 双击画面时的播放/暂停反馈动画 ---------- */
  var tapFlashTimer = null;
  function showTapFlash(playing) {
    var box = el.pcTapFlash;
    if (!box) return;

    box.innerHTML = playing
      ? '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="7" y="5.5" width="3.6" height="13" rx="1"/><rect x="13.4" y="5.5" width="3.6" height="13" rx="1"/></svg>';

    box.classList.remove('show');
    // 强制重排，让动画能重新播放
    void box.offsetWidth;
    box.classList.add('show');

    clearTimeout(tapFlashTimer);
    tapFlashTimer = setTimeout(function () {
      box.classList.remove('show');
    }, 620);
  }

  /* ---------- 音量 ---------- */
  function initVolume() {
    var savedVol = parseFloat(WXM.store.get('wxm_volume', '1'));
    var savedMuted = WXM.store.get('wxm_muted', '0') === '1';

    if (!isNaN(savedVol)) {
      el.video.volume = Math.max(0, Math.min(1, savedVol));
      el.pcVolume.value = String(el.video.volume);
    }

    if (savedMuted) {
      el.video.muted = true;
    }
    syncVolumeUI();

    el.pcVolume.addEventListener('input', function () {
      el.video.volume = parseFloat(el.pcVolume.value);
      el.video.muted = false;
      WXM.store.set('wxm_volume', String(el.video.volume));
      WXM.store.set('wxm_muted', '0');
      syncVolumeUI();
    });

    el.pcMute.addEventListener('click', function () {
      el.video.muted = !el.video.muted;
      WXM.store.set('wxm_muted', el.video.muted ? '1' : '0');
      syncVolumeUI();
    });
  }

  function syncVolumeUI() {
    if (el.video.muted || el.video.volume === 0) {
      el.playerShell.classList.add('muted');
    } else {
      el.playerShell.classList.remove('muted');
    }
    // 音量条填充色跟随数值
    var v = el.video.muted ? 0 : el.video.volume;
    var pct = Math.round(v * 100);
    el.pcVolume.style.background =
      'linear-gradient(90deg, var(--primary) ' + pct + '%, rgba(255,255,255,.28) ' + pct + '%)';
  }

  /* ---------- 播放速度 ---------- */
  var SPEEDS = [1, 1.25, 1.5, 2, 0.75, 0.5];

  function initSpeed() {
    var savedSpeed = parseFloat(WXM.store.get('wxm_speed', '1'));
    if (!isNaN(savedSpeed) && SPEEDS.indexOf(savedSpeed) !== -1) {
      el.video.playbackRate = savedSpeed;
    }
    updateSpeedLabel();

    el.pcSpeed.addEventListener('click', function () {
      var cur = el.video.playbackRate;
      var idx = SPEEDS.indexOf(cur);
      var next = SPEEDS[(idx + 1) % SPEEDS.length];
      el.video.playbackRate = next;
      WXM.store.set('wxm_speed', String(next));
      updateSpeedLabel();
    });
  }

  function updateSpeedLabel() {
    var r = el.video.playbackRate;
    el.pcSpeed.textContent = (r === 1 ? '1.0' : String(r)) + '×';
  }

  /* ---------- 画中画 ---------- */
  function initPip() {
    if (!document.pictureInPictureEnabled) {
      el.pcPip.style.display = 'none';
      return;
    }
    el.pcPip.addEventListener('click', function () {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(function () {});
      } else {
        el.video.requestPictureInPicture().catch(function () {});
      }
    });
  }

  /* ---------- 横屏锁定（手机上全屏时自动转横屏）---------- */
  function lockLandscape() {
    try {
      if (screen.orientation && typeof screen.orientation.lock === 'function') {
        screen.orientation.lock('landscape').catch(function () {
          // 部分浏览器不支持或不允许，忽略即可（比如 iOS Safari）
        });
      }
    } catch (e) {}
  }

  function unlockLandscape() {
    try {
      if (screen.orientation && typeof screen.orientation.unlock === 'function') {
        screen.orientation.unlock();
      }
    } catch (e) {}
  }

  /* ---------- 全屏 ---------- */
  function toggleFullscreen() {
    var shell = el.playerShell;
    var isFull = document.fullscreenElement || shell.classList.contains('is-fullscreen');

    if (isFull) {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(function () {});
      }
      shell.classList.remove('is-fullscreen');
      unlockLandscape();
    } else {
      var req =
        shell.requestFullscreen ||
        shell.webkitRequestFullscreen ||
        shell.msRequestFullscreen;
      if (req) {
        var p = req.call(shell);
        if (p && p.catch) {
          p.catch(function () {
            // 某些环境下全屏被禁用，就用 CSS 模拟
            shell.classList.add('is-fullscreen');
          });
        }
      } else {
        shell.classList.add('is-fullscreen');
      }
      // 转横屏要在全屏生效之后才行，所以稍微延迟一下
      setTimeout(lockLandscape, 120);
    }
  }

  /* ---------- 网页全屏（影院模式）---------- */
  function toggleTheater() {
    var shell = el.playerShell;
    var on = shell.classList.toggle('is-theater');
    document.body.classList.toggle('theater-lock', on);

    // 进入影院模式时，Esc 退出
    if (on) {
      var escHandler = function (e) {
        if (e.key === 'Escape') {
          shell.classList.remove('is-theater');
          document.body.classList.remove('theater-lock');
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);
    }
  }

  /* =========================================================
     八、自动连播
     ========================================================= */
  function startAutonext() {
    if (state.epIndex >= state.work.episodes.length - 1) return; // 已经是最后一集

    state.autonextLeft = 5;
    el.autonextCount.textContent = String(state.autonextLeft);
    el.autonextToast.classList.add('show');

    state.autonextTimer = setInterval(function () {
      state.autonextLeft -= 1;
      el.autonextCount.textContent = String(state.autonextLeft);
      if (state.autonextLeft <= 0) {
        cancelAutonext();
        goNext();
      }
    }, 1000);
  }

  function cancelAutonext() {
    clearInterval(state.autonextTimer);
    state.autonextTimer = null;
    if (el.autonextToast) el.autonextToast.classList.remove('show');
  }

  /* =========================================================
     九、键盘快捷键
     ========================================================= */
  function initKeyboard() {
    document.addEventListener('keydown', function (e) {
      // 如果焦点在输入框里，不要触发快捷键
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;

      switch (e.key) {
        case ' ':
        case 'Spacebar':
          e.preventDefault();
          togglePlay();
          showBarTemporarily();
          break;

        case 'ArrowLeft':
          e.preventDefault();
          seekBy(-5);
          showBarTemporarily();
          break;

        case 'ArrowRight':
          e.preventDefault();
          seekBy(5);
          showBarTemporarily();
          break;

        case 'ArrowUp':
          e.preventDefault();
          el.video.volume = Math.min(1, el.video.volume + 0.1);
          el.video.muted = false;
          el.pcVolume.value = String(el.video.volume);
          WXM.store.set('wxm_volume', String(el.video.volume));
          syncVolumeUI();
          showBarTemporarily();
          break;

        case 'ArrowDown':
          e.preventDefault();
          el.video.volume = Math.max(0, el.video.volume - 0.1);
          el.pcVolume.value = String(el.video.volume);
          WXM.store.set('wxm_volume', String(el.video.volume));
          syncVolumeUI();
          showBarTemporarily();
          break;

        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;

        case 'm':
        case 'M':
          e.preventDefault();
          el.video.muted = !el.video.muted;
          WXM.store.set('wxm_muted', el.video.muted ? '1' : '0');
          syncVolumeUI();
          break;

        case 'Escape':
          var shell = el.playerShell;
          if (shell.classList.contains('is-theater')) {
            shell.classList.remove('is-theater');
            document.body.classList.remove('theater-lock');
          }
          break;
      }
    });

    // 鼠标移动时把控制条叫回来（手机上不监听，避免误触发）
    if (!state.isTouch) {
      document.addEventListener('mousemove', function () {
        if (el.playerShell.classList.contains('pc-hidden')) {
          showBarTemporarily();
        }
      });
    }
  }

  /* =========================================================
     十、点赞 / 收藏 / 分享
     ========================================================= */
  function initActions() {
    var likeKey = 'wxm_liked_' + state.work.id;
    var favKey = 'wxm_faved_' + state.work.id;

    // 点赞（本地记录，换电脑不通用，但足够用）
    var liked = WXM.store.get(likeKey, '0') === '1';
    el.likeCount.textContent = liked ? '1' : '0';
    if (liked) el.likeBtn.classList.add('active', 'liked');

    el.likeBtn.addEventListener('click', function () {
      var nowLiked = !(WXM.store.get(likeKey, '0') === '1');
      WXM.store.set(likeKey, nowLiked ? '1' : '0');
      el.likeCount.textContent = nowLiked ? '1' : '0';
      el.likeBtn.classList.toggle('active', nowLiked);
      el.likeBtn.classList.toggle('liked', nowLiked);

      // 点个赞的小动画
      if (nowLiked) {
        el.likeBtn.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }],
          { duration: 320, easing: 'ease-out' }
        );
      }
    });

    // 收藏
    var faved = WXM.store.get(favKey, '0') === '1';
    el.favCount.textContent = faved ? '1' : '0';
    if (faved) el.favBtn.classList.add('active');

    el.favBtn.addEventListener('click', function () {
      var nowFaved = !(WXM.store.get(favKey, '0') === '1');
      WXM.store.set(favKey, nowFaved ? '1' : '0');
      el.favCount.textContent = nowFaved ? '1' : '0';
      el.favBtn.classList.toggle('active', nowFaved);

      if (nowFaved) {
        el.favBtn.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }],
          { duration: 320, easing: 'ease-out' }
        );
      }
    });

    // 分享
    el.shareBtn.addEventListener('click', function () {
      var shareUrl =
        location.origin + location.pathname +
        '?work=' + encodeURIComponent(state.work.id) +
        '&ep=' + state.work.episodes[state.epIndex].ep;

      var shareData = {
        title: state.work.title + ' 第' + state.work.episodes[state.epIndex].ep + '集',
        text: state.work.summary || state.work.title,
        url: shareUrl,
      };

      // 手机上优先用系统分享
      if (navigator.share) {
        navigator.share(shareData).catch(function () {});
        return;
      }

      // 电脑上复制到剪贴板
      copyText(shareUrl).then(function (ok) {
        showToast(ok ? '链接已复制，发给你朋友吧～' : '复制失败，请手动复制网址');
      });
    });
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard
        .writeText(text)
        .then(function () {
          return true;
        })
        .catch(function () {
          return fallbackCopy(text);
        });
    }
    return Promise.resolve(fallbackCopy(text));
  }

  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  }

  var toastTimer = null;
  function showToast(msg) {
    el.copyToast.textContent = msg;
    el.copyToast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.copyToast.classList.remove('show');
    }, 2400);
  }

  /* =========================================================
     十一、标签页切换（简介 / 评论）
     ========================================================= */
  function initTabs() {
    var tabs = document.querySelectorAll('.tab');

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var name = tab.getAttribute('data-tab');

        document.querySelectorAll('.tab').forEach(function (t) {
          t.classList.toggle('active', t === tab);
        });

        document.querySelectorAll('.tab-panel').forEach(function (p) {
          p.classList.remove('active');
        });

        var panel = document.getElementById('panel' + name.charAt(0).toUpperCase() + name.slice(1));
        if (panel) panel.classList.add('active');

        // 第一次切到评论页时，才开始加载评论（省流量、更快）
        if (name === 'comments') {
          loadGiscus();
        }
      });
    });
  }

  /* =========================================================
     十二、评论系统（Giscus，基于 GitHub Discussions，免费）
     ========================================================= */
  var giscusLoaded = false;

  function loadGiscus() {
    if (giscusLoaded) return;
    giscusLoaded = true;

    var repo = WXM.store.get('wxm_giscus_repo', '');
    var repoId = WXM.store.get('wxm_giscus_repo_id', '');
    var categoryId = WXM.store.get('wxm_giscus_category_id', '');

    // 还没配置过 Giscus，就先显示说明
    if (!repo || !repoId || !categoryId) {
      if (el.giscusHint) {
        el.giscusHint.innerHTML =
          '评论区还没开启。<br /><br />' +
          '开启后，任何人都能用 GitHub 账号在这里留言。<br />' +
          '（设置方法见 README 文件的「开启评论区」章节）';
      }
      return;
    }

    if (el.giscusHint) el.giscusHint.style.display = 'none';

    var script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', repo);
    script.setAttribute('data-repo-id', repoId);
    script.setAttribute('data-category', 'Announcements');
    script.setAttribute('data-category-id', categoryId);
    script.setAttribute('data-mapping', 'specific');
    script.setAttribute('data-term', state.work.id + '-ep' + state.work.episodes[state.epIndex].ep);
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'top');
    script.setAttribute('data-theme', WXM.getTheme() === 'light' ? 'light' : 'dark_dimmed');
    script.setAttribute('data-lang', 'zh-CN');
    script.setAttribute('crossorigin', 'anonymous');
    script.async = true;

    el.commentsWrap.appendChild(script);
  }

  /* =========================================================
     十三、初始化
     ========================================================= */
  function init() {
    grabElements();

    var params = readParams();
    if (!params) return;

    state.work = params.work;
    state.epIndex = params.epIndex;

    // 渲染
    renderWorkInfo();
    renderEpisodes();
    updateEpNavButtons();

    // 事件绑定
    initProgressBar();
    initVolume();
    initSpeed();
    initPip();
    initKeyboard();
    initActions();
    initTabs();

    // 全屏状态变化时（包括用户按 ESC 或手机返回键退出），自动锁定 / 解除横屏
    function onFullscreenChange() {
      var isFull = document.fullscreenElement || document.webkitFullscreenElement;
      if (isFull) {
        lockLandscape();
        showBarTemporarily();
      } else {
        unlockLandscape();
      }
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);

    // 播放器按钮
    el.pcPlay.addEventListener('click', togglePlay);
    el.pcBigPlay.addEventListener('click', togglePlay);
    el.pcPrev.addEventListener('click', goPrev);
    el.pcNext.addEventListener('click', goNext);
    el.pcFull.addEventListener('click', toggleFullscreen);
    el.pcTheater.addEventListener('click', toggleTheater);

    el.prevEpBtn.addEventListener('click', goPrev);
    el.nextEpBtn.addEventListener('click', goNext);

    el.autonextNow.addEventListener('click', function () {
      cancelAutonext();
      goNext();
    });
    el.autonextCancel.addEventListener('click', cancelAutonext);

    // 视频事件
    var v = el.video;

    v.addEventListener('play', function () {
      el.playerShell.classList.remove('paused');
      showBarTemporarily();
    });

    v.addEventListener('pause', function () {
      el.playerShell.classList.add('paused');
      showBarTemporarily();
      saveProgress();
    });

    v.addEventListener('timeupdate', updateProgressUI);
    v.addEventListener('durationchange', updateDuration);
    v.addEventListener('loadedmetadata', updateDuration);
    v.addEventListener('progress', updateProgressUI);

    v.addEventListener('volumechange', syncVolumeUI);

    // 播放结束 -> 自动连播
    v.addEventListener('ended', function () {
      el.playerShell.classList.add('paused');
      saveProgress();

      // 标记这集已看完
      var ep = state.work.episodes[state.epIndex];
      WXM.store.setJSON(progressKey(state.work.id, ep.ep), { t: 999999, d: 1, at: Date.now() });
      highlightEpisode();

      startAutonext();
    });

    // ---------- 交互手势：手机和电脑分开，符合各自的习惯 ----------
    //   手机：单击 = 显示 / 隐藏控制条，双击 = 播放 / 暂停
    //   电脑：单击 = 播放 / 暂停，双击 = 全屏（保持电脑上的通用习惯）
    if (state.isTouch) {
      var lastTapTime = 0;
      var singleTapTimer = null;
      var touchStartX = 0;
      var touchStartY = 0;
      var DOUBLE_TAP_MS = 280;

      // 记录手指按下位置，用来区分"点击"和"滑动"
      el.playerShell.addEventListener(
        'touchstart',
        function (e) {
          touchStartX = e.changedTouches[0].clientX;
          touchStartY = e.changedTouches[0].clientY;
        },
        { passive: true }
      );

      el.playerShell.addEventListener(
        'touchend',
        function (e) {
          var t = e.changedTouches[0];

          // 手指滑动了（比如在翻页），不算点击
          if (Math.abs(t.clientX - touchStartX) > 12 || Math.abs(t.clientY - touchStartY) > 12) {
            return;
          }

          // 点在控制条 / 大播放按钮 / 自动连播条上时，交给它们自己处理
          if (
            e.target.closest &&
            (e.target.closest('.pc-bar') ||
              e.target.closest('.pc-bigplay') ||
              e.target.closest('.autonext-toast'))
          ) {
            return;
          }

          var now = Date.now();
          if (now - lastTapTime < DOUBLE_TAP_MS) {
            // ===== 双击：播放 / 暂停 =====
            clearTimeout(singleTapTimer);
            singleTapTimer = null;
            lastTapTime = 0;
            togglePlay();
            showTapFlash(!el.video.paused);
            showBarTemporarily();
          } else {
            // 先记下时间，等一下看有没有第二下（避免单击立刻响应）
            lastTapTime = now;
            singleTapTimer = setTimeout(function () {
              singleTapTimer = null;
              lastTapTime = 0;
              // ===== 单击：显示 / 隐藏控制条 =====
              toggleBar();
            }, DOUBLE_TAP_MS);
          }
        },
        { passive: true }
      );
    } else {
      // 电脑端：单击播放/暂停
      v.addEventListener('click', function () {
        togglePlay();
      });
      // 电脑端：双击全屏
      v.addEventListener('dblclick', function (e) {
        e.preventDefault();
        toggleFullscreen();
      });
    }

    // 鼠标移动时显示控制条（只在有鼠标的设备上，手机上会误触发）
    if (!state.isTouch) {
      el.playerShell.addEventListener('mousemove', showBarTemporarily);
      el.playerShell.addEventListener('mouseleave', function () {
        if (!v.paused) el.playerShell.classList.add('pc-hidden');
      });
    }

    // 页面隐藏时保存进度
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) saveProgress();
    });

    // 关闭页面前保存
    window.addEventListener('beforeunload', saveProgress);

    // 开始加载视频
    var firstEp = state.work.episodes[state.epIndex];
    loadVideo(firstEp.file, false);
  }

  /* ---------- 启动 ---------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
