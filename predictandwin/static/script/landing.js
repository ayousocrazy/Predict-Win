
(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /*Simulated auth state*/
  let isLoggedIn = false;

  const authGuest = document.getElementById('authGuest');
  const authUser = document.getElementById('authUser');
  const loginBtn = document.getElementById('loginBtn');
  const signupBtn = document.getElementById('signupBtn');
  const mobileLoginBtn = document.getElementById('mobileLoginBtn');
  const mobileSignupBtn = document.getElementById('mobileSignupBtn');
  const startPredictingBtn = document.getElementById('startPredictingBtn');
  const registerNowBtn = document.getElementById('registerNowBtn');

  function setLoggedIn(value) {
    isLoggedIn = value;
    authGuest.classList.toggle('hidden', isLoggedIn);
    authUser.classList.toggle('hidden', !isLoggedIn);
  }

  function handleAuthAction() {
    setLoggedIn(true);
    document.getElementById('dashboard')?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }

  [loginBtn, signupBtn, mobileLoginBtn, mobileSignupBtn, startPredictingBtn, registerNowBtn]
    .forEach(btn => btn && btn.addEventListener('click', handleAuthAction));

  document.getElementById('dashboardBtn')?.addEventListener('click', () => {
    document.getElementById('dashboard')?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  });

  /*Loader*/
  window.addEventListener('load', () => {
    const loader = document.getElementById('loader');
    setTimeout(() => loader?.classList.add('is-hidden'), 400);
  });

  /*Navbar scroll state + active section highlighting*/
  const navbar = document.getElementById('navbar');
  const scrollProgress = document.getElementById('scrollProgress');
  const backToTop = document.getElementById('backToTop');
  const navLinks = document.querySelectorAll('.nav-link, .mobile-link');
  const sections = document.querySelectorAll('main section[id], .hero[id]');

  function onScroll() {
    const scrollY = window.scrollY;
    navbar.classList.toggle('scrolled', scrollY > 40);
    backToTop.classList.toggle('is-visible', scrollY > 600);

    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
    scrollProgress.style.width = progress + '%';
    scrollProgress.setAttribute('aria-valuenow', Math.round(progress));

    let currentId = sections[0]?.id;
    const triggerLine = scrollY + window.innerHeight * 0.3;
    sections.forEach(sec => {
      if (sec.offsetTop <= triggerLine) currentId = sec.id;
    });
    navLinks.forEach(link => {
      link.classList.toggle('active', link.dataset.section === currentId);
    });
  }
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  });

  /*Mobile hamburger menu*/
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mobileMenu = document.getElementById('mobileMenu');

  function closeMobileMenu() {
    hamburgerBtn.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('is-open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  function openMobileMenu() {
    hamburgerBtn.setAttribute('aria-expanded', 'true');
    mobileMenu.classList.add('is-open');
    mobileMenu.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  hamburgerBtn.addEventListener('click', () => {
    const isOpen = hamburgerBtn.getAttribute('aria-expanded') === 'true';
    isOpen ? closeMobileMenu() : openMobileMenu();
  });
  mobileMenu.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', closeMobileMenu);
  });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMobileMenu();
  });

  /*Smooth scroll for in-page anchors*/
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const id = anchor.getAttribute('href');
      if (id.length > 1) {
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
        }
      }
    });
  });

  /*Mouse glow effect*/
  const mouseGlow = document.getElementById('mouseGlow');
  if (mouseGlow && window.matchMedia('(hover: hover)').matches) {
    window.addEventListener('mousemove', e => {
      mouseGlow.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
    }, { passive: true });
  }

  /*Ripple effect on buttons*/
  document.querySelectorAll('.ripple').forEach(btn => {
    btn.addEventListener('click', function (e) {
      const rect = this.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      ripple.className = 'ripple-fx';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      this.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    });
  });

  /*Scroll reveal via IntersectionObserver*/
  const revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(el => revealObserver.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  /*Animated counters*/
  const counters = document.querySelectorAll('[data-counter]');
  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10) || 0;
    const suffix = el.dataset.suffix || '';
    const duration = 1600;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.floor(eased * target);
      el.textContent = value + suffix;
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target + suffix;
    }
    if (prefersReducedMotion) {
      el.textContent = target + suffix;
    } else {
      requestAnimationFrame(tick);
    }
  }
  if ('IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(el => counterObserver.observe(el));
  } else {
    counters.forEach(animateCounter);
  }

  /*Live countdown timers (kickoff simulation)*/
  function startCountdown(el, initialSeconds) {
    let remaining = initialSeconds;
    function render() {
      const h = String(Math.floor(remaining / 3600)).padStart(2, '0');
      const m = String(Math.floor((remaining % 3600) / 60)).padStart(2, '0');
      const s = String(Math.floor(remaining % 60)).padStart(2, '0');
      if (el) el.textContent = `${h}:${m}:${s}`;
    }
    render();
    setInterval(() => {
      remaining = remaining > 0 ? remaining - 1 : 0;
      render();
    }, 1000);
  }
  const heroCountdown = document.getElementById('heroCountdown');
  const laptopCountdown = document.getElementById('laptopCountdown');
  startCountdown(heroCountdown, 2 * 3600 + 14 * 60 + 33);
  startCountdown(laptopCountdown, 2 * 3600 + 14 * 60 + 33);

  /*FAQ accordion*/
  document.querySelectorAll('.accordion__trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const expanded = trigger.getAttribute('aria-expanded') === 'true';
      const panel = document.getElementById(trigger.getAttribute('aria-controls'));

      document.querySelectorAll('.accordion__trigger').forEach(t => {
        if (t !== trigger) {
          t.setAttribute('aria-expanded', 'false');
          const p = document.getElementById(t.getAttribute('aria-controls'));
          if (p) p.style.maxHeight = null;
        }
      });

      trigger.setAttribute('aria-expanded', String(!expanded));
      if (!expanded) {
        panel.style.maxHeight = panel.scrollHeight + 'px';
      } else {
        panel.style.maxHeight = null;
      }
    });
  });

  /*Typing effect for first hero title line*/
  const typedEl = document.querySelector('[data-typed]');
  if (typedEl && !prefersReducedMotion) {
    const fullText = typedEl.textContent;
    typedEl.textContent = '';
    typedEl.style.borderRight = '2px solid var(--cyan)';
    let i = 0;
    function typeChar() {
      if (i <= fullText.length) {
        typedEl.textContent = fullText.slice(0, i);
        i++;
        setTimeout(typeChar, 45);
      } else {
        setTimeout(() => { typedEl.style.borderRight = 'none'; }, 400);
      }
    }
    setTimeout(typeChar, 700);
  }

  /*Parallax blobs on scroll (subtle, transform/opacity only)*/
  const blobs = document.querySelectorAll('.blob');
  if (!prefersReducedMotion && blobs.length) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const y = window.scrollY * 0.08;
          blobs.forEach((blob, idx) => {
            blob.style.translate = `0 ${y * (idx % 2 === 0 ? 1 : -1)}px`;
          });
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

})();
