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

  totalGoals: 0,
  goalsFirstHalf: 0,

  btts: null,
  first15: null,

  firstScorer: null,

  method: null,
  margin: null,

  motm: '',

  redCard: null,
  yellowCards: 0,
  penalty: null,
  ownGoal: null,

  totalCorners: 0,
  mostCorners: null
};

const interacted = {
  ft: false,
  ht: false,
  goals: false,
  totalGoals: false,
  goalsFirstHalf: false,
  yellowCards: false,
  totalCorners: false
};

const LABELS = {

  winner: {
    draw: 'Draw'
  },

  btts: {
    yes: 'Yes',
    no: 'No'
  },

  first15: {
    yes: 'Yes',
    no: 'No'
  },

  method: {
    '90': '90 Minutes',
    'ET': 'Extra Time',
    'PEN': 'Penalty Shootout'
  },

  margin: {
    '1': '1 Goal',
    '2': '2 Goals',
    '3': '3+ Goals'
  },

  mostCorners: {
    draw: 'Equal'
  },

  redCard: {
    yes: 'Yes',
    no: 'No'
  },

  penalty: {
    yes: 'Yes',
    no: 'No'
  },

  ownGoal: {
    yes: 'Yes',
    no: 'No'
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
  totalGoals: 'totalGoalsInput',
  goalsFirstHalf: 'goalsFirstHalfInput',
  btts: 'bttsInput',
  first15: 'first15Input',
  firstScorer: 'firstScorerInput',
  method: 'methodInput',
  margin: 'marginInput',
  motm: 'motmHiddenInput',
  redCard: 'redCardInput',
  yellowCards: 'yellowCardsInput',
  penalty: 'penaltyInput',
  ownGoal: 'ownGoalInput',
  totalCorners: 'totalCornersInput',
  mostCorners: 'mostCornersInput'
};

const STEP_MAP = {

  'ft-arg': 'ftArg',
  'ft-bra': 'ftBra',

  'ht-arg': 'htArg',
  'ht-bra': 'htBra',

  'goals-arg': 'goalsArg',
  'goals-bra': 'goalsBra',

  'total-goals': 'totalGoals',
  'goals-first-half': 'goalsFirstHalf',

  'yellow-cards': 'yellowCards',
  'total-corners': 'totalCorners'
};

// Reverse of STEP_MAP: stateKey -> DOM id, used when pre-filling from
// an existing prediction.
const STATE_TO_STEP_ID = {};
Object.keys(STEP_MAP).forEach((domId) => {
  STATE_TO_STEP_ID[STEP_MAP[domId]] = domId;
});

// Which "interacted" flag (if any) a given stepper stateKey belongs to.
const STEP_INTERACTED_KEY = {
  ftArg: 'ft', ftBra: 'ft',
  htArg: 'ht', htBra: 'ht',
  goalsArg: 'goals', goalsBra: 'goals',
  totalGoals: 'totalGoals',
  goalsFirstHalf: 'goalsFirstHalf',
  yellowCards: 'yellowCards',
  totalCorners: 'totalCorners'
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

    case 'first15':
      state.first15 = value;
      syncHiddenInput('first15');
      break;

    case 'first-scorer':
      state.firstScorer = value;
      syncHiddenInput('firstScorer');
      break;

    case 'method':
      state.method = value;
      syncHiddenInput('method');
      break;

    case 'margin':
      state.margin = value;
      syncHiddenInput('margin');
      break;

    case 'redcard':
      state.redCard = value;
      syncHiddenInput('redCard');
      break;

    case 'penalty':
      state.penalty = value;
      syncHiddenInput('penalty');
      break;

    case 'owngoal':
      state.ownGoal = value;
      syncHiddenInput('ownGoal');
      break;

    case 'most-corners':
      state.mostCorners = value;
      syncHiddenInput('mostCorners');
      break;
  }
}

