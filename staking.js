/***********************
 * ALBUKHR STAKING CORE
 ***********************/
const STORAGE_KEY = "albukhr_stakes";

/* ===== HELPERS ===== */
function getStakes() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function saveStakes(stakes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stakes));
}

/* ===== DAILY ACCRUAL ===== */
function updateAccruedRewards() {
  const stakes = getStakes();
  const now = Date.now();

  stakes.forEach(stake => {
    if (stake.status !== "active") return;

    const daysPassed = Math.floor(
      (now - stake.lastUpdated) / (1000 * 60 * 60 * 24)
    );

    if (daysPassed <= 0) return;

    const addReward = daysPassed * stake.rewardPerDay;
    stake.accruedReward += addReward;
    stake.lastUpdated += daysPassed * 86400000;

    if (now >= stake.endDate) {
      stake.accruedReward = stake.totalReward;
      stake.status = "completed";
    }
  });

  saveStakes(stakes);
}

/* ===== CREATE STAKE ===== */
function createStake(project, amount, duration) {
  const rate = 0.01;
  const totalReward = amount * rate;
  const rewardPerDay = totalReward / duration;
  const now = Date.now();

  const stake = {
    id: "stake_" + now,
    project,
    amount,
    duration,
    rate,
    rewardPerDay,
    totalReward,
    accruedReward: 0,
    startDate: now,
    lastUpdated: now,
    endDate: now + duration * 86400000,
    status: "active"
  };

  const stakes = getStakes();
  stakes.push(stake);
  saveStakes(stakes);
}

/* ===== HOME STATS ===== */
function renderHomeStats() {
  const stakes = getStakes();

  let totalStaking = 0;
  let totalReward = 0;

  stakes.forEach(s => {
    totalStaking += s.amount;
    totalReward += s.accruedReward;
  });

  const stakingEl = document.getElementById("totalStaking");
  const rewardEl = document.getElementById("totalRewards");

  if (stakingEl) stakingEl.textContent = totalStaking.toFixed(2) + " Pi";
  if (rewardEl) rewardEl.textContent = totalReward.toFixed(2) + " Pi";
}

/* ===== HISTORY RENDER ===== */
function renderHistory(containerId, projectName = null) {
  const box = document.getElementById(containerId);
  if (!box) return;

  const stakes = getStakes().filter(s =>
    projectName ? s.project === projectName : true
  );

  box.innerHTML = "";

  if (stakes.length === 0) {
    box.innerHTML = "<p>No transactions yet.</p>";
    return;
  }

  stakes.forEach(s => {
    const div = document.createElement("div");
    div.className = "project-item";

    div.innerHTML = `
      <span>${s.project}</span>
      <small>
        ${s.amount} Pi • ${s.accruedReward.toFixed(2)} Pi<br>
        ${s.status === "active" ? "Earning daily…" : "Completed ✅"}
      </small>
    `;

    box.appendChild(div);
  });
}

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded", () => {
  updateAccruedRewards();
  renderHomeStats();
});
