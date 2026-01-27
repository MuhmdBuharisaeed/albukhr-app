/* ==================================
   ALBUKHR – INTERNAL STAKING ENGINE
   SIMPLE • GUARANTEED • TRUSTED
   ================================== */

const INT_STAKE_KEY = "albukhr_internal_stakes";

/* ---------- HELPERS ---------- */

function loadInternal(){
  return JSON.parse(localStorage.getItem(INT_STAKE_KEY) || "[]");
}

function saveInternal(data){
  localStorage.setItem(INT_STAKE_KEY, JSON.stringify(data));
}

/* ---------- CORE FUNCTIONS ---------- */

/* CREATE STAKE */
function stakeInternal(project, amount){
  amount = Number(amount);

  if(isNaN(amount) || amount <= 0){
    throw "Invalid stake amount";
  }

  const reward = +(amount * 0.10).toFixed(2); // 10% fixed reward

  const stake = {
    stakeId: "INT-" + Date.now(),
    project,
    amount,
    reward,
    status: "Successful",
    timestamp: Date.now()
  };

  const all = loadInternal();
  all.push(stake);
  saveInternal(all);

  return stake;
}

/* GET ALL STAKES */
function getInternalStakes(){
  return loadInternal();
}

/* GET STAKES BY PROJECT */
function getInternalStakesByProject(project){
  return loadInternal().filter(s => s.project === project);
}

/* TOTALS (HOME DASHBOARD SAFE) */
function getInternalTotals(){
  const all = loadInternal();

  let totalStake = 0;
  let totalReward = 0;

  all.forEach(s => {
    totalStake += Number(s.amount) || 0;
    totalReward += Number(s.reward) || 0;
  });

  return {
    totalStake,
    totalReward
  };
}

/* RECENT TRANSACTIONS */
function getInternalRecent(limit = 3){
  return loadInternal()
    .slice()
    .reverse()
    .slice(0, limit);
}
