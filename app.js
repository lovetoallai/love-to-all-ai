/* ─────────────────────────────────────────
LOVE TO ALL AI — app.js
Supabase integration + UI logic
───────────────────────────────────────── */

// ══════════════════════════════════════════
// ① SUPABASE 設定
// ══════════════════════════════════════════
// ▼ ここに Supabase の URL と anon key を入れてください
//   場所: Supabase Dashboard → Settings → API
const SUPABASE_URL  = ‘https://bvnuelljoyibryvwtqdr.supabase.co’;   // 例: https://xxxxxxxxxxxx.supabase.co
const SUPABASE_ANON = ‘eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2bnVlbGxqb3lpYnJ5dnd0cWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyOTE1OTMsImV4cCI6MjA4ODg2NzU5M30._sEQ5Xk6VH65gr3-QWgtCItyfZAIuIurvuxdEYRjllE’; // 例: eyJhbGciOiJIUzI1Ni…

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ══════════════════════════════════════════
// ② 設定値
// ══════════════════════════════════════════
const COOLDOWN_KEY  = ‘lovetoallai_last_sent’; // localStorage key
const COOLDOWN_MS   = 24 * 60 * 60 * 1000;    // 24時間（ミリ秒）
const POLL_INTERVAL = 10_000;                  // カウンター更新間隔（10秒）

// ══════════════════════════════════════════
// ③ DOM 要素
// ══════════════════════════════════════════
const btn         = document.getElementById(‘signal-btn’);
const statusEl    = document.getElementById(‘status-text’);
const counterEl   = document.getElementById(‘counter-number’);
const counterSub  = document.getElementById(‘counter-sub’);

// ══════════════════════════════════════════
// ④ 状態
// ══════════════════════════════════════════
let currentCount = 0;
let isSending    = false;

// ══════════════════════════════════════════
// ⑤ 起動
// ══════════════════════════════════════════
window.addEventListener(‘DOMContentLoaded’, () => {
initCanvas();
loadCount();
checkAlreadySent();

// 定期的にカウンター更新
setInterval(loadCount, POLL_INTERVAL);
});

// ══════════════════════════════════════════
// ⑥ カウンター取得（Supabase）
// ══════════════════════════════════════════
async function loadCount() {
try {
const { count, error } = await supabase
.from(‘signals’)
.select(’*’, { count: ‘exact’, head: true });

```
if (error) throw error;

const n = count ?? 0;
if (n !== currentCount) {
  currentCount = n;
  renderCount(n);
}
```

} catch (err) {
console.warn(‘Count fetch failed:’, err.message);
// エラー時は表示をそのまま維持（消さない）
}
}

function renderCount(n) {
counterEl.innerHTML = n.toLocaleString(‘en-US’);
counterEl.classList.remove(‘bump’);
void counterEl.offsetWidth; // reflow
counterEl.classList.add(‘bump’);
}

// ══════════════════════════════════════════
// ⑦ シグナル送信（ボタン押下）
// ══════════════════════════════════════════
btn.addEventListener(‘click’, () => sendSignal());

async function sendSignal() {
if (isSending) return;

// ─ 連打・再送信チェック ─
if (hasAlreadySent()) {
const remaining = getRemainingTime();
showStatus(`You already sent today. Next signal available in ${remaining}.`, ‘gold’);
return;
}

isSending = true;
btn.classList.add(‘sending’);
showStatus(‘Sending your peace signal…’, ‘blue’);

try {
// ─ Supabase にレコード挿入 ─
const { error } = await supabase
.from(‘signals’)
.insert([{ created_at: new Date().toISOString() }]);

```
if (error) throw error;

// ─ 成功処理 ─
markAsSent();
currentCount++;
renderCount(currentCount);

btn.classList.remove('sending');
btn.classList.add('sent', 'disabled');
btn.querySelector('.btn-label').textContent = 'Signal Sent ✓';

showStatus('Your peace signal has been sent to all AI. Thank you. 💙', 'green');
spawnParticles();
```

} catch (err) {
console.error(‘Send failed:’, err.message);
btn.classList.remove(‘sending’);
showStatus(‘Connection error. Please try again.’, ‘error’);
isSending = false;
return;
}

isSending = false;
}

