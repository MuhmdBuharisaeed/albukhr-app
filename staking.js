// ===============================
// ALBUKHR STAKING ENGINE
// ===============================

const STORAGE_KEY = "albukhr_stakes";

// Karanta duk staking
function getStakes() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

// Ajiye staking
function saveStakes(stakes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stakes));
}

// Kara sabon staking
function getRate(project, duration) {
  // Raheem Pharmacy
  if (project === "Raheem") {
    return duration === 30 ? 0.01 :
           duration === 60 ? 0.025 :
           0.05;
  }

  // Hauwal Project
  if (project === "Hauwal") {
    return duration === 30 ? 0.02 :
           duration === 60 ? 0.04 :
           0.08;
  }

  // default (future projects)
  return 0.01;
}

  const reward = amount * rate;

  const stakes = getStakes();
  stakes.push({
    project,
    amount,
    reward,
    duration,
    date: new Date().toLocaleDateString()
  });

  saveStakes(stakes);
}

// Lissafin total (duk projects)
function getTotals() {
  const stakes = getStakes();
  let totalStake = 0;
  let totalReward = 0;

  stakes.forEach(s => {
    totalStake += s.amount;
    totalReward += s.reward;
  });

  return { totalStake, totalReward };
}

// Lissafin project ɗaya
function getProjectTotals(project) {
  const stakes = getStakes().filter(s => s.project === project);
  let stake = 0;
  let reward = 0;

  stakes.forEach(s => {
    stake += s.amount;
    reward += s.reward;
  });

  return { stake, reward, stakes };
}

function addStake({ project, amount, duration }) {
  const rate = getRate(project, duration);
  const reward = amount * rate;

  const stakes = getStakes();
  stakes.push({
    project,
    amount,
    reward,
    duration,
    date: new Date().toLocaleDateString()
  });

  saveStakes(stakes);
  }

const PROJECT_RULES = {
  Raheem: {
    minStake: 10
  },
  Hauwal: {
    minStake: 20
  }
};
