// ===============================
// ALBUKHR STAKING ENGINE (FINAL)
// ===============================

const STORAGE_KEY = "albukhr_stakes";

/* ===============================
   STORAGE
================================ */
function getStakes(){
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function saveStakes(stakes){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stakes));
}

/* ===============================
   PROJECT RULES
================================ */
const PROJECT_RULES = {
  Raheem:  { minStake: 10 },
  Hauwal:  { minStake: 20 },
  Barsh:   { minStake: 100 },
  Khairat: { minStake: 50 }
};

function getMinStake(project){
  return PROJECT_RULES[project]?.minStake || 0;
}

/* ===============================
   REWARD RATES
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

  return 0;
}

/* ===============================
   ADD STAKE (FUTURE-PROOF)
================================ */
function addStake({ project, amount, duration }){

  const stakes = getStakes();
  const rate = getRate(project, duration);
  const reward = amount * rate;

  const now = new Date();

  stakes.push({
    id: "TX-" + now.getTime(),   // 🆕 Transaction ID
    project,
    amount,
    duration,
    reward,
    status: "Successful",

    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString(),

    iso: now.toISOString(),      // 🆕 backend / API ready
    timestamp: now.getTime()     // 🆕 sorting & audit
  });

  saveStakes(stakes);
  return true;
}

/* ===============================
   TOTALS (HOME)
================================ */
function getTotals(){

  const stakes = getStakes();
  let totalStake = 0;
  let totalReward = 0;

  stakes.forEach(s=>{
    if(s.status === "Successful"){
      totalStake += Number(s.amount);
      totalReward += Number(s.reward);
    }
  });

  return { totalStake, totalReward };
}

/* ===============================
   PROJECT TOTALS
================================ */
function getProjectTotals(project){

  const stakes = getStakes().filter(s => s.project === project);

  let stake = 0;
  let reward = 0;

  stakes.forEach(s=>{
    if(s.status === "Successful"){
      stake += Number(s.amount);
      reward += Number(s.reward);
    }
  });

  return {
    stake,
    reward,
    stakes
  };
}

/* ===============================
   TIME AGO (UI HELPER)
================================ */
function timeAgo(timestamp){
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if(seconds < 60) return seconds + " sec ago";
  if(seconds < 3600) return Math.floor(seconds/60) + " min ago";
  if(seconds < 86400) return Math.floor(seconds/3600) + " hrs ago";
  return Math.floor(seconds/86400) + " days ago";
}
