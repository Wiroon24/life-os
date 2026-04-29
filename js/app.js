// ============ STATE ============
const todayStr = new Date().toDateString();
let foodLog = [], waterCount = 0;
let timerSec = 0, timerTotal = 0, timerRun = false, timerIv = null;
let reportPeriod = 'week';
let charts = {};
let recentFoods = [];

function loadState() {
  try {
    const ts = localStorage.getItem('los_t_' + todayStr);
    if (ts) JSON.parse(ts).forEach(id => document.getElementById(id)?.classList.add('done'));
    const fl = localStorage.getItem('los_f_' + todayStr);
    if (fl) foodLog = JSON.parse(fl);
    const wc = localStorage.getItem('los_w_' + todayStr);
    if (wc) waterCount = parseInt(wc) || 0;
    const rf = localStorage.getItem('los_recent');
    if (rf) recentFoods = JSON.parse(rf);
  } catch(e) {}
}

function saveTask() {
  const done = [];
  document.querySelectorAll('.tblock.done, .subtask.done').forEach(e => done.push(e.id));
  localStorage.setItem('los_t_' + todayStr, JSON.stringify(done));
  // save to history
  const hist = JSON.parse(localStorage.getItem('los_hist') || '{}');
  if (!hist[todayStr]) hist[todayStr] = {};
  const all = document.querySelectorAll('.tblock').length;
  const dn  = document.querySelectorAll('.tblock.done').length;
  hist[todayStr].task = all ? Math.round(dn/all*100) : 0;
  localStorage.setItem('los_hist', JSON.stringify(hist));
}

function saveFood() {
  localStorage.setItem('los_f_' + todayStr, JSON.stringify(foodLog));
  const hist = JSON.parse(localStorage.getItem('los_hist') || '{}');
  if (!hist[todayStr]) hist[todayStr] = {};
  hist[todayStr].cal  = foodLog.reduce((s,f) => s+f.cal, 0);
  hist[todayStr].prot = foodLog.reduce((s,f) => s+f.p, 0);
  localStorage.setItem('los_hist', JSON.stringify(hist));
}

function saveWater() {
  localStorage.setItem('los_w_' + todayStr, waterCount);
  const hist = JSON.parse(localStorage.getItem('los_hist') || '{}');
  if (!hist[todayStr]) hist[todayStr] = {};
  hist[todayStr].water = waterCount * 250;
  localStorage.setItem('los_hist', JSON.stringify(hist));
}

// ============ INIT ============
function init() {
  const now = new Date();
  const day = now.getDay();
  const dd  = String(now.getDate()).padStart(2,'0');
  const mm  = String(now.getMonth()+1).padStart(2,'0');
  const yy  = now.getFullYear() + 543;

  document.getElementById('hdrDate').textContent = `${dd}/${mm}/${yy}`;
  document.getElementById('hdrDay').textContent  = `วัน${DAY_TH[day]}`;
  document.getElementById('nowTime').textContent = now.toLocaleTimeString('th',{hour:'2-digit',minute:'2-digit'});

  // Badges
  const isNon = [1,2,3,4].includes(day);
  const isBas = [1,3].includes(day);
  const gymLabels = {5:'Legs',6:'Push',0:'Pull',2:'Push DB',4:'Pull DB'};
  let html = `<span class="badge ${isNon?'b-loc-n':'b-loc-h'}">${isNon?'📍 นนทบุรี':'📍 ห้วยขวาง'}</span>`;
  if (isBas) html += `<span class="badge b-bas">🏀 บาส</span>`;
  if (gymLabels[day]) html += `<span class="badge b-gym">🏋️ ${gymLabels[day]}</span>`;
  document.getElementById('hdrBadges').innerHTML = html;

  buildTimeline(day);
  updateNow(day);
  updateCalTarget(day);
  renderFood();
  buildWater();
  renderRecent();

  setInterval(() => {
    const n = new Date();
    document.getElementById('nowTime').textContent = n.toLocaleTimeString('th',{hour:'2-digit',minute:'2-digit'});
    updateNow(n.getDay());
  }, 60000);
}

