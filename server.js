/**
 * Jaan Kichu Khaba — backend
 * Zero external dependencies. Just plain Node.js (http, fs, crypto).
 *
 * Run:   node server.js
 * Then open:
 *   http://localhost:3000        -> the customer-facing site
 *   http://localhost:3000/admin  -> the admin panel
 *
 * Admin login (change these before real use!):
 *   set env vars ADMIN_USER / ADMIN_PASS, or fall back to defaults below.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || 'ishtiak';
const ADMIN_PASS = process.env.ADMIN_PASS || '123456';

const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

// ---------- storage helpers ----------
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, '[]', 'utf-8');

function readOrders() {
  try {
    return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf-8'));
  } catch (e) {
    return [];
  }
}

function writeOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
}

function nextOrderNumber(orders) {
  const n = orders.length + 1;
  return 'ORD-' + String(n).padStart(4, '0');
}

// ---------- very small session store (in-memory) ----------
const sessions = new Map(); // token -> expiry timestamp
const SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

function createSession() {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  return token;
}

function isValidSession(token) {
  if (!token) return false;
  const expiry = sessions.get(token);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function getBearerToken(req) {
  const header = req.headers['authorization'] || '';
  const match = header.match(/^Bearer (.+)$/);
  return match ? match[1] : null;
}

// ---------- static file serving ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function serveStatic(req, res, filePath) {
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

// ---------- body parsing ----------
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) req.destroy(); // 1MB safety limit
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

// ---------- request handler ----------
const server = http.createServer(async (req, res) => {
  const [pathname] = req.url.split('?');

  // ---- API: create an order (called from the customer payment flow) ----
  if (pathname === '/api/orders' && req.method === 'POST') {
    try {
      const data = await readJsonBody(req);
      const orders = readOrders();
      const order = {
        orderNumber: nextOrderNumber(orders),
        food: data.food || 'Unknown',
        emoji: data.emoji || '',
        price: Number(data.price) || 0,
        phone: data.phone || '',
        trx: data.trx || '',
        status: 'Paid (demo)',
        createdAt: new Date().toISOString(),
      };
      orders.unshift(order); // newest first
      writeOrders(orders);
      return sendJson(res, 201, { ok: true, order });
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: 'Invalid request body' });
    }
  }

  // ---- API: list orders (admin only) ----
  if (pathname === '/api/orders' && req.method === 'GET') {
    const token = getBearerToken(req);
    if (!isValidSession(token)) {
      return sendJson(res, 401, { ok: false, error: 'Unauthorized' });
    }
    const orders = readOrders();
    return sendJson(res, 200, { ok: true, orders });
  }

  // ---- API: admin login ----
  if (pathname === '/api/admin/login' && req.method === 'POST') {
    try {
      const data = await readJsonBody(req);
      if (data.username === ADMIN_USER && data.password === ADMIN_PASS) {
        const token = createSession();
        return sendJson(res, 200, { ok: true, token });
      }
      return sendJson(res, 401, { ok: false, error: 'ভুল আইডি বা পাসওয়ার্ড' });
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: 'Invalid request body' });
    }
  }

  // ---- API: admin logout ----
  if (pathname === '/api/admin/logout' && req.method === 'POST') {
    const token = getBearerToken(req);
    if (token) sessions.delete(token);
    return sendJson(res, 200, { ok: true });
  }

  // ---- static files ----
  let filePath;
  if (pathname === '/' || pathname === '') {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  } else if (pathname === '/admin') {
    filePath = path.join(PUBLIC_DIR, 'admin.html');
  } else {
    // prevent path traversal
    const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    filePath = path.join(PUBLIC_DIR, safePath);
  }

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  serveStatic(req, res, filePath);
});

server.listen(PORT, () => {
  console.log(`\n💗 Jaan Kichu Khaba server running`);
  console.log(`   Storefront:  http://localhost:${PORT}`);
  console.log(`   Admin panel: http://localhost:${PORT}/admin`);
  console.log(`   Admin login: ${ADMIN_USER} / ${ADMIN_PASS}  (change via ADMIN_USER / ADMIN_PASS env vars)\n`);
});
