/* ===================== STORAGE ===================== */

function getStakes() {
  return JSON.parse(localStorage.getItem("albukhr_stakes")) || [];
}

function saveStake(stake) {
  const stakes = getStakes();
  stakes.push(stake);
  localStorage.setItem("albukhr_stakes", JSON.stringify(stakes));
}

/* ===================== CALCULATIONS ===================== */

function calculateTotals() {
  const stakes = getStakes();

  const totalStaking = stakes.reduce((s, x) => s + x.amount, 0);
  const totalRewards = stakes.reduce((s, x) => s + x.reward, 0);

  if (document.getElementById("totalStaking")) {
    document.getElementById("totalStaking").textContent =
      totalStaking.toFixed(2) + " Pi";
  }

  if (document.getElementById("totalRewards")) {
    document.getElementById("totalRewards").textContent =
      totalRewards.toFixed(2) + " Pi";
  }
}

/* ===================== STAKING (RAHEEM) ===================== */

function openStakeModal() {
  const modal = document.getElementById("stakeModal");
  if (modal) modal.style.display = "flex";
}

function closeStakeModal() {
  const modal = document.getElementById("stakeModal");
  if (modal) modal.style.display = "none";
}

function stakeInRaheem() {
  const amountEl = document.getElementById("stakeAmount");
  const durationEl = document.getElementById("stakeDuration");

  if (!amountEl || !durationEl) return;

  const amount = Number(amountEl.value);
  const duration = Number(durationEl.value);

  if (!amount || amount <= 0) {
    alert("Shigar da adadin Pi mai inganci");
    return;
  }

  // Fixed rate (kamar yadda ka zaba)
  let rate = 0.01;
  if (duration === 60) rate = 0.025;
  if (duration === 90) rate = 0.05;

  const reward = amount * rate;

  saveStake({
    project: "Raheem Pharmacy",
    amount,
    reward,
    duration,
    date: new Date().toISOString()
  });

  amountEl.value = "";
  durationEl.value = "30";

  closeStakeModal();
  calculateTotals();
  renderHistory();  

  alert("Staking ya yi nasara ✅");
}

/* ===================== TRANSACTION HISTORY ===================== */

function renderHistory(project = null) {
  const stakes = getStakes();
  const container = document.getElementById("transactionHistory");

  if (!container) return;

  container.innerHTML = "";

  stakes
    .filter(s => !project || s.project === project)
    .reverse()
    .forEach(s => {
      const item = document.createElement("div");
      item.className = "history-item";
      item.innerHTML = `
        <strong>${s.project}</strong><br/>
        Stake: ${s.amount} Pi<br/>
        Reward: ${s.reward.toFixed(2)} Pi<br/>
        <small>${new Date(s.date).toLocaleString()}</small>
      `;
      container.appendChild(item);
    });
}

/* ===================== INIT ===================== */

document.addEventListener("DOMContentLoaded", () => {
  calculateTotals();
  renderHistory();
});