// ============ TIMELINE ============
function buildTimeline(day) {
  const sched = makeSched(day);
  const container = document.getElementById('timeline');
  container.innerHTML = '';
  const now = new Date();
  const cur = now.getHours()*60 + now.getMinutes();

  // Sort: active → upcoming → past
  const active = [], upcoming = [], past = [];
  sched.forEach((b, i) => {
    const [h, m] = (b.t+':00').split(':').map(Number);
    const bMin = h*60 + (m||0);
    const nextB = sched[i+1];
    const nMin = nextB ? (() => { const [nh,nm]=(nextB.t+':00').split(':').map(Number); return nh*60+(nm||0); })() : 1440;
    b._active = cur >= bMin && cur < nMin;
    b._past   = cur >= nMin;
    if (b._active) active.push(b);
    else if (b._past) past.push(b);
    else upcoming.push(b);
  });

  [...active, ...upcoming, ...past].forEach(b => {
    const div = document.createElement('div');
    div.id = b.id;
    div.className = 'tblock' + (b._active?' active':'') + (b._past?' collapsed':'');

    const subIds = b.subs.map(s => s.id).join(',');
    const subsHTML = b.subs.map(s => {
      const btn = s.sec > 0
        ? `<button class="st-btn" onclick="event.stopPropagation();openTimer('${s.n.substring(0,28)}',${s.sec})">${fmtSec(s.sec)}</button>`
        : '';
      return `<div class="subtask" id="${s.id}" onclick="toggleST('${b.id}','${s.id}')">
        <div class="st-dot"></div>
        <span class="st-name">${s.n}</span>${btn}
      </div>`;
    }).join('');

    div.innerHTML = `
      <div class="tblock-hd" onclick="collapseToggle('${b.id}')">
        <span class="tblock-time">${b.t}</span>
        <span class="tblock-ico">${b.ico}</span>
        <div class="tblock-info">
          <div class="tblock-name">${b.name}</div>
          <div class="tblock-meta">${b.subs.length} รายการ${b._past?' · เลยเวลา':''}</div>
        </div>
        <div class="tblock-check" onclick="event.stopPropagation();markDone('${b.id}','${subIds}')">✓</div>
      </div>
      <div class="subtasks">${subsHTML}</div>`;
    container.appendChild(div);
  });

  loadState();
  updateProgress();
}

function collapseToggle(id) {
  document.getElementById(id)?.classList.toggle('collapsed');
}

function markDone(blockId, subIds) {
  const el = document.getElementById(blockId);
  if (!el) return;
  const wasDone = el.classList.contains('done');
  el.classList.toggle('done');
  el.classList.toggle('collapsed', !wasDone);
  if (!wasDone && subIds) {
    subIds.split(',').forEach(sid => document.getElementById(sid)?.classList.add('done'));
  } else if (wasDone) {
    subIds.split(',').forEach(sid => document.getElementById(sid)?.classList.remove('done'));
  }
  saveTask(); updateProgress();
}

function toggleST(blockId, subId) {
  document.getElementById(subId)?.classList.toggle('done');
  const block = document.getElementById(blockId);
  if (block) {
    const all  = block.querySelectorAll('.subtask');
    const done = [...all].every(s => s.classList.contains('done'));
    block.classList.toggle('done',  done);
    block.classList.toggle('collapsed', done);
  }
  saveTask(); updateProgress();
}

function updateProgress() {
  const all  = document.querySelectorAll('.tblock').length;
  const done = document.querySelectorAll('.tblock.done').length;
  const pct  = all ? Math.round(done/all*100) : 0;
  document.getElementById('progVal').textContent  = pct + '%';
  document.getElementById('progFill').style.width = pct + '%';
}

