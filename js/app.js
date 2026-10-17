import * as pdfjsLib from '../lib/pdfjs/pdf.min.mjs';
import { CONFIG } from './config.js';
import { playIntro } from './intro.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../lib/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
const LIB = (p) => new URL('../lib/pdfjs/' + p, import.meta.url).href;

const $ = (s) => document.querySelector(s);
const el = {
  title: $('#title'),
  scroller: $('#scroller'),
  canvas: $('#page'),
  pleasantArticle: $('#pleasantArticle'),
  pleasantText: $('#pleasantText'),
  pleasantCard: $('#pleasantCard'),
  pleasantArtImg: $('#pleasantArtImg'),
  pleasantCaption: $('#pleasantCaption'),
  pleasantPageNum: $('#pleasantPageNum'),
  pleasantConceptTag: $('#pleasantConceptTag'),
  pageFlipper: $('#pageFlipper'),
  pageFlipCanvas: $('#pageFlipCanvas'),
  slider: $('#slider'),
  pageLabel: $('#pageLabel'),
  pct: $('#pct'),
  road: $('#road'),
  lit: $('#lit'),
  rider: $('#rider'),
  modeStatus: $('#modeStatus'),
  warm: $('#warm'),
  loading: $('#loading'),
  loadText: $('#loadText'),
  loadBar: $('#loadBar'),
  error: $('#error'),
  errorText: $('#errorText'),
  sheet: $('#sheet'),
  btnWarm: $('#btnWarm'),
  btnThemeToggle: $('#btnThemeToggle'),
  btnReaderMode: $('#btnReaderMode'),
  quickPrev: $('#quickPrev'),
  quickNext: $('#quickNext'),
  quickPageBtn: $('#quickPageBtn'),
  tapLeft: $('#tapLeft'),
  tapCenter: $('#tapCenter'),
  tapRight: $('#tapRight'),
  intro: $('#intro'),
  introCanvas: $('#introCanvas'),
  introTitle: $('#introTitle'),
};

/* =======================================================
   INDEXEDDB HELPER (SAVES ANY UPLOADED BOOK IN BROWSER)
   ======================================================= */
const idb = {
  db: null,
  async init() {
    return new Promise((resolve) => {
      const req = indexedDB.open('RockstarReaderDB', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('books')) {
          db.createObjectStore('books', { keyPath: 'id' });
        }
      };
      req.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };
      req.onerror = () => resolve(null);
    });
  },
  async saveBook(id, name, buffer) {
    if (!this.db) await this.init();
    if (!this.db) return false;
    return new Promise((resolve) => {
      const tx = this.db.transaction('books', 'readwrite');
      tx.objectStore('books').put({ id, name, buffer, updatedAt: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  },
  async getLatestBook() {
    if (!this.db) await this.init();
    if (!this.db) return null;
    return new Promise((resolve) => {
      const tx = this.db.transaction('books', 'readonly');
      const req = tx.objectStore('books').getAll();
      req.onsuccess = () => {
        const list = req.result || [];
        list.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(list[0] || null);
      };
      req.onerror = () => resolve(null);
    });
  },
};

/* ---------- Storage Helper ---------- */
const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem('rockstar.' + k);
      return v === null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem('rockstar.' + k, JSON.stringify(v));
    } catch {
      /* ignore */
    }
  },
};

let initialTheme = store.get('theme', 'fight');
if (initialTheme === 'sun') initialTheme = 'fight';
if (initialTheme === 'night') initialTheme = 'relax';

const state = {
  pdf: null,
  N: 1,
  page: 1,
  zoom: 1,
  bookId: '',
  bookName: '',
  theme: initialTheme, // 'fight' (Fiery) or 'relax' (Cold Spectral)
  warm: store.get('warm', false),
  warmLevel: store.get('warmLevel', 25),
  readerMode: store.get('readerMode', false), // true = Pleasant Reader, false = Original PDF
  font: store.get('font', 'garamond'),        // 'garamond' or 'trebuchet'
  fontSize: store.get('fontSize', 18),
  showConceptArt: store.get('showConceptArt', true),
  isFlipping: false,
};

/* =======================================================
   THEME (FIGHT MODE VS RELAX MODE) & WARM LIGHT
   ======================================================= */
