/* =========================================================
   公共逻辑：主题切换、导航栏、返回顶部、通用工具
   所有页面都会加载这个文件
   ========================================================= */

(function () {
  'use strict';

  /* ---------- 主题切换（记住你的选择）---------- */
  var THEME_KEY = 'wxm_theme';

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    // 同步手机浏览器的地址栏颜色
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'light' ? '#fbf6f0' : '#15120f');
    }
  }

  function getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }

  function toggleTheme() {
    var next = getTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (e) {}
  }

  /* ---------- 本地存储小工具（避免隐私模式下报错）---------- */
  var store = {
    get: function (key, fallback) {
      try {
        var v = localStorage.getItem(key);
        return v === null ? fallback : v;
      } catch (e) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {}
    },
    getJSON: function (key, fallback) {
      try {
        var v = localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) {
        return fallback;
      }
    },
    setJSON: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {}
    },
  };

  /* ---------- 页面初始化 ---------- */
  function init() {
    // 网站名字、作者信息等，统一从 data.js 的 SITE_CONFIG 读
    if (typeof SITE_CONFIG !== 'undefined') {
      var nameEl = document.getElementById('navSiteName');
      if (nameEl) nameEl.textContent = SITE_CONFIG.siteName;

      var heroTitle = document.getElementById('heroTitle');
      if (heroTitle) heroTitle.textContent = SITE_CONFIG.siteName;

      var heroTagline = document.getElementById('heroTagline');
      if (heroTagline) heroTagline.textContent = SITE_CONFIG.tagline;

      document.title = SITE_CONFIG.siteName + ' · 我的动画作品';

      var ghUrl = 'https://github.com/' + SITE_CONFIG.githubUser;
      ['githubLink', 'footerGithub'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.href = ghUrl;
      });
    }

    // 主题按钮
    var toggle = document.getElementById('themeToggle');
    if (toggle) toggle.addEventListener('click', toggleTheme);

    // 页脚年份
    var yearEl = document.getElementById('footerYear');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    // 返回顶部
    var toTop = document.getElementById('toTop');
    if (toTop) {
      toTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      var onScroll = function () {
        if (window.scrollY > 420) {
          toTop.classList.add('show');
        } else {
          toTop.classList.remove('show');
        }
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  }

  /* ---------- 对外暴露 ---------- */
  window.WXM = {
    store: store,
    toggleTheme: toggleTheme,
    getTheme: getTheme,
    applyTheme: applyTheme,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