function updateNow(day) {
  const sched = makeSched(day);
  const cur   = new Date().getHours()*60 + new Date().getMinutes();
  let active  = sched[0];
  sched.forEach((b, i) => {
    const [h, m] = (b.t+':00').split(':').map(Number);
    if (cur >= h*60+(m||0)) active = b;
  });
  document.getElementById('nowTask').textContent = active.ico + ' ' + active.name;
  const pending = active.subs.filter(s => !document.getElementById(s.id)?.classList.contains('done'));
  document.getElementById('nowSub').textContent  = pending.length ? '▸ ' + pending[0].n : '✓ เสร็จหมดแล้ว';
}

// ============ FOOD ============
function calTarget(day) { return day === 4 ? 1700 : 2000; }

function updateCalTarget(day) {
  const t = calTarget(day);
  const isRest = day === 4;
  document.getElementById('calTarget').textContent  = t.toLocaleString() + ' kcal';
  document.getElementById('calDayLabel').textContent = isRest ? '💤 วันพัก' : '🏋️ วันออกกำลังกาย';
  document.getElementById('calTarget').style.color   = isRest ? 'var(--blue)' : 'var(--lime)';
  window._calt = t;
}

function searchFDB(q) {
  if (!q || q.length < 1) return [];
  const query = q.toLowerCase();
  const results = [];
  for (const k in FDB) {
    const kl = k.toLowerCase();
    let score = 0;
    if (kl === query) score = 10;
    else if (kl.startsWith(query)) score = 8;
    else if (kl.includes(query)) score = 5;
    else if (query.includes(kl) && kl.length > 1) score = 3;
    if (score > 0) results.push({ key: k, score, ...FDB[k] });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 8);
}

function onFoodInput(val) {
  const suggest = document.getElementById('foodSuggest');
  const q = val.trim();
  if (!q) { suggest.classList.remove('on'); return; }
  const results = searchFDB(q);
  if (!results.length) { suggest.classList.remove('on'); return; }
  suggest.innerHTML = results.map(r => `
    <div class="suggest-item">
      <div class="si-info">
        <div class="si-name">${r.key}</div>
        <div class="si-macro">${r.cal} kcal · P${r.p}g · C${r.c}g · F${r.f}g · (${r.u})</div>
      </div>
      <button class="si-add" onclick="quickAdd('${r.key}',1)">+</button>
    </div>`).join('');
  suggest.classList.add('on');
}

function quickAdd(key, qty) {
  const d = FDB[key];
  if (!d) return;
  const q = qty || 1;
  foodLog.push({
    name: `${key}${q !== 1 ? ' ×'+q : ''} (${d.u})`,
    cal: Math.round(d.cal*q), p: Math.round(d.p*q),
    c: Math.round(d.c*q),    f: Math.round(d.f*q)
  });
  // update recent
  if (!recentFoods.includes(key)) {
    recentFoods.unshift(key);
    recentFoods = recentFoods.slice(0, 10);
    localStorage.setItem('los_recent', JSON.stringify(recentFoods));
  }
  document.getElementById('foodInp').value = '';
  document.getElementById('foodSuggest').classList.remove('on');
  saveFood(); renderFood(); renderRecent();
}

async function addFoodByName() {
  const raw = document.getElementById('foodInp').value.trim().toLowerCase();
  if (!raw) return;
  document.getElementById('foodSuggest').classList.remove('on');

  const qm   = raw.match(/^(.*?)\s+([\d.]+)$/);
  const name = qm ? qm[1].trim() : raw;
  const qty  = qm ? parseFloat(qm[2]) : 1;
  const q    = isNaN(qty) || qty <= 0 ? 1 : qty;

  // Best match in FDB
  let matched = null;
  const results = searchFDB(name);
  if (results.length && results[0].score >= 3) matched = results[0].key;

  if (!matched) {
    const btn = document.getElementById('addBtn');
    btn.textContent = '…'; btn.disabled = true;
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 120,
          system: 'Return ONLY JSON no markdown: {"cal":int,"p":int,"c":int,"f":int,"u":"string"} per 1 serving. Thai food.',
          messages: [{ role: 'user', content: `Nutrition for: ${name}` }]
        })
      });
      const d = await res.json();
      const parsed = JSON.parse(d.content[0].text.replace(/```json|```/g,'').trim());
      FDB[name] = { cal:parsed.cal||0, p:parsed.p||0, c:parsed.c||0, f:parsed.f||0, u:parsed.u||'จาน' };
      matched = name;
    } catch(e) {
      foodLog.push({ name, cal:0, p:0, c:0, f:0, unk:true });
      saveFood(); renderFood();
      btn.textContent = '+'; btn.disabled = false;
      document.getElementById('foodInp').value = '';
      return;
    }
    btn.textContent = '+'; btn.disabled = false;
  }

  if (matched) quickAdd(matched, q);
}