function applyTheme() {
  document.body.dataset.theme = state.theme;

  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) {
    meta.content = state.theme === 'fight' ? '#090303' : '#02070c';
  }

  // Header Mode Pill
  const isFight = state.theme === 'fight';
  const fightOpt = el.btnThemeToggle.querySelector('.mode-fight');
  const relaxOpt = el.btnThemeToggle.querySelector('.mode-relax');
  if (fightOpt) fightOpt.classList.toggle('active', isFight);
  if (relaxOpt) relaxOpt.classList.toggle('active', !isFight);

  if (el.modeStatus) {
    el.modeStatus.textContent = isFight ? '⚔️ Fight Mode' : '❄️ Relax Mode';
  }

  // Settings Segmented Buttons
  document.querySelectorAll('#segTheme button').forEach((b) => {
    b.classList.toggle('on', b.dataset.v === state.theme);
  });
}

function applyWarm() {
  el.warm.style.opacity = state.warm ? String(state.warmLevel / 100) : '0';
  el.btnWarm.setAttribute('aria-pressed', String(state.warm));
  const chkWarm = $('#chkWarm');
  if (chkWarm) chkWarm.checked = state.warm;
  const rngWarm = $('#rngWarm');
  if (rngWarm) rngWarm.value = state.warmLevel;
  const warmVal = $('#warmVal');
  if (warmVal) warmVal.textContent = state.warmLevel + '%';
}

function setTheme(t) {
  state.theme = t;
  store.set('theme', t);
  applyTheme();
  if (navigator.vibrate) navigator.vibrate(15);
}

function toggleTheme() {
  setTheme(state.theme === 'fight' ? 'relax' : 'fight');
}

function setWarm(on) {
  state.warm = on;
  store.set('warm', on);
  applyWarm();
}

function applyReaderModeUI() {
  if (el.btnReaderMode) {
    el.btnReaderMode.classList.toggle('active', state.readerMode);
    el.btnReaderMode.setAttribute('aria-pressed', String(state.readerMode));
  }
  const chkPleasant = $('#chkPleasant');
  if (chkPleasant) chkPleasant.checked = state.readerMode;

  // Toggle font classes on pleasantText
  if (el.pleasantText) {
    el.pleasantText.classList.toggle('font-garamond', state.font === 'garamond');
    el.pleasantText.classList.toggle('font-trebuchet', state.font === 'trebuchet');
    document.documentElement.style.setProperty('--book-font-size', state.fontSize + 'px');
  }

  // Settings segFont buttons
  document.querySelectorAll('#segFont button').forEach((b) => {
    b.classList.toggle('on', b.dataset.f === state.font);
  });
  const fontSizeVal = $('#fontSizeVal');
  if (fontSizeVal) fontSizeVal.textContent = state.fontSize + 'px';
  const rngFontSize = $('#rngFontSize');
  if (rngFontSize) rngFontSize.value = state.fontSize;
  const chkConceptArt = $('#chkConceptArt');
  if (chkConceptArt) chkConceptArt.checked = state.showConceptArt;
}

function toggleReaderMode() {
  state.readerMode = !state.readerMode;
  store.set('readerMode', state.readerMode);
  applyReaderModeUI();
  show(state.page, 0);
  if (navigator.vibrate) navigator.vibrate(15);
}

function setFont(f) {
  state.font = f;
  store.set('font', f);
  applyReaderModeUI();
}

/* =======================================================
   CONTEXTUAL SCENE ANALYSIS (NLP KEYWORD MATCHING)
   ======================================================= */
const CONCEPTS = [
  {
    tag: 'Battle & Fire',
    caption: 'Concept Visual: The Blazing Inferno',
    img: 'assets/scenes/battle-flame.svg',
    keywords: ['fire', 'flame', 'war', 'fight', 'sword', 'blood', 'hell', 'burn', 'battle', 'rider', 'strike', 'power', 'demon', 'fury'],
  },
  {
    tag: 'Highway & Journey',
    caption: 'Concept Visual: The Endless Highway',
    img: 'assets/scenes/journey-road.svg',
    keywords: ['road', 'drive', 'highway', 'car', 'bike', 'journey', 'travel', 'path', 'mile', 'motorcycle', 'speed', 'run', 'escape', 'distance'],
  },
  {
    tag: 'Starlit Night',
    caption: 'Concept Visual: Midnight Skies & Reflections',
    img: 'assets/scenes/celestial-night.svg',
    keywords: ['night', 'moon', 'star', 'sky', 'dark', 'ice', 'cold', 'blue', 'quiet', 'water', 'sea', 'lake', 'sleep', 'shadow', 'silent', 'calm'],
  },
];

