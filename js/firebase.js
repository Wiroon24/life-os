// ============ FIREBASE ============
const firebaseConfig = {
  apiKey: "AIzaSyC2mEiYeRJij9aBbhT4obplZ72MQV93_mo",
  authDomain: "lift-os-53d36.firebaseapp.com",
  projectId: "lift-os-53d36",
  storageBucket: "lift-os-53d36.firebasestorage.app",
  messagingSenderId: "802315841089",
  appId: "1:802315841089:web:7884e54ca152ad1ef0a0c0"
};

firebase.initializeApp(firebaseConfig);
const _auth = firebase.auth();
const _db   = firebase.firestore();

let _uid     = null;
let _fbReady = false;
let _unsubToday  = null;
let _unsubHealth = null;
let _unsubMoney  = null;

// Local dev convenience: skip the cloud-login gate entirely on localhost so the app
// runs off localStorage with no sign-in prompt. Never applies to the deployed domain.
const _isLocalDev = ['localhost', '127.0.0.1'].includes(location.hostname);

function _todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function _dayRef()   { return _db.doc(`users/${_uid}/days/${_todayKey()}`); }
function _metaRef(k) { return _db.doc(`users/${_uid}/meta/${k}`); }

// ── Auth state ────────────────────────────────────
_auth.onAuthStateChanged(user => {
  if (_isLocalDev) { _fbReady = false; _uid = null; _hideLogin(); return; }
  if (user && !user.isAnonymous) {
    _uid     = user.uid;
    _fbReady = true;
    _hideLogin();
    _dbg('✅ ' + user.email);
    _fbListen();
    _fbPull();
  } else {
    if (user) _auth.signOut();
    _fbReady = false;
    _uid     = null;
    _showLogin();
  }
});

// ── Login / Register ──────────────────────────────
function fbLogin() {
  const email = document.getElementById('fbEmail').value.trim();
  const pw    = document.getElementById('fbPw').value;
  const err   = document.getElementById('fbErr');
  if (!email || !pw) { err.textContent = 'กรุณากรอก email และ password'; return; }
  if (pw.length < 6) { err.textContent = 'Password ต้องมีอย่างน้อย 6 ตัวอักษร'; return; }
  err.textContent = 'กำลัง login...';
  _auth.signInWithEmailAndPassword(email, pw)
    .catch(e => {
      if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
        err.textContent = 'กำลังสร้างบัญชีใหม่...';
        return _auth.createUserWithEmailAndPassword(email, pw)
          .catch(ce => {
            err.textContent = ce.code === 'auth/email-already-in-use'
              ? 'Password ไม่ถูกต้อง' : ce.message;
          });
      }
      const msg = {
        'auth/wrong-password':  'Password ไม่ถูกต้อง',
        'auth/invalid-email':   'Email ไม่ถูกต้อง',
        'auth/weak-password':   'Password ต้องมีอย่างน้อย 6 ตัวอักษร',
      };
      err.textContent = msg[e.code] || ('Error: ' + e.code);
    });
}

