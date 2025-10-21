
// FIFA-like UI prototype with joystick and three action buttons + 11v11 pseudo-3D simulation.
// Mobile-first. Local wallet stored in localStorage (demo only).
// Controls: joystick to move the captain (team 0 player 0), buttons: skill (special), pass, shoot.

const DEFAULT_COINS = 100;
let state = { coins:0, duration:90, score:[0,0], timer:90 };
const el = id=>document.getElementById(id);
let canvas, ctx, W, H, players, ball, loopInterval, countdownInterval;
let joystick = {active:false, baseX:0, baseY:0, knobX:0, knobY:0, dx:0, dy:0, max:40};
let captainIndex = 0; // team 0 captain index = 0

window.addEventListener('load', ()=>{ init(); });

function init(){
  loadState();
  setupUI();
  refreshUI();
}

function loadState(){ const s=localStorage.getItem('fifa_proto_state'); if(s) state = Object.assign(state, JSON.parse(s)); else { state.coins = DEFAULT_COINS; saveState(); } }
function saveState(){ localStorage.setItem('fifa_proto_state', JSON.stringify(state)); }

function refreshUI(){ el('coins').innerText = state.coins.toFixed(0); el('walletCoins').innerText = state.coins.toFixed(0); el('score').innerText = state.score.join(' - '); el('timer').innerText = state.timer; }

function setupUI(){
  // menu buttons
  el('playOffline').addEventListener('click', ()=>{ prepareMatch('offline'); });
  el('playOnline').addEventListener('click', ()=>{ alert('اللعب أونلاين يتطلب سيرفر فعلي — هذه محاكاة'); prepareMatch('online'); });
  el('walletBtnMain').addEventListener('click', ()=>{ showPanel('wallet'); });
  el('settingsBtn').addEventListener('click', ()=>{ showPanel('settings'); });
  el('backToMenu').addEventListener('click', ()=>{ showPanel('menu'); });
  el('resultBack').addEventListener('click', ()=>{ showPanel('menu'); });
  el('exitMatch').addEventListener('click', ()=>{ stopMatch(); showPanel('menu'); });

  // wallet actions
  el('submitProof').addEventListener('click', submitProof);
  el('requestWithdraw').addEventListener('click', requestWithdraw);

  // action buttons
  el('passBtn').addEventListener('touchstart', ()=>{ doPass(); });
  el('shootBtn').addEventListener('touchstart', ()=>{ doShoot(); });
  el('skillBtn').addEventListener('touchstart', ()=>{ doSkill(); });

  // joystick touch handling
  const base = document.getElementById('joystickBase') || null;
  const container = document.getElementById('joystickContainer');
  const knob = document.getElementById('joystickKnob');
  // set base position
  let rect = container.getBoundingClientRect();
  joystick.baseX = rect.left + rect.width/2;
  joystick.baseY = rect.top + rect.height/2;
  joystick.knobX = joystick.baseX; joystick.knobY = joystick.baseY;
  // touch events on container
  container.addEventListener('touchstart', e=>{ e.preventDefault(); joystick.active=true; let t=e.touches[0]; updateJoystick(t.clientX, t.clientY); });
  container.addEventListener('touchmove', e=>{ e.preventDefault(); let t=e.touches[0]; updateJoystick(t.clientX, t.clientY); });
  container.addEventListener('touchend', e=>{ joystick.active=false; joystick.dx=0; joystick.dy=0; resetKnob(); });

  // controls for desktop testing
  window.addEventListener('keydown', e=>{
    if(e.key === 'ArrowUp') joystick.dy = -1;
    if(e.key === 'ArrowDown') joystick.dy = 1;
    if(e.key === 'ArrowLeft') joystick.dx = -1;
    if(e.key === 'ArrowRight') joystick.dx = 1;
    if(e.key === ' ') doShoot();
    if(e.key === 'x') doPass();
    if(e.key === 'z') doSkill();
  });
  window.addEventListener('keyup', e=>{ if(['ArrowUp','ArrowDown'].includes(e.key)) joystick.dy=0; if(['ArrowLeft','ArrowRight'].includes(e.key)) joystick.dx=0; });

  // responsive canvas setup
  canvas = el('gameCanvas'); ctx = canvas.getContext('2d');
  function resize(){ const rect = canvas.getBoundingClientRect(); W = canvas.width; H = canvas.height; }
  resize(); window.addEventListener('resize', resize);

  // action visuals touch feedback
  ['passBtn','shootBtn','skillBtn'].forEach(id=>{
    const b = el(id);
    b.addEventListener('touchstart', ()=>{ b.classList.add('pressed'); setTimeout(()=>b.classList.remove('pressed'),150); });
  });
}