async function lookupBarcode(code) {
  if (!code) return;
  const hint = document.getElementById('bcHint');
  hint.textContent = '🔍 กำลังค้นหา ' + code + '...';
  hint.style.color = 'var(--t3)';
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
    const d   = await res.json();
    if (d.status === 1 && d.product) {
      const p    = d.product;
      const name = (p.product_name_th || p.product_name || 'สินค้า ' + code).substring(0, 40);
      const n    = p.nutriments || {};
      FDB[name]  = {
        cal: Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || 0),
        p:   Math.round(n['proteins_100g'] || 0),
        c:   Math.round(n['carbohydrates_100g'] || 0),
        f:   Math.round(n['fat_100g'] || 0),
        u:   p.serving_size || '100g'
      };
      document.getElementById('foodInp').value = name;
      onFoodInput(name);
      hint.textContent = '✓ พบ: ' + name + ' (' + FDB[name].cal + ' kcal/' + FDB[name].u + ')';
      hint.style.color = 'var(--green)';
      document.getElementById('barcodeInp').value = '';
    } else {
      hint.textContent = '⚠️ ไม่พบสินค้า barcode: ' + code;
      hint.style.color = 'var(--amber)';
    }
  } catch(e) {
    hint.textContent = '❌ เชื่อมต่อไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต';
    hint.style.color = 'var(--red)';
  }
}

function removeFood(i) { foodLog.splice(i,1); saveFood(); renderFood(); }
function resetFood()   { foodLog = []; saveFood(); renderFood(); }

function renderFood() {
  const tCal = foodLog.reduce((s,f) => s+f.cal, 0);
  const tP   = foodLog.reduce((s,f) => s+f.p,   0);
  const tC   = foodLog.reduce((s,f) => s+f.c,   0);
  const tF   = foodLog.reduce((s,f) => s+f.f,   0);
  const goal = window._calt || 2000;
  const rem  = goal - tCal;

  document.getElementById('mCal').textContent = tCal;
  document.getElementById('mP').textContent   = tP + 'g';
  document.getElementById('mC').textContent   = tC + 'g';
  document.getElementById('mF').textContent   = tF + 'g';
  document.getElementById('calLeft').textContent  = `${tCal.toLocaleString()} / ${goal.toLocaleString()} kcal`;
  document.getElementById('calRight').textContent = rem >= 0 ? `เหลือ ${rem}` : `เกิน ${Math.abs(rem)}`;
  document.getElementById('calRight').style.color = rem >= 0 ? 'var(--lime)' : 'var(--red)';
  document.getElementById('calBarFill').style.width = Math.min(100, Math.round(tCal/goal*100)) + '%';
  document.getElementById('calBarFill').style.background = rem >= 0 ? 'var(--lime)' : 'var(--red)';
  document.getElementById('protIn').textContent     = tP;
  document.getElementById('protRight').textContent  = tP >= 120 ? 'ครบ ✓' : `ขาด ${120-tP}g`;
  document.getElementById('protRight').style.color  = tP >= 120 ? 'var(--green)' : 'var(--amber)';
  document.getElementById('protBarFill').style.width = Math.min(100, Math.round(tP/120*100)) + '%';

  const list = document.getElementById('foodList');
  list.innerHTML = foodLog.length === 0
    ? '<div class="empty-food">ยังไม่มีรายการ<br><span style="font-size:10px;">พิมพ์ชื่ออาหาร หรือป้อน barcode</span></div>'
    : foodLog.map((f,i) => `<div class="food-item">
        <span class="fi-name" style="${f.unk?'color:var(--amber);':''}">${f.name}${f.unk?' ⚠️':''}</span>
        <span class="fi-kcal">${f.cal} kcal · P${f.p}g</span>
        <button class="fi-del" onclick="removeFood(${i})">✕</button>
      </div>`).join('');
}