// ── Login UI ─────────────────────────────────────
function _showLogin() {
  let el = document.getElementById('fbLogin');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fbLogin';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(8,16,30,0.98);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;gap:14px;padding:32px;backdrop-filter:blur(8px);';
    el.innerHTML = `
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:52px;height:52px;margin-bottom:4px;">
        <rect width="36" height="36" rx="10" fill="url(#lg1)"/>
        <circle cx="18" cy="11" r="4.5" fill="white" fill-opacity="0.95"/>
        <path d="M9 27c0-4.97 4.03-9 9-9s9 4.03 9 9" stroke="white" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        <defs><linearGradient id="lg1" x1="0" y1="0" x2="36" y2="36"><stop offset="0%" stop-color="#2DD4BF"/><stop offset="100%" stop-color="#0EA5E9"/></linearGradient></defs>
      </svg>
      <div style="font-family:'Quicksand',sans-serif;font-size:26px;font-weight:700;color:#E8F0FF;letter-spacing:1px;margin-bottom:4px;">I<span style="color:#2DD4BF;">am</span></div>
      <div style="font-size:12px;color:#6E8BBF;margin-bottom:8px;">เข้าสู่ระบบเพื่อซิงค์ข้อมูล</div>
      <input id="fbEmail" type="email" placeholder="Email" autocomplete="email"
        style="width:100%;max-width:300px;padding:13px 16px;border-radius:12px;border:1px solid #1E3055;background:#0C1628;color:#E8F0FF;font-size:15px;box-sizing:border-box;outline:none;">
      <input id="fbPw" type="password" placeholder="Password (ตั้งได้เลย ครั้งแรก)" autocomplete="current-password"
        style="width:100%;max-width:300px;padding:13px 16px;border-radius:12px;border:1px solid #1E3055;background:#0C1628;color:#E8F0FF;font-size:15px;box-sizing:border-box;outline:none;"
        onkeydown="if(event.key==='Enter')fbLogin()">
      <button onclick="fbLogin()"
        style="width:100%;max-width:300px;padding:15px;border-radius:12px;border:none;background:linear-gradient(135deg,#2DD4BF,#0EA5E9);color:#08101E;font-size:15px;font-weight:700;cursor:pointer;letter-spacing:0.3px;">
        เข้าสู่ระบบ / สมัคร
      </button>
      <div id="fbErr" style="font-size:12px;color:#F87171;min-height:16px;text-align:center;"></div>
      <div style="font-size:11px;color:#364E78;text-align:center;margin-top:2px;line-height:1.6;">ครั้งแรกระบบจะสร้างบัญชีให้อัตโนมัติ<br>ใช้ email + password เดียวกันทุกเครื่อง</div>`;
    document.body.appendChild(el);
  }
  el.style.display = 'flex';
}

function _hideLogin() {
  const el = document.getElementById('fbLogin');
  if (el) el.style.display = 'none';
}

