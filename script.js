const views = {
  menu:       document.getElementById('view-menu'),
  about:      document.getElementById('view-about'),
  projects:   document.getElementById('view-projects'),
  contact:    document.getElementById('view-contact'),
  coverflow:  document.getElementById('view-coverflow'),
};

const screenTitle = document.getElementById('screen-title');
const clickwheel  = document.getElementById('clickwheel');

const VIEW_TITLES = {
  menu:      'Alfred Romero',
  about:     'About',
  projects:  'Projects',
  contact:   'Contact',
  coverflow: 'Photos',
};

let currentView = 'menu';
let selectedIndex = 0;
let preRotateView = 'menu';
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
  } else if (currentView === 'coverflow') {
    rotateCoverFlow(1);
  } else {
    scrollBy(30);
  }
});

document.getElementById('btn-bck').addEventListener('click', e => {
  e.stopPropagation();
  if (currentView === 'menu') {
    selectedIndex = Math.max(selectedIndex - 1, 0);
    updateMenuSelection();
  } else if (currentView === 'coverflow') {
    rotateCoverFlow(-1);
  } else {
    scrollBy(-30);
  }
});

// ─── Cover Flow ───────────────────────────────────

const CF_ARTS = ['cf-art-1','cf-art-2','cf-art-3','cf-art-4','cf-art-5'];
let cfIndex = 0;

function rotateCoverFlow(dir) {
  cfIndex = (cfIndex + dir + CF_ARTS.length) % CF_ARTS.length;
  const centerArt  = document.querySelector('.cf-center .cf-art');
  const leftArt    = document.querySelector('.cf-side-left .cf-art');
  const rightArt   = document.querySelector('.cf-side-right .cf-art');
  const reflection = document.querySelector('.cf-reflection');

  const prev = (cfIndex - 1 + CF_ARTS.length) % CF_ARTS.length;
  const next = (cfIndex + 1) % CF_ARTS.length;

  centerArt.className  = 'cf-art ' + CF_ARTS[cfIndex];
  leftArt.className    = 'cf-art ' + CF_ARTS[prev];
  rightArt.className   = 'cf-art ' + CF_ARTS[next];
  if (reflection) reflection.className = 'cf-reflection ' + CF_ARTS[cfIndex];

  // Update dots
  document.querySelectorAll('.cf-dot').forEach((d, i) => {
    d.classList.toggle('active', i === cfIndex);
  });
}

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
  } else if (currentView === 'coverflow') {
    wheelAccum += delta;
    if (Math.abs(wheelAccum) > 30) {
      rotateCoverFlow(wheelAccum > 0 ? 1 : -1);
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
  } else if (currentView === 'coverflow') {
    rotateCoverFlow(e.deltaY > 0 ? 1 : -1);
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
  } else if (currentView === 'coverflow') {
    if (e.key === 'ArrowRight') rotateCoverFlow(1);
    if (e.key === 'ArrowLeft')  rotateCoverFlow(-1);
    if (e.key === 'Escape')     navigate(preRotateView);
  } else {
    if (e.key === 'ArrowDown')                       scrollBy(22);
    if (e.key === 'ArrowUp')                         scrollBy(-22);
    if (e.key === 'Escape' || e.key === 'Backspace') navigate('menu');
  }
});

// ─── Orientation (Cover Flow) ─────────────────────

const mql = window.matchMedia('(orientation: landscape)');

function handleOrientation(e) {
  if (e.matches) {
    if (currentView !== 'coverflow') preRotateView = currentView;
    navigate('coverflow');
  } else {
    navigate(preRotateView || 'menu');
  }
}

mql.addEventListener('change', handleOrientation);
// Check on load
if (mql.matches) navigate('coverflow');

// ─── Init ─────────────────────────────────────────
updateScrollThumb();
