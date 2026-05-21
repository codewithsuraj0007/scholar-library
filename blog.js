/**
 * SCHOLAR'S LIBRARY — FOCUS JOURNAL
 * blog.js — Premium Blog Animations & Interactions
 * Handles: particles, 3D card tilt, reading progress,
 *          TOC generation, focus mode, category filter,
 *          study timer, paragraph reveal, navbar scroll
 */

'use strict';

// ─────────────────────────────────────────────────────────
//  UTILITY
// ─────────────────────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const clamp = (v, mn, mx) => Math.min(Math.max(v, mn), mx);

// ─────────────────────────────────────────────────────────
//  NAVBAR — SCROLL BEHAVIOUR
// ─────────────────────────────────────────────────────────
const blogNav = $('#blog-nav');
if (blogNav) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
      blogNav.classList.add('scrolled');
    } else {
      blogNav.classList.remove('scrolled');
    }
  }, { passive: true });
}

// ─────────────────────────────────────────────────────────
//  READING PROGRESS BAR (top bar)
// ─────────────────────────────────────────────────────────
const progressBarEl = $('#blog-progress-bar');
if (progressBarEl) {
  function updateProgressBar() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? clamp((scrollTop / docHeight) * 100, 0, 100) : 0;
    progressBarEl.style.width = progress + '%';
  }
  window.addEventListener('scroll', updateProgressBar, { passive: true });
}

// ─────────────────────────────────────────────────────────
//  PARTICLE CANVAS (Blog Hero)
// ─────────────────────────────────────────────────────────
const particleCanvas = $('#blog-particles');
if (particleCanvas) {
  const pCtx = particleCanvas.getContext('2d');
  let particles = [];
  let animFrame;

  function resizeParticles() {
    particleCanvas.width = particleCanvas.offsetWidth;
    particleCanvas.height = particleCanvas.offsetHeight;
  }

  function createParticle() {
    return {
      x: Math.random() * particleCanvas.width,
      y: Math.random() * particleCanvas.height,
      r: Math.random() * 2.5 + 0.5,
      opacity: Math.random() * 0.6 + 0.1,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -Math.random() * 0.4 - 0.1,
      life: 1,
      decay: Math.random() * 0.003 + 0.001,
      color: Math.random() > 0.5 ? '#c080fb' : '#ff4fd8'
    };
  }

  function initParticles() {
    particles = Array.from({ length: 80 }, createParticle);
  }

  function drawParticles() {
    pCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    particles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0 || p.y < -10) {
        particles[i] = createParticle();
        particles[i].y = particleCanvas.height + 10;
        particles[i].life = 1;
        return;
      }
      pCtx.beginPath();
      pCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      pCtx.fillStyle = p.color;
      pCtx.globalAlpha = p.opacity * p.life;
      pCtx.fill();
    });
    pCtx.globalAlpha = 1;
    animFrame = requestAnimationFrame(drawParticles);
  }

  resizeParticles();
  initParticles();
  drawParticles();

  window.addEventListener('resize', () => {
    resizeParticles();
    initParticles();
  });
}

// ─────────────────────────────────────────────────────────
//  BLOG CARD — 3D TILT HOVER
// ─────────────────────────────────────────────────────────
function initCardTilt() {
  $$('.blog-card, .featured-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const rotX = ((y / rect.height) - 0.5) * -8;
      const rotY = ((x / rect.width) - 0.5) * 8;
      card.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-8px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

// ─────────────────────────────────────────────────────────
//  CATEGORY FILTER
// ─────────────────────────────────────────────────────────
function initCategoryFilter() {
  const filterBtns = $$('.filter-btn');
  const blogCards = $$('.blog-card, .featured-card');
  const countEl = $('#article-count');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;

      // Update active state
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      let visible = 0;

      blogCards.forEach((card, i) => {
        const cat = card.dataset.category || 'all';
        const show = filter === 'all' || cat === filter;

        if (show) {
          card.style.display = 'block';
          visible++;
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = '';
          }, i * 50);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'translateY(20px)';
          setTimeout(() => {
            if (card.dataset.category !== filter && filter !== 'all') {
              card.style.display = 'none';
            }
          }, 300);
        }
      });

      if (countEl) {
        countEl.textContent = (filter === 'all' ? blogCards.length : visible) + ' articles';
      }
    });
  });
}

// ─────────────────────────────────────────────────────────
//  CARD SCROLL REVEAL (Blog Grid)
// ─────────────────────────────────────────────────────────
function initCardReveal() {
  const cards = $$('.blog-card');
  if (!cards.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('card-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  cards.forEach((card, i) => {
    card.style.transitionDelay = `${i * 80}ms`;
    obs.observe(card);
  });
}