function analyzeTextForConcept(text) {
  if (!text || text.length < 30) return null;
  const lower = text.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const c of CONCEPTS) {
    let score = 0;
    for (const kw of c.keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = c;
    }
  }

  // If score is decent, return the concept, otherwise default to alternate scene
  return bestScore >= 1 ? bestMatch : null;
}

/* =======================================================
   PAGE RENDERING & REAL-LIFE 3D PAGE LIFTING
   ======================================================= */
const PAD_X = 10 + 38;
const PAD_Y = 24;
const cache = new Map();
let wanted = null;
let busy = false;

const ratio = () => Math.min(window.devicePixelRatio || 1, 2.5);

async function renderPdfPage(n) {
  const page = await state.pdf.getPage(n);
  const base = page.getViewport({ scale: 1 });
  const availW = Math.max(120, el.scroller.clientWidth - PAD_X);
  const availH = Math.max(120, el.scroller.clientHeight - PAD_Y);
  const fit = Math.min(availW / base.width, availH / base.height);
  const cssScale = fit * state.zoom;
  const r = ratio();
  const key = `${state.bookId}|${n}|${cssScale.toFixed(3)}|${r}`;

  if (cache.has(key)) {
    const v = cache.get(key);
    cache.delete(key);
    cache.set(key, v);
    return v;
  }

  let outScale = cssScale * r;
  let vp = page.getViewport({ scale: outScale });
  const MAXPX = 16e6;
  if (vp.width * vp.height > MAXPX) {
    outScale *= Math.sqrt(MAXPX / (vp.width * vp.height));
    vp = page.getViewport({ scale: outScale });
  }

  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.floor(vp.width));
  c.height = Math.max(1, Math.floor(vp.height));
  const ctx = c.getContext('2d');
  await page.render({ canvasContext: ctx, canvas: c, viewport: vp }).promise;

  // Extract page text for Pleasant Reader Mode
  let text = '';
  try {
    const textContent = await page.getTextContent();
    text = textContent.items.map((i) => i.str).join(' ');
  } catch (e) {
    /* ignore text extract errors */
  }
  page.cleanup();

  const out = {
    canvas: c,
    cssW: base.width * cssScale,
    cssH: base.height * cssScale,
    text: text.trim(),
  };
  cache.set(key, out);
  while (cache.size > 8) cache.delete(cache.keys().next().value);
  return out;
}

function animate3DPageTurn(dir, prevCanvas, out) {
  if (!dir || !el.pageFlipper || !el.pageFlipCanvas || state.zoom > 1) return;

  const flipper = el.pageFlipper;
  const fcv = el.pageFlipCanvas;

  fcv.width = prevCanvas.width;
  fcv.height = prevCanvas.height;
  fcv.style.width = prevCanvas.style.width;
  fcv.style.height = prevCanvas.style.height;
  const fctx = fcv.getContext('2d');
  fctx.clearRect(0, 0, fcv.width, fcv.height);
  fctx.drawImage(prevCanvas, 0, 0);

  flipper.style.width = (state.readerMode ? el.pleasantArticle.offsetWidth : out.cssW) + 'px';
  flipper.style.height = (state.readerMode ? el.pleasantArticle.offsetHeight : out.cssH) + 'px';

  flipper.classList.remove('flip-next', 'flip-prev');
  void flipper.offsetWidth;

  flipper.classList.add(dir > 0 ? 'flip-next' : 'flip-prev');
  flipper.style.opacity = '1';

  if (navigator.vibrate) navigator.vibrate(18);

  setTimeout(() => {
    flipper.classList.remove('flip-next', 'flip-prev');
    flipper.style.opacity = '0';
  }, 440);
}

