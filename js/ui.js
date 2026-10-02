/* ui.js —— 公共 UI 工具（浏览器端，依赖 Core）
 * B/C 各页面复用：卡片渲染、分类图标、Toast、URL 参数、匿名 uid、一键复制。
 */
(function (root) {
  'use strict';

  // 分类 → emoji 图标（与原型 pages/ 一致）
  const CATEGORY_ICON = {
    '证件卡类': '🎫', '钥匙': '🔑', '雨伞': '☂️', '水杯': '🥤',
    '耳机': '🎧', '图书': '📚', '书籍': '📚', '其他': '📦'
  };

  function categoryIcon(cat) { return CATEGORY_ICON[cat] || '📦'; }

  function typeLabel(type) { return type === 'lost' ? '寻物' : '招领'; }

  // 徽章文案：已解决时按类型显示「已找到/已归还」，否则显示「寻物/招领」
  function statusLabel(item) {
    return item.status === 'resolved' ? Core.resolvedLabel(item.type) : typeLabel(item.type);
  }

  // 缩略图底色：已解决→灰；寻物→琥珀；招领→绿
  function thumbClass(item) {
    if (item.status === 'resolved') return 'thumb done';
    return item.type === 'lost' ? 'thumb lost' : 'thumb found';
  }

  // 渲染一条信息卡片（首页 / 搜索 / 我的 通用）
  function itemCard(item) {
    const tagCls = item.status === 'resolved' ? 'tag cat' : (item.type === 'lost' ? 'tag lost' : 'tag found');
    const tagText = statusLabel(item);
    const catTag = item.status === 'resolved'
      ? '<span class="tag cat">已解决</span>'
      : '<span class="tag cat">' + Core.escapeHtml(item.category) + '</span>';
    const who = item.publisherName
      ? '<span class="who">· ' + Core.escapeHtml(item.publisherName) + '</span>'
      : '';
    return (
      '<a class="card" href="detail.html?id=' + encodeURIComponent(item.id) + '">' +
        '<div class="' + thumbClass(item) + '">' + categoryIcon(item.category) + '</div>' +
        '<div class="body">' +
          '<div class="top"><span class="' + tagCls + '">' + tagText + '</span>' + catTag + '</div>' +
          '<h3>' + Core.escapeHtml(item.title) + '</h3>' +
          '<div class="meta">' + Core.escapeHtml(item.location) + ' · ' + Core.escapeHtml(item.time) + who + '</div>' +
        '</div>' +
      '</a>'
    );
  }

  // 相对时间（今天 / 昨天 / MM-DD）
  function prettyTime(timeStr) {
    if (!timeStr) return '';
    return String(timeStr);
  }

  // 轻提示
  function toast(msg) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      el.style.cssText = 'position:fixed;left:50%;bottom:90px;transform:translateX(-50%) translateY(8px);background:rgba(0,0,0,.82);color:#fff;font-size:13px;padding:9px 16px;border-radius:8px;opacity:0;pointer-events:none;transition:.22s;z-index:999;max-width:320px';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(el._t);
    el._t = setTimeout(function () {
      el.style.opacity = '0';
      el.style.transform = 'translateX(-50%) translateY(8px)';
    }, 2000);
  }

  // 读取 URL query 参数
  function query(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  // 匿名 uid（「我的发布」用；首次访问生成并存 localStorage）
  function uid() {
    let u = localStorage.getItem('uid');
    if (!u) {
      u = 'u-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
      localStorage.setItem('uid', u);
    }
    return u;
  }

  // 一键复制（优先 Clipboard API，失败回退 execCommand）
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () {
        return fallbackCopy(text);
      });
    }
    return Promise.resolve(fallbackCopy(text));
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    if (!ok) throw new Error('复制失败，请长按手动复制');
    return true;
  }

  root.UI = {
    categoryIcon: categoryIcon,
    typeLabel: typeLabel,
    statusLabel: statusLabel,
    thumbClass: thumbClass,
    itemCard: itemCard,
    prettyTime: prettyTime,
    toast: toast,
    query: query,
    uid: uid,
    copyText: copyText
  };
})(typeof window !== 'undefined' ? window : this);