// Visually marks the matching button as selected without firing a click
// (used for pre-filling from an existing prediction).
function selectButtonByValue(group, value) {

  if (value === null || value === undefined || value === '') return;

  document
    .querySelectorAll('.select-btn[data-group="' + group + '"]')
    .forEach((sib) => {
      sib.classList.remove('is-selected');
    });

  const btn = document.querySelector(
    '.select-btn[data-group="' + group + '"][data-value="' + value + '"]'
  );

  if (btn) btn.classList.add('is-selected');
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

      const interactedKey = STEP_INTERACTED_KEY[stateKey];
      if (interactedKey) {
        interacted[interactedKey] = true;
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

// Sets a stepper's displayed number directly (used for pre-filling).
function setStepperDisplay(targetId, value) {
  const el = document.getElementById(targetId);
  if (el) el.textContent = value;
}

/* =========================================================
   MOTM INPUT
   ========================================================= */

function initMotmInput() {

  const input = document.getElementById('motmInput');

  if (!input) return;

  input.addEventListener('input', () => {

    state.motm = input.value.trim();
    syncHiddenInput('motm');
    updateSummary();
    updateProgress();
    updateSubmitState();
  });
}

/* =========================================================
   EXISTING PREDICTION (pre-fill on load)
   ========================================================= */

function readExistingPredictionData() {

  const el = document.getElementById('existing-prediction-data');

  if (!el) return null;

  try {
    const parsed = JSON.parse(el.textContent);
    return parsed || null;
  } catch (e) {
    return null;
  }
}

function applyExistingPrediction(data) {

  if (!data) return;

  // Winner
  if (data.winner) {
    state.winner = data.winner;
    selectButtonByValue('winner', data.winner);
  }

  // Full time score
  if (data.full_time_country1 !== null && data.full_time_country1 !== undefined) {
    state.ftArg = parseInt(data.full_time_country1, 10) || 0;
    interacted.ft = true;
  }
  if (data.full_time_country2 !== null && data.full_time_country2 !== undefined) {
    state.ftBra = parseInt(data.full_time_country2, 10) || 0;
    interacted.ft = true;
  }

  // Half time score
  if (data.half_time_country1 !== null && data.half_time_country1 !== undefined) {
    state.htArg = parseInt(data.half_time_country1, 10) || 0;
    interacted.ht = true;
  }
  if (data.half_time_country2 !== null && data.half_time_country2 !== undefined) {
    state.htBra = parseInt(data.half_time_country2, 10) || 0;
    interacted.ht = true;
  }

  // Goals scored (per team)
  if (data.goals_country1 !== null && data.goals_country1 !== undefined) {
    state.goalsArg = parseInt(data.goals_country1, 10) || 0;
    interacted.goals = true;
  }
  if (data.goals_country2 !== null && data.goals_country2 !== undefined) {
    state.goalsBra = parseInt(data.goals_country2, 10) || 0;
    interacted.goals = true;
  }

  // Total goals
  if (data.total_goals !== null && data.total_goals !== undefined) {
    state.totalGoals = parseInt(data.total_goals, 10) || 0;
    interacted.totalGoals = true;
  }

  // Goals in first half
  if (data.goals_first_half !== null && data.goals_first_half !== undefined) {
    state.goalsFirstHalf = parseInt(data.goals_first_half, 10) || 0;
    interacted.goalsFirstHalf = true;
  }

  // Both teams to score
  if (data.both_teams_to_score) {
    state.btts = data.both_teams_to_score;
    selectButtonByValue('btts', data.both_teams_to_score);
  }

  // Goal in first 15 minutes
  if (data.goal_in_first_15) {
    state.first15 = data.goal_in_first_15;
    selectButtonByValue('first15', data.goal_in_first_15);
  }

  // First team to score
  if (data.first_team_to_score) {
    state.firstScorer = data.first_team_to_score;
    selectButtonByValue('first-scorer', data.first_team_to_score);
  }

  // Winning method
  if (data.winning_method) {
    state.method = data.winning_method;
    selectButtonByValue('method', data.winning_method);
  }

  // Winning margin
  if (data.winning_margin) {
    state.margin = data.winning_margin;
    selectButtonByValue('margin', data.winning_margin);
  }

  // Man of the match
  if (data.man_of_the_match) {
    state.motm = data.man_of_the_match;
    const motmInput = document.getElementById('motmInput');
    if (motmInput) motmInput.value = data.man_of_the_match;
    syncHiddenInput('motm');
  }

  // Red card
  if (data.red_card) {
    state.redCard = data.red_card;
    selectButtonByValue('redcard', data.red_card);
  }

  // Yellow cards
  if (data.yellow_cards !== null && data.yellow_cards !== undefined) {
    state.yellowCards = parseInt(data.yellow_cards, 10) || 0;
    interacted.yellowCards = true;
  }

  // Penalty awarded
  if (data.penalty_awarded) {
    state.penalty = data.penalty_awarded;
    selectButtonByValue('penalty', data.penalty_awarded);
  }

  // Own goal
  if (data.own_goal) {
    state.ownGoal = data.own_goal;
    selectButtonByValue('owngoal', data.own_goal);
  }

  // Total corners
  if (data.total_corners !== null && data.total_corners !== undefined) {
    state.totalCorners = parseInt(data.total_corners, 10) || 0;
    interacted.totalCorners = true;
  }

  // Team with most corners
  if (data.team_most_corners) {
    state.mostCorners = data.team_most_corners;
    selectButtonByValue('most-corners', data.team_most_corners);
  }

  // Push everything into the visible stepper numbers + hidden inputs
  Object.keys(STATE_TO_STEP_ID).forEach((stateKey) => {
    setStepperDisplay(STATE_TO_STEP_ID[stateKey], state[stateKey]);
    syncHiddenInput(stateKey);
  });

  syncHiddenInput('winner');
  syncHiddenInput('btts');
  syncHiddenInput('first15');
  syncHiddenInput('firstScorer');
  syncHiddenInput('method');
  syncHiddenInput('margin');
  syncHiddenInput('redCard');
  syncHiddenInput('penalty');
  syncHiddenInput('ownGoal');
  syncHiddenInput('mostCorners');
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
    'sumTotalGoals',
    interacted.totalGoals
      ? `${state.totalGoals}`
      : '—'
  );

  setSummaryValue(
    'sumFirstHalfGoals',
    interacted.goalsFirstHalf
      ? `${state.goalsFirstHalf}`
      : '—'
  );

  setSummaryValue(
    'sumBTTS',
    state.btts
      ? LABELS.btts[state.btts]
      : '—'
  );

  setSummaryValue(
    'sumFirst15',
    state.first15
      ? LABELS.first15[state.first15]
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
    'sumMargin',
    state.margin
      ? LABELS.margin[state.margin]
      : '—'
  );

  setSummaryValue(
    'sumMOTM',
    state.motm
      ? state.motm
      : '—'
  );

  setSummaryValue(
    'sumRedCard',
    state.redCard
      ? LABELS.redCard[state.redCard]
      : '—'
  );

  setSummaryValue(
    'sumYellowCards',
    interacted.yellowCards
      ? `${state.yellowCards}`
      : '—'
  );

  setSummaryValue(
    'sumPenalty',
    state.penalty
      ? LABELS.penalty[state.penalty]
      : '—'
  );

  setSummaryValue(
    'sumOwnGoal',
    state.ownGoal
      ? LABELS.ownGoal[state.ownGoal]
      : '—'
  );

  setSummaryValue(
    'sumTotalCorners',
    interacted.totalCorners
      ? `${state.totalCorners}`
      : '—'
  );

  setSummaryValue(
    'sumMostCorners',
    state.mostCorners
      ? (LABELS.mostCorners[state.mostCorners] || state.mostCorners)
      : '—'
  );
}

/* =========================================================
   PROGRESS
   ========================================================= */

function updateProgress() {

  const total = 18;

  let answered = 0;

  if (state.winner) answered++;
  if (interacted.ft) answered++;
  if (interacted.ht) answered++;
  if (interacted.goals) answered++;
  if (interacted.totalGoals) answered++;
  if (interacted.goalsFirstHalf) answered++;
  if (state.btts) answered++;
  if (state.first15) answered++;
  if (state.firstScorer) answered++;
  if (state.method) answered++;
  if (state.margin) answered++;
  if (state.motm) answered++;
  if (state.redCard) answered++;
  if (interacted.yellowCards) answered++;
  if (state.penalty) answered++;
  if (state.ownGoal) answered++;
  if (interacted.totalCorners) answered++;
  if (state.mostCorners) answered++;

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

function hasAnyPredictionMade() {
  return !!(
    state.winner ||
    interacted.ft ||
    interacted.ht ||
    interacted.goals ||
    interacted.totalGoals ||
    interacted.goalsFirstHalf ||
    state.btts ||
    state.first15 ||
    state.firstScorer ||
    state.method ||
    state.margin ||
    state.motm ||
    state.redCard ||
    interacted.yellowCards ||
    state.penalty ||
    state.ownGoal ||
    interacted.totalCorners ||
    state.mostCorners
  );
}

function updateSubmitState() {

  const submitBtn = document.getElementById('submitBtn');

  if (!submitBtn) return;

  if (isLocked()) return; // don't fight with lockForm's own disabling

  const anyPrediction = hasAnyPredictionMade();

  submitBtn.disabled = !anyPrediction;

  submitBtn.classList.toggle(
    'is-disabled',
    !anyPrediction
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

  const form = document.getElementById('predictionForm');
  if (form) form.dataset.locked = 'true';

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

    if (!hasAnyPredictionMade()) {

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

  // Pre-fill from a saved prediction BEFORE locking, so the lock step
  // disables inputs that already show the right values.
  const existingData = readExistingPredictionData();

  if (existingData) {
    applyExistingPrediction(existingData);
  }

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