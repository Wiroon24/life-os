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
const _db = firebase.firestore();
const _provider = new firebase.auth.GoogleAuthProvider();

let _uid = null;
let _fbReady = false;
let _unsubToday = null;

function _todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function _dayRef()    { return _db.doc(`users/${_uid}/days/${_todayKey()}`); }
function _metaRef(k)  { return _db.doc(`users/${_uid}/meta/${k}`); }

// ── Auth state ────────────────────────────────────
_auth.onAuthStateChanged(user => {
  if (user) {
    _uid = user.uid;
    _fbReady = true;
    _hideLoginUI();
    _fbPull();
    _fbListen();
  } else {
    _fbReady = false;
    _uid = null;
    _showLoginUI();
  }
});

function fbLogin() {
  _auth.signInWithPopup(_provider).catch(e => {
    console.warn('[FB] login:', e);
    alert('Login ไม่สำเร็จ: ' + e.message);
  });
}

// ── Login UI ─────────────────────────────────────
function _showLoginUI() {
  let el = document.getElementById('fbLoginOverlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fbLoginOverlay';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(6,6,8,0.92);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;gap:16px;';
    el.innerHTML = `
      <div style="font-size:22px;font-weight:700;letter-spacing:2px;color:#fff;">LIFE·OS</div>
      <div style="font-size:12px;color:#888;margin-bottom:8px;">เข้าสู่ระบบเพื่อ sync ข้ามอุปกรณ์</div>
      <button onclick="fbLogin()" style="display:flex;align-items:center;gap:10px;background:#fff;color:#222;border:none;border-radius:8px;padding:12px 24px;font-size:14px;font-weight:600;cursor:pointer;">
        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        Sign in with Google
      </button>`;
    document.body.appendChild(el);
  }
  el.style.display = 'flex';
}

function _hideLoginUI() {
  const el = document.getElementById('fbLoginOverlay');
  if (el) el.style.display = 'none';
}

// ── Pull on login ─────────────────────────────────
async function _fbPull() {
  try {
    const [daySnap, recentSnap, histSnap] = await Promise.all([
      _dayRef().get(),
      _metaRef('recent').get(),
      _metaRef('hist').get(),
    ]);

    let changed = false;
    if (daySnap.exists) {
      const d = daySnap.data();
      if (d.tasks !== undefined) { localStorage.setItem('los_t_' + TODAY, JSON.stringify(d.tasks)); changed = true; }
      if (d.food  !== undefined) { localStorage.setItem('los_f_' + TODAY, JSON.stringify(d.food));  foodLog = d.food; changed = true; }
      if (d.water !== undefined) { localStorage.setItem('los_w_' + TODAY, String(d.water)); waterCount = d.water; changed = true; }
    }
    if (recentSnap.exists && recentSnap.data().list) {
      localStorage.setItem('los_recent', JSON.stringify(recentSnap.data().list));
    }
    if (histSnap.exists && histSnap.data().data) {
      const local = JSON.parse(localStorage.getItem('los_hist') || '{}');
      localStorage.setItem('los_hist', JSON.stringify({ ...local, ...histSnap.data().data }));
    }

    if (changed) {
      loadState(); updateProgress();
      renderFood(); buildWater(); updateRecentList();
    }
    _badge('synced');
  } catch(e) { console.warn('[FB] pull:', e); }
}

// ── Real-time listener ────────────────────────────
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
}

// ── Save helpers ──────────────────────────────────
function fbSaveTasks(done)  { if (!_fbReady) return; _dayRef().set({tasks:done},{merge:true}).catch(e=>console.warn('[FB]',e)); }
function fbSaveFood(food)   { if (!_fbReady) return; _dayRef().set({food},{merge:true}).catch(e=>console.warn('[FB]',e)); }
function fbSaveWater(water) { if (!_fbReady) return; _dayRef().set({water},{merge:true}).catch(e=>console.warn('[FB]',e)); }
function fbSaveRecent(list) { if (!_fbReady) return; _metaRef('recent').set({list},{merge:true}).catch(e=>console.warn('[FB]',e)); }
function fbSaveHist(hist)   { if (!_fbReady) return; _metaRef('hist').set({data:hist},{merge:true}).catch(e=>console.warn('[FB]',e)); }

// ── Badge ─────────────────────────────────────────
function _badge(msg) {
  const el = document.getElementById('syncBadge');
  if (!el) return;
  el.textContent = '☁ ' + msg;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 2500);
}
