const views = {
  menu:     document.getElementById('view-menu'),
  about:    document.getElementById('view-about'),
  projects: document.getElementById('view-projects'),
  contact:  document.getElementById('view-contact'),
};

const screenTitle = document.getElementById('screen-title');
const clickwheel  = document.getElementById('clickwheel');

const VIEW_TITLES = {
  menu:     'Alfred Romero',
  about:    'About',
  projects: 'Projects',
  contact:  'Contact',
};

const menuItems    = Array.from(document.querySelectorAll('#view-menu .ipod-menu-item'));
const projectItems = Array.from(document.querySelectorAll('#view-projects .ipod-menu-item'));
const contactItems = Array.from(document.querySelectorAll('#view-contact .ipod-menu-item'));
const itemsByView  = { menu: menuItems, projects: projectItems, contact: contactItems };

let currentView = 'menu';
const indexes = { menu: 0, projects: 0, contact: 0 };

// ─── Helpers ──────────────────────────────────────

function isMenuView() { return currentView in itemsByView; }
function currentItems() { return itemsByView[currentView] || []; }

function updateSelection() {
  const items = currentItems();
  const i = indexes[currentView] || 0;
  items.forEach((item, idx) => item.classList.toggle('selected', idx === i));
}

function bumpIndex(step) {
  const items = currentItems();
  if (!items.length) return false;
  const cur  = indexes[currentView] || 0;
  const next = Math.max(0, Math.min(items.length - 1, cur + step));
  if (next === cur) return false;
  indexes[currentView] = next;
  updateSelection();
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

// ─── Navigation ───────────────────────────────────

const TRANSITION_MS = 320;
function navigate(view, direction) {
  if (!views[view] || view === currentView) return;
  const prev = views[currentView];
  const target = views[view];

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

// ─── Wheel buttons ────────────────────────────────

document.getElementById('btn-menu').addEventListener('click', e => {
  e.stopPropagation();
  buzz();
  navigate('menu', 'left');
});

document.getElementById('btn-select').addEventListener('click', e => {
  e.stopPropagation();
  buzz(12);
  if (currentView === 'menu') {
    const sel = menuItems[indexes.menu];
    if (sel) navigate(sel.dataset.view, 'right');
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
  const next = (i + step + VIEW_ORDER.length) % VIEW_ORDER.length;
  navigate(VIEW_ORDER[next], step > 0 ? 'right' : 'left');
}

document.getElementById('btn-fwd').addEventListener('click', e => {
  e.stopPropagation();
  buzz();
  if (currentView === 'menu') bumpIndex(1);
  else                        cycleView(1);
});

document.getElementById('btn-bck').addEventListener('click', e => {
  e.stopPropagation();
  buzz();
  if (currentView === 'menu') bumpIndex(-1);
  else                        navigate('menu', 'left');
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

  if (isMenuView()) {
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

// ─── Init ─────────────────────────────────────────
updateSelection();
updateScrollThumb();
