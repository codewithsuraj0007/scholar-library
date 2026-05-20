// ─────────────────────────────────────────────────────────
//  CONFIGURATION
// ─────────────────────────────────────────────────────────
const FRAME_COUNT   = 181;
const FRAME_PATH    = (n) => `./frames-image/ezgif-frame-${String(n).padStart(3,'0')}.jpg`;
const PRELOAD_AHEAD = 10;   // how many frames to preload ahead

// ─────────────────────────────────────────────────────────
//  CANVAS SETUP
// ─────────────────────────────────────────────────────────
const canvas  = document.getElementById('hero-canvas');
// Force maximum quality context: no alpha saves memory and avoids compositing artefacts
const ctx     = canvas.getContext('2d', { alpha: false, desynchronized: false });
const images  = new Array(FRAME_COUNT);
let   loaded  = 0;
let   firstImageW = 0, firstImageH = 0;

// ── Offscreen double-buffer: prevents pixel-breaking from direct canvas stretch ──
const offscreen = document.createElement('canvas');
const offCtx    = offscreen.getContext('2d', { alpha: false });

function setCtxQuality(context) {
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const W = window.innerWidth;
  const H = window.innerHeight;

  // Physical pixel dimensions (canvas backing store)
  canvas.width  = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);

  // CSS display size stays 1:1 viewport
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';

  // Scale context matrix once so all drawImage calls work in CSS pixels
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  setCtxQuality(ctx);
  setCtxQuality(offCtx);

  renderFrame(currentFrame);
}
window.addEventListener('resize', resizeCanvas);

// ─────────────────────────────────────────────────────────
//  FRAME RENDERING
// ─────────────────────────────────────────────────────────
let currentFrame = 0;

function renderFrame(idx) {
  const img = images[idx];
  if (!img || !img.complete || img.naturalWidth === 0) return;

  const iw = img.naturalWidth;
  const ih = img.naturalHeight;

  // Step 1: Draw image at its NATIVE pixel size into the offscreen buffer.
  // This preserves every pixel from the source JPG with zero artefacts.
  if (offscreen.width !== iw || offscreen.height !== ih) {
    offscreen.width  = iw;
    offscreen.height = ih;
    setCtxQuality(offCtx);
  }
  offCtx.drawImage(img, 0, 0, iw, ih);

  // Step 2: Composite the offscreen buffer onto the main canvas using
  // CSS-pixel coordinates (the DPR scale transform handles the rest).
  // "cover" pattern: scale up to fill the full viewport with no letterboxing.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const ratio = Math.max(vw / iw, vh / ih);
  const dw = iw * ratio;
  const dh = ih * ratio;
  const dx = (vw - dw) / 2;
  const dy = (vh - dh) / 2;

  setCtxQuality(ctx);
  ctx.clearRect(0, 0, vw, vh);
  ctx.drawImage(offscreen, dx, dy, dw, dh);
}

// ─────────────────────────────────────────────────────────
//  IMAGE LOADING  (lazy, prioritised)
// ─────────────────────────────────────────────────────────
function loadImage(idx) {
  if (images[idx]) return;                   // already loading/loaded
  const img = new Image();
  img.src = FRAME_PATH(idx + 1);             // frames are 1-indexed filenames
  img.onload = () => {
    loaded++;
    if (idx === 0) {
      firstImageW = img.naturalWidth;
      firstImageH = img.naturalHeight;
      resizeCanvas();
    }
    if (idx === currentFrame) renderFrame(idx);
  };
  images[idx] = img;
}

// Load first frame immediately, then stagger the rest
loadImage(0);
setTimeout(() => {
  for (let i = 1; i < FRAME_COUNT; i++) {
    setTimeout(() => loadImage(i), i * 8);
  }
}, 100);

