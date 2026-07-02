(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    initFloatingFields();
    initPasswordToggles();
    initUsernameAvailability();
    initPasswordStrength();
    initOtpBoxes();
    initOtpCountdown();
    initButtonEffects();
  });

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function initFloatingFields() {
    qsa(".pw-field").forEach(function (field) {
      var input = field.querySelector("input, select, textarea");
      if (!input) return;

      input.classList.add("pw-input");
      var hasToggle = field.querySelector(".pw-field__toggle");
      if (hasToggle) input.classList.add("pw-input--has-toggle");

      function sync() {
        var filled = input.value && input.value.length > 0;
        field.classList.toggle("pw-field--filled", !!filled);
      }

      input.addEventListener("focus", function () { field.classList.add("pw-field--focused"); });
      input.addEventListener("blur", function () { field.classList.remove("pw-field--focused"); sync(); });
      input.addEventListener("input", sync);
      sync(); // handle browser autofill / re-rendered values on validation errors
    });
  }

  /*Password visibility toggles*/
  function initPasswordToggles() {
    qsa(".pw-field__toggle").forEach(function (btn) {
      var field = btn.closest(".pw-field");
      var input = field && field.querySelector("input");
      if (!input) return;

      btn.addEventListener("click", function () {
        var isPassword = input.getAttribute("type") === "password";
        input.setAttribute("type", isPassword ? "text" : "password");
        btn.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
        btn.setAttribute("aria-pressed", isPassword ? "true" : "false");
        btn.classList.toggle("pw-field__toggle--visible", isPassword);
        input.focus({ preventScroll: true });
      });
    });
  }

  /*Live username availability check*/
  function initUsernameAvailability() {
    var field = qs('[data-field="username"]');
    if (!field) return;

    var input = field.querySelector("input");
    var status = field.querySelector(".pw-status");
    if (!input || !status) return;

    var spinner = status.querySelector(".pw-status__spinner");
    var text = status.querySelector(".pw-status__text");
    var timer = null;
    var currentRequest = 0;

    function setState(state, message) {
      status.setAttribute("data-state", state);
      if (text) text.textContent = message || "";
      if (spinner) spinner.style.display = state === "checking" ? "inline-block" : "none";
    }

    input.addEventListener("input", function () {
      var value = input.value.trim();
      window.clearTimeout(timer);

      if (!value) { setState("idle", ""); return; }
      if (value.length < 3) { setState("idle", ""); return; }

      timer = window.setTimeout(function () {
        var requestId = ++currentRequest;
        setState("checking", "Checking availability…");

        fetch("/check-username/?username=" + encodeURIComponent(value), {
          headers: { "X-Requested-With": "XMLHttpRequest" }
        })
          .then(function (res) { return res.json(); })
          .then(function (data) {
            if (requestId !== currentRequest) return; // stale response
            if (data && data.available) {
              setState("available", "Username available");
            } else {
              setState("taken", "Username already taken");
            }
          })
          .catch(function () {
            if (requestId !== currentRequest) return;
            setState("idle", "");
          });
      }, 500);
    });
  }

  /*Password strength meter*/
  function initPasswordStrength() {
    var field = qs('[data-field="password"]');
    var meter = qs(".pw-strength");
    if (!field || !meter) return;

    var input = field.querySelector("input");
    if (!input) return;

    var label = meter.querySelector(".pw-strength__label");
    var rules = {
      length: meter.querySelector('[data-rule="length"]'),
      upper: meter.querySelector('[data-rule="upper"]'),
      lower: meter.querySelector('[data-rule="lower"]'),
      number: meter.querySelector('[data-rule="number"]'),
      special: meter.querySelector('[data-rule="special"]')
    };

    input.addEventListener("input", function () {
      var value = input.value;
      var checks = {
        length: value.length >= 8,
        upper: /[A-Z]/.test(value),
        lower: /[a-z]/.test(value),
        number: /[0-9]/.test(value),
        special: /[^A-Za-z0-9]/.test(value)
      };

      Object.keys(checks).forEach(function (key) {
        var el = rules[key];
        if (el) el.setAttribute("data-met", checks[key] ? "true" : "false");
      });

      var score = Object.keys(checks).filter(function (k) { return checks[k]; }).length;
      var level = "weak";
      if (value.length === 0) level = "";
      else if (score >= 5) level = "strong";
      else if (score >= 3) level = "medium";
      else level = "weak";

      meter.setAttribute("data-level", level);
      if (label) {
        label.textContent = value.length === 0 ? "Password strength"
          : level === "strong" ? "Strong password"
          : level === "medium" ? "Medium strength"
          : "Weak password";
      }
    });
  }

  /*OTP boxes*/
  function initOtpBoxes() {
    var wrap = qs(".pw-otp");
    if (!wrap) return;

    var boxes = qsa(".pw-otp__box", wrap);
    var nativeContainer = qs(".pw-otp-native");
    var nativeInput = nativeContainer ? nativeContainer.querySelector("input") : null;

    function syncNative() {
      var code = boxes.map(function (b) { return b.value; }).join("");
      if (nativeInput) nativeInput.value = code;
    }

    boxes.forEach(function (box, index) {
      box.addEventListener("input", function () {
        box.value = box.value.replace(/[^0-9]/g, "").slice(-1);
        box.classList.toggle("pw-otp__box--filled", !!box.value);
        if (box.value && boxes[index + 1]) boxes[index + 1].focus();
        syncNative();
      });

      box.addEventListener("keydown", function (e) {
        if (e.key === "Backspace" && !box.value && boxes[index - 1]) {
          boxes[index - 1].focus();
        }
      });

      box.addEventListener("paste", function (e) {
        e.preventDefault();
        var pasted = (e.clipboardData || window.clipboardData).getData("text").replace(/[^0-9]/g, "");
        if (!pasted) return;
        pasted.split("").forEach(function (digit, i) {
          if (boxes[i]) {
            boxes[i].value = digit;
            boxes[i].classList.add("pw-otp__box--filled");
          }
        });
        var next = boxes[Math.min(pasted.length, boxes.length - 1)];
        if (next) next.focus();
        syncNative();
      });
    });

    // Keep the decorative boxes in sync if the native field already has a
    // value (e.g. after a failed verification round-trip).
    if (nativeInput && nativeInput.value) {
      nativeInput.value.split("").forEach(function (digit, i) {
        if (boxes[i]) {
          boxes[i].value = digit;
          boxes[i].classList.add("pw-otp__box--filled");
        }
      });
    }
  }

  /*OTP countdown timer*/
  function initOtpCountdown() {
    var timerEl = qs("[data-otp-timer]");
    var resendBtn = qs("[data-otp-resend]");
    if (!timerEl) return;

    // OTP expires in 5 minutes
    var expirySeconds = 300;

    // Resend allowed after 30 seconds
    var resendCooldown = 30;

    function render() {
        var m = Math.floor(expirySeconds / 60);
        var s = expirySeconds % 60;

        timerEl.textContent =
        String(m).padStart(2, "0") +
        ":" +
        String(s).padStart(2, "0");
    }

    render();

    // Disable resend only briefly
    if (resendBtn) resendBtn.disabled = true;

    // Enable resend after cooldown
    window.setTimeout(function () {
        if (resendBtn) resendBtn.disabled = false;
    }, resendCooldown * 1000);

    // Continue expiry countdown independently
    var interval = window.setInterval(function () {
        expirySeconds -= 1;

        if (expirySeconds <= 0) {
        expirySeconds = 0;
        render();
        window.clearInterval(interval);

        // Optional: show OTP expired message
        timerEl.textContent = "OTP expired";
        return;
        }

        render();
    }, 1000);
    }
  /*Button ripple + loading-state on submit*/
  function initButtonEffects() {
    qsa(".pw-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        var rect = btn.getBoundingClientRect();
        var ripple = document.createElement("span");
        var size = Math.max(rect.width, rect.height);
        ripple.className = "pw-ripple";
        ripple.style.width = ripple.style.height = size + "px";
        ripple.style.left = (e.clientX - rect.left - size / 2) + "px";
        ripple.style.top = (e.clientY - rect.top - size / 2) + "px";
        btn.appendChild(ripple);
        window.setTimeout(function () { ripple.remove(); }, 650);
      });
    });

    qsa("form.pw-form, form.pw-otp-form").forEach(function (form) {
      form.addEventListener("submit", function () {
        var submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.setAttribute("data-loading", "true");
      });
    });
  }
})();