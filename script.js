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

let currentView = 'menu';
let selectedIndex = 0;
const menuItems = Array.from(document.querySelectorAll('.ipod-menu-item'));

// ─── Helpers ──────────────────────────────────────

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

function navigate(view) {
  if (!views[view]) return;
  Object.values(views).forEach(v => v.classList.remove('active'));
  views[view].classList.add('active');
  currentView = view;
  screenTitle.textContent = VIEW_TITLES[view] || view;
  const el = activeScroll();
  if (el) { el.scrollTop = 0; el.addEventListener('scroll', updateScrollThumb); }
  updateScrollThumb();
}

function updateMenuSelection() {
  menuItems.forEach((item, i) => item.classList.toggle('selected', i === selectedIndex));
}

// ─── Menu clicks ──────────────────────────────────

// Screen is not touch — navigation happens via the clickwheel only.

// ─── Wheel buttons ────────────────────────────────

document.getElementById('btn-menu').addEventListener('click', e => {
  e.stopPropagation();
  navigate('menu');
});

document.getElementById('btn-select').addEventListener('click', e => {
  e.stopPropagation();
  if (currentView === 'menu') {
    const sel = menuItems[selectedIndex];
    if (sel) navigate(sel.dataset.view);
  }
});

document.getElementById('btn-fwd').addEventListener('click', e => {
  e.stopPropagation();
  if (currentView === 'menu') {
    selectedIndex = Math.min(selectedIndex + 1, menuItems.length - 1);
    updateMenuSelection();
  } else {
    scrollBy(30);
  }
});

document.getElementById('btn-bck').addEventListener('click', e => {
  e.stopPropagation();
  if (currentView === 'menu') {
    selectedIndex = Math.max(selectedIndex - 1, 0);
    updateMenuSelection();
  } else {
    scrollBy(-30);
  }
});

// ─── Clickwheel drag ──────────────────────────────

let dragging  = false;
let lastAngle = null;
let wheelAccum = 0;

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

const CENTER_RADIUS = 28; // matches 56px center hole / 2

function onWheelStart(e) {
  if (distFromCenter(e, clickwheel) <= CENTER_RADIUS) return;
  dragging  = true;
  lastAngle = getAngle(e, clickwheel);
  e.preventDefault();
}

function onWheelMove(e) {
  if (!dragging) return;
  const angle = getAngle(e, clickwheel);
  let delta = angle - lastAngle;
  if (delta >  180) delta -= 360;
  if (delta < -180) delta += 360;
  lastAngle = angle;

  if (currentView === 'menu') {
    wheelAccum += delta;
    if (Math.abs(wheelAccum) > 22) {
      if (wheelAccum > 0) selectedIndex = Math.min(selectedIndex + 1, menuItems.length - 1);
      else                selectedIndex = Math.max(selectedIndex - 1, 0);
      updateMenuSelection();
      wheelAccum = 0;
    }
  } else {
    scrollBy(delta * 1.8);
  }
  e.preventDefault();
}

function onWheelEnd() { dragging = false; lastAngle = null; wheelAccum = 0; }

clickwheel.addEventListener('mousedown',  onWheelStart, { passive: false });
clickwheel.addEventListener('touchstart', onWheelStart, { passive: false });
document.addEventListener('mousemove',    onWheelMove,  { passive: false });
document.addEventListener('touchmove',    onWheelMove,  { passive: false });
document.addEventListener('mouseup',      onWheelEnd);
document.addEventListener('touchend',     onWheelEnd);

clickwheel.addEventListener('wheel', e => {
  e.preventDefault();
  if (currentView === 'menu') {
    if (e.deltaY > 0) selectedIndex = Math.min(selectedIndex + 1, menuItems.length - 1);
    else              selectedIndex = Math.max(selectedIndex - 1, 0);
    updateMenuSelection();
  } else {
    scrollBy(e.deltaY * 0.6);
  }
}, { passive: false });

// ─── Keyboard ─────────────────────────────────────

document.addEventListener('keydown', e => {
  if (currentView === 'menu') {
    if (e.key === 'ArrowDown')  { selectedIndex = Math.min(selectedIndex + 1, menuItems.length - 1); updateMenuSelection(); }
    if (e.key === 'ArrowUp')    { selectedIndex = Math.max(selectedIndex - 1, 0); updateMenuSelection(); }
    if (e.key === 'Enter')      { const sel = menuItems[selectedIndex]; if (sel) navigate(sel.dataset.view); }
  } else {
    if (e.key === 'ArrowDown')                       scrollBy(22);
    if (e.key === 'ArrowUp')                         scrollBy(-22);
    if (e.key === 'Escape' || e.key === 'Backspace') navigate('menu');
  }
});

// ─── Init ─────────────────────────────────────────
updateScrollThumb();
