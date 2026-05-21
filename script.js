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

  // Immersive Masonry Gallery Parallax
  const gallerySection = document.querySelector('.parallax-gallery-section');
  if (gallerySection) {
    
  // Background Glow Parallax
    gsap.to('.glow-cyan', {
      y: 200,
      ease: 'none',
      scrollTrigger: {
        trigger: gallerySection,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 2
      }
    });

    gsap.to('.glow-orange', {
      y: -200,
      ease: 'none',
      scrollTrigger: {
        trigger: gallerySection,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 2
      }
    });

    // Fade-in Header
    gsap.from('.gallery-header-glass', {
      scrollTrigger: {
        trigger: gallerySection,
        start: 'top 80%',
        toggleActions: 'play reverse play reverse'
      },
      y: 50,
      opacity: 0,
      duration: 1,
      ease: 'power3.out'
    });

    // Foreground Parallax for Floating Glass Panels
    gsap.to('.left-panel', {
      y: -250,
      ease: 'none',
      scrollTrigger: {
        trigger: gallerySection,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.2
      }
    });

    gsap.to('.right-panel', {
      y: 150,
      ease: 'none',
      scrollTrigger: {
        trigger: gallerySection,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.5
      }
    });
  }

  // ─────────────────────────────────────────────────────────
  //  WHY CHOOSE US — STICKY SCROLL STORYTELLING
  // ─────────────────────────────────────────────────────────
  const scenes = gsap.utils.toArray('.scroll-scene');
  const progressSteps = gsap.utils.toArray('.progress-step');
  const progressFill = document.querySelector('.progress-line-fill');
  
  // Data definitions for morphing elements per scene
  const sceneData = [
    {
      focus: 98,
      hours: "+4.2h",
      distraction: "-92%",
      chartPath: "M 0,40 Q 20,10 40,40 T 80,40 T 120,30 T 160,40 T 200,20 T 240,40",
      chartPathFill: "M 0,40 Q 20,10 40,40 T 80,40 T 120,30 T 160,40 T 200,20 T 240,40 L 240,80 L 0,80 Z",
      status: "Flow State",
      quote: '"The silence is almost tactile—letting your mind fully submerge in the task at hand without external friction."',
      acoustic: 98,
      thermal: "22°C",
      thermalFill: 85
    },
    {
      focus: 95,
      hours: "+5.8h",
      distraction: "-85%",
      chartPath: "M 0,25 Q 30,25 60,25 T 120,25 T 180,25 T 240,25",
      chartPathFill: "M 0,25 Q 30,25 60,25 T 120,25 T 180,25 T 240,25 L 240,80 L 0,80 Z",
      status: "Cognitive Stamina",
      quote: '"AC climate control combined with premium ergonomic cabins means you study 12 hours straight and leave feeling as fresh as you arrived."',
      acoustic: 92,
      thermal: "21°C",
      thermalFill: 90
    },
    {
      focus: 97,
      hours: "+6.5h",
      distraction: "-89%",
      chartPath: "M 0,60 Q 30,50 60,40 T 120,25 T 180,15 T 240,10",
      chartPathFill: "M 0,60 Q 30,50 60,40 T 120,25 T 180,15 T 240,10 L 240,80 L 0,80 Z",
      status: "Peer Synergy",
      quote: '"Looking left and right, you see students preparing for civil services, software builds, and exams. You feel a quiet duty to match their rigor."',
      acoustic: 90,
      thermal: "22°C",
      thermalFill: 85
    },
    {
      focus: 99,
      hours: "+7.2h",
      distraction: "-96%",
      chartPath: "M 0,40 L 20,20 L 40,50 L 60,10 L 80,45 L 100,15 L 120,35 L 140,5 L 160,40 L 180,20 L 200,45 L 220,10 L 240,30",
      chartPathFill: "M 0,40 L 20,20 L 40,50 L 60,10 L 80,45 L 100,15 L 120,35 L 140,5 L 160,40 L 180,20 L 200,45 L 220,10 L 240,30 L 240,80 L 0,80 Z",
      status: "Gigabit Canopy",
      quote: '"Zero-buffering video lectures and instant downloads. The high-speed internet keeps you in sync with the digital pulse without micro-delays."',
      acoustic: 94,
      thermal: "22°C",
      thermalFill: 85
    },
    {
      focus: 96,
      hours: "+8.0h",
      distraction: "-94%",
      chartPath: "M 0,35 Q 40,30 80,35 T 160,35 T 240,35",
      chartPathFill: "M 0,35 Q 40,30 80,35 T 160,35 T 240,35 L 240,80 L 0,80 Z",
      status: "Secure Sanctuary",
      quote: '"Safety is a given. With 24/7 CCTV security, biometric logs, and heavy personal lockers, you only focus on what is inside your head."',
      acoustic: 95,
      thermal: "22°C",
      thermalFill: 85
    },
    {
      focus: 98,
      hours: "+9.2h",
      distraction: "-98%",
      chartPath: "M 0,20 Q 30,10 60,20 T 120,10 T 180,20 T 240,10",
      chartPathFill: "M 0,20 Q 30,10 60,20 T 120,10 T 180,20 T 240,10 L 240,80 L 0,80 Z",
      status: "Deep Sanctuary Flow",
      quote: '"Ergonomic partitions block visual glare completely. It is just your desk, your notes, and your massive goals. The ultimate self-study capsule."',
      acoustic: 99,
      thermal: "22°C",
      thermalFill: 85
    }
  ];

  // DOM Elements references
  const focusPercentVal  = document.getElementById('focus-percentage-val');
  const studyHoursVal     = document.getElementById('study-hours-val');
  const distractionVal    = document.getElementById('distraction-val');
  const chartStatusVal    = document.getElementById('chart-status-val');
  const dynamicQuoteText  = document.getElementById('dynamic-quote-text');
  const circularMeterFill = document.querySelector('.meter-fill');
  const chartPath         = document.querySelector('.chart-path');
  const chartPathFill     = document.querySelector('.chart-path-fill');
  const acousticVal       = document.getElementById('acoustic-val');
  const acousticFill      = document.getElementById('acoustic-fill');
  const thermalVal        = document.getElementById('thermal-val');
  const thermalFill       = document.getElementById('thermal-fill');
  const consoleLogs       = document.getElementById('console-logs');

  function updateStickyBoard(index) {
    const data = sceneData[index];
    if (!data) return;

    // 1. Update progress steps list
    progressSteps.forEach((step, i) => {
      if (i === index) {
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    });

    // 2. Vertical progress track line height is handled smoothly by GSAP ScrollTrigger scrub

    // 3. Stats counters count up transition
    if (focusPercentVal) {
      gsap.to(focusPercentVal, {
        innerText: data.focus,
        duration: 0.8,
        snap: { innerText: 1 },
        ease: 'power1.out',
        onUpdate: function() {
          focusPercentVal.innerHTML = Math.floor(focusPercentVal.innerText) + '%';
        }
      });
    }

    // Circular meter fill
    if (circularMeterFill) {
      // 2 * PI * r = 251.2
      const offset = 251.2 - (251.2 * data.focus) / 100;
      gsap.to(circularMeterFill, {
        strokeDashoffset: offset,
        duration: 0.8,
        ease: 'power2.out'
      });
    }

    if (studyHoursVal) {
      const numHours = parseFloat(data.hours.replace(/[^\d.]/g, ''));
      gsap.to(studyHoursVal, {
        innerText: numHours,
        duration: 0.8,
        snap: { innerText: 0.1 },
        ease: 'power1.out',
        onUpdate: function() {
          studyHoursVal.innerHTML = '+' + parseFloat(studyHoursVal.innerText).toFixed(1) + 'h';
        }
      });
    }

    if (distractionVal) {
      const numDist = parseFloat(data.distraction.replace(/[^\d.]/g, ''));
      gsap.to(distractionVal, {
        innerText: numDist,
        duration: 0.8,
        snap: { innerText: 1 },
        ease: 'power1.out',
        onUpdate: function() {
          distractionVal.innerHTML = '-' + Math.floor(distractionVal.innerText) + '%';
        }
      });
    }

    // Update acoustic slider value and fill
    if (acousticVal && data.acoustic !== undefined) {
      gsap.to(acousticVal, {
        innerText: data.acoustic,
        duration: 0.8,
        snap: { innerText: 1 },
        ease: 'power1.out',
        onUpdate: function() {
          acousticVal.innerHTML = Math.floor(acousticVal.innerText) + '%';
        }
      });
    }
    if (acousticFill && data.acoustic !== undefined) {
      gsap.to(acousticFill, {
        width: data.acoustic + '%',
        duration: 0.8,
        ease: 'power2.out'
      });
    }

    // Update thermal slider value and fill
    if (thermalVal && data.thermal !== undefined) {
      thermalVal.textContent = data.thermal;
    }
    if (thermalFill && data.thermalFill !== undefined) {
      gsap.to(thermalFill, {
        width: data.thermalFill + '%',
        duration: 0.8,
        ease: 'power2.out'
      });
    }

    // Update telemetry console scroll and active state
    if (consoleLogs) {
      const logEntries = consoleLogs.querySelectorAll('.log-entry');
      logEntries.forEach((entry, i) => {
        if (i === index) {
          entry.classList.add('active');
        } else {
          entry.classList.remove('active');
        }
      });
      consoleLogs.style.transform = `translateY(${-(index * 28)}px)`;
    }

    // 4. Morph SVG path
    if (chartPath && chartPathFill) {
      chartPath.setAttribute('d', data.chartPath);
      chartPathFill.setAttribute('d', data.chartPathFill);
    }

    // 5. Update texts
    if (chartStatusVal) chartStatusVal.textContent = data.status;
    
    if (dynamicQuoteText) {
      gsap.to(dynamicQuoteText, {
        opacity: 0,
        y: -10,
        duration: 0.25,
        onComplete: () => {
          dynamicQuoteText.textContent = data.quote;
          gsap.to(dynamicQuoteText, { opacity: 1, y: 0, duration: 0.4 });
        }
      });
    }
  }

  // 1. Smooth scroll scrub for the vertical timeline line fill (Apple & Sigma style)
  if (progressFill && scenes.length > 0) {
    gsap.fromTo(progressFill, 
      { height: '0%' },
      {
        height: '100%',
        ease: 'none',
        scrollTrigger: {
          trigger: '.why-choose-right-scroll',
          start: 'top 55%',
          end: 'bottom 45%',
          scrub: true
        }
      }
    );
  }

  // Hook ScrollTrigger instances to scenes
  scenes.forEach((scene, index) => {
    ScrollTrigger.create({
      trigger: scene,
      start: 'top 55%',
      end: 'bottom 45%',
      onEnter: () => {
        scenes.forEach(s => s.classList.remove('active'));
        scene.classList.add('active');
        updateStickyBoard(index);
      },
      onEnterBack: () => {
        scenes.forEach(s => s.classList.remove('active'));
        scene.classList.add('active');
        updateStickyBoard(index);
      }
    });
  });

  // Enable navigation click smooth scrolling fallback
  progressSteps.forEach((step, index) => {
    step.addEventListener('click', () => {
      const targetScene = scenes[index];
      if (targetScene) {
        const topPos = targetScene.getBoundingClientRect().top + window.scrollY - 140;
        window.scrollTo({
          top: topPos,
          behavior: 'smooth'
        });
      }
    });
  });

  // 3D Tilt Card Interaction Effect
  const cards = document.querySelectorAll('.glass-content-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const xPercent = (x / rect.width - 0.5) * 15; // rotate degrees
      const yPercent = (y / rect.height - 0.5) * -15;
      
      gsap.to(card, {
        rotateY: xPercent,
        rotateX: yPercent,
        transformPerspective: 800,
        ease: 'power2.out',
        duration: 0.3
      });

      const glow = card.querySelector('.card-glow-reflection');
      if (glow) {
        gsap.to(glow, {
          x: (x / rect.width - 0.5) * 40,
          y: (y / rect.height - 0.5) * 40,
          duration: 0.3
        });
      }
    });

    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        rotateY: 0,
        rotateX: 0,
        ease: 'power2.out',
        duration: 0.6
      });
      
      const glow = card.querySelector('.card-glow-reflection');
      if (glow) {
        gsap.to(glow, {
          x: 0,
          y: 0,
          duration: 0.6
        });
      }
    });
  });
}