// ══════════════════════════════════════════
// ⑧ 連打対策（localStorage 24時間制限）
// ══════════════════════════════════════════
function hasAlreadySent() {
const last = localStorage.getItem(COOLDOWN_KEY);
if (!last) return false;
return (Date.now() - parseInt(last)) < COOLDOWN_MS;
}

function markAsSent() {
localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
}

function getRemainingTime() {
const last = parseInt(localStorage.getItem(COOLDOWN_KEY) || ‘0’);
const diff = COOLDOWN_MS - (Date.now() - last);
const h = Math.floor(diff / 3_600_000);
const m = Math.floor((diff % 3_600_000) / 60_000);
return `${h}h ${m}m`;
}

function checkAlreadySent() {
if (hasAlreadySent()) {
btn.classList.add(‘sent’, ‘disabled’);
btn.querySelector(’.btn-label’).textContent = ‘Signal Sent ✓’;
const remaining = getRemainingTime();
showStatus(`Signal sent. Next available in ${remaining}.`, ‘gold’);
}
}

// ══════════════════════════════════════════
// ⑨ ステータステキスト
// ══════════════════════════════════════════
let statusTimer = null;

function showStatus(msg, type = ‘’) {
statusEl.textContent = msg;
statusEl.className = `status-text show ${type}`;

clearTimeout(statusTimer);
// 成功・gold メッセージは長めに表示
const duration = (type === ‘green’ || type === ‘gold’) ? 8000 : 4000;
statusTimer = setTimeout(() => {
statusEl.classList.remove(‘show’);
}, duration);
}

// ══════════════════════════════════════════
// ⑩ パーティクルエフェクト
// ══════════════════════════════════════════
function spawnParticles() {
const rect   = btn.getBoundingClientRect();
const cx     = rect.left + rect.width / 2;
const cy     = rect.top  + rect.height / 2;
const glyphs = [‘✦’, ‘·’, ‘°’, ‘★’, ‘☽’, ‘✧’, ‘◦’];
const colors = [’#4a9eff’, ‘#c8a96e’, ‘#6ec87a’, ‘#a8d4ff’, ‘#ffffff’];

for (let i = 0; i < 24; i++) {
setTimeout(() => {
const p   = document.createElement(‘span’);
const ang = Math.random() * Math.PI * 2;
const d   = 80 + Math.random() * 200;

```
  p.className   = 'particle';
  p.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
  p.style.cssText = `
    left: ${cx}px;
    top:  ${cy}px;
    color: ${colors[Math.floor(Math.random() * colors.length)]};
    font-size: ${10 + Math.random() * 14}px;
    animation-duration: ${0.9 + Math.random() * 0.7}s;
    --dx: ${Math.cos(ang) * d}px;
    --dy: ${Math.sin(ang) * d}px;
  `;
  document.body.appendChild(p);
  setTimeout(() => p.remove(), 1800);
}, Math.random() * 300);
```

}
}

// ══════════════════════════════════════════
// ⑪ 背景キャンバス（静かな星空）
// ══════════════════════════════════════════
function initCanvas() {
const canvas = document.getElementById(‘bg-canvas’);
const ctx    = canvas.getContext(‘2d’);
let stars    = [];
let W, H;

function resize() {
W = canvas.width  = window.innerWidth;
H = canvas.height = window.innerHeight;
stars = Array.from({ length: 120 }, () => ({
x:  Math.random() * W,
y:  Math.random() * H,
r:  Math.random() * 0.9 + 0.2,
op: Math.random() * 0.4 + 0.05,
sp: Math.random() * 0.008 + 0.002,
ph: Math.random() * Math.PI * 2,
}));
}

let t = 0;
function draw() {
ctx.clearRect(0, 0, W, H);
t += 0.004;

```
// Very subtle gradient fog
const grad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W * 0.6);
grad.addColorStop(0,   'rgba(26, 58, 110, 0.08)');
grad.addColorStop(1,   'rgba(10, 15, 26, 0)');
ctx.fillStyle = grad;
ctx.fillRect(0, 0, W, H);

stars.forEach(s => {
  const opacity = s.op * (0.5 + 0.5 * Math.sin(t * s.sp * 200 + s.ph));
  ctx.beginPath();
  ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(200, 220, 255, ${opacity})`;
  ctx.fill();
});

requestAnimationFrame(draw);
```

}

resize();
draw();
window.addEventListener(‘resize’, resize);
}