const views = {
  menu:     document.getElementById('view-menu'),
  about:    document.getElementById('view-about'),
  projects: document.getElementById('view-projects'),
  contact:  document.getElementById('view-contact'),
  settings: document.getElementById('view-settings'),
  colors:   document.getElementById('view-colors'),
  games:    document.getElementById('view-games'),
  brick:    document.getElementById('view-brick'),
};

const screenTitle = document.getElementById('screen-title');
const clickwheel  = document.getElementById('clickwheel');

const VIEW_TITLES = {
  menu:     'Alfred Romero',
  about:    'About',
  projects: 'Projects',
  contact:  'Contact',
  settings: 'Settings',
  colors:   'Colors',
  games:    'Games',
  brick:    'Brick',
};

const PARENT = {
  about: 'menu',
  projects: 'menu',
  contact: 'menu',
  settings: 'menu',
  colors: 'settings',
  games: 'menu',
  brick: 'games',
};

const menuItems     = Array.from(document.querySelectorAll('#view-menu .ipod-menu-item'));
const projectItems  = Array.from(document.querySelectorAll('#view-projects .ipod-menu-item'));
const contactItems  = Array.from(document.querySelectorAll('#view-contact .ipod-menu-item'));
const settingsItems = Array.from(document.querySelectorAll('#view-settings .ipod-menu-item'));
const colorItems    = Array.from(document.querySelectorAll('#view-colors .ipod-menu-item'));
const gamesItems    = Array.from(document.querySelectorAll('#view-games .ipod-menu-item'));
const itemsByView   = { menu: menuItems, projects: projectItems, contact: contactItems, settings: settingsItems, colors: colorItems, games: gamesItems };

let currentView = 'menu';
const indexes = { menu: 0, projects: 0, contact: 0, settings: 0, colors: 0, games: 0 };

// Restore saved theme + sync colors selection
const savedTheme = localStorage.getItem('ipod-theme');
if (savedTheme) document.body.dataset.theme = savedTheme;
const initialColor = savedTheme || 'purple';
const initialColorIdx = colorItems.findIndex(it => it.dataset.color === initialColor);
if (initialColorIdx >= 0) indexes.colors = initialColorIdx;

// ─── Helpers ──────────────────────────────────────

function isMenuView() { return currentView in itemsByView; }
function currentItems() { return itemsByView[currentView] || []; }

function updateSelection() {
  const items = currentItems();
  const i = indexes[currentView] || 0;
  items.forEach((item, idx) => item.classList.toggle('selected', idx === i));
  const sel = items[i];
  const scroller = activeScroll();
  if (sel && scroller) {
    const sTop = sel.offsetTop;
    const sBot = sTop + sel.offsetHeight;
    const vTop = scroller.scrollTop;
    const vBot = vTop + scroller.clientHeight;
    if (sBot > vBot)      scroller.scrollTop = sBot - scroller.clientHeight;
    else if (sTop < vTop) scroller.scrollTop = sTop;
    updateScrollThumb();
  }
}

function bumpIndex(step) {
  const items = currentItems();
  if (!items.length) return false;
  const cur  = indexes[currentView] || 0;
  const next = Math.max(0, Math.min(items.length - 1, cur + step));
  if (next === cur) return false;
  indexes[currentView] = next;
  updateSelection();
  tick();
  return true;
}

function activeScroll() {
  const v = views[currentView];
  return v ? v.querySelector('.scroll-content') : null;
}

function activeThumb() {
  const v = views[currentView];
  return v ? v.querySelector('.scroll-thumb') : null;
}

function updateScrollThumb() {
  const el    = activeScroll();
  const thumb = activeThumb();
  if (!el || !thumb) return;
  const { scrollTop, scrollHeight, clientHeight } = el;
  const track  = thumb.parentElement;
  const trackH = track ? track.clientHeight : 130;
  const thumbH = Math.max(14, (clientHeight / scrollHeight) * trackH);
  const maxScr = scrollHeight - clientHeight;
  thumb.style.height = thumbH + 'px';
  thumb.style.top    = maxScr > 0 ? (scrollTop / maxScr) * (trackH - thumbH) + 'px' : '0px';
}