// ─────────────────────────────────────────────────────────
//  SCROLL & PROGRESS INTERPOLATION LOGIC (LERP)
// ─────────────────────────────────────────────────────────
const scrollContainer = document.getElementById('hero-scroll-container');
const scrollIndicator = document.getElementById('scroll-indicator');
const progressBar     = document.getElementById('progress-bar');
const phase1El        = document.getElementById('phase-1');
const phase2El        = document.getElementById('phase-2');
const phase3El        = document.getElementById('phase-3');
const frameDebug      = document.getElementById('frame-debug');

// Linear Interpolation factor for buttery-smooth scrolling momentum
const LERP_FACTOR = 0.08;
let targetProgress = 0;
let currentProgress = 0;
let isRunning = false;

// Easing: ease-in-out cubic
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// Smooth clamp
function clamp(v, mn, mx) { return Math.min(Math.max(v, mn), mx); }

// Map value from [a,b] → [c,d]
function mapRange(v, a, b, c, d) {
  return c + ((v - a) / (b - a)) * (d - c);
}

function onScroll() {
  const rect = scrollContainer.getBoundingClientRect();
  const total = scrollContainer.offsetHeight - window.innerHeight;
  const scrollY = -rect.top;
  
  // Set target progress (where the scroll is directly)
  targetProgress = clamp(scrollY / total, 0, 1);
  
  // Start the momentum render loop if it's currently sleeping
  if (!isRunning) {
    isRunning = true;
    requestAnimationFrame(tick);
  }
}

// Momentum Lerping tick
function tick() {
  const diff = targetProgress - currentProgress;
  
  if (Math.abs(diff) > 0.0001) {
    currentProgress += diff * LERP_FACTOR;
    renderAnimation(currentProgress);
    requestAnimationFrame(tick);
  } else {
    currentProgress = targetProgress;
    renderAnimation(currentProgress);
    isRunning = false;
  }
}

// Renders the animation frame and text state based on smoothly interpolated progress
function renderAnimation(progress) {
  // Progress bar
  progressBar.style.width = (progress * 100).toFixed(2) + '%';

  // Frame index (0-based)
  const frameIdx = clamp(Math.floor(progress * (FRAME_COUNT - 1)), 0, FRAME_COUNT - 1);

  // Preload ahead based on current frame position
  for (let i = frameIdx; i < Math.min(frameIdx + PRELOAD_AHEAD, FRAME_COUNT); i++) {
    loadImage(i);
  }

  if (frameIdx !== currentFrame) {
    currentFrame = frameIdx;
    renderFrame(currentFrame);
    if (frameDebug) {
      frameDebug.textContent = `Frame: ${currentFrame + 1}`;
    }
  }

  // Hide scroll indicator after moving past 4% scroll
  scrollIndicator.style.opacity = progress > 0.04 ? '0' : '1';

  // ── PHASE TRANSITIONS (Fluid Vertical Translations) ──

  // Phase 1: 0–30% → fade in 0–5%, hold 5–25%, fade out 25–30%
  let p1Opacity = 0, p1Ty = 30;
  if (progress < 0.05) {
    const t = progress / 0.05;
    p1Opacity = easeInOut(t);
    p1Ty = 30 * (1 - t);
  } else if (progress < 0.25) {
    p1Opacity = 1;
    p1Ty = 0;
  } else if (progress < 0.30) {
    const t = (progress - 0.25) / 0.05;
    p1Opacity = 1 - easeInOut(t);
    p1Ty = -20 * easeInOut(t);
  } else {
    p1Opacity = 0;
    p1Ty = -20;
  }
  phase1El.style.opacity = p1Opacity;
  phase1El.style.transform = `translate3d(0, ${p1Ty}px, 0)`;

  // Phase 2: 30–50% → fade in 30–35%, hold 35–45%, fade out 45–50%
  let p2Opacity = 0, p2Ty = 30;
  if (progress >= 0.30 && progress < 0.35) {
    const t = (progress - 0.30) / 0.05;
    p2Opacity = easeInOut(t);
    p2Ty = 30 * (1 - easeInOut(t));
  } else if (progress >= 0.35 && progress < 0.45) {
    p2Opacity = 1;
    p2Ty = 0;
  } else if (progress >= 0.45 && progress < 0.50) {
    const t = (progress - 0.45) / 0.05;
    p2Opacity = 1 - easeInOut(t);
    p2Ty = -20 * easeInOut(t);
  } else {
    p2Opacity = 0;
    p2Ty = -20;
  }
  phase2El.style.opacity = p2Opacity;
  phase2El.style.transform = `translate3d(0, ${p2Ty}px, 0)`;

  // Phase 3: 50–80% → fade in 50–57%, hold 57–73%, fade out 73–80% (fully hidden past 80%)
  let p3Opacity = 0, p3Ty = 30;
  if (progress >= 0.50 && progress < 0.57) {
    const t = (progress - 0.50) / 0.07;
    p3Opacity = easeInOut(t);
    p3Ty = 30 * (1 - t);
  } else if (progress >= 0.57 && progress < 0.73) {
    p3Opacity = 1;
    p3Ty = 0;
  } else if (progress >= 0.73 && progress < 0.80) {
    const t = (progress - 0.73) / 0.07;
    p3Opacity = 1 - easeInOut(t);
    p3Ty = -20 * easeInOut(t);
  } else {
    p3Opacity = 0;
    p3Ty = -20;
  }
  phase3El.style.opacity = p3Opacity;
  phase3El.style.transform = `translate3d(0, ${p3Ty}px, 0)`;
}

