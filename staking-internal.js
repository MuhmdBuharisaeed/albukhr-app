/* ================================
   ALBUKHR – INTERNAL STAKING ENGINE
   Backward Compatible (SAFE)
================================ */

/* ====== CONFIG ====== */
const INTERNAL_PROJECTS = {
  "Raheem": {
    minStake: 10,
    rates: {
      30: 0.05,
      60: 0.12,
      90: 0.20
    }
  }
};

/* ====== STORAGE ====== */
function _getStore(){
  return JSON.parse(localStorage.getItem("albukhr_internal_staking") || "{}");
}

function _setStore(data){
  localStorage.setItem("albukhr_internal_staking", JSON.stringify(data));
}

/* ====== HELPERS (PUBLIC API – DO NOT BREAK) ====== */
function getMinStake(project){
  return INTERNAL_PROJECTS[project]?.minStake || 0;
}

function getRate(project, duration){
  return INTERNAL_PROJECTS[project]?.rates[duration] || 0;
}

function formatDateTime(stake){
  const d = new Date(stake.time || Date.now());
  return {
    date: d.toLocaleDateString(),
    time: d.toLocaleTimeString()
  };
}

/* ====== CORE LOGIC ====== */
function addStake(payload){
  if(!payload || payload.type === "external") return;

  const { project, amount, duration } = payload;
  if(!INTERNAL_PROJECTS[project]) return;

  const store = _getStore();
  if(!store[project]){
    store[project] = { stake:0, reward:0, stakes:[] };
  }

  const rate = getRate(project, duration);
  const reward = amount * rate;

  store[project].stake += amount;
  store[project].reward += reward;

  store[project].stakes.push({
    amount,
    duration,
    reward,
    time: Date.now()
  });

  _setStore(store);
}

/* ====== READ TOTALS ====== */
function getProjectTotals(project){
  const store = _getStore();
  return store[project] || { stake:0, reward:0, stakes:[] };
}