// ─────────────────────────────────────────────────────────
//  PARAGRAPH REVEAL (Article Page)
// ─────────────────────────────────────────────────────────
function initParagraphReveal() {
  const paragraphs = $$('.reveal-paragraph');
  if (!paragraphs.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

  paragraphs.forEach((p, i) => {
    p.style.transitionDelay = `${Math.min(i * 40, 200)}ms`;
    obs.observe(p);
  });
}

// ─────────────────────────────────────────────────────────
//  ARTICLE HERO PARALLAX
// ─────────────────────────────────────────────────────────
function initArticleParallax() {
  const heroImg = $('#article-hero-img');
  if (!heroImg) return;

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const translateY = scrollY * 0.35;
    heroImg.style.transform = `scale(1.08) translateY(${translateY}px)`;
  }, { passive: true });
}

// ─────────────────────────────────────────────────────────
//  TABLE OF CONTENTS — AUTO-GENERATE
// ─────────────────────────────────────────────────────────
function initTOC() {
  const tocList = $('#toc-list');
  const articleContent = $('#article-content');
  if (!tocList || !articleContent) return;

  const headings = $$('h2, h3', articleContent);
  if (!headings.length) return;

  headings.forEach((h, i) => {
    if (!h.id) h.id = `section-${i}`;

    const li = document.createElement('li');
    li.className = 'toc-item';
    li.dataset.id = h.id;

    const a = document.createElement('a');
    a.href = `#${h.id}`;
    a.textContent = h.textContent.replace(/^#\s*/, '');
    if (h.tagName === 'H3') a.style.paddingLeft = '1rem';

    a.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    li.appendChild(a);
    tocList.appendChild(li);
  });

  // Active TOC on scroll
  const tocItems = $$('.toc-item');
  window.addEventListener('scroll', () => {
    let current = '';
    headings.forEach(h => {
      const rect = h.getBoundingClientRect();
      if (rect.top <= 130) current = h.id;
    });
    tocItems.forEach(item => {
      item.classList.toggle('active', item.dataset.id === current);
    });
  }, { passive: true });
}

// ─────────────────────────────────────────────────────────
//  VERTICAL READING PROGRESS SIDEBAR
// ─────────────────────────────────────────────────────────
function initVerticalProgress() {
  const fillEl = $('#progress-fill-vertical');
  const pctEl = $('#progress-pct');
  const articleMain = $('#article-main');
  if (!fillEl || !articleMain) return;

  window.addEventListener('scroll', () => {
    const rect = articleMain.getBoundingClientRect();
    const articleTop = articleMain.offsetTop;
    const articleHeight = articleMain.offsetHeight;
    const scrolled = window.scrollY - articleTop;
    const progress = clamp(scrolled / (articleHeight - window.innerHeight), 0, 1) * 100;
    fillEl.style.height = progress + '%';
    if (pctEl) pctEl.textContent = Math.round(progress) + '%';
  }, { passive: true });
}

// ─────────────────────────────────────────────────────────
//  FOCUS MODE
// ─────────────────────────────────────────────────────────
function initFocusMode() {
  const toggleBtn = $('#focus-mode-btn');
  const exitBtn = $('#focus-exit-btn');
  const btnText = $('#focus-btn-text');

  let isActive = false;

  function activateFocus() {
    isActive = true;
    document.body.classList.add('focus-mode-active');
    if (toggleBtn) toggleBtn.classList.add('active');
    if (btnText) btnText.textContent = 'Exit Focus';
  }

  function deactivateFocus() {
    isActive = false;
    document.body.classList.remove('focus-mode-active');
    if (toggleBtn) toggleBtn.classList.remove('active');
    if (btnText) btnText.textContent = 'Focus Mode';
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      if (isActive) deactivateFocus(); else activateFocus();
    });
  }
  if (exitBtn) {
    exitBtn.addEventListener('click', deactivateFocus);
  }

  // Click overlay to exit
  const overlay = $('#focus-overlay');
  if (overlay) {
    overlay.addEventListener('click', deactivateFocus);
  }

  // ESC key to exit
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isActive) deactivateFocus();
  });
}