function scrollBy(delta) {
  const el = activeScroll();
  if (!el) return;
  el.scrollTop += delta;
  updateScrollThumb();
}

// ─── Theme conveyor ───────────────────────────────
// Conveyor-belt animation: pull back, slide current iPod off-screen, slide
// each color in the list between current and target across the stage, park
// the final one at center, and push it forward. Direction follows list order
// (forward through list → belt moves rightward; backward → leftward).
let spinning = false;
const COLOR_ORDER = ['red','orange','yellow','green','blue','pink','purple','silver','black'];
const wait = ms => new Promise(r => setTimeout(r, ms));

function applyTheme(color) {
  if (color === 'purple') {
    delete document.body.dataset.theme;
    localStorage.removeItem('ipod-theme');
  } else {
    document.body.dataset.theme = color;
    localStorage.setItem('ipod-theme', color);
  }
}

// Belt physical layout: red leftmost, black rightmost. Going forward through
// the list (e.g. red → black) scrolls the camera rightward, so iPods on stage
// move leftward and exit on the left. Going backward reverses both.
async function conveyorToTheme(target) {
  const el = document.getElementById('ipod-3d');
  if (!el || spinning) return;
  const current = document.body.dataset.theme || 'purple';
  const ci = COLOR_ORDER.indexOf(current);
  const ti = COLOR_ORDER.indexOf(target);
  if (ci < 0 || ti < 0 || ci === ti) return;

  spinning = true;
  el.classList.add('conveyor');

  const N      = Math.abs(ti - ci);
  const dir    = Math.sign(ti - ci);  // +1 forward in list, -1 backward
  const xSign  = -dir;                // forward → iPods exit left (negative x)
  // Lane wider than the viewport so the iPod fully exits before the color swap
  // (iPod is ~200px wide; +200 buffer guarantees offscreen on desktop and mobile).
  const lane   = Math.max(window.innerWidth, 320) + 400;
  const Z      = -50;
  // One continuous ease-in-out across the whole traversal so motion feels fluid.
  const beltMs = Math.round(620 + N * 95);
  const ease   = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  // Pull back into the stage.
  el.style.transition = 'transform 200ms ease-in';
  el.style.transform  = `translate3d(0, 0, ${Z}px)`;
  await wait(210);
  el.style.transition = 'none';

  await new Promise(resolve => {
    const start = performance.now();
    let applied = 0;
    function frame(now) {
      const t = Math.min(1, (now - start) / beltMs);
      const d = ease(t) * N * lane;
      // Snap to the lane whose center is currently nearest the iPod's onscreen
      // position; swap the theme each time we cross into a new lane.
      const laneIdx = Math.min(N, Math.floor(d / lane + 0.5));
      while (applied < laneIdx) {
        applied++;
        applyTheme(COLOR_ORDER[ci + dir * applied]);
      }
      const x = (d - laneIdx * lane) * xSign;
      el.style.transform = `translate3d(${x}px, 0, ${Z}px)`;
      if (t < 1) requestAnimationFrame(frame);
      else {
        while (applied < N) {
          applied++;
          applyTheme(COLOR_ORDER[ci + dir * applied]);
        }
        el.style.transform = `translate3d(0, 0, ${Z}px)`;
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });

  // Push forward to resting depth.
  el.style.transition = 'transform 220ms ease-out';
  el.style.transform  = 'translate3d(0, 0, 0)';
  await wait(230);

  el.style.transition = '';
  el.style.transform  = '';
  el.classList.remove('conveyor');
  spinning = false;
}

// ─── Navigation ───────────────────────────────────

const TRANSITION_MS = 320;
function navigate(view, direction) {
  if (!views[view] || view === currentView) return;
  const prev = views[currentView];
  const target = views[view];

  if (currentView === 'brick' && window.Brick) Brick.stop();
  if (view === 'brick' && window.Brick) Brick.start(document.getElementById('brick-canvas'));

  Object.values(views).forEach(v => {
    if (v !== prev) v.classList.remove('active', 'exiting', 'from-right', 'from-left', 'to-right', 'to-left');
  });

  if (prev && direction) {
    prev.classList.remove('active', 'from-right', 'from-left');
    prev.classList.add('exiting', direction === 'right' ? 'to-left' : 'to-right');
    setTimeout(() => prev.classList.remove('exiting', 'to-left', 'to-right'), TRANSITION_MS);
  } else if (prev) {
    prev.classList.remove('active', 'from-right', 'from-left');
  }

  target.classList.add('active');
  if (direction === 'right') target.classList.add('from-right');
  else if (direction === 'left') target.classList.add('from-left');

  currentView = view;
  screenTitle.textContent = VIEW_TITLES[view] || view;
  const el = activeScroll();
  if (el) { el.scrollTop = 0; el.addEventListener('scroll', updateScrollThumb); }
  updateSelection();
  updateScrollThumb();
}

// ─── Haptics ──────────────────────────────────────
// Android: navigator.vibrate. iOS: trigger via synthetic <label> click,
// which Safari treats as a user gesture on a switch and fires the taptic engine.
const isCoarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

function iosHapticTick() {
  try {
    const label = document.createElement('label');
    label.ariaHidden = 'true';
    label.style.cssText = 'position:absolute;left:-9999px;width:0;height:0;pointer-events:none;';
    label.htmlFor = 'haptic-switch';
    document.body.appendChild(label);
    label.click();
    document.body.removeChild(label);
  } catch {}
}

function buzz(ms = 8) {
  if (navigator.vibrate) { navigator.vibrate(ms); return; }
  if (isCoarsePointer) iosHapticTick();
}

// Click-wheel tick — piezo-style 4kHz square-wave burst, ~5ms, matching the
// original iPod's internal speaker (~10–30 cycles of 4kHz per click).
let audioCtx;
function tick() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 4000;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.10, t + 0.0008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.005);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.006);
  } catch {}
}