function updateJoystick(cx, cy){
  // compute local dx/dy clamped by joystick.max
  const baseRect = document.getElementById('joystickContainer').getBoundingClientRect();
  const centerX = baseRect.left + baseRect.width/2;
  const centerY = baseRect.top + baseRect.height/2;
  let dx = cx - centerX, dy = cy - centerY;
  const dist = Math.hypot(dx,dy);
  const max = joystick.max;
  if(dist > max){ dx = dx/dist*max; dy = dy/dist*max; }
  joystick.dx = dx / max;
  joystick.dy = dy / max;
  // move knob visually
  const knob = document.getElementById('joystickKnob');
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
}

function resetKnob(){ const knob = document.getElementById('joystickKnob'); knob.style.transform = 'translate(0,0)'; }

// Match flow
function prepareMatch(mode){
  if(state.coins < 1){ alert('رصيدك غير كافٍ (100 coins افتراضي للمبتدئين)'); return; }
  state.coins -= 1; saveState();
  startMatch();
  showPanel('gameArea');
}

// Entities & simulation for 11v11
function startMatch(){
  // init entities
  state.score = [0,0]; state.timer = state.duration || 90; refreshUI();
  initEntities();
  loopInterval = setInterval(gameTick, 1000/30);
  countdownInterval = setInterval(()=>{ state.timer--; if(state.timer<=0){ finishMatch(); } refreshUI(); }, 1000);
}

function stopMatch(){
  clearInterval(loopInterval); clearInterval(countdownInterval);
  saveState();
  refreshUI();
}

function finishMatch(){
  clearInterval(loopInterval); clearInterval(countdownInterval);
  // simple reward/penalty: winner +1.8, loser -2
  if(state.score[0] > state.score[1]){ state.coins += 1.8; addLog('فزت! تم إضافة 1.8 coins'); }
  else if(state.score[0] < state.score[1]){ state.coins -= 2; addLog('خسرت! تم خصم 2 coins'); }
  else addLog('تعادل - لا تغيير');
  saveState(); showPanel('result'); el('resultText').innerText = 'النتيجة: ' + state.score.join(' - ');
}

// Entities
function initEntities(){
  players = [];
  // team 0 (green) - left half, include captain at index 0
  for(let i=0;i<11;i++){
    players.push({team:0, x: 200 + (i%4)*30, y: 380 - Math.floor(i/4)*60, vx:0, vy:0, id:i});
  }
  // team 1 (white) - right half
  for(let i=0;i<11;i++){
    players.push({team:1, x: 700 - (i%4)*30, y: 140 + Math.floor(i/4)*60, vx:0, vy:0, id:i+11});
  }
  ball = {x: 480, y: 270, vx:0, vy:0, r:8};
}

