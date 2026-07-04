(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    setupScrollReveal();
  }

  /* ---------------------------------------------------------------------
   * Fade-in / card reveal on scroll
   * ------------------------------------------------------------------- */
  function setupScrollReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry, i) {
          if (entry.isIntersecting) {
            // slight stagger so detail cards don't all pop at once
            var delay = Array.prototype.indexOf.call(items, entry.target) * 40;
            setTimeout(function () {
              entry.target.classList.add("is-visible");
            }, Math.min(delay, 240));
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -30px 0px" }
    );

    items.forEach(function (el) {
      observer.observe(el);
    });
  }
})();