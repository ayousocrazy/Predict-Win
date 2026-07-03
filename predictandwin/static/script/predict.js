/* =========================================================
   Predict & Win — Prediction Page Interactions
   ========================================================= */

(function () {

'use strict';

/* =========================================================
   STATE
   ========================================================= */

const state = {
  winner: null,

  ftArg: 0,
  ftBra: 0,

  htArg: 0,
  htBra: 0,

  goalsArg: 0,
  goalsBra: 0,

  btts: null,

  firstScorer: null,

  method: null,

  motm: ''
};

const interacted = {
  ft: false,
  ht: false,
  goals: false
};

const LABELS = {

  winner: {
    draw: 'Draw'
  },

  btts: {
    yes: 'Yes',
    no: 'No'
  },

  method: {
    '90': '90 Minutes',
    'ET': 'Extra Time',
    'PEN': 'Penalty Shootout'
  }
};

const HIDDEN_INPUT_IDS = {

  winner: 'winnerInput',

  ftArg: 'ftArgInput',
  ftBra: 'ftBraInput',

  htArg: 'htArgInput',
  htBra: 'htBraInput',

  goalsArg: 'goalsArgInput',
  goalsBra: 'goalsBraInput',

  btts: 'bttsInput',

  firstScorer: 'firstScorerInput',

  method: 'methodInput'
};

const STEP_MAP = {

  'ft-arg': 'ftArg',
  'ft-bra': 'ftBra',

  'ht-arg': 'htArg',
  'ht-bra': 'htBra',

  'goals-arg': 'goalsArg',
  'goals-bra': 'goalsBra'
};

const MAX_STEP = 20;

/* =========================================================
   HELPERS
   ========================================================= */

function syncHiddenInput(stateKey) {

  const id = HIDDEN_INPUT_IDS[stateKey];

  if (!id) return;

  const el = document.getElementById(id);

  if (!el) return;

  el.value = state[stateKey] === null
    ? ''
    : state[stateKey];
}

function setSummaryValue(id, value) {

  const el = document.getElementById(id);

  if (!el) return;

  el.textContent = value;

  el.classList.toggle(
    'is-set',
    value !== '—'
  );
}

function isLocked() {
  const form = document.getElementById('predictionForm');
  return !!form && form.dataset.locked === 'true';
}

/* =========================================================
   SELECT BUTTONS
   ========================================================= */

function initSelectGroups() {

  const buttons = document.querySelectorAll(
    '.select-btn[data-group]'
  );

  buttons.forEach((btn) => {

    btn.addEventListener('click', (e) => {

      if (isLocked()) return;

      const group = btn.dataset.group;
      const value = btn.dataset.value;

      document
        .querySelectorAll(
          '.select-btn[data-group="' + group + '"]'
        )
        .forEach((sib) => {
          sib.classList.remove('is-selected');
        });

      btn.classList.add('is-selected');

      spawnRipple(btn, e);

      applySelection(group, value);

      updateSummary();
      updateProgress();
      updateSubmitState();
    });
  });
}

function applySelection(group, value) {

  switch (group) {

    case 'winner':
      state.winner = value;
      syncHiddenInput('winner');
      break;

    case 'btts':
      state.btts = value;
      syncHiddenInput('btts');
      break;

    case 'first-scorer':
      state.firstScorer = value;
      syncHiddenInput('firstScorer');
      break;

    case 'method':
      state.method = value;
      syncHiddenInput('method');
      break;
  }
}

/* =========================================================
   RIPPLE EFFECT
   ========================================================= */

function spawnRipple(btn, evt) {

  const existing = btn.querySelector('.ripple');

  if (existing) existing.remove();

  const rect = btn.getBoundingClientRect();

  const ripple = document.createElement('span');

  ripple.className = 'ripple';

  const size = Math.max(rect.width, rect.height);

  const x =
    (evt.clientX || rect.left + rect.width / 2)
    - rect.left
    - size / 2;

  const y =
    (evt.clientY || rect.top + rect.height / 2)
    - rect.top
    - size / 2;

  ripple.style.width = size + 'px';
  ripple.style.height = size + 'px';

  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';

  btn.appendChild(ripple);

  ripple.addEventListener('animationend', () => {
    ripple.remove();
  });
}

/* =========================================================
   STEPPERS
   ========================================================= */

function initSteppers() {

  document.querySelectorAll('.step-btn').forEach((btn) => {

    btn.addEventListener('click', () => {

      if (isLocked()) return;

      const targetId = btn.dataset.target;

      const action = btn.dataset.action;

      const stateKey = STEP_MAP[targetId];

      if (!stateKey) return;

      let value = state[stateKey];

      value =
        action === 'plus'
          ? Math.min(MAX_STEP, value + 1)
          : Math.max(0, value - 1);

      state[stateKey] = value;

      syncHiddenInput(stateKey);

      if (targetId.includes('ft')) {
        interacted.ft = true;
      }

      if (targetId.includes('ht')) {
        interacted.ht = true;
      }

      if (targetId.includes('goals')) {
        interacted.goals = true;
      }

      const valueEl = document.getElementById(targetId);

      valueEl.textContent = value;

      valueEl.classList.remove('bump');

      void valueEl.offsetWidth;

      valueEl.classList.add('bump');

      updateSummary();
      updateProgress();
      updateSubmitState();
    });
  });
}

/* =========================================================
   MOTM INPUT
   ========================================================= */

function initMotmInput() {

  const input = document.getElementById('motmInput');

  if (!input) return;

  input.addEventListener('input', () => {

    state.motm = input.value.trim();

    updateSummary();
    updateProgress();
    updateSubmitState();
  });
}

/* =========================================================
   SUMMARY
   ========================================================= */

function updateSummary() {

  setSummaryValue(
    'sumWinner',
    state.winner
      ? state.winner
      : '—'
  );

  setSummaryValue(
    'sumFT',
    interacted.ft
      ? `${state.ftArg} – ${state.ftBra}`
      : '—'
  );

  setSummaryValue(
    'sumHT',
    interacted.ht
      ? `${state.htArg} – ${state.htBra}`
      : '—'
  );

  setSummaryValue(
    'sumGoals',
    interacted.goals
      ? `${state.goalsArg} – ${state.goalsBra}`
      : '—'
  );

  setSummaryValue(
    'sumBTTS',
    state.btts
      ? LABELS.btts[state.btts]
      : '—'
  );

  setSummaryValue(
    'sumFirstScorer',
    state.firstScorer
      ? state.firstScorer
      : '—'
  );

  setSummaryValue(
    'sumMethod',
    state.method
      ? LABELS.method[state.method]
      : '—'
  );

  setSummaryValue(
    'sumMOTM',
    state.motm
      ? state.motm
      : '—'
  );
}

/* =========================================================
   PROGRESS
   ========================================================= */

function updateProgress() {

  const total = 8;

  let answered = 0;

  if (state.winner) answered++;

  if (interacted.ft) answered++;

  if (interacted.ht) answered++;

  if (interacted.goals) answered++;

  if (state.btts) answered++;

  if (state.firstScorer) answered++;

  if (state.method) answered++;

  if (state.motm) answered++;

  const percent = Math.round(
    (answered / total) * 100
  );

  const fill = document.getElementById('progressFill');

  const label = document.getElementById('progressPercent');

  if (fill) {
    fill.style.width = percent + '%';
  }

  if (label) {
    label.textContent = percent + '%';
  }
}

/* =========================================================
   SUBMIT BUTTON STATE
   ========================================================= */

function updateSubmitState() {

  const submitBtn = document.getElementById('submitBtn');

  if (!submitBtn) return;

  const hasAnyPrediction =

    state.winner ||

    interacted.ft ||

    interacted.ht ||

    interacted.goals ||

    state.btts ||

    state.firstScorer ||

    state.method ||

    state.motm;

  submitBtn.disabled = !hasAnyPrediction;

  submitBtn.classList.toggle(
    'is-disabled',
    !hasAnyPrediction
  );
}

/* =========================================================
   COUNTDOWN
   ========================================================= */

function initCountdown() {

  const el = document.getElementById('countdownTimer');

  if (!el) return;

  const deadline = el.dataset.deadline;

  if (!deadline) return;

  const targetTime = new Date(deadline).getTime();

  function tick() {

    const now = new Date().getTime();

    const distance = targetTime - now;

    if (distance <= 0) {

      el.textContent = 'Prediction Closed';

      lockForm('already-submitted');

      return;
    }

    const hours = Math.floor(
      (distance % (1000 * 60 * 60 * 24))
      / (1000 * 60 * 60)
    );

    const minutes = Math.floor(
      (distance % (1000 * 60 * 60))
      / (1000 * 60)
    );

    const seconds = Math.floor(
      (distance % (1000 * 60))
      / 1000
    );

    el.textContent =
      String(hours).padStart(2, '0')
      + ':'
      + String(minutes).padStart(2, '0')
      + ':'
      + String(seconds).padStart(2, '0');
  }

  tick();

  setInterval(tick, 1000);
}

/* =========================================================
   LOCK FORM
   ========================================================= */

function lockForm(reason) {

  document.body.dataset.locked = 'true';

  document
    .querySelectorAll(
      '#predictionForm button, #predictionForm input:not([type="hidden"])'
    )
    .forEach((el) => {
      el.disabled = true;
    });

  const submitBtn =
    document.getElementById('submitBtn');

  if (submitBtn) {

    submitBtn.disabled = true;

    submitBtn.querySelector('span').textContent =
      reason === 'submitting'
        ? 'Submitting...'
        : 'Already Submitted';
  }

  const banner =
    document.getElementById('lockedBanner');

  if (
    banner &&
    reason !== 'submitting'
  ) {
    banner.hidden = false;
  }
}

/* =========================================================
   INITIAL LOCK CHECK
   ========================================================= */

function initLockCheck() {

  const form = document.getElementById('predictionForm');

  const alreadyPredictedFromServer =
    !!form && form.dataset.alreadyPredicted === 'true';

  if (alreadyPredictedFromServer) {
    lockForm('already-submitted');
  }
}

/* =========================================================
   SUBMIT
   ========================================================= */

function initSubmit() {

  const form =
    document.getElementById('predictionForm');

  const toast =
    document.getElementById('toast');

  if (!form) return;

  form.addEventListener('submit', (e) => {

    if (isLocked()) {

      e.preventDefault();

      return;
    }

    const hasAnyPrediction =

      state.winner ||

      interacted.ft ||

      interacted.ht ||

      interacted.goals ||

      state.btts ||

      state.firstScorer ||

      state.method ||

      state.motm;

    if (!hasAnyPrediction) {

      e.preventDefault();

      if (toast) {

        toast.textContent =
          'Make at least one prediction before submitting.';

        toast.classList.add('is-visible');

        clearTimeout(initSubmit._t);

        initSubmit._t = setTimeout(() => {

          toast.classList.remove('is-visible');

        }, 2500);
      }

      return;
    }

    lockForm('submitting');
  });
}

/* =========================================================
   BACK BUTTON
   ========================================================= */

function initBackLink() {

  const link =
    document.getElementById('backLink');

  if (!link) return;

  link.addEventListener('click', (e) => {

    e.preventDefault();

    window.history.back();
  });
}

/* =========================================================
   INIT
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  initLockCheck();

  initSelectGroups();

  initSteppers();

  initMotmInput();

  initCountdown();

  initSubmit();

  initBackLink();

  updateSummary();

  updateProgress();

  updateSubmitState();
});

})();