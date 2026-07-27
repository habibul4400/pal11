/* ---------------- DATA ---------------- */
const foods = [
  { name: "বিরিয়ানি", emoji: "🍛", price: 250 },
  { name: "ফুচকা", emoji: "🥟", price: 60 },
  { name: "পিৎজা", emoji: "🍕", price: 450 },
  { name: "বার্গার", emoji: "🍔", price: 180 },
  { name: "আইসক্রিম", emoji: "🍦", price: 90 },
  { name: "চা ও সিঙ্গারা", emoji: "🍵", price: 40 },
];

/* ---------------- NAV ---------------- */
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

/* ---------------- PAGE 1 : dodging No button ---------------- */
const noBtn = document.getElementById('noBtn');
const yesBtn = document.getElementById('yesBtn');

function placeNoInitial(){
  const r = yesBtn.getBoundingClientRect();
  noBtn.style.left = (r.right + 28) + 'px';
  noBtn.style.top = r.top + 'px';
}
window.addEventListener('load', placeNoInitial);
window.addEventListener('resize', () => {
  if (document.getElementById('page1').classList.contains('active')) clampNoBtn();
});

function clampNoBtn(){
  const w = noBtn.offsetWidth, h = noBtn.offsetHeight;
  const maxX = window.innerWidth - w - 10;
  const maxY = window.innerHeight - h - 10;
  let x = parseFloat(noBtn.style.left) || 10;
  let y = parseFloat(noBtn.style.top) || 10;
  x = Math.min(Math.max(10, x), Math.max(10, maxX));
  y = Math.min(Math.max(10, y), Math.max(10, maxY));
  noBtn.style.left = x + 'px';
  noBtn.style.top = y + 'px';
}

function dodge(cursorX, cursorY){
  const w = noBtn.offsetWidth, h = noBtn.offsetHeight;
  const maxX = window.innerWidth - w - 10;
  const maxY = window.innerHeight - h - 10;
  let x, y, tries = 0;
  do{
    x = 10 + Math.random() * Math.max(1, maxX - 10);
    y = 10 + Math.random() * Math.max(1, maxY - 10);
    tries++;
  } while (Math.hypot((x + w/2) - cursorX, (y + h/2) - cursorY) < 180 && tries < 20);
  noBtn.style.left = x + 'px';
  noBtn.style.top = y + 'px';
}

document.addEventListener('mousemove', (e) => {
  if (!document.getElementById('page1').classList.contains('active')) return;
  const r = noBtn.getBoundingClientRect();
  const cx = r.left + r.width/2, cy = r.top + r.height/2;
  const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
  if (dist < 110) dodge(e.clientX, e.clientY);
});
noBtn.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  dodge(t.clientX, t.clientY);
}, { passive:true });
// just in case someone actually manages to click it
noBtn.addEventListener('click', (e) => {
  dodge(e.clientX, e.clientY);
});

/* floating hearts on page 1 */
function spawnHeart(){
  const h = document.createElement('div');
  h.className = 'floating-heart';
  h.textContent = ['💗','💕','🩷','💞'][Math.floor(Math.random()*4)];
  h.style.left = Math.random()*100 + '%';
  h.style.fontSize = (16 + Math.random()*22) + 'px';
  h.style.bottom = '-40px';
  document.getElementById('page1').appendChild(h);
  setTimeout(() => h.remove(), 6200);
}
setInterval(() => {
  if (document.getElementById('page1').classList.contains('active')) spawnHeart();
}, 700);

/* ---------------- YES -> MENU ---------------- */
const menuGrid = document.getElementById('menuGrid');
foods.forEach(f => {
  const card = document.createElement('div');
  card.className = 'food-card';
  card.innerHTML = `
    <div class="food-emoji">${f.emoji}</div>
    <div class="food-name">${f.name}</div>
    <div class="food-price">৳${f.price}</div>
  `;
  card.addEventListener('click', () => openPayment(f));
  menuGrid.appendChild(card);
});

yesBtn.addEventListener('click', () => showScreen('page2'));
document.getElementById('backToP1').addEventListener('click', () => showScreen('page1'));

/* ---------------- PAYMENT FLOW ---------------- */
let currentFood = null;

function openPayment(food){
  currentFood = food;
  document.getElementById('orderName').textContent = `${food.emoji} ${food.name}`;
  document.getElementById('orderAmt').textContent = `৳${food.price}`;
  resetPaymentSteps();
  showScreen('page3');
}

function resetPaymentSteps(){
  document.querySelectorAll('#page3 .step').forEach(s => s.classList.remove('active'));
  document.getElementById('stepNumber').classList.add('active');
  document.getElementById('phoneInput').value = '';
  document.getElementById('pinInput').value = '';
  updatePinDots('');
}

document.getElementById('toPinBtn').addEventListener('click', () => {
  const phone = document.getElementById('phoneInput').value.trim();
  if (!/^01[0-9]{9}$/.test(phone)) {
    document.getElementById('phoneInput').style.borderColor = '#e2136e';
    document.getElementById('phoneInput').placeholder = 'সঠিক ১১ ডিজিটের নম্বর দিন';
    return;
  }
  document.getElementById('stepNumber').classList.remove('active');
  document.getElementById('stepPin').classList.add('active');
});

const pinInput = document.getElementById('pinInput');
function updatePinDots(val){
  const dots = document.querySelectorAll('#pinDots span');
  dots.forEach((d, i) => d.classList.toggle('filled', i < val.length));
  document.getElementById('confirmPayBtn').disabled = val.length !== 4;
}
pinInput.addEventListener('input', () => {
  pinInput.value = pinInput.value.replace(/\D/g,'').slice(0,4);
  updatePinDots(pinInput.value);
});

document.getElementById('confirmPayBtn').addEventListener('click', async () => {
  document.getElementById('stepPin').classList.remove('active');
  document.getElementById('stepLoading').classList.add('active');

  const trx = 'DEMO' + Math.random().toString(36).slice(2, 10).toUpperCase();
  const phone = document.getElementById('phoneInput').value.trim();

  let orderNumber = '—';
  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        food: currentFood.name,
        emoji: currentFood.emoji,
        price: currentFood.price,
        phone: phone,
        trx: trx,
      }),
    });
    const data = await res.json();
    if (data.ok) orderNumber = data.order.orderNumber;
  } catch (e) {
    // backend not reachable — still show a local confirmation so the demo doesn't break
    console.error('Could not reach backend:', e);
  }

  setTimeout(() => {
    document.getElementById('stepLoading').classList.remove('active');
    document.getElementById('stepSuccess').classList.add('active');
    document.getElementById('successFood').textContent =
      `${currentFood.emoji} ${currentFood.name} — ৳${currentFood.price} এর অর্ডার কনফার্ম হয়েছে`;
    document.getElementById('trxId').innerHTML =
      `Order No: <strong>${orderNumber}</strong><br>Transaction ID: ${trx}`;
  }, 1200);
});

document.getElementById('orderAgainBtn').addEventListener('click', () => {
  showScreen('page2');
});