async function draw(n, dir) {
  try {
    const cv = el.canvas;
    const hadContent = cv.width > 0 && cv.height > 0;

    let snapshotCanvas = null;
    if (dir && hadContent && state.zoom === 1 && !state.readerMode) {
      snapshotCanvas = document.createElement('canvas');
      snapshotCanvas.width = cv.width;
      snapshotCanvas.height = cv.height;
      snapshotCanvas.style.width = cv.style.width;
      snapshotCanvas.style.height = cv.style.height;
      snapshotCanvas.getContext('2d').drawImage(cv, 0, 0);
    }

    const out = await renderPdfPage(n);

    if (state.readerMode && out.text && out.text.length > 30) {
      // 1. PLEASANT READER MODE
      el.canvas.hidden = true;
      el.pleasantArticle.hidden = false;

      el.pleasantPageNum.textContent = `Page ${n} of ${state.N}`;

      // Alternate page contextual art detection
      const concept = analyzeTextForConcept(out.text);
      const isAltPage = n % 2 === 0;

      if (state.showConceptArt && (concept || isAltPage)) {
        const activeConcept = concept || CONCEPTS[n % CONCEPTS.length];
        el.pleasantCard.hidden = false;
        el.pleasantArtImg.src = activeConcept.img;
        el.pleasantCaption.textContent = activeConcept.caption;
        el.pleasantConceptTag.textContent = activeConcept.tag;
        el.pleasantConceptTag.hidden = false;
      } else {
        el.pleasantCard.hidden = true;
        el.pleasantConceptTag.hidden = true;
      }

      // Format text paragraphs
      const paragraphs = out.text
        .split(/(?:\r?\n){2,}|(?<=[.!?])\s+(?=[A-Z])/)
        .map((p) => p.trim())
        .filter((p) => p.length > 5);

      if (paragraphs.length > 0) {
        el.pleasantText.innerHTML = paragraphs.map((p) => `<p>${p}</p>`).join('');
      } else {
        el.pleasantText.innerHTML = `<p>${out.text}</p>`;
      }
    } else {
      // 2. ORIGINAL PDF VIEW (Keeps pristine natural images & colors)
      el.canvas.hidden = false;
      el.pleasantArticle.hidden = true;

      cv.width = out.canvas.width;
      cv.height = out.canvas.height;
      cv.getContext('2d').drawImage(out.canvas, 0, 0);
      cv.style.width = out.cssW + 'px';
      cv.style.height = out.cssH + 'px';

      if (snapshotCanvas && dir) {
        animate3DPageTurn(dir, snapshotCanvas, out);
      }
    }

    el.scroller.scrollTop = 0;
    if (state.zoom === 1) el.scroller.scrollLeft = 0;

    if (n < state.N) {
      setTimeout(() => {
        if (!busy && state.page === n) renderPdfPage(n + 1).catch(() => {});
      }, 350);
    }
  } catch (err) {
    console.error('Render failed', err);
  }
}

function show(n, dir) {
  wanted = { n, dir };
  if (busy) return;
  busy = true;
  (async () => {
    while (wanted) {
      const w = wanted;
      wanted = null;
      await draw(w.n, w.dir);
    }
    busy = false;
  })();
}

function goTo(n, { instant = false } = {}) {
  n = Math.max(1, Math.min(state.N, Math.round(n)));
  const dir = n === state.page ? 0 : n > state.page ? 1 : -1;
  state.page = n;
  updateUI(instant);
  show(n, instant ? 0 : dir);
  store.set('page.' + state.bookId, n);
}

const next = () => {
  if (state.page < state.N) goTo(state.page + 1);
};
const prev = () => {
  if (state.page > 1) goTo(state.page - 1);
};

function setZoom(z) {
  z = Math.max(1, Math.min(3, Math.round(z * 4) / 4));
  if (z === state.zoom) return;
  state.zoom = z;
  show(state.page, 0);
}

/* =======================================================
   PROGRESS, SLIDER & ROAD TRACKER
   ======================================================= */
const slider = el.slider;
const thumb = slider.querySelector('.thumb');
const fillEl = slider.querySelector('.fill');
const bubble = slider.querySelector('.bubble');
const THUMB_H = 32;

function progress() {
  return state.N > 1 ? (state.page - 1) / (state.N - 1) : 1;
}