// ── Pull on login ─────────────────────────────────
async function _fbPull() {
  _dbg('🔄 pulling...');
  try {
    const [daySnap, recentSnap, histSnap, healthSnap, moneySnap, goalsSnap, coinsSnap] = await Promise.all([
      _dayRef().get(),
      _metaRef('recent').get(),
      _metaRef('hist').get(),
      _metaRef('health').get(),
      _metaRef('money').get(),
      _metaRef('goals').get(),
      _metaRef('coins').get(),
    ]);

    let changed = false;

    if (daySnap.exists) {
      const d = daySnap.data();
      if (d.tasks !== undefined) { localStorage.setItem('los_t_' + TODAY, JSON.stringify(d.tasks)); changed = true; }
      if (d.food  !== undefined) { localStorage.setItem('los_f_' + TODAY, JSON.stringify(d.food));  foodLog = d.food; changed = true; }
      if (d.water !== undefined) { localStorage.setItem('los_w_' + TODAY, String(d.water)); waterCount = d.water; changed = true; }
    }
    if (recentSnap.exists && recentSnap.data().list)
      localStorage.setItem('los_recent', JSON.stringify(recentSnap.data().list));
    if (histSnap.exists && histSnap.data().data) {
      const merged = { ...JSON.parse(localStorage.getItem('los_hist') || '{}'), ...histSnap.data().data };
      localStorage.setItem('los_hist', JSON.stringify(merged));
    }

    if (healthSnap.exists) {
      const h = healthSnap.data();
      if (h.weightLog)  { weightLog  = h.weightLog;  localStorage.setItem('los_weight',   JSON.stringify(h.weightLog));  changed = true; }
      if (h.moodLog)    { moodLog    = h.moodLog;    localStorage.setItem('los_mood',      JSON.stringify(h.moodLog));    changed = true; }
      if (h.illnessLog) { illnessLog = h.illnessLog; localStorage.setItem('los_illness',   JSON.stringify(h.illnessLog)); changed = true; }
      if (h.medList)    { medList    = h.medList;    localStorage.setItem('los_meds',      JSON.stringify(h.medList));    changed = true; }
      if (h.medTaken)   { medTaken   = h.medTaken;   localStorage.setItem('los_med_taken', JSON.stringify(h.medTaken));   changed = true; }
    }

    if (goalsSnap.exists && goalsSnap.data().goals) {
      userGoals = goalsSnap.data().goals;
      localStorage.setItem('los_goals', JSON.stringify(userGoals));
      changed = true;
    }

    if (coinsSnap.exists) {
      const c = coinsSnap.data();
      if (c.coinBalance !== undefined) { coinBalance = c.coinBalance; localStorage.setItem('los_coins', coinBalance); changed = true; }
      if (c.pendingBaht !== undefined) { pendingBaht = c.pendingBaht; localStorage.setItem('los_pending_baht', pendingBaht); changed = true; }
      if (c.coinLog)    { coinLog = c.coinLog;    localStorage.setItem('los_coin_log', JSON.stringify(coinLog)); changed = true; }
      if (c.streakBonusGiven) { streakBonusGiven = c.streakBonusGiven; localStorage.setItem('los_streak_bonus', JSON.stringify(streakBonusGiven)); }
    }

    if (moneySnap.exists) {
      const m = moneySnap.data();
      if (m.txLog)       { financeLog          = m.txLog;       localStorage.setItem('los_finance',      JSON.stringify(m.txLog));       changed = true; }
      if (m.budgetCaps)  { budgetCaps          = m.budgetCaps;  localStorage.setItem('los_budget',       JSON.stringify(m.budgetCaps));  changed = true; }
      if (m.catMemory)   { catMemory           = m.catMemory;   localStorage.setItem('los_cat_memory',   JSON.stringify(m.catMemory));   changed = true; }
      if (m.recurringTx) { recurringTx         = m.recurringTx; localStorage.setItem('los_recurring',    JSON.stringify(m.recurringTx)); changed = true; }
      if (m.startDay)    { moneyBudgetStartDay  = m.startDay;   localStorage.setItem('los_budget_start', String(m.startDay));            changed = true; }
    }

    // Auto-migrate: ถ้า Firestore ว่างแต่ localStorage มีข้อมูล
    if (!healthSnap.exists) {
      const hasLocal = weightLog.length || illnessLog.length || Object.keys(moodLog).length;
      if (hasLocal) { fbSaveHealth({weightLog, moodLog, illnessLog, medList, medTaken}); _dbg('📤 migrate health'); }
    }
    if (!moneySnap.exists && financeLog.length) {
      fbSaveMoney({txLog:financeLog, budgetCaps, catMemory, recurringTx, startDay:moneyBudgetStartDay});
      _dbg('📤 migrate money');
    }
    if (!goalsSnap.exists) {
      const localGoals = typeof userGoals !== 'undefined' ? userGoals : [];
      if (localGoals.length) { fbSaveGoals(localGoals); _dbg('📤 migrate goals'); }
    }
    if (!coinsSnap.exists && typeof coinBalance !== 'undefined' && coinBalance > 0) {
      fbSaveCoins({coinBalance, pendingBaht, coinLog, streakBonusGiven});
      _dbg('📤 migrate coins');
    }

    if (changed) {
      loadState(); updateProgress();
      renderFood(); buildWater(); updateRecentList();
      if (typeof renderMoney  === 'function') try { renderMoney();  } catch(e) {}
      if (typeof renderHealth === 'function') try { renderHealth(); } catch(e) {}
      if (typeof renderGoals  === 'function') try { renderGoals();  } catch(e) {}
      if (typeof renderCoinBadge === 'function') try { renderCoinBadge(); } catch(e) {}
      if (typeof renderTravelFundCard === 'function') try { renderTravelFundCard(); } catch(e) {}
    }

    _badge('synced');
    _dbg('✅ pull | day:' + daySnap.exists + ' health:' + healthSnap.exists + ' money:' + moneySnap.exists + ' goals:' + goalsSnap.exists);
  } catch(e) { _dbg('❌ pull: ' + e.message); }
}

