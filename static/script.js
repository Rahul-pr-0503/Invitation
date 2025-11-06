/* script.js
   Complete script:
   - realistic flag waving (canvas slice displacement)
   - confetti, invite, audio, JAI text
   - PWA install handling
   - right-click / common shortcuts disabled
   - show "open invitation" button after date or FORCE_SHOW for testing
*/
const FORCE_SHOW = false;
const EVENT_ISO_DATETIME = "2025-11-11T16:30:00";

(() => {
  // ---------- Utility: safe query helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const $all = (sel) => Array.from(document.querySelectorAll(sel));

  // ---------- Config ----------
  const FORCE_SHOW = false; // true to force the invite button visible immediately (testing)
  const EVENT_ISO_DATETIME = "2025-11-11T16:30:00"; // local time of event (change if needed)
  const CHECK_INTERVAL_MS = 15 * 1000; // how often to poll until showDate (15s)

  // ---------- Globals for canvases (set after DOM ready) ----------
  let flagCanvas, flagCtx, off, offCtx, animationId;
  let confettiCanvas, confettiCtx;

  // ---------- Flag drawing & waving ----------
  function setupFlagCanvas() {
    flagCanvas = document.getElementById('flag-canvas');
    if (!flagCanvas) return;
    flagCtx = flagCanvas.getContext('2d');

    // offscreen canvas for source flag image
    off = document.createElement('canvas');
    offCtx = off.getContext('2d');

    // initial sizing & draw
    resizeFlag();
    window.addEventListener('resize', () => {
      resizeFlag();
      drawFlatFlag(offCtx, off.width || 600, off.height || 300);
    });
  }

  function resizeFlag() {
    if (!flagCanvas) return;
    const rect = flagCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const desiredW = Math.max(300, Math.floor(rect.width * dpr));
    const desiredH = Math.max(150, Math.floor(rect.height * dpr));

    flagCanvas.width = desiredW;
    flagCanvas.height = desiredH;
    flagCanvas.style.width = rect.width + 'px';
    flagCanvas.style.height = rect.height + 'px';

    off.width = desiredW;
    off.height = desiredH;
    drawFlatFlag(offCtx, off.width, off.height);
  }

  function drawFlatFlag(ctx, w, h) {
    if (!ctx || !w || !h) return;
    ctx.clearRect(0, 0, w, h);
    // top red
    ctx.fillStyle = '#E31B23';
    ctx.fillRect(0, 0, w, Math.floor(h / 2));
    // bottom yellow
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(0, Math.floor(h / 2), w, Math.ceil(h / 2));
    // emblem: simple circle + Kannada text as stylized emblem
    const emW = Math.min(0.30 * w, 0.32 * h);
    const cx = Math.floor(w * 0.35);
    const cy = Math.floor(h * 0.45);

    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(cx, cy, emW / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // emblem text
    ctx.fillStyle = '#000';
    ctx.font = `${Math.floor(emW * 0.45)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // short word to avoid overflow
    ctx.fillText('ಕರ್ನಾಟಕ', cx, cy + 1);
  }

  function renderWave(nowTs) {
    if (!flagCanvas || !flagCtx || !off) return;
    const now = nowTs || performance.now();
    const w = flagCanvas.width;
    const h = flagCanvas.height;
    flagCtx.clearRect(0, 0, w, h);

    const time = now / 1000;
    const amplitude = Math.max(6, h * 0.02);
    const wavelength = Math.max(80, w * 0.08);
    const speed = 1.4;
    const stiffness = 0.85;
    const sliceW = Math.max(2, Math.floor(w / 180));

    for (let x = 0; x < w; x += sliceW) {
      const nx = x / w; // 0..1
      const attenuation = Math.pow(nx, stiffness);
      const phase = (x / wavelength) * Math.PI * 2;
      const yOff = Math.sin(phase - time * speed) * amplitude * attenuation;
      const shear = Math.cos(phase - time * speed * 0.9) * 0.6 * attenuation;

      const sx = x;
      const sw = Math.min(sliceW, w - x);
      const dx = x;
      const dy = Math.round(yOff);

      try {
        flagCtx.save();
        flagCtx.setTransform(1, 0, shear * 0.002, 1, 0, 0);
        flagCtx.drawImage(off, sx, 0, sw, h, dx, dy, sw, h);
        flagCtx.restore();
      } catch (e) {
        flagCtx.drawImage(off, sx, 0, sw, h, dx, dy, sw, h);
      }
    }

    // subtle bottom shadow
    flagCtx.fillStyle = 'rgba(0,0,0,0.03)';
    flagCtx.fillRect(0, h - Math.round(h * 0.035), w, Math.round(h * 0.035));

    animationId = requestAnimationFrame(renderWave);
  }

  function startFlag() {
    if (!flagCanvas) return;
    cancelAnimationFrame(animationId);
    resizeFlag();
    animationId = requestAnimationFrame(renderWave);
  }

  // ---------- Confetti ----------

  function setupConfetti() {
    confettiCanvas = document.getElementById('confetti-canvas');
    if (!confettiCanvas) return;
    confettiCtx = confettiCanvas.getContext && confettiCanvas.getContext('2d');

    function resizeConf() {
      const dpr = window.devicePixelRatio || 1;
      confettiCanvas.width = Math.max(window.innerWidth * dpr, 300);
      confettiCanvas.height = Math.max(window.innerHeight * dpr, 200);
      confettiCanvas.style.width = window.innerWidth + 'px';
      confettiCanvas.style.height = window.innerHeight + 'px';
    }
    window.addEventListener('resize', resizeConf);
    resizeConf();
  }

  function partyBlast(duration = 2600) {
    if (!confettiCtx) return;
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
    (function frame(now) {
      confettiCtx.clearRect(0, 0, w, h);
      pieces.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.rot += p.vr;
        confettiCtx.save();
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate(p.rot);
        confettiCtx.fillStyle = p.color;
        confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        confettiCtx.restore();
      });
      if (now - start < duration) requestAnimationFrame(frame);
      else confettiCtx.clearRect(0, 0, w, h);
    })(performance.now());
  }

  // ---------- Invitation UI wiring & audio ----------
  function setupInvitationUI() {
    // handled after DOMContentLoaded in main init
  }

  // ---------- PWA install handler ----------
  function setupPWAHandlers() {
    let deferredPrompt = null;
    const installBtn = document.getElementById('install-btn');

    // register service worker if possible
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/static/service-worker.js')
        .then(() => console.log('Service Worker registered'))
        .catch(err => console.warn('SW registration failed:', err));
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('PWA: beforeinstallprompt fired');
      e.preventDefault();
      deferredPrompt = e;
      if (installBtn) {
        installBtn.classList.add('show');
        installBtn.style.display = 'block';
      }
    });

    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) {
          alert('If you are on iOS: use Safari → Share → Add to Home Screen');
          return;
        }
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        console.log('PWA: userChoice', choice);
        deferredPrompt = null;
        installBtn.style.display = 'none';
      });
    }

    window.addEventListener('appinstalled', () => {
      console.log('PWA: appinstalled');
      if (installBtn) installBtn.style.display = 'none';
    });
  }

  // ---------- Right-click / keyboard discourage ----------
  function setupProtection() {
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => {
      // F12
      if (e.key === 'F12') e.preventDefault();
      // Ctrl+Shift+I/J and Ctrl+U
      if (e.ctrlKey && e.shiftKey && ['I','J'].includes(e.key.toUpperCase())) e.preventDefault();
      if (e.ctrlKey && e.key.toUpperCase() === 'U') e.preventDefault();
    });
  }

  // ---------- Date-based unlock for invitation button ----------
  function setupDateUnlock(openBtn, partyFn, resizeFns = []) {
    if (!openBtn) return;
    if (FORCE_SHOW) {
      console.warn('FORCE_SHOW enabled — invitation button shown for testing.');
      openBtn.classList.add('show');
      openBtn.style.display = 'block';
      return;
    }

    const showDate = new Date(EVENT_ISO_DATETIME);
    const now = new Date();
    console.log('Invitation debug - now:', now.toString());
    console.log('Invitation debug - showDate:', showDate.toString());

    function show() {
      openBtn.classList.add('show');
      openBtn.style.display = 'block';
    }
    function hide() {
      openBtn.classList.remove('show');
      openBtn.style.display = 'none';
    }

    if (now >= showDate) {
      show();
    } else {
      hide();
      const checker = setInterval(() => {
        if (new Date() >= showDate) {
          show();
          clearInterval(checker);
        }
      }, CHECK_INTERVAL_MS);
      // if page short and user wants button visible earlier, you could add logic here
    }

    // Also ensure canvases are sized once when visible
    resizeFns.forEach(fn => { if (typeof fn === 'function') fn(); });
  }

  // ---------- Main init after DOM ready ----------
  document.addEventListener('DOMContentLoaded', () => {
    // Prepare canvases and functions
    setupFlagCanvas();
    setupConfetti();
    setupPWAHandlers();
    setupProtection();

    // Start flag animation (if canvas exists)
    startFlag();

    // Elements
    const openBtn = document.getElementById('open-btn');
    const overlay = document.getElementById('overlay');
    const closeBtn = document.getElementById('close-invite');
    const jaiText = document.getElementById('jktxt');
    const audio = document.getElementById('jai-audio');

    // Defensive: if confetti canvas not found, partyBlast is a noop already
    // Reveal function
    function revealInvitation() {
      if (overlay) overlay.classList.add('show');

      if (jaiText) {
        jaiText.classList.add('show');
        setTimeout(() => jaiText.classList.remove('show'), 2200);
      }

      // confetti and audio
      partyBlast();
      if (audio && typeof audio.play === 'function') {
        audio.currentTime = 0;
        const p = audio.play();
        if (p !== undefined) {
          p.catch(err => console.warn('Audio play blocked or failed:', err));
        }
      }
    }

    // Hook button events if element present
    if (openBtn) {
      // set initial display to none; setupDateUnlock will show if needed
      openBtn.style.display = 'none';

      openBtn.addEventListener('click', () => {
        revealInvitation();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (overlay) overlay.classList.remove('show');
        if (audio) audio.pause();
      });
    }

    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('show');
          if (audio) audio.pause();
        }
      });
    }

    // Escape key closes
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (overlay) overlay.classList.remove('show');
        if (audio) audio.pause();
      }
    });

    // Ensure canvases sized and animation started on load
    if (typeof resizeFlag === 'function') resizeFlag();
    if (typeof resizeConfetti === 'function') resizeConfetti();

    // set up date unlock (openBtn may be null - safe)
    setupDateUnlock(openBtn, partyBlast, [resizeFlag, resizeConfetti]);
  });

  // Also call resizeFlag on full window load (images/fonts settled)
  window.addEventListener('load', () => {
    if (typeof resizeFlag === 'function') resizeFlag();
    if (typeof resizeConfetti === 'function') resizeConfetti();
  });
})();
// Minimal robust script to ensure #open-btn appears (FOR TESTING).
document.addEventListener('DOMContentLoaded', () => {
  console.log('script.js loaded - DOMContentLoaded');

  const openBtn = document.getElementById('open-btn');
  const overlay = document.getElementById('overlay');
  const closeBtn = document.getElementById('close-invite');
  const jaiAudio = document.getElementById('jai-audio');

  if (!openBtn) {
    console.error('ERROR: #open-btn not found');
    return;
  }

  // TESTING: set true to force show now; set false for real date-based unlocking.
  const FORCE_SHOW = true;

  // Event date/time (local). Keep but not used while FORCE_SHOW=true.
  const showDate = new Date("2025-11-11T16:30:00");

  function showBtn() {
    console.log('Showing invitation button');
    openBtn.classList.add('show');
    openBtn.style.display = 'block';
  }
  function hideBtn() {
    openBtn.classList.remove('show');
    openBtn.style.display = 'none';
  }

  if (FORCE_SHOW) {
    console.warn('FORCE_SHOW enabled - button visible for testing');
    showBtn();
  } else {
    // date-based logic
    const now = new Date();
    console.log('Now:', now.toString(), 'ShowDate:', showDate.toString());
    if (now >= showDate) showBtn();
    else {
      hideBtn();
      const interval = setInterval(() => {
        if (new Date() >= showDate) {
          showBtn();
          clearInterval(interval);
        }
      }, 15000);
    }
  }

  // wire click to open overlay and play audio
  openBtn.addEventListener('click', () => {
    if (overlay) overlay.classList.add('show');
    // try to play audio (user clicked so browsers allow)
    if (jaiAudio && typeof jaiAudio.play === 'function') {
      jaiAudio.currentTime = 0;
      const p = jaiAudio.play();
      if (p && p.catch) p.catch(err => console.warn('Audio play failed:', err));
    }
  });

  if (closeBtn && overlay) {
    closeBtn.addEventListener('click', () => {
      overlay.classList.remove('show');
      if (jaiAudio) jaiAudio.pause();
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('show');
        if (jaiAudio) jaiAudio.pause();
      }
    });
  }

  // debug: show current state in console every time
  console.log('openBtn initial visible?', window.getComputedStyle(openBtn).display);
});