function updateUI(instant) {
  const p = progress();

  const trackH = slider.clientHeight;
  const y = p * Math.max(0, trackH - THUMB_H);
  thumb.style.top = y + 'px';
  bubble.style.top = Math.max(0, y - 4) + 'px';
  fillEl.style.height = y + THUMB_H / 2 + 'px';
  bubble.textContent = state.page;
  slider.setAttribute('aria-valuenow', state.page);
  slider.setAttribute('aria-valuemax', state.N);

  const roadW = el.road.clientWidth;
  const riderW = el.rider.offsetWidth;
  const left = p * Math.max(0, roadW - riderW);
  el.rider.style.left = left + 'px';
  el.lit.style.width = Math.min(roadW, left + riderW * 0.6) + 'px';

  const pageStr = `Page ${state.page} / ${state.N}`;
  el.pageLabel.textContent = pageStr;
  if (el.quickPageBtn) el.quickPageBtn.textContent = `P. ${state.page} / ${state.N}`;
  el.pct.textContent = Math.round(p * 100) + '%';
}

function pageFromY(clientY) {
  const r = slider.getBoundingClientRect();
  const f = (clientY - r.top - THUMB_H / 2) / Math.max(1, r.height - THUMB_H);
  return 1 + Math.round(Math.max(0, Math.min(1, f)) * (state.N - 1));
}

function pageFromX(clientX) {
  const r = el.road.getBoundingClientRect();
  const rw = el.rider.offsetWidth;
  const f = (clientX - r.left - rw / 2) / Math.max(1, r.width - rw);
  return 1 + Math.round(Math.max(0, Math.min(1, f)) * (state.N - 1));
}

function dragger(target, toPage, cls) {
  let active = false;
  target.addEventListener('pointerdown', (e) => {
    active = true;
    target.setPointerCapture(e.pointerId);
    document.body.classList.add('dragging');
    if (cls) target.classList.add(cls);
    goTo(toPage(e), { instant: true });
    e.preventDefault();
  });
  target.addEventListener('pointermove', (e) => {
    if (active) goTo(toPage(e), { instant: true });
  });
  const end = () => {
    active = false;
    document.body.classList.remove('dragging');
    if (cls) target.classList.remove(cls);
  };
  target.addEventListener('pointerup', end);
  target.addEventListener('pointercancel', end);
}
dragger(slider, (e) => pageFromY(e.clientY), 'drag');
dragger(el.road, (e) => pageFromX(e.clientX));

slider.addEventListener('keydown', (e) => {
  const k = e.key;
  if (k === 'ArrowDown' || k === 'ArrowRight') {
    next();
    e.preventDefault();
  } else if (k === 'ArrowUp' || k === 'ArrowLeft') {
    prev();
    e.preventDefault();
  } else if (k === 'Home') {
    goTo(1);
    e.preventDefault();
  } else if (k === 'End') {
    goTo(state.N);
    e.preventDefault();
  }
});

function promptPage() {
  const v = window.prompt(`Go to page (1 – ${state.N})`, String(state.page));
  const n = parseInt(v, 10);
  if (!Number.isNaN(n)) goTo(n);
}
el.pageLabel.addEventListener('click', promptPage);
if (el.quickPageBtn) el.quickPageBtn.addEventListener('click', promptPage);

/* =======================================================
   IMMERSION TAP ZONES (UNDISTURBED READING)
   ======================================================= */
if (el.quickPrev) el.quickPrev.addEventListener('click', prev);
if (el.quickNext) el.quickNext.addEventListener('click', next);
if (el.tapLeft) el.tapLeft.addEventListener('click', prev);
if (el.tapRight) el.tapRight.addEventListener('click', next);

// Tapping center toggles controls visibility so reading is undisturbed
if (el.tapCenter) {
  el.tapCenter.addEventListener('click', () => {
    document.body.classList.toggle('reading-focus');
    if (navigator.vibrate) navigator.vibrate(12);
  });
}

let sx = 0, sy = 0, st = 0, tracking = false;
el.scroller.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  tracking = true;
  sx = e.clientX;
  sy = e.clientY;
  st = performance.now();
});