// Game tick
function gameTick(){
  // captain movement controlled by joystick
  const captain = players[0];
  captain.vx = joystick.dx * 3.2; captain.vy = joystick.dy * 3.2;
  captain.x += captain.vx; captain.y += captain.vy;
  clampPlayer(captain);

  // other players simple AI behavior
  players.forEach(p=>{
    if(p === captain) return;
    // roam
    if(Math.random() < 0.02){ p.vx = (Math.random()*2-1)*1.2; p.vy = (Math.random()*2-1)*1.2; }
    // move toward ball if near
    const dx = ball.x - p.x, dy = ball.y - p.y; const d = Math.hypot(dx,dy);
    if(d < 120 && Math.random() < 0.6){ p.vx += dx/d * 0.5; p.vy += dy/d * 0.5; }
    p.x += p.vx; p.y += p.vy;
    clampPlayer(p);
    // collision with ball
    const dist = Math.hypot(ball.x - p.x, ball.y - p.y);
    if(dist < ball.r + 10){
      ball.vx = (ball.x - p.x) * 0.18 + p.vx; ball.vy = (ball.y - p.y) * 0.18 + p.vy;
      // small chance to score if near goal and team is attacking
      if(p.team === 0 && ball.x > 820 && Math.abs(ball.y - H/2) < 90 && Math.random() < 0.25){ state.score[0]++; resetBall(); addLog('هدف لصالح فريقك'); }
      if(p.team === 1 && ball.x < 140 && Math.abs(ball.y - H/2) < 90 && Math.random() < 0.25){ state.score[1]++; resetBall(); addLog('هدف ضدك'); }
    }
  });

  // ball physics
  ball.x += ball.vx; ball.y += ball.vy; ball.vx *= 0.96; ball.vy *= 0.96;
  // goal detection using x extremes
  if(ball.x < 60 && Math.abs(ball.y - H/2) < 90){ state.score[1]++; resetBall(); addLog('هدف ضدك'); }
  if(ball.x > W-60 && Math.abs(ball.y - H/2) < 90){ state.score[0]++; resetBall(); addLog('هدف لصالحك'); }

  render();
  refreshUI();
}

function clampPlayer(p){ p.x = Math.max(40, Math.min(W-40, p.x)); p.y = Math.max(40, Math.min(H-40, p.y)); }

function resetBall(){ ball.x = W/2; ball.y = H/2; ball.vx = (Math.random()*4-2); ball.vy = (Math.random()*4-2); }

// Actions
function doPass(){ // pass from captain to nearest teammate forward
  const captain = players[0];
  let teammates = players.filter(p=>p.team===0 && p!==captain);
  teammates.sort((a,b)=>Math.hypot(a.x-captain.x,a.y-captain.y) - Math.hypot(b.x-captain.x,b.y-captain.y));
  if(teammates.length===0) return;
  const target = teammates[0];
  ball.vx = (target.x - captain.x) * 0.12; ball.vy = (target.y - captain.y) * 0.12;
  addLog('تمرير');
}

function doShoot(){ // powerful shot from captain towards opponent goal
  const captain = players[0];
  ball.vx = (W - captain.x) * 0.06 + (Math.random()*2-1); ball.vy = (H/2 - captain.y) * 0.07 + (Math.random()*2-1);
  addLog('تسديدة');
}

function doSkill(){ // skill: short dash and strong kick
  const captain = players[0];
  captain.x += joystick.dx * 18; captain.y += joystick.dy * 18;
  clampPlayer(captain);
  ball.vx = (ball.x - captain.x) * 0.24; ball.vy = (ball.y - captain.y) * 0.24;
  addLog('مهارة مستخدمة');
}

// render pseudo-3D field & players
function render(){
  ctx.clearRect(0,0,W,H);
  // perspective field gradient
  const grad = ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,'#1b6b2c'); grad.addColorStop(1,'#0f4a17');
  ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);
  // perspective lines
  for(let i=0;i<20;i++){ let y = H*(i/19); let width = W*(1 - 0.28*(i/19)); ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.beginPath(); ctx.ellipse(W/2, y, width/2, 3,0,0,Math.PI*2); ctx.stroke(); }
  // goals
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, H/2-90, 12, 180); ctx.fillRect(W-12, H/2-90, 12, 180);

  // players scaled by y for depth
  players.forEach(p=>{
    const scale = 0.6 + 0.5*(p.y/H);
    ctx.beginPath();
    ctx.fillStyle = p.team===0? '#1a9a1a' : '#ffffff';
    ctx.ellipse(p.x, p.y, 10*scale, 14*scale, 0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#f1c27d'; ctx.beginPath(); ctx.arc(p.x, p.y-12*scale, 5*scale,0,Math.PI*2); ctx.fill();
  });

  // ball
  ctx.beginPath(); ctx.fillStyle = '#fff'; ctx.arc(ball.x, ball.y, ball.r,0,Math.PI*2); ctx.fill();
  // subtle HUD overlay on canvas
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(10,10,140,44);
  ctx.fillStyle = '#fff'; ctx.font = '18px Inter'; ctx.fillText(state.score[0] + ' - ' + state.score[1], 22, 38);
}

