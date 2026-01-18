// ===============================
// ALBUKHR STAKING ENGINE (FIXED)
// ===============================

const STORAGE_KEY = "albukhr_stakes";

// ===== PROJECT RULES =====
const PROJECT_RULES = {
  Raheem: {
    minStake: 10,
    rates: {
      30: 0.01,
      60: 0.025,
      90: 0.05
    }
  },
  Hauwal: {
    minStake: 20,
    rates: {
      30: 0.02,
      60: 0.04,
      90: 0.08
    }
  }
};

// ===== STORAGE =====
function getStakes() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function saveStakes(stakes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stakes));
}

// ===== HELPERS =====
function getRate(project, duration) {
  const rules = PROJECT_RULES[project];
  if (!rules) return 0.01;
  return rules.rates[duration] || 0.01;
}

function getMinStake(project) {
  const rules = PROJECT_RULES[project];
  return rules ? rules.minStake : 0;
}

// ===== CORE ACTION =====
function addStake({ project, amount, duration }) {
  const min = getMinStake(project);
  if (amount < min) {
    alert(`Minimum stake for ${project} is ${min} Pi`);
    return false;
  }

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
  return true;
}

// ===== TOTALS =====
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

function getProjectTotals(project) {
  const list = getStakes().filter(s => s.project === project);
  let stake = 0;
  let reward = 0;

  list.forEach(s => {
    stake += s.amount;
    reward += s.reward;
  });

  return { stake, reward, stakes: list };
}
