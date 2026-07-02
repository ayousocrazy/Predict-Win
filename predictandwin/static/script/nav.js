(() => {
  'use strict';

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    initProfileDropdown();
    initRipple();
    initActiveIndicator();
  }

  /*Profile dropdown*/
  function initProfileDropdown() {
    const trigger = document.getElementById('pwProfileTrigger');
    const menu = document.getElementById('pwProfileMenu');
    if (!trigger || !menu) return;

    function openMenu() {
      trigger.setAttribute('aria-expanded', 'true');
      menu.classList.add('is-open');
      menu.setAttribute('aria-hidden', 'false');
    }
    function closeMenu() {
      trigger.setAttribute('aria-expanded', 'false');
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
    }
    function isOpen() {
      return trigger.getAttribute('aria-expanded') === 'true';
    }

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      isOpen() ? closeMenu() : openMenu();
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (isOpen() && !menu.contains(e.target) && !trigger.contains(e.target)) {
        closeMenu();
      }
    });

    // Close on Escape, return focus to trigger
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) {
        closeMenu();
        trigger.focus();
      }
    });

    // Basic roving keyboard support inside the menu
    menu.addEventListener('keydown', (e) => {
      const items = Array.from(menu.querySelectorAll('.pw-profile__menu-item'));
      const currentIndex = items.indexOf(document.activeElement);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = items[currentIndex + 1] || items[0];
        next.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = items[currentIndex - 1] || items[items.length - 1];
        prev.focus();
      }
    });
  }

  /*Ripple micro-interaction on nav links / bottom nav items*/
  function initRipple() {
    const targets = document.querySelectorAll('.pw-nav-link, .pw-bottom-nav__item, .pw-profile__trigger');
    targets.forEach(el => {
      el.style.position = el.style.position || 'relative';
      el.style.overflow = 'hidden';
      el.addEventListener('click', function (e) {
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const ripple = document.createElement('span');
        ripple.className = 'pw-ripple';
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        this.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
      });
    });
  }
  
  function initActiveIndicator() {
    const list = document.getElementById('pwNavList');
    const indicator = document.getElementById('pwNavIndicator');
    if (!list || !indicator) return;

    function placeIndicator() {
      const activeLink = list.querySelector('.pw-nav-link.is-active');
      if (!activeLink) {
        indicator.style.width = '0px';
        return;
      }
      const item = activeLink.closest('.pw-nav-item');
      indicator.style.width = item.offsetWidth + 'px';
      indicator.style.transform = `translateX(${item.offsetLeft}px)`;
    }

    placeIndicator();
    window.addEventListener('resize', placeIndicator);

    // Re-place after fonts load, since widths can shift
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(placeIndicator);
    }
  }

})();