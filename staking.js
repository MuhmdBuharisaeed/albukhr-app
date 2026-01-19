// ===============================
// ALBUKHR STAKING ENGINE
// ===============================

const STORAGE_KEY = "albukhr_stakes";

const PROJECT_RULES = {
  Raheem: { minStake: 10 },
  Hauwal: { minStake: 20 }
};

function getStakes() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function saveStakes(stakes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stakes));
}

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

function getMinStake(project){
  return PROJECT_RULES[project]?.minStake || 0;
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

function getProjectTotals(project) {
  const stakes = getStakes().filter(s => s.project === project);
  let stake = 0, reward = 0;

  stakes.forEach(s => {
    stake += s.amount;
    reward += s.reward;
  });

  return { stake, reward, stakes };
}

function getTotals() {
  const stakes = getStakes();
  let totalStake = 0, totalReward = 0;

  stakes.forEach(s => {
    totalStake += s.amount;
    totalReward += s.reward;
  });

  return { totalStake, totalReward };
}

function showSuccess(amount, duration){
  const reward = amount * getRate("Raheem", duration);
  document.getElementById("successText").innerHTML =
    `You staked <b>${amount} Pi</b><br>
     Duration: <b>${duration} days</b><br>
     Reward: <b>${reward.toFixed(2)} Pi</b>`;
  successModal.style.display = "flex";
}

function closeSuccess(){
  successModal.style.display = "none";
}
