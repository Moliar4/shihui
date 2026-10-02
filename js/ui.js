/* ui.js —— 公共 UI 工具（浏览器端，依赖 Core）
 * B/C 各页面复用：卡片渲染、徽章、分类图标、Toast、URL 参数、匿名 uid。
 */
(function (root) {
  'use strict';

  const CATEGORY_ICON = {
    '证件卡类': '💳', '钥匙': '🔑', '雨伞': '☂️', '水杯': '🥤',
    '耳机': '🎧', '图书': '📚', '其他': '📦'
  };

  function categoryIcon(cat) { return CATEGORY_ICON[cat] || '📦'; }

  function typeLabel(type) { return type === 'lost' ? '寻物' : '招领'; }

  // 徽章文案：已解决时按类型显示「已找到/已归还」，否则显示「寻物/招领」
  function statusLabel(item) {
    return item.status === 'resolved' ? Core.resolvedLabel(item.type) : typeLabel(item.type);
  }

  // 渲染一条信息卡片（首页 / 搜索 / 我的 通用）
  function itemCard(item) {
    const badgeCls = item.status === 'resolved'
      ? 'badge resolved'
      : (item.type === 'lost' ? 'badge lost' : 'badge found');
    return (
      '<a class="card" href="detail.html?id=' + encodeURIComponent(item.id) + '">' +
        '<div class="card-ico">' + categoryIcon(item.category) + '</div>' +
        '<div class="card-body">' +
          '<div class="card-title">' + Core.escapeHtml(item.title) + '</div>' +
          '<div class="card-meta">' + Core.escapeHtml(item.location) + ' · ' + Core.escapeHtml(item.time) + '</div>' +
        '</div>' +
        '<span class="' + badgeCls + '">' + statusLabel(item) + '</span>' +
      '</a>'
    );
  }

  // 轻提示
  function toast(msg) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('show'); }, 2000);
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
    itemCard: itemCard,
    toast: toast,
    query: query,
    uid: uid,
    copyText: copyText
  };
})(typeof window !== 'undefined' ? window : this);
