/* =========================================================
   PREDICT & WIN — DASHBOARD SCRIPT
   Vanilla JS only. Handles: live date, animated stat counters,
   countdown chips, filter chips, search, scroll-reveal.
   Does not touch any Django-rendered links/hrefs.
   ========================================================= */
(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', () => {
    setDashDate();
    initStatCounters();
    initCountdowns();
    initFilters();
    initSearch();
    initRevealObserver();
    initCardRipple();
  });

  /* -------------------------------------------------------
     Today's date in the hero
     ------------------------------------------------------- */
  function setDashDate() {
    const el = document.getElementById('dashDate');
    if (!el) return;
    const formatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    el.textContent = formatter.format(new Date());
  }

  /* -------------------------------------------------------
     Animated stat counters
     ------------------------------------------------------- */
  function initStatCounters() {
    const counters = document.querySelectorAll('[data-counter]');
    if (!counters.length) return;

    function animate(el) {
      const target = parseInt(el.dataset.target, 10) || 0;
      if (prefersReducedMotion) { el.textContent = target; return; }
      const duration = 1200;
      const start = performance.now();
      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target);
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = target;
      }
      requestAnimationFrame(tick);
    }

    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) { animate(entry.target); obs.unobserve(entry.target); }
        });
      }, { threshold: 0.6 });
      counters.forEach(el => obs.observe(el));
    } else {
      counters.forEach(animate);
    }
  }

  /* -------------------------------------------------------
     Live countdown chips ("Starts in 2h 14m" / "LIVE SOON")
     ------------------------------------------------------- */
  function initCountdowns() {
    const chips = document.querySelectorAll('[data-countdown]');
    if (!chips.length) return;

    function render(chip) {
      const kickoff = new Date(chip.dataset.kickoff);
      const textEl = chip.querySelector('.countdown-chip__text');
      if (!textEl || isNaN(kickoff.getTime())) return;

      const diffMs = kickoff.getTime() - Date.now();
      if (diffMs <= 0) {
        textEl.textContent = 'LIVE SOON';
        chip.setAttribute('data-live-soon', '');
        return;
      }
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin <= 30) {
        textEl.textContent = 'LIVE SOON';
        chip.setAttribute('data-live-soon', '');
        return;
      }
      const hours = Math.floor(diffMin / 60);
      const mins = diffMin % 60;
      if (hours >= 24) {
        const days = Math.floor(hours / 24);
        textEl.textContent = `Starts in ${days}d ${hours % 24}h`;
      } else {
        textEl.textContent = `Starts in ${hours}h ${mins}m`;
      }
    }

    chips.forEach(render);
    setInterval(() => chips.forEach(render), 60000);
  }

  /*Filter chips (client-side show/hide of match cards)*/
  function initFilters() {
    const chips = document.querySelectorAll('.filter-chip');
    const cards = document.querySelectorAll('.match-card');
    if (!chips.length || !cards.length) return;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday.getTime() + 86400000);
    const startOfDayAfter = new Date(startOfTomorrow.getTime() + 86400000);

    function matches(card, filter) {
      if (filter === 'all') return true;
      if (filter === 'upcoming') return card.classList.contains('match-card--upcoming');
      if (filter === 'completed') return card.classList.contains('match-card--past');
      if (filter === 'group') return (card.dataset.stage || '').includes('group');
      if (filter === 'knockout') return /round-of|quarter|semi|final/.test(card.dataset.stage || '');
      if (filter === 'today' || filter === 'tomorrow') {
        const kickoffAttr = card.dataset.kickoff;
        if (!kickoffAttr) return false;
        const kickoff = new Date(kickoffAttr);
        if (filter === 'today') return kickoff >= startOfToday && kickoff < startOfTomorrow;
        return kickoff >= startOfTomorrow && kickoff < startOfDayAfter;
      }
      return true;
    }

    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        const filter = chip.dataset.filter;

        cards.forEach(card => {
          const show = matches(card, filter);
          card.style.display = show ? '' : 'none';
        });

        toggleSectionEmptyStates();
      });
    });
  }

  /* -------------------------------------------------------
     Search by country name
     ------------------------------------------------------- */
  function initSearch() {
    const input = document.getElementById('matchSearch');
    const cards = document.querySelectorAll('.match-card');
    if (!input || !cards.length) return;

    let debounceTimer;
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const query = input.value.trim().toLowerCase();
        cards.forEach(card => {
          const countries = card.dataset.countries || '';
          const matchesQuery = query === '' || countries.includes(query);
          card.style.display = matchesQuery ? '' : 'none';
        });
        toggleSectionEmptyStates();
      }, 300);
    });
  }

  /* -------------------------------------------------------
     Show a lightweight "no results" message per grid when
     every card in it is hidden by filter/search
     ------------------------------------------------------- */
  function toggleSectionEmptyStates() {
    document.querySelectorAll('.match-grid').forEach(grid => {
      const cards = grid.querySelectorAll('.match-card');
      if (!cards.length) return; // template {% empty %} already handles true-empty case
      const visibleCount = Array.from(cards).filter(c => c.style.display !== 'none').length;

      let noResultsEl = grid.querySelector('.js-no-results');
      if (visibleCount === 0) {
        if (!noResultsEl) {
          noResultsEl = document.createElement('div');
          noResultsEl.className = 'empty-state js-no-results';
          noResultsEl.innerHTML = '<div class="empty-state__illo" aria-hidden="true">🔍</div><p>No matches found.</p>';
          grid.appendChild(noResultsEl);
        }
      } else if (noResultsEl) {
        noResultsEl.remove();
      }
    });
  }

  /* -------------------------------------------------------
     Scroll reveal via IntersectionObserver
     ------------------------------------------------------- */
  function initRevealObserver() {
    const els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;

    if (!('IntersectionObserver' in window) || prefersReducedMotion) {
      els.forEach(el => el.classList.add('is-visible'));
      return;
    }
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => obs.observe(el));
  }

  /* -------------------------------------------------------
     Subtle ripple feedback on match card tap/click
     (the <a> navigation itself is left completely untouched)
     ------------------------------------------------------- */
  function initCardRipple() {
    document.querySelectorAll('.match-card').forEach(card => {
      card.style.position = card.style.position || 'relative';
      card.addEventListener('click', function (e) {
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const ripple = document.createElement('span');
        ripple.className = 'dash-ripple';
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 500);
      });
    });
  }

})();