el.scroller.addEventListener('pointerup', (e) => {
  if (!tracking) return;
  tracking = false;
  if (state.zoom > 1) return;

  const dx = e.clientX - sx;
  const dy = e.clientY - sy;
  const dt = performance.now() - st;

  if (Math.abs(dx) > 50 && Math.abs(dy) < 80 && dt < 650) {
    if (dx < 0) next();
    else prev();
    return;
  }
});

el.scroller.addEventListener('pointercancel', () => {
  tracking = false;
});

window.addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('input,textarea')) return;
  if (!state.pdf || !el.sheet.hidden) return;
  switch (e.key) {
    case 'ArrowRight':
    case 'PageDown':
    case ' ':
      next();
      e.preventDefault();
      break;
    case 'ArrowLeft':
    case 'PageUp':
      prev();
      e.preventDefault();
      break;
    case 'Home':
      goTo(1);
      break;
    case 'End':
      goTo(state.N);
      break;
    case '+':
    case '=':
      setZoom(state.zoom + 0.25);
      break;
    case '-':
      setZoom(state.zoom - 0.25);
      break;
  }
});

let rz;
window.addEventListener('resize', () => {
  clearTimeout(rz);
  rz = setTimeout(() => {
    if (state.pdf) {
      updateUI();
      show(state.page, 0);
    }
  }, 120);
});

/* =======================================================
   BOOK LOADING & DIRECT DEVICE UPLOAD
   ======================================================= */
async function fetchBook(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const total = +res.headers.get('content-length') || 0;
  if (!res.body || !total) return new Uint8Array(await res.arrayBuffer());

  const reader = res.body.getReader();
  const chunks = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    el.loadBar.style.width = Math.min(100, (got / total) * 100) + '%';
    el.loadText.textContent = `Summoning book… ${Math.round(Math.min(1, got / total) * 100)}%`;
  }
  const out = new Uint8Array(got);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

async function openData(data, id, bookName = 'Book') {
  el.loading.hidden = false;
  el.error.hidden = true;
  el.loadText.textContent = `Opening ${bookName}…`;
  try {
    if (state.pdf) {
      try {
        state.pdf.destroy();
      } catch {
        /* ignore */
      }
    }
    cache.clear();
    const task = pdfjsLib.getDocument({
      data,
      cMapUrl: LIB('cmaps/'),
      cMapPacked: true,
      standardFontDataUrl: LIB('standard_fonts/'),
      wasmUrl: LIB('wasm/'),
    });
    state.pdf = await task.promise;
    state.N = state.pdf.numPages;
    state.bookId = id + '|' + state.N;
    state.bookName = bookName;
    state.zoom = 1;

    const saved = store.get('page.' + state.bookId, 1);
    state.page = Math.min(state.N, Math.max(1, saved));
    el.loading.hidden = true;

    // Automatically enter reading focus mode when a book opens
    document.body.classList.add('reading-focus');

    updateUI(true);
    show(state.page, 0);
  } catch (err) {
    console.error(err);
    showError('This file could not be opened as a book.');
  }
}

function showError(msg) {
  el.loading.hidden = true;
  el.error.hidden = false;
  el.errorText.textContent = msg;
}

async function handleBookUpload(file) {
  if (!file) return;
  closeSheet();
  el.loading.hidden = false;
  el.loadText.textContent = `Reading ${file.name}…`;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const id = 'custom:' + file.name + ':' + file.size;

    // Store in browser IndexedDB so it's remembered on next visit
    await idb.saveBook(id, file.name, arrayBuffer);

    await openData(uint8, id, file.name.replace(/\.[^/.]+$/, ''));
  } catch (err) {
    console.error('Upload failed', err);
    showError(`Could not read "${file.name}". Please ensure it is a valid PDF.`);
  }
}

async function loadInitialBook() {
  el.loading.hidden = false;
  el.loadBar.style.width = '0';

  // 1. First check if user previously uploaded a book to browser IndexedDB
  try {
    const savedBook = await idb.getLatestBook();
    if (savedBook && savedBook.buffer) {
      const uint8 = new Uint8Array(savedBook.buffer);
      await openData(uint8, savedBook.id, savedBook.name.replace(/\.[^/.]+$/, ''));
      return;
    }
  } catch (e) {
    /* fallback to default */
  }

  // 2. Otherwise load configured book (assets/book.pdf)
  try {
    const data = await fetchBook(CONFIG.bookUrl);
    await openData(data, CONFIG.bookUrl, 'Sample Book');
  } catch (err) {
    console.error(err);
    showError(`No book loaded yet. Upload any PDF book using the upload button.`);
  }
}