function renderRecent() {
  const sec = document.getElementById('recentSection');
  const list = document.getElementById('recentList');
  if (!recentFoods.length) { sec.style.display = 'none'; return; }
  sec.style.display = 'block';
  list.innerHTML = recentFoods.filter(k => FDB[k]).map(k => {
    const d = FDB[k];
    return `<div class="recent-item">
      <span class="ri-name">${k}</span>
      <span class="ri-kcal">${d.cal} kcal · P${d.p}g</span>
      <button class="ri-add" onclick="quickAdd('${k}',1)">+</button>
    </div>`;
  }).join('');
}

// ============ WATER ============
function buildWater() {
  const c = document.getElementById('waterCups');
  c.innerHTML = '';
  for (let i = 0; i < 12; i++) {
    const d = document.createElement('div');
    d.className = 'wcup' + (i < waterCount ? ' full' : '');
    d.textContent = '💧';
    d.onclick = () => { waterCount = i < waterCount ? i : i+1; saveWater(); buildWater(); };
    c.appendChild(d);
  }
  document.getElementById('waterVal').textContent = (waterCount * 250) + ' ml';
}

// ============ TIMER ============
const CIRC = 339.3;
function fmtSec(s) { if(s>=3600)return Math.floor(s/3600)+'h'; if(s>=60)return Math.floor(s/60)+'m'; return s+'s'; }
function fmtDisp(s){ return Math.floor(s/60)+':'+(String(s%60).padStart(2,'0')); }

function openTimer(label, sec) {
  timerSec = sec; timerTotal = sec; timerRun = false;
  clearInterval(timerIv);
  document.getElementById('timerLabel').textContent  = label;
  document.getElementById('timerNum').textContent    = fmtDisp(sec);
  document.getElementById('timerTogBtn').textContent = 'เริ่ม';
  document.getElementById('timerTogBtn').style.background = 'var(--lime)';
  updateRing(sec, sec);
  document.getElementById('timerModal').classList.add('on');
}

function closeTimer() {
  clearInterval(timerIv); timerRun = false;
  document.getElementById('timerModal').classList.remove('on');
}

function toggleTimer() {
  if (timerRun) {
    clearInterval(timerIv); timerRun = false;
    document.getElementById('timerTogBtn').textContent = 'ต่อ'; return;
  }
  if (timerSec <= 0) timerSec = timerTotal;
  timerRun = true;
  document.getElementById('timerTogBtn').textContent = 'หยุด';
  timerIv = setInterval(() => {
    timerSec--;
    document.getElementById('timerNum').textContent = fmtDisp(timerSec);
    updateRing(timerSec, timerTotal);
    if (timerSec <= 0) {
      clearInterval(timerIv); timerRun = false;
      document.getElementById('timerNum').textContent = '✓';
      document.getElementById('timerTogBtn').textContent = 'เริ่มใหม่';
      document.getElementById('timerTogBtn').style.background = 'var(--amber)';
      if (navigator.vibrate) navigator.vibrate([300,100,300]);
    }
  }, 1000);
}

function updateRing(cur, tot) {
  document.getElementById('timerRing').style.strokeDashoffset = CIRC * (1 - (tot > 0 ? cur/tot : 0));
}

// ============ REPORT ============
function setPeriod(p, el) {
  reportPeriod = p;
  document.querySelectorAll('.ptab').forEach(t => t.classList.remove('on'));
  el.classList.add('on');
  buildReport();
}

function getDateRange(period) {
  const dates = [];
  const now   = new Date();
  const count = period === 'week' ? 7 : period === 'month' ? 30 : 365;
  for (let i = count-1; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate()-i);
    dates.push(d.toDateString());
  }
  return dates;
}

