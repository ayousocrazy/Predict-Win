/**
 * Predict&Win — Leaderboard interactions
 * - Fade-in on scroll for hero/podium/list elements
 * - Floating "Your Position" card that tracks the current user's row
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    setupScrollReveal();
    setupFloatingPositionCard();
  }

  /* ---------------------------------------------------------------------
   * Fade-in on scroll
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
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    items.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ---------------------------------------------------------------------
   * Floating "Your Position" card
   *
   * Reads rank/points straight from the current user's row
   * (data-rank / data-points), which are rendered server-side
   * by Django, so no extra API call is needed.
   *
   * The card appears once the user scrolls past the hero, and
   * hides again automatically while the user's own row is
   * already visible on screen (no need to remind them then).
   * ------------------------------------------------------------------- */
  function setupFloatingPositionCard() {
    var floatCard = document.getElementById("lbFloat");
    var currentRow = document.querySelector('[data-current-user="true"]');
    if (!floatCard) return;

    // No current-user row rendered in the full list — the user is
    // likely already on the podium (top 3), so skip the floating card.
    if (!currentRow) return;

    var rankEl = document.getElementById("lbFloatRank");
    var pointsEl = document.getElementById("lbFloatPoints");
    var rank = currentRow.getAttribute("data-rank");
    var points = currentRow.getAttribute("data-points");

    if (rankEl) rankEl.textContent = "#" + rank;
    if (pointsEl) pointsEl.textContent = points + " pts";

    var hero = document.querySelector(".lb-hero");
    var pastHero = false;

    var heroObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          pastHero = !entry.isIntersecting;
          updateVisibility();
        });
      },
      { threshold: 0 }
    );
    if (hero) heroObserver.observe(hero);

    var rowInView = false;
    var rowObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          rowInView = entry.isIntersecting;
          updateVisibility();
        });
      },
      { threshold: 0.6 }
    );
    rowObserver.observe(currentRow);

    function updateVisibility() {
      var shouldShow = pastHero && !rowInView;
      floatCard.hidden = false; // keep in DOM for transition, control via class
      floatCard.classList.toggle("is-visible", shouldShow);
    }
  }
})();
