(() => {
  'use strict';

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    initFieldStates();
    initPasswordToggle();
    initRipple();
    initSubmitLoadingState();
  }

  function initFieldStates() {
    document.querySelectorAll('.pw-field').forEach(field => {
      const input = field.querySelector('input');
      if (!input) return;

      const sync = () => field.classList.toggle('has-value', input.value.trim().length > 0);
      sync();

      input.addEventListener('focus', () => field.classList.add('is-focused'));
      input.addEventListener('blur', () => {
        field.classList.remove('is-focused');
        sync();
      });
      input.addEventListener('input', sync);
    });
  }

  /*Password show/hide toggle*/
  function initPasswordToggle() {
    document.querySelectorAll('[data-toggle-password]').forEach(btn => {
      btn.addEventListener('click', () => {
        const field = btn.closest('.pw-field');
        const input = field ? field.querySelector('input') : null;
        if (!input) return;

        const isVisible = input.type === 'text';
        input.type = isVisible ? 'password' : 'text';
        field.classList.toggle('is-password-visible', !isVisible);
        btn.setAttribute('aria-pressed', String(!isVisible));
        btn.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
        input.focus({ preventScroll: true });
      });
    });
  }

  /*Ripple micro-interaction on the login button*/
  function initRipple() {
    const btn = document.getElementById('loginSubmitBtn');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple = document.createElement('span');
      ripple.className = 'login-ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      this.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    });
  }

  function initSubmitLoadingState() {
    const form = document.getElementById('loginForm');
    const btn = document.getElementById('loginSubmitBtn');
    if (!form || !btn) return;

    form.addEventListener('submit', () => {
      if (form.checkValidity() === false) return;
      btn.classList.add('is-loading');
      btn.disabled = true;
      // button stays disabled through page navigation/reload,
    });
  }

})();