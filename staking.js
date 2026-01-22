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
   ADD STAKE (DATE + TIME)
================================ */
function addStake({ project, amount, duration }){

  const stakes = getStakes();
  const reward = amount * getRate(project, duration);

  const now = new Date();

  stakes.push({
    id: Date.now(),                 // unique
    project,
    amount,
    duration,
    reward,
    status: "Successful",

    // 🔐 FUTURE-PROOFING
    timestamp: now.toISOString(),   // audit / backend / sorting
    date: now.toLocaleDateString(), // UI fallback
    time: now.toLocaleTimeString()  // UI fallback
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
   DATE / TIME FORMATTER (SAFE)
================================ */
function formatDateTime(stake){

  // New system (preferred)
  if(stake.timestamp){
    const d = new Date(stake.timestamp);
    return {
      date: d.toLocaleDateString(),
      time: d.toLocaleTimeString()
    };
  }

  // Old system fallback
  return {
    date: stake.date || "--",
    time: stake.time || "--"
  };
}
