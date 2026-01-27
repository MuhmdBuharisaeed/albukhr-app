// ===============================
// ALBUKHR STAKING ENGINE (STABLE)
// Internal Projects Only
// ===============================

const STORAGE_KEY = "albukhr_stakes";

/* ===============================
   STORAGE CORE
================================ */
function _getAllStakes(){
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function _saveAllStakes(stakes){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stakes));
}

/* ===============================
   PROJECT RULES (INTERNAL)
================================ */
const PROJECT_RULES = {
  Raheem:   { minStake: 10 },
  Hauwal:   { minStake: 20 },
  Barsh:    { minStake: 100 },
  Khairat:  { minStake: 50 },
  Urban:    { minStake: 150 },
  Labbaika: { minStake: 30 }
};

function getMinStake(project){
  return PROJECT_RULES[project]?.minStake || 0;
}

/* ===============================
   REWARD RATES (INTERNAL)
================================ */
function getRate(project, duration){

  if(project === "Raheem"){
    return duration === 30 ? 0.01 :
           duration === 60 ? 0.025 :
           0.05;
  }

  if(project === "Hauwal"){
    return duration === 30 ? 0.02 :
           duration === 60 ? 0.04 :
           0.08;
  }

  if(project === "Khairat"){
    return duration === 30 ? 0.025 :
           duration === 60 ? 0.05 :
           0.09;
  }

  if(project === "Barsh"){
    return duration === 30 ? 0.03 :
           duration === 60 ? 0.06 :
           0.10;
  }

  if(project === "Labbaika"){
    return duration === 30 ? 0.02 :
           duration === 60 ? 0.045 :
           0.075;
  }

  if(project === "Urban"){
    return 0.12;
  }

  return 0;
}

/* ===============================
   ADD STAKE (ANTI-NaN SAFE)
================================ */
function addStake({ project, amount, duration }){

  const safeAmount = Number(amount);
  const safeDuration = Number(duration);
  const rate = getRate(project, safeDuration);

  if(
    !project ||
    isNaN(safeAmount) ||
    isNaN(safeDuration) ||
    safeAmount <= 0
  ){
    return false;
  }

  const reward = safeAmount * rate;
  const now = new Date();

  const stakes = _getAllStakes();

  stakes.push({
    id: Date.now(),
    project,
    amount: safeAmount,
    duration: safeDuration,
    reward: Number(reward) || 0,
    status: "Successful",
    timestamp: now.toISOString(),
    type: "internal"   // 🔑 future-proof
  });

  _saveAllStakes(stakes);
  return true;
}

/* ===============================
   TOTALS (HOME SAFE)
================================ */
function getTotals(){

  const stakes = _getAllStakes();
  let totalStake = 0;
  let totalReward = 0;

  stakes.forEach(s=>{
    if(s?.status === "Successful"){
      totalStake += Number(s.amount) || 0;
      totalReward += Number(s.reward) || 0;
    }
  });

  return { totalStake, totalReward };
}

/* ===============================
   PROJECT TOTALS (SAFE)
================================ */
function getProjectTotals(project){

  const all = _getAllStakes();
  const filtered = all.filter(s => s.project === project);

  let stake = 0;
  let reward = 0;

  filtered.forEach(s=>{
    if(s.status === "Successful"){
      stake += Number(s.amount) || 0;
      reward += Number(s.reward) || 0;
    }
  });

  return { stake, reward, stakes: filtered };
}

/* ===============================
   DATE / TIME FORMATTER
================================ */
function formatDateTime(stake){

  if(stake?.timestamp){
    const d = new Date(stake.timestamp);
    if(!isNaN(d)){
      return {
        date: d.toLocaleDateString("en-GB"),
        time: d.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        })
      };
    }
  }

  return { date: "--", time: "--" };
}

/* ===============================
   LEGACY BRIDGE (DO NOT REMOVE)
   Keeps old pages working
================================ */
function getStakes(){
  return _getAllStakes();
}