function buildReport() {
  const hist  = JSON.parse(localStorage.getItem('los_hist') || '{}');
  const dates = getDateRange(reportPeriod);
  const labels = dates.map(d => {
    const dt = new Date(d);
    if (reportPeriod === 'week')  return DAY_TH[dt.getDay()].substring(0,2);
    if (reportPeriod === 'month') return String(dt.getDate());
    return `${dt.getMonth()+1}/${String(dt.getFullYear()).slice(2)}`;
  });

  const calData   = dates.map(d => (hist[d]?.cal  || 0));
  const protData  = dates.map(d => (hist[d]?.prot || 0));
  const taskData  = dates.map(d => (hist[d]?.task || 0));
  const waterData = dates.map(d => (hist[d]?.water|| 0));

  // Streak
  let streak = 0;
  for (let i = dates.length-1; i >= 0; i--) {
    if ((hist[dates[i]]?.task||0) > 0) streak++;
    else if (i < dates.length-1) break;
  }
  document.getElementById('streakNum').textContent = streak;
  document.getElementById('streakSub').textContent = streak > 0
    ? `ล่าสุด: ${new Date(dates[dates.length-1]).toLocaleDateString('th')}`
    : 'ยังไม่มีข้อมูล';

  // Averages
  const nzCal  = calData.filter(v=>v>0);
  const nzProt = protData.filter(v=>v>0);
  const nzTask = taskData.filter(v=>v>0);
  const avg = arr => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : null;
  document.getElementById('avgCal').textContent  = avg(nzCal)  != null ? avg(nzCal)+'':   '—';
  document.getElementById('avgProt').textContent = avg(nzProt) != null ? avg(nzProt)+'g': '—';
  document.getElementById('avgTask').textContent = avg(nzTask) != null ? avg(nzTask)+'%': '—';

  const cfg = (data, color, target) => ({
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: data.map(v => v > 0 ? color.replace('1)','0.65)') : 'rgba(42,42,51,0.5)'),
          borderColor:      data.map(v => v > 0 ? color : 'transparent'),
          borderWidth: 1, borderRadius: 3,
        },
        ...(target ? [{
          type: 'line', data: dates.map(()=>target),
          borderColor: 'rgba(184,240,0,0.3)', borderWidth: 1,
          borderDash: [4,4], pointRadius: 0, fill: false,
        }] : [])
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color:'rgba(42,42,51,0.5)' }, ticks: { color:'#4a4a55', font:{size:9} } },
        y: { grid: { color:'rgba(42,42,51,0.5)' }, ticks: { color:'#4a4a55', font:{size:9} } }
      }
    }
  });

  const sets = {
    calChart:   [calData,   'rgba(240,160,32,1)',  window._calt||2000],
    protChart:  [protData,  'rgba(74,184,240,1)',  120],
    waterChart: [waterData, 'rgba(74,184,240,1)',  3000],
    taskChart:  [taskData,  'rgba(184,240,0,1)',   null],
  };
  Object.entries(sets).forEach(([id,[d,c,t]]) => {
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(document.getElementById(id).getContext('2d'), cfg(d,c,t));
  });
}

// ============ PAGE NAV ============
window.showPg = function(name) {
  document.querySelectorAll('.pg').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.tab, .nbtn').forEach(b => b.classList.remove('on'));
  const pg = document.getElementById('pg-'+name);
  if (pg) pg.classList.add('on');
  const idx = { today:0, food:1, report:2 };
  document.querySelectorAll('.tab')[idx[name]]?.classList.add('on');
  document.querySelectorAll('.nbtn')[idx[name]]?.classList.add('on');
  if (name === 'food')   { updateCalTarget(new Date().getDay()); renderFood(); buildWater(); renderRecent(); }
  if (name === 'report') setTimeout(buildReport, 50);
};

// Close suggest when clicking outside
document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap')) {
    document.getElementById('foodSuggest')?.classList.remove('on');
  }
});

// ============ BOOT ============
loadState();
init();
