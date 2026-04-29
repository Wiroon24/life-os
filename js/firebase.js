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

let _uid = null;
let _fbReady = false;
let _unsubToday = null;

function _todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function _dayRef() { return _db.doc(`users/${_uid}/days/${_todayKey()}`); }
function _metaRef(k) { return _db.doc(`users/${_uid}/meta/${k}`); }

// ── Boot ─────────────────────────────────────────
_auth.signInAnonymously()
  .then(cred => {
    _uid = cred.user.uid;
    _fbReady = true;
    _fbPull();
    _fbListen();
  })
  .catch(e => console.warn('[FB] auth:', e));

// ── Pull on start ─────────────────────────────────
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
      const cloud = histSnap.data().data;
      localStorage.setItem('los_hist', JSON.stringify({ ...local, ...cloud }));
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

// ── Save helpers (called from app.js) ────────────
function fbSaveTasks(done) {
  if (!_fbReady) return;
  _dayRef().set({ tasks: done }, { merge: true }).catch(e => console.warn('[FB] saveTasks:', e));
}

function fbSaveFood(food) {
  if (!_fbReady) return;
  _dayRef().set({ food }, { merge: true }).catch(e => console.warn('[FB] saveFood:', e));
}

function fbSaveWater(water) {
  if (!_fbReady) return;
  _dayRef().set({ water }, { merge: true }).catch(e => console.warn('[FB] saveWater:', e));
}

function fbSaveRecent(list) {
  if (!_fbReady) return;
  _metaRef('recent').set({ list }, { merge: true }).catch(e => console.warn('[FB] saveRecent:', e));
}

function fbSaveHist(hist) {
  if (!_fbReady) return;
  _metaRef('hist').set({ data: hist }, { merge: true }).catch(e => console.warn('[FB] saveHist:', e));
}

// ── UI badge ─────────────────────────────────────
function _badge(msg) {
  const el = document.getElementById('syncBadge');
  if (!el) return;
  el.textContent = '☁ ' + msg;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 2500);
}