/* =======================================================
   SETTINGS & CONTROLS BINDINGS
   ======================================================= */
function openSheet() { el.sheet.hidden = false; }
function closeSheet() { el.sheet.hidden = true; }

$('#btnSettings').addEventListener('click', openSheet);
$('#btnClose').addEventListener('click', closeSheet);
$('#sheetBack').addEventListener('click', closeSheet);

el.btnThemeToggle.addEventListener('click', toggleTheme);
if (el.btnReaderMode) el.btnReaderMode.addEventListener('click', toggleReaderMode);
el.btnWarm.addEventListener('click', () => setWarm(!state.warm));

// Direct Upload Buttons
const fileDirect = $('#fileDirect');
if (fileDirect) fileDirect.addEventListener('change', (e) => handleBookUpload(e.target.files[0]));
const fileSet = $('#fileSet');
if (fileSet) fileSet.addEventListener('change', (e) => handleBookUpload(e.target.files[0]));
const fileErr = $('#fileErr');
if (fileErr) fileErr.addEventListener('change', (e) => handleBookUpload(e.target.files[0]));

// Pleasant Reader Settings
const chkPleasant = $('#chkPleasant');
if (chkPleasant) chkPleasant.addEventListener('change', (e) => {
  state.readerMode = e.target.checked;
  store.set('readerMode', state.readerMode);
  applyReaderModeUI();
  show(state.page, 0);
});

document.querySelectorAll('#segFont button').forEach((b) => {
  b.addEventListener('click', () => setFont(b.dataset.f));
});

const rngFontSize = $('#rngFontSize');
if (rngFontSize) rngFontSize.addEventListener('input', (e) => {
  state.fontSize = +e.target.value;
  store.set('fontSize', state.fontSize);
  applyReaderModeUI();
});

const chkConceptArt = $('#chkConceptArt');
if (chkConceptArt) chkConceptArt.addEventListener('change', (e) => {
  state.showConceptArt = e.target.checked;
  store.set('showConceptArt', state.showConceptArt);
  show(state.page, 0);
});

document.querySelectorAll('#segTheme button').forEach((b) => {
  b.addEventListener('click', () => setTheme(b.dataset.v));
});

$('#chkWarm').addEventListener('change', (e) => setWarm(e.target.checked));
$('#rngWarm').addEventListener('input', (e) => {
  state.warmLevel = +e.target.value;
  store.set('warmLevel', state.warmLevel);
  if (!state.warm) setWarm(true);
  else applyWarm();
});

$('#btnToggleShell').addEventListener('click', () => {
  document.body.classList.toggle('fullscreen-mode');
});

$('#btnReplay').addEventListener('click', () => {
  closeSheet();
  runIntro();
});

/* =======================================================
   CINEMATIC INTRO RUNNER
   ======================================================= */
let intro = null;
function runIntro() {
  if (intro) intro.skip();
  el.rider.classList.remove('arrive');
  el.rider.style.left = '-100px';

  intro = playIntro({
    root: el.intro,
    canvas: el.introCanvas,
    titleEl: el.introTitle,
    title: CONFIG.title || 'ROCKSTAR',
    theme: state.theme,
    onDone: () => {
      el.rider.classList.add('arrive');
      requestAnimationFrame(() => updateUI());
      setTimeout(() => el.rider.classList.remove('arrive'), 1800);
    },
  });
}
$('#skip').addEventListener('click', () => intro && intro.skip());

/* =======================================================
   INITIALIZATION
   ======================================================= */
el.title.textContent = CONFIG.title || 'ROCKSTAR';
document.title = (CONFIG.title || 'ROCKSTAR') + ' - Ghost Rider Reader';
applyTheme();
applyWarm();
applyReaderModeUI();
updateUI(true);

const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (CONFIG.playIntro && !reduceMotion) {
  runIntro();
}
loadInitialBook();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
