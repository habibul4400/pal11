const loginScreen = document.getElementById('loginScreen');
const dashScreen = document.getElementById('dashScreen');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const ordersBody = document.getElementById('ordersBody');
const statsRow = document.getElementById('statsRow');

function getToken() {
  return sessionStorage.getItem('adminToken');
}
function setToken(t) {
  sessionStorage.setItem('adminToken', t);
}
function clearToken() {
  sessionStorage.removeItem('adminToken');
}

function showDash() {
  loginScreen.classList.remove('active');
  dashScreen.classList.add('active');
  loadOrders();
}
function showLogin() {
  dashScreen.classList.remove('active');
  loginScreen.classList.add('active');
}

async function login() {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  loginError.textContent = '';
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.ok) {
      setToken(data.token);
      showDash();
    } else {
      loginError.textContent = data.error || 'লগইন ব্যর্থ হয়েছে';
    }
  } catch (e) {
    loginError.textContent = 'সার্ভারের সাথে সংযোগ করা যায়নি';
  }
}

loginBtn.addEventListener('click', login);
document.getElementById('loginPass').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') login();
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  const token = getToken();
  try {
    await fetch('/api/admin/logout', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
    });
  } catch (e) {}
  clearToken();
  showLogin();
});

document.getElementById('refreshBtn').addEventListener('click', loadOrders);

function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('bn-BD', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function maskPhone(phone) {
  if (!phone || phone.length < 4) return phone || '—';
  return phone.slice(0, 5) + 'XXXX' + phone.slice(-2);
}

async function loadOrders() {
  const token = getToken();
  if (!token) return showLogin();

  try {
    const res = await fetch('/api/orders', {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (res.status === 401) {
      clearToken();
      return showLogin();
    }
    const data = await res.json();
    renderOrders(data.orders || []);
  } catch (e) {
    ordersBody.innerHTML = '<tr><td colspan="7" class="empty">সার্ভারের সাথে সংযোগ করা যায়নি</td></tr>';
  }
}

function renderOrders(orders) {
  // stats
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
  statsRow.innerHTML = `
    <div class="stat-card">
      <div class="label">মোট অর্ডার</div>
      <div class="value">${totalOrders}</div>
    </div>
    <div class="stat-card">
      <div class="label">মোট আয়</div>
      <div class="value">৳${totalRevenue}</div>
    </div>
  `;

  if (orders.length === 0) {
    ordersBody.innerHTML = '<tr><td colspan="7" class="empty">এখনো কোনো অর্ডার আসেনি</td></tr>';
    return;
  }

  ordersBody.innerHTML = orders.map(o => `
    <tr>
      <td><strong>${o.orderNumber}</strong></td>
      <td>${fmtTime(o.createdAt)}</td>
      <td>${o.emoji || ''} ${o.food}</td>
      <td>৳${o.price}</td>
      <td>${maskPhone(o.phone)}</td>
      <td>${o.trx}</td>
      <td><span class="status-pill">${o.status}</span></td>
    </tr>
  `).join('');
}

// auto-refresh every 5s while dashboard is open
setInterval(() => {
  if (dashScreen.classList.contains('active')) loadOrders();
}, 5000);

// try to resume session on page load
if (getToken()) {
  showDash();
} else {
  showLogin();
}
