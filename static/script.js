/* script.js
 - realistic flag waving (canvas slice displacement)
 - confetti, invite, audio, JAI text
*/

// ---------- FLAG WAVE SETUP ----------
const flagCanvas = document.getElementById('flag-canvas');
const flagCtx = flagCanvas.getContext('2d');

// Offscreen: draw flat flag once (red top, yellow bottom, emblem)
const off = document.createElement('canvas');
const offCtx = off.getContext('2d');

function resizeFlag() {
  // make canvas match displayed size in device pixels for crispness
  const rect = flagCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  flagCanvas.width = Math.max(300, Math.floor(rect.width * dpr));
  flagCanvas.height = Math.max(150, Math.floor(rect.height * dpr));
  flagCanvas.style.width = rect.width + 'px';
  flagCanvas.style.height = rect.height + 'px';

  // offscreen should be same size
  off.width = flagCanvas.width;
  off.height = flagCanvas.height;

  drawFlatFlag(offCtx, off.width, off.height);
}
window.addEventListener('resize', resizeFlag);

// draws the static flag (two stripes + simple emblem)
function drawFlatFlag(ctx, w, h) {
  // clear
  ctx.clearRect(0,0,w,h);
  // top red
  ctx.fillStyle = '#E31B23';
  ctx.fillRect(0,0,w, Math.floor(h/2));
  // bottom yellow
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(0, Math.floor(h/2), w, Math.ceil(h/2));
  // simple emblem: a circle and Kannada letters (stylized)
  const emW = Math.min(0.30*w, 0.32*h);
  const cx = Math.floor(w * 0.35);
  const cy = Math.floor(h * 0.45);
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(cx, cy, emW/2, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  // darker emblem text (simple)
  ctx.fillStyle = '#000';
  ctx.font = `${Math.floor(emW*0.5)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
    ctx.fillText('ಕರ್ನಾಟಕ', cx, cy);
  
}

// wave rendering: slice the offscreen image vertically and draw with vertical offsets
let animationId;
let lastTime = 0;
function renderWave(t) {
  if (!flagCanvas.width) return;
  const now = t || performance.now();
  const elapsed = (now - lastTime) / 1000;
  lastTime = now;

  const w = flagCanvas.width;
  const h = flagCanvas.height;
  flagCtx.clearRect(0,0,w,h);

  // Wave parameters (experiment to adjust realism)
  const time = now / 1000;
  const amplitude = Math.max(6, h * 0.02); // base amplitude
  const wavelength = Math.max(80, w * 0.08); // wave length
  const speed = 1.4; // wave speed multiplier
  const stiffness = 0.8; // how quickly amplitude decreases near pole

  // left anchor - pole x in pixels (in device pixels)
  const rect = flagCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const poleOffsetCss = -22; // we offset in CSS; but we want leftmost canvas column to be near pole
  // treat leftmost columns as near-pole (less movement)
  const poleX = 0; // leftmost canvas pixel is anchored

  // slice width
  const sliceW = Math.max(2, Math.floor(w/180)); // smaller slices = smoother but slower
  for (let x = 0; x < w; x += sliceW) {
    // normalized distance from pole: 0 at left, 1 at right
    const nx = (x - poleX) / w;
    const attenuation = Math.pow(nx, stiffness); // left side moves less
    // phase varies across x to create propagation
    const phase = (x / wavelength) * Math.PI * 2;
    const yOff = Math.sin(phase - time * speed) * amplitude * attenuation;
    // optional slight horizontal stretch to simulate perspective
    const shear = Math.cos(phase - time * speed * 0.9) * 0.6 * attenuation;

    // draw slice from offscreen to onscreen with vertical offset
    // use drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh)
    const sx = x, sw = Math.min(sliceW, w - x);
    // source y =0..h
    const dx = x;
    const dy = Math.round(yOff);
    // optionally apply small vertical scaling for perspective effect
    try {
      flagCtx.save();
      // slight horizontal skew via transform for extra realism
      flagCtx.setTransform(1, 0, shear * 0.002, 1, 0, 0); // tiny skew
      flagCtx.drawImage(off, sx, 0, sw, h, dx, dy, sw, h);
      flagCtx.restore();
    } catch (e) {
      // if any odd issue, fallback to direct draw
      flagCtx.drawImage(off, sx, 0, sw, h, dx, dy, sw, h);
    }
  }

  // add subtle shadow at bottom edge and a gentle inner highlight near pole
  flagCtx.globalCompositeOperation = 'source-over';
  flagCtx.fillStyle = 'rgba(0,0,0,0.03)';
  flagCtx.fillRect(0, h - Math.round(h * 0.035), w, Math.round(h * 0.035));
  flagCtx.globalCompositeOperation = 'source-over';

  animationId = requestAnimationFrame(renderWave);
}

// start the flag animation
function startFlag() {
  cancelAnimationFrame(animationId);
  resizeFlag();
  animationId = requestAnimationFrame(renderWave);
}
startFlag(); // initial
// ensure we re-create the flat image on resize
window.addEventListener('resize', () => {
  drawFlatFlag(offCtx, off.width || 600, off.height || 300);
  resizeFlag();
});

// ---------- REST OF UI: confetti, invite, audio, JAI ----------
const openBtn = document.getElementById('open-btn');
const overlay = document.getElementById('overlay');
const closeBtn = document.getElementById('close-invite');
const confettiCanvas = document.getElementById('confetti-canvas');
const ctx = confettiCanvas.getContext && confettiCanvas.getContext('2d');
const jaiText = document.getElementById('jktxt');
const audio = document.getElementById('jai-audio');

// confetti canvas sizing
function resizeConfetti() {
  if (!confettiCanvas) return;
  const rect = overlay.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  confettiCanvas.width = Math.max(window.innerWidth * dpr, 300);
  confettiCanvas.height = Math.max(window.innerHeight * dpr, 200);
  confettiCanvas.style.width = window.innerWidth + 'px';
  confettiCanvas.style.height = window.innerHeight + 'px';
}
window.addEventListener('resize', resizeConfetti);
resizeConfetti();

// show button on scroll
window.addEventListener('scroll', () => {
  if (window.scrollY > 90) openBtn.classList.add('show');
  else openBtn.classList.remove('show');
});

// party blast (same approach but safe-guarded)
function partyBlast(duration = 2600) {
  if (!ctx) return;
  const w = confettiCanvas.width, h = confettiCanvas.height;
  const colors = ['#E31B23', '#FFD700', '#FF8C00', '#FFF200'];
  const pieces = [];
  for (let i = 0; i < 160; i++) {
    pieces.push({
      x: Math.random() * w,
      y: Math.random() * -h / 2,
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * 6 + 2,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.25
    });
  }
  const start = performance.now();
  function frame(now) {
    ctx.clearRect(0, 0, w, h);
    pieces.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });
    if (now - start < duration) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, w, h);
  }
  requestAnimationFrame(frame);
}

// reveal invitation
function revealInvitation() {
  overlay.classList.add('show');
  // show JAI text
  if (jaiText) {
    jaiText.classList.add('show');
    setTimeout(() => jaiText.classList.remove('show'), 2200);
  }
  // confetti and audio
  partyBlast();
  if (audio) {
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.warn('Audio play declined:', err);
      });
    }
  }
}

// event wiring
openBtn.addEventListener('click', () => {
  // user clicked -> safe to play audio/autoplay
  revealInvitation();
});

closeBtn.addEventListener('click', () => {
  overlay.classList.remove('show');
  if (audio) audio.pause();
});
overlay.addEventListener('click', (e) => {
  if (e.target === overlay) {
    overlay.classList.remove('show');
    if (audio) audio.pause();
  }
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    overlay.classList.remove('show');
    if (audio) audio.pause();
  }
});

// ensure everything sized initially
window.addEventListener('load', () => {
  resizeFlag();
  resizeConfetti();
});
// ---------- Show open button on scroll OR when page is short ----------

// helper to decide whether the page is scrollable
function pageIsScrollable() {
  // use documentElement for cross-browser correctness
  return document.documentElement.scrollHeight > window.innerHeight;
}

// scroll listener: toggle button when user scrolls past threshold
window.addEventListener('scroll', () => {
  if (window.scrollY > 90) openBtn.classList.add('show');
  else openBtn.classList.remove('show');
});

// on load: if the page is short (no scrollbar), show the button immediately
window.addEventListener('load', () => {
  if (!pageIsScrollable()) {
    openBtn.classList.add('show');
  } else {
    // ensure correct initial state for scrollable pages
    if (window.scrollY > 90) openBtn.classList.add('show');
    else openBtn.classList.remove('show');
  }

  // also ensure canvases sized (existing code in your file)
  if (typeof resizeFlag === 'function') resizeFlag();
  if (typeof resizeConfetti === 'function') resizeConfetti();
});
// ---------- Disable right click ----------
window.addEventListener('contextmenu', function (e) {
  e.preventDefault();
  // Optional alert or toast (comment out if you don’t want it):
  // alert("Right-click is disabled on this page!");
});
// ---------- Optional: Disable certain keyboard shortcuts ----------
window.addEventListener('keydown', function (e) {
  // F12
  if (e.key === "F12") e.preventDefault();

  // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+U
  if (e.ctrlKey && e.shiftKey && ["I", "J"].includes(e.key.toUpperCase())) e.preventDefault();
  if (e.ctrlKey && e.key.toUpperCase() === "U") e.preventDefault();
});