// ── Real-time listeners ───────────────────────────
function _fbListen() {
  if (_unsubToday) _unsubToday();
  _unsubToday = _dayRef().onSnapshot(snap => {
    if (!snap.exists || snap.metadata.hasPendingWrites) return;
    const d = snap.data();
    if (d.food  !== undefined) { foodLog = d.food; localStorage.setItem('los_f_' + TODAY, JSON.stringify(d.food)); renderFood(); updateRecentList(); }
    if (d.water !== undefined) { waterCount = d.water; localStorage.setItem('los_w_' + TODAY, String(d.water)); buildWater(); }
    if (d.tasks !== undefined) { localStorage.setItem('los_t_' + TODAY, JSON.stringify(d.tasks)); loadState(); updateProgress(); }
    _badge('synced');
  });

  if (_unsubHealth) _unsubHealth();
  _unsubHealth = _metaRef('health').onSnapshot(snap => {
    if (!snap.exists) return;
    const h = snap.data();
    if (h.weightLog)  { weightLog  = h.weightLog;  localStorage.setItem('los_weight',   JSON.stringify(h.weightLog)); }
    if (h.moodLog)    { moodLog    = h.moodLog;    localStorage.setItem('los_mood',      JSON.stringify(h.moodLog)); }
    if (h.illnessLog) { illnessLog = h.illnessLog; localStorage.setItem('los_illness',   JSON.stringify(h.illnessLog)); }
    if (h.medList)    { medList    = h.medList;    localStorage.setItem('los_meds',      JSON.stringify(h.medList)); }
    if (h.medTaken)   { medTaken   = h.medTaken;   localStorage.setItem('los_med_taken', JSON.stringify(h.medTaken)); }
    try { renderHealth(); } catch(e) {}
    _badge('synced');
  }, e => _dbg('❌ health: ' + e.message));

  if (window._unsubGoals) window._unsubGoals();
  window._unsubGoals = _metaRef('goals').onSnapshot(snap => {
    if (!snap.exists) return;
    const g = snap.data();
    if (g.goals) { userGoals = g.goals; localStorage.setItem('los_goals', JSON.stringify(g.goals)); }
    _badge('synced');
  }, e => _dbg('❌ goals: ' + e.message));

  if (window._unsubCoins) window._unsubCoins();
  window._unsubCoins = _metaRef('coins').onSnapshot(snap => {
    if (!snap.exists) return;
    const c = snap.data();
    if (c.coinBalance !== undefined) { coinBalance = c.coinBalance; localStorage.setItem('los_coins', coinBalance); }
    if (c.pendingBaht !== undefined) { pendingBaht = c.pendingBaht; localStorage.setItem('los_pending_baht', pendingBaht); }
    if (c.coinLog)    { coinLog = c.coinLog; localStorage.setItem('los_coin_log', JSON.stringify(coinLog)); }
    if (c.streakBonusGiven) { streakBonusGiven = c.streakBonusGiven; localStorage.setItem('los_streak_bonus', JSON.stringify(streakBonusGiven)); }
    try { renderCoinBadge(); renderTravelFundCard(); } catch(e) {}
    _badge('synced');
  }, e => _dbg('❌ coins: ' + e.message));

  if (_unsubMoney) _unsubMoney();
  _unsubMoney = _metaRef('money').onSnapshot(snap => {
    if (!snap.exists) return;
    const m = snap.data();
    if (m.txLog)       { financeLog          = m.txLog;       localStorage.setItem('los_finance',      JSON.stringify(m.txLog)); }
    if (m.budgetCaps)  { budgetCaps          = m.budgetCaps;  localStorage.setItem('los_budget',       JSON.stringify(m.budgetCaps)); }
    if (m.catMemory)   { catMemory           = m.catMemory;   localStorage.setItem('los_cat_memory',   JSON.stringify(m.catMemory)); }
    if (m.recurringTx) { recurringTx         = m.recurringTx; localStorage.setItem('los_recurring',    JSON.stringify(m.recurringTx)); }
    if (m.startDay)    { moneyBudgetStartDay  = m.startDay;   localStorage.setItem('los_budget_start', String(m.startDay)); }
    try { renderMoney(); } catch(e) {}
    _badge('synced');
  }, e => _dbg('❌ money: ' + e.message));
}

