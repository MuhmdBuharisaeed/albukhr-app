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
function addStake({ project, amount, duration }) {
  const rate =
    duration === 30 ? 0.01 :
    duration === 60 ? 0.025 :
    0.05;

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
