/* core.js —— 纯函数逻辑（无 DOM / 无网络 / 无文件），前后端共用
 *
 * 浏览器：<script src="js/core.js"> 后使用全局 Core
 * Node：  const Core = require('./js/core.js')
 *
 * 这是整个项目可测试性的根基：后端 server.js 和前端页面复用同一套
 * 搜索 / 筛选 / 排序 / 校验逻辑，单元测试也只需 require 本文件。
 */
(function (root) {
  'use strict';

  // 按关键词搜索：在物品名称 + 详细描述中模糊匹配（忽略大小写、去首尾空格）
  function searchItems(items, kw) {
    const q = String(kw == null ? '' : kw).trim().toLowerCase();
    if (!q) return items.slice();
    return items.filter(function (it) {
      const title = String(it.title == null ? '' : it.title).toLowerCase();
      const desc = String(it.description == null ? '' : it.description).toLowerCase();
      return title.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
    });
  }

  // 组合筛选
  //   opts.type       'lost' | 'found'
  //   opts.category   物品分类
  //   opts.status     'active' 只保留进行中（自动下架）；'all'/空 保留全部
  //   opts.publisher  发布者匿名 uid
  function filterItems(items, opts) {
    opts = opts || {};
    return items.filter(function (it) {
      if (opts.type && it.type !== opts.type) return false;
      if (opts.category && it.category !== opts.category) return false;
      if (opts.status === 'active' && it.status !== 'active') return false;
      if (opts.publisher && it.publisher !== opts.publisher) return false;
      return true;
    });
  }

  // 排序：'newest' 最新发布倒序（其余保持原顺序）
  function sortItems(items, sort) {
    const arr = items.slice();
    if (sort === 'newest') {
      arr.sort(function (a, b) {
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
    }
    return arr;
  }

  // HTML 转义（所有用户输入渲染前必须先经过这里）
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 关键词高亮：先整体转义再包裹 <mark>，防止关键词注入 XSS
  function highlight(text, kw) {
    const safe = escapeHtml(text);
    const q = String(kw == null ? '' : kw).trim();
    if (!q) return safe;
    const qEsc = escapeHtml(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(qEsc, 'gi');
    return safe.replace(re, function (m) { return '<mark>' + m + '</mark>'; });
  }

  // 校验发布表单：返回 { ok, errors }，errors 键对应必填字段
  function validatePublish(form) {
    const errors = {};
    form = form || {};
    if (!String(form.title == null ? '' : form.title).trim()) errors.title = '请填写物品名称';
    if (!String(form.contact == null ? '' : form.contact).trim()) errors.contact = '请填写联系方式';
    if (form.type !== 'lost' && form.type !== 'found') errors.type = '请选择寻物或招领';
    if (!String(form.category == null ? '' : form.category).trim()) errors.category = '请选择物品分类';
    if (!String(form.location == null ? '' : form.location).trim()) errors.location = '请填写地点';
    if (!String(form.time == null ? '' : form.time).trim()) errors.time = '请填写时间';
    return { ok: Object.keys(errors).length === 0, errors: errors };
  }

  // 状态文案：寻物→已找到，招领→已归还
  function resolvedLabel(type) {
    return type === 'lost' ? '已找到' : '已归还';
  }

  const Core = {
    searchItems: searchItems,
    filterItems: filterItems,
    sortItems: sortItems,
    escapeHtml: escapeHtml,
    highlight: highlight,
    validatePublish: validatePublish,
    resolvedLabel: resolvedLabel
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Core;
  } else {
    root.Core = Core;
  }
})(typeof window !== 'undefined' ? window : this);
