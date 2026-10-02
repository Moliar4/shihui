/* server.js —— 校园失物招领「拾回」后端（Node 原生 http，零依赖）
 *
 * 功能：
 *   1. 静态文件服务（index.html、css/、js/、assets/）
 *   2. REST API（列表 / 详情 / 发布 / 搜索 / 更新状态）
 *   3. 数据持久化到 data/items.json
 *
 * 启动：node server.js  →  http://localhost:3000
 * 测试：DATA_FILE=/tmp/x.json PORT=3456 node server.js（可用环境变量隔离数据与端口）
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const Core = require('./js/core.js');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_FILE = process.env.DATA_FILE || path.join(ROOT, 'data', 'items.json');

// ---------------- 数据读写 ----------------

function loadItems() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const arr = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      return Array.isArray(arr) ? arr : [];
    }
  } catch (e) {
    console.error('[server] 读取数据失败，使用空数据：', e.message);
  }
  // 首次运行（数据文件缺失）：写入空数组
  saveItems([]);
  return [];
}

function saveItems(items) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), 'utf8');
}

let items = loadItems();

// ---------------- 工具 ----------------

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    let data = '';
    req.on('data', function (c) { data += c; });
    req.on('end', function () {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('非法 JSON')); }
    });
    req.on('error', reject);
  });
}

function genId() {
  return 't' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

// ---------------- 静态文件服务 ----------------

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

// 不对外暴露的路径（后端源码 / 数据 / 测试）
const BLOCKED = ['data', 'tests', 'server.js', 'package.json', 'package-lock.json', '.git', '.gitignore', 'node_modules', 'README.md'];

function serveStatic(res, pathname) {
  if (pathname === '/' || pathname === '') pathname = '/index.html';
  let rel;
  try {
    rel = decodeURIComponent(pathname).replace(/^\/+/, '');
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Bad Request');
  }
  if (BLOCKED.indexOf(rel.split('/')[0]) !== -1) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Not Found');
  }
  const filePath = path.join(ROOT, rel);
  const resolved = path.resolve(filePath);
  // 防路径穿越：确保解析后仍在项目目录内
  if (resolved !== ROOT && resolved.indexOf(ROOT + path.sep) !== 0) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Forbidden');
  }
  fs.readFile(filePath, function (err, data) {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not Found');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

// ---------------- REST API ----------------

function handleApi(req, res, pathname, query) {
  // GET /api/items —— 列表（搜索 + 筛选 + 排序；默认只返回进行中=自动下架）
  if (pathname === '/api/items' && req.method === 'GET') {
    let result = items.slice();
    if (query.q) result = Core.searchItems(result, query.q);
    result = Core.filterItems(result, {
      type: query.type,
      category: query.category,
      status: query.status || 'active',
      publisher: query.publisher
    });
    result = Core.sortItems(result, query.sort || 'newest');
    return sendJson(res, 200, result);
  }

  // POST /api/items —— 发布（服务端复用 Core.validatePublish 二次校验）
  if (pathname === '/api/items' && req.method === 'POST') {
    return readBody(req).then(function (body) {
      const v = Core.validatePublish(body);
      if (!v.ok) return sendJson(res, 400, { error: '请完整填写必填项', errors: v.errors });
      const item = {
        id: genId(),
        type: body.type,
        title: String(body.title).trim(),
        category: String(body.category).trim(),
        location: String(body.location).trim(),
        time: String(body.time).trim(),
        description: String(body.description == null ? '' : body.description).trim(),
        contact: String(body.contact).trim(),
        image: String(body.image == null ? '' : body.image),
        status: 'active',
        publisher: String(body.publisher == null ? '' : body.publisher),
        publisherName: String(body.publisherName == null ? '' : body.publisherName).trim(),
        dept: String(body.dept == null ? '' : body.dept).trim(),
        createdAt: Date.now()
      };
      items.unshift(item);
      saveItems(items);
      return sendJson(res, 201, item);
    }).catch(function () {
      return sendJson(res, 400, { error: '请求体不是合法 JSON' });
    });
  }

  // GET/PATCH /api/items/:id —— 详情 / 更新状态（标记已找到/已归还 → 自动下架）
  const m = pathname.match(/^\/api\/items\/([^/]+)$/);
  if (m) {
    let id;
    try { id = decodeURIComponent(m[1]); } catch (e) { id = m[1]; }
    const item = items.find(function (it) { return it.id === id; });
    if (!item) return sendJson(res, 404, { error: '未找到该条信息' });

    if (req.method === 'GET') return sendJson(res, 200, item);

    if (req.method === 'PATCH') {
      return readBody(req).then(function (body) {
        if (body.status === 'resolved') {
          item.status = 'resolved';
          saveItems(items);
          return sendJson(res, 200, item);
        }
        return sendJson(res, 400, { error: '不支持的状态更新' });
      }).catch(function () {
        return sendJson(res, 400, { error: '请求体不是合法 JSON' });
      });
    }
  }

  return sendJson(res, 404, { error: '接口不存在' });
}

// ---------------- 服务启动 ----------------

const server = http.createServer(function (req, res) {
  let u;
  try { u = new URL(req.url, 'http://localhost'); }
  catch (e) { res.writeHead(400); return res.end('Bad Request'); }

  const pathname = u.pathname;
  const query = {};
  u.searchParams.forEach(function (v, k) { query[k] = v; });

  if (pathname.indexOf('/api/') === 0) {
    return handleApi(req, res, pathname, query);
  }
  return serveStatic(res, pathname);
});

server.listen(PORT, function () {
  console.log('校园失物招领「拾回」已启动：http://localhost:' + PORT);
  console.log('数据文件：' + DATA_FILE);
});