// ─────────────────────────────────────────────────────────
//  STUDY TIMER (Pomodoro)
// ─────────────────────────────────────────────────────────
function initStudyTimer() {
  const display = $('#timer-display');
  const startBtn = $('#timer-start');
  const resetBtn = $('#timer-reset');
  if (!display) return;

  let duration = 25 * 60; // 25 minutes in seconds
  let remaining = duration;
  let interval = null;
  let isRunning = false;

  function formatTime(s) {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  function tick() {
    remaining--;
    display.textContent = formatTime(remaining);
    if (remaining <= 0) {
      clearInterval(interval);
      isRunning = false;
      startBtn.textContent = 'Start';
      display.style.animation = 'timerPulse 1s ease infinite';
      setTimeout(() => { display.style.animation = ''; }, 4000);
    }
  }

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (isRunning) {
        clearInterval(interval);
        isRunning = false;
        startBtn.textContent = 'Resume';
      } else {
        interval = setInterval(tick, 1000);
        isRunning = true;
        startBtn.textContent = 'Pause';
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      clearInterval(interval);
      isRunning = false;
      remaining = duration;
      display.textContent = formatTime(remaining);
      startBtn.textContent = 'Start';
    });
  }
}

// ─────────────────────────────────────────────────────────
//  COPY LINK BUTTON
// ─────────────────────────────────────────────────────────
function initCopyLink() {
  const copyBtn = $('#copy-link-btn');
  if (!copyBtn) return;

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      const orig = copyBtn.innerHTML;
      copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#25D366" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      setTimeout(() => { copyBtn.innerHTML = orig; }, 2000);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  });
}

// ─────────────────────────────────────────────────────────
//  GSAP ANIMATIONS
// ─────────────────────────────────────────────────────────
function initGSAP() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  // Blog hero floating cards entrance
  gsap.from('.float-card', {
    y: 30,
    opacity: 0,
    stagger: 0.2,
    duration: 1,
    ease: 'power3.out',
    delay: 1
  });

  // Featured card reveal
  const featuredCard = $('.featured-card');
  if (featuredCard) {
    gsap.from(featuredCard, {
      scrollTrigger: {
        trigger: featuredCard,
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      y: 50,
      opacity: 0,
      duration: 1,
      ease: 'power3.out'
    });
  }

  // Grid header reveal
  const gridHeader = $('.grid-header');
  if (gridHeader) {
    gsap.from(gridHeader, {
      scrollTrigger: {
        trigger: gridHeader,
        start: 'top 90%',
        toggleActions: 'play none none none'
      },
      y: 25,
      opacity: 0,
      duration: 0.7,
      ease: 'power2.out'
    });
  }

  // Article sidebar booking CTA — glow pulse
  const bookingCta = $('.sidebar-booking-cta');
  if (bookingCta) {
    gsap.to(bookingCta, {
      boxShadow: '0 10px 40px rgba(159,92,255,0.4), 0 0 60px rgba(159,92,255,0.15)',
      duration: 2,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut'
    });
  }

  // Article hero parallax (additional GSAP layer)
  const articleHero = $('.article-hero');
  if (articleHero) {
    gsap.to('.article-hero-content', {
      scrollTrigger: {
        trigger: articleHero,
        start: 'top top',
        end: 'bottom top',
        scrub: true
      },
      y: -60,
      opacity: 0.3
    });
  }
}

// ─────────────────────────────────────────────────────────
//  SMOOTH SCROLL FOR INTERNAL ANCHOR LINKS
// ─────────────────────────────────────────────────────────
function initSmoothScroll() {
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = 100;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}

// ─────────────────────────────────────────────────────────
//  MOUSE FOLLOW AMBIENT GLOW (Hero)
// ─────────────────────────────────────────────────────────
function initMouseGlow() {
  const hero = $('.blog-hero');
  if (!hero) return;

  const glow = document.createElement('div');
  glow.style.cssText = `
    position: absolute; width: 500px; height: 500px; border-radius: 50%;
    background: radial-gradient(circle, rgba(159,92,255,0.08) 0%, transparent 70%);
    pointer-events: none; transform: translate(-50%, -50%);
    transition: left 0.8s ease, top 0.8s ease; z-index: 2;
  `;
  hero.style.position = 'relative';
  hero.appendChild(glow);

  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    glow.style.left = (e.clientX - rect.left) + 'px';
    glow.style.top = (e.clientY - rect.top) + 'px';
  });
}

// ─────────────────────────────────────────────────────────
//  INIT — RUN EVERYTHING ON DOM READY
// ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initCardTilt();
  initCategoryFilter();
  initCardReveal();
  initParagraphReveal();
  initArticleParallax();
  initTOC();
  initVerticalProgress();
  initFocusMode();
  initStudyTimer();
  initCopyLink();
  initSmoothScroll();
  initMouseGlow();

  // GSAP needs a slight delay to ensure DOM is painted
  requestAnimationFrame(() => {
    setTimeout(initGSAP, 100);
  });
});