// ── Save helpers ──────────────────────────────────
function fbSaveTasks(done)  { if (!_fbReady) return; _dayRef().set({tasks:done},{merge:true}).then(()=>_dbg('💾 tasks')).catch(e=>_dbg('❌ '+e.message)); }
function fbSaveFood(food)   { if (!_fbReady) return; _dayRef().set({food},{merge:true}).then(()=>_dbg('💾 food')).catch(e=>_dbg('❌ '+e.message)); }
function fbSaveWater(water) { if (!_fbReady) return; _dayRef().set({water},{merge:true}).then(()=>_dbg('💾 water')).catch(e=>_dbg('❌ '+e.message)); }
function fbSaveRecent(list) { if (!_fbReady) return; _metaRef('recent').set({list},{merge:true}).catch(e=>_dbg('❌ '+e.message)); }
function fbSaveHist(hist)   { if (!_fbReady) return; _metaRef('hist').set({data:hist},{merge:true}).catch(e=>_dbg('❌ '+e.message)); }

function fbSaveHealth(data) {
  if (!_fbReady) return;
  _metaRef('health').set(data, {merge:true})
    .then(() => _dbg('💾 health'))
    .catch(e => _dbg('❌ health: ' + e.message));
}

function fbSaveMoney(data) {
  if (!_fbReady) return;
  _metaRef('money').set(data, {merge:true})
    .then(() => _dbg('💾 money'))
    .catch(e => _dbg('❌ money: ' + e.message));
}

function fbSaveGoals(goals) {
  if (!_fbReady) return;
  _metaRef('goals').set({goals}, {merge:true})
    .then(() => _dbg('💾 goals'))
    .catch(e => _dbg('❌ goals: ' + e.message));
}

function fbSaveCoins(data) {
  if (!_fbReady) return;
  _metaRef('coins').set(data, {merge:true})
    .then(() => _dbg('💾 coins'))
    .catch(e => _dbg('❌ coins: ' + e.message));
}

// ── Pull section (เรียกตอนเปิด tab) ──────────────
window._fbPullMeta = async function(section) {
  if (!_fbReady) return;
  try {
    const snap = await _metaRef(section).get();
    if (!snap.exists) return;
    const data = snap.data();
    if (section === 'health') {
      if (data.weightLog)  { weightLog  = data.weightLog;  localStorage.setItem('los_weight',   JSON.stringify(data.weightLog)); }
      if (data.moodLog)    { moodLog    = data.moodLog;    localStorage.setItem('los_mood',      JSON.stringify(data.moodLog)); }
      if (data.illnessLog) { illnessLog = data.illnessLog; localStorage.setItem('los_illness',   JSON.stringify(data.illnessLog)); }
      if (data.medList)    { medList    = data.medList;    localStorage.setItem('los_meds',      JSON.stringify(data.medList)); }
      if (data.medTaken)   { medTaken   = data.medTaken;   localStorage.setItem('los_med_taken', JSON.stringify(data.medTaken)); }
      try { renderHealth(); } catch(e) {}
    }
    if (section === 'money') {
      if (data.txLog)       { financeLog          = data.txLog;       localStorage.setItem('los_finance',      JSON.stringify(data.txLog)); }
      if (data.budgetCaps)  { budgetCaps          = data.budgetCaps;  localStorage.setItem('los_budget',       JSON.stringify(data.budgetCaps)); }
      if (data.catMemory)   { catMemory           = data.catMemory;   localStorage.setItem('los_cat_memory',   JSON.stringify(data.catMemory)); }
      if (data.recurringTx) { recurringTx         = data.recurringTx; localStorage.setItem('los_recurring',    JSON.stringify(data.recurringTx)); }
      if (data.startDay)    { moneyBudgetStartDay  = data.startDay;   localStorage.setItem('los_budget_start', String(data.startDay)); }
      try { renderMoney(); } catch(e) {}
    }
    if (section === 'goals') {
      if (data.goals) { userGoals = data.goals; localStorage.setItem('los_goals', JSON.stringify(data.goals)); }
    }
    if (section === 'coins') {
      if (data.coinBalance !== undefined) { coinBalance = data.coinBalance; localStorage.setItem('los_coins', coinBalance); }
      if (data.pendingBaht !== undefined) { pendingBaht = data.pendingBaht; localStorage.setItem('los_pending_baht', pendingBaht); }
      if (data.coinLog)    { coinLog = data.coinLog; localStorage.setItem('los_coin_log', JSON.stringify(coinLog)); }
      if (data.streakBonusGiven) { streakBonusGiven = data.streakBonusGiven; localStorage.setItem('los_streak_bonus', JSON.stringify(streakBonusGiven)); }
      try { renderCoinBadge(); renderTravelFundCard(); } catch(e) {}
    }
    _badge('synced');
  } catch(e) { _dbg('❌ pull/'+section+': '+e.message); }
};