// Attach passive scroll listener for high performance
window.addEventListener('scroll', onScroll, { passive: true });

// Initial setup call
resizeCanvas();
onScroll();

// ─────────────────────────────────────────────────────────
//  LIGHT / DARK MODE THEME TOGGLE
// ─────────────────────────────────────────────────────────
const themeToggleBtn = document.getElementById('theme-toggle-btn');
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    
    // Trigger canvas context re-render to make transitions visually stunning
    renderFrame(currentFrame);
  });
}

// ─────────────────────────────────────────────────────────
//  MOBILE RESPONSIVE HAMBURGER MENU TOGGLE
// ─────────────────────────────────────────────────────────
const navMenuBtn = document.getElementById('nav-menu-btn');
const navLinks = document.querySelector('.nav-links');

if (navMenuBtn && navLinks) {
  navMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    navMenuBtn.classList.toggle('active');
    navLinks.classList.toggle('active');
  });

  // Close menu when clicking outside
  document.addEventListener('click', () => {
    navMenuBtn.classList.remove('active');
    navLinks.classList.remove('active');
  });

  // Close menu when clicking a link
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navMenuBtn.classList.remove('active');
      navLinks.classList.remove('active');
    });
  });
}

// ─────────────────────────────────────────────────────────
//  GSAP SCROLLTRIGGER ANIMATIONS
// ─────────────────────────────────────────────────────────
// Register ScrollTrigger
if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);

  // About Section Animations
  const aboutLeft = document.querySelector('.about-content-left');
  const aboutRight = document.querySelector('.about-image-right');

  if (aboutLeft && aboutRight) {
    // Left Content Animation
    gsap.to(aboutLeft, {
      scrollTrigger: {
        trigger: '.premium-about-section',
        start: 'top 75%',
        end: 'bottom 25%',
        toggleActions: 'play reverse play reverse',
      },
      x: 0,
      opacity: 1,
      duration: 1.2,
      ease: 'power3.out'
    });

    // Right Image Animation
    gsap.to(aboutRight, {
      scrollTrigger: {
        trigger: '.premium-about-section',
        start: 'top 75%',
        end: 'bottom 25%',
        toggleActions: 'play reverse play reverse',
      },
      x: 0,
      opacity: 1,
      scale: 1,
      duration: 1.2,
      delay: 0.2, // slight stagger
      ease: 'power3.out'
    });
  }
}