// wallet functions (local)
function submitProof(){ const f = el('proofFile').files[0]; const amt = parseFloat(el('proofAmount').value); const method = el('proofMethod').value; if(!f||!amt){ alert('اختر إثبات وادخل المبلغ'); return; } const proofs = JSON.parse(localStorage.getItem('fifa_proofs')||'[]'); const reader = new FileReader(); reader.onload = e=>{ proofs.push({id:Date.now(), amount:amt, method, data:e.target.result, status:'pending'}); localStorage.setItem('fifa_proofs', JSON.stringify(proofs)); addLog('أرسلت إثبات شحن — قيد المراجعة'); alert('تم إرسال الإثبات. سيتم مراجعته يدوياً.'); refreshLogs(); }; reader.readAsDataURL(f); }

function requestWithdraw(){ const amt = parseFloat(el('withdrawAmount').value); const method = el('withdrawMethod').value; const details = el('withdrawDetails').value || ''; if(!amt||amt<=0){ alert('ادخل مبلغ صالح'); return; } if(amt > state.coins){ alert('رصيدك غير كافٍ'); return; } state.coins -= amt; saveState(); const reqs = JSON.parse(localStorage.getItem('fifa_withdraws')||'[]'); reqs.push({id:Date.now(), amount:amt, method, details, status:'pending'}); localStorage.setItem('fifa_withdraws', JSON.stringify(reqs)); addLog('طلب سحب أنشئ — قيد المراجعة'); refreshLogs(); refreshUI(); }

function refreshLogs(){ const logs = el('logs'); logs.innerHTML=''; const proofs = JSON.parse(localStorage.getItem('fifa_proofs')||'[]'); const withdraws = JSON.parse(localStorage.getItem('fifa_withdraws')||'[]'); proofs.concat(withdraws).forEach(r=>{ const d = document.createElement('div'); d.innerHTML = `<small>${new Date(r.id).toLocaleString()} — ${r.amount||''} — ${r.method||''} — ${r.status||''}</small>`; logs.appendChild(d); }); }

function addLog(text){ const a = JSON.parse(localStorage.getItem('fifa_logs')||'[]'); a.unshift({t:Date.now(), text}); localStorage.setItem('fifa_logs', JSON.stringify(a)); const logs = el('logs'); const d = document.createElement('div'); d.innerHTML = `<small>${new Date().toLocaleString()} — ${text}</small>`; logs.prepend(d); }

function showPanel(id){
  ['menu','gameArea','wallet','settings','result'].forEach(x=>document.getElementById(x).classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  if(id === 'menu') refreshUI();
  if(id === 'wallet') refreshLogs();
}

function startMatch(){ // prepare canvas size based on container
  const canvasEl = el('gameCanvas'); const parent = canvasEl.parentElement; const rect = parent.getBoundingClientRect();
  // adapt canvas resolution
  canvasEl.width = 960; canvasEl.height = 540; W = canvasEl.width; H = canvasEl.height;
  initEntities();
  loopInterval = setInterval(gameTick, 1000/30);
  countdownInterval = setInterval(()=>{ state.timer--; if(state.timer<=0){ finishMatch(); } refreshUI(); }, 1000);
}

function finishMatch(){ clearInterval(loopInterval); clearInterval(countdownInterval); if(state.score[0] > state.score[1]){ state.coins += 1.8; addLog('فزت — أضيف 1.8 coins'); } else if(state.score[0] < state.score[1]){ state.coins -= 2; addLog('خسرت — خصم 2 coins'); } else addLog('تعادل'); saveState(); showPanel('result'); el('resultText').innerText = 'النتيجة: ' + state.score.join(' - '); refreshUI(); }

// helpers
window.addEventListener('load', ()=>{ // initialize canvas dimensions after styles apply
  const canvasEl = el('gameCanvas'); canvasEl.width = 960; canvasEl.height = 540; W = canvasEl.width; H = canvasEl.height;
}); 