// ── Force upload (ปุ่มใน Settings) ───────────────
window.forceUploadToCloud = async function() {
  const btn    = document.getElementById('uploadCloudBtn');
  const status = document.getElementById('uploadCloudStatus');
  if (!_fbReady) { if (status) status.textContent = '❌ ยังไม่ได้ Login'; return; }
  if (btn) { btn.disabled = true; btn.textContent = '⏳ กำลังอัปโหลด...'; }
  try {
    const localGoals = typeof userGoals !== 'undefined' ? userGoals : [];
    await Promise.all([
      _metaRef('health').set({weightLog, moodLog, illnessLog, medList, medTaken}, {merge:true}),
      _metaRef('money').set({txLog:financeLog, budgetCaps, catMemory, recurringTx, startDay:moneyBudgetStartDay}, {merge:true}),
      _metaRef('goals').set({goals:localGoals}, {merge:true}),
      _metaRef('coins').set({coinBalance, pendingBaht, coinLog, streakBonusGiven}, {merge:true}),
    ]);
    if (status) status.textContent = `✅ อัปโหลดสำเร็จ — น้ำหนัก ${weightLog.length} · เงิน ${financeLog.length} · เป้าหมาย ${localGoals.length}`;
    _badge('uploaded');
    _dbg('📤 force upload done');
  } catch(e) {
    if (status) status.textContent = '❌ ' + e.message;
    _dbg('❌ force upload: ' + e.message);
  }
  if (btn) { btn.disabled = false; btn.textContent = '☁️ อัปโหลดข้อมูลในเครื่องขึ้น Cloud'; }
};

// ── Debug ─────────────────────────────────────────
window.fbDebug = async function() {
  if (!_fbReady) { console.log('[FB] not ready'); return; }
  try {
    const [h, m, g, d] = await Promise.all([
      _metaRef('health').get(), _metaRef('money').get(),
      _metaRef('goals').get(),  _dayRef().get(),
    ]);
    console.log('[FB] uid:', _uid);
    console.log('[FB] health:', h.exists, h.exists ? 'wt:'+((h.data().weightLog||[]).length) : '');
    console.log('[FB] money:', m.exists, m.exists ? 'tx:'+((m.data().txLog||[]).length) : '');
    console.log('[FB] goals:', g.exists, g.exists ? 'n:'+((g.data().goals||[]).length) : '');
    console.log('[FB] today:', d.exists);
    console.log('[FB] local — wt:', weightLog.length, 'finance:', financeLog.length);
  } catch(e) { console.log('[FB] err:', e.message); }
};

function _dbg(msg) { console.log('[FB]', msg); }

function _badge(msg) {
  const el = document.getElementById('syncBadge');
  if (!el) return;
  el.textContent = '☁ ' + msg;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 2500);
}