// ─── Wheel buttons ────────────────────────────────

document.getElementById('btn-menu').addEventListener('click', e => {
  e.stopPropagation();
  buzz();
  navigate('menu', 'left');
});

document.getElementById('btn-select').addEventListener('click', e => {
  e.stopPropagation();
  buzz(12);
  tick();
  if (currentView === 'menu' || currentView === 'settings' || currentView === 'games') {
    const sel = currentItems()[indexes[currentView]];
    if (sel && sel.dataset.view) navigate(sel.dataset.view, 'right');
  } else if (currentView === 'brick') {
    if (window.Brick) Brick.launch();
  } else if (currentView === 'colors') {
    const sel = colorItems[indexes.colors];
    if (sel && sel.dataset.color) conveyorToTheme(sel.dataset.color);
  } else if (currentView === 'contact') {
    const sel = contactItems[indexes.contact];
    if (sel && sel.dataset.href) {
      const a = document.createElement('a');
      a.href = sel.dataset.href;
      if (sel.dataset.target) {
        a.target = sel.dataset.target;
        a.rel = 'noopener noreferrer';
      }
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }
});

const VIEW_ORDER = ['about', 'projects', 'contact'];

function cycleView(step) {
  const i = VIEW_ORDER.indexOf(currentView);
  if (i === -1) return;
  const next = i + step;
  if (next < 0 || next >= VIEW_ORDER.length) {
    navigate('menu', 'left');
  } else {
    navigate(VIEW_ORDER[next], step > 0 ? 'right' : 'left');
  }
}

document.getElementById('btn-fwd').addEventListener('click', e => {
  e.stopPropagation();
  buzz();
  if (isMenuView()) bumpIndex(1);
  else              cycleView(1);
});

document.getElementById('btn-bck').addEventListener('click', e => {
  e.stopPropagation();
  buzz();
  if (currentView === 'menu') bumpIndex(-1);
  else                        navigate(PARENT[currentView] || 'menu', 'left');
});

// ─── Clickwheel drag ──────────────────────────────

let dragging  = false;
let lastAngle = null;
let wheelAccum = 0;
let dragMoved = false;
const DRAG_THRESHOLD = 4; // degrees of cumulative angular movement before we treat as drag

function getAngle(e, el) {
  const r = el.getBoundingClientRect();
  const x = (e.touches ? e.touches[0].clientX : e.clientX) - (r.left + r.width  / 2);
  const y = (e.touches ? e.touches[0].clientY : e.clientY) - (r.top  + r.height / 2);
  return Math.atan2(y, x) * (180 / Math.PI);
}

function distFromCenter(e, el) {
  const r = el.getBoundingClientRect();
  const x = (e.touches ? e.touches[0].clientX : e.clientX) - (r.left + r.width  / 2);
  const y = (e.touches ? e.touches[0].clientY : e.clientY) - (r.top  + r.height / 2);
  return Math.sqrt(x * x + y * y);
}

const CENTER_RADIUS = 28;

function onWheelStart(e) {
  if (distFromCenter(e, clickwheel) <= CENTER_RADIUS) return;
  dragging  = true;
  dragMoved = false;
  lastAngle = getAngle(e, clickwheel);
}

function onWheelMove(e) {
  if (!dragging) return;
  const angle = getAngle(e, clickwheel);
  let delta = angle - lastAngle;
  if (delta >  180) delta -= 360;
  if (delta < -180) delta += 360;
  lastAngle = angle;
  if (!dragMoved) {
    wheelAccum += delta;
    if (Math.abs(wheelAccum) < DRAG_THRESHOLD) return;
    dragMoved = true;
    wheelAccum = 0;
  }
  if (e.cancelable) e.preventDefault();

  if (currentView === 'brick') {
    if (window.Brick) Brick.movePaddle(delta * 1.4);
  } else if (isMenuView()) {
    wheelAccum += delta;
    if (Math.abs(wheelAccum) > 22) {
      if (bumpIndex(wheelAccum > 0 ? 1 : -1)) buzz(5);
      wheelAccum = 0;
    }
  } else {
    scrollBy(delta * 1.8);
  }
}

function onWheelEnd() { dragging = false; lastAngle = null; wheelAccum = 0; dragMoved = false; }

clickwheel.addEventListener('mousedown',  onWheelStart, { passive: false });
clickwheel.addEventListener('touchstart', onWheelStart, { passive: false });
document.addEventListener('mousemove',    onWheelMove,  { passive: false });
document.addEventListener('touchmove',    onWheelMove,  { passive: false });
document.addEventListener('mouseup',      onWheelEnd);
document.addEventListener('touchend',     onWheelEnd);

clickwheel.addEventListener('wheel', e => {
  e.preventDefault();
  if (isMenuView()) bumpIndex(e.deltaY > 0 ? 1 : -1);
  else              scrollBy(e.deltaY * 0.6);
}, { passive: false });

// ─── Keyboard ─────────────────────────────────────

document.addEventListener('keydown', e => {
  if (currentView === 'brick') {
    if (e.key === 'ArrowLeft')  { Brick.movePaddle(-8); return; }
    if (e.key === 'ArrowRight') { Brick.movePaddle(8);  return; }
    if (e.key === 'Enter' || e.key === ' ') { Brick.launch(); return; }
    if (e.key === 'Escape' || e.key === 'Backspace') navigate('games', 'left');
    return;
  }
  if (isMenuView()) {
    if (e.key === 'ArrowDown')  bumpIndex(1);
    if (e.key === 'ArrowUp')    bumpIndex(-1);
    if (e.key === 'Enter' && currentView === 'menu') {
      const sel = menuItems[indexes.menu];
      if (sel) navigate(sel.dataset.view, 'right');
    }
  } else {
    if (e.key === 'ArrowDown')                       scrollBy(22);
    if (e.key === 'ArrowUp')                         scrollBy(-22);
  }
  if (e.key === 'Escape' || e.key === 'Backspace') navigate('menu', 'left');
});

// Prime AudioContext on first user gesture so the very first tick is audible.
function primeAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch {}
}
['pointerdown', 'touchstart', 'keydown', 'wheel'].forEach(ev => {
  document.addEventListener(ev, primeAudio, { once: true, passive: true, capture: true });
});

// ─── Init ─────────────────────────────────────────
updateSelection();
updateScrollThumb();
