// ===============================
// ALBUKHR STAKING ENGINE (FINAL)
// ===============================

const STORAGE_KEY = "albukhr_stakes";

/* ===============================
   CORE STORAGE
================================ */
function getStakes() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function saveStakes(stakes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stakes));
}

/* ===============================
   RULES
================================ */
const PROJECT_RULES = {
  Raheem: { minStake: 10 },
  Hauwal: { minStake: 20 }
};

function getMinStake(project){
  return PROJECT_RULES[project]?.minStake || 0;
}

/* ===============================
   RATES
================================ */
function getRate(project, duration) {
  if (project === "Raheem") {
    return duration === 30 ? 0.01 :
           duration === 60 ? 0.025 : 0.05;
  }

  if (project === "Hauwal") {
    return duration === 30 ? 0.02 :
           duration === 60 ? 0.04 : 0.08;
  }

  return 0.01;
}

/* ===============================
   ADD STAKE (WITH STATUS)
================================ */
function addStake({ project, amount, duration }) {
  const rate = getRate(project, duration);
  const reward = amount * rate;

  const stakes = getStakes();

  stakes.push({
    id: Date.now(),
    project,
    amount,
    duration,
    reward,
    date: new Date().toLocaleDateString(),
    status: "Pending" // 👈 default
  });

  saveStakes(stakes);

function addStake({ project, amount, duration }) {
  const rate = getRate(project, duration);
  const reward = amount * rate;

  const stakes = getStakes();
  stakes.push({
    project,
    amount,
    reward,
    duration,
    status: "Pending",   // 🔴 MUHIMMI
    date: new Date().toLocaleDateString()
  });

  saveStakes(stakes);
}
   
  // Simulate confirmation (real system = backend)
  setTimeout(() => {
    markStakeSuccessful(stakes[stakes.length - 1].id);
  }, 500);

  return true;
}

/* ===============================
   STATUS UPDATE
================================ */
function markStakeSuccessful(id){
  const stakes = getStakes();
  const stake = stakes.find(s => s.id === id);

  if(stake){
    stake.status = "Successful";
    saveStakes(stakes);
  }
}

/* ===============================
   TOTALS
================================ */
function getTotals() {
  const stakes = getStakes();
  let totalStake = 0;
  let totalReward = 0;

  stakes.forEach(s => {
    if(s.status === "Successful"){
      totalStake += s.amount;
      totalReward += s.reward;
    }
  });

  return { totalStake, totalReward };
}

/* ===============================
   PROJECT TOTALS
================================ */
function getProjectTotals(project) {
  const stakes = getStakes().filter(s => s.project === project);
  let stake = 0;
  let reward = 0;

  stakes.forEach(s => {
    if(s.status === "Successful"){
      stake += s.amount;
      reward += s.reward;
    }
  });

  return { stake, reward, stakes };
}
