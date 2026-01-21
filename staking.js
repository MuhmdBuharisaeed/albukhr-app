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
  Khairat: { minStake: 50 },   // 🆕 Khairat oganic fertiliser
  Barsh:   { minStake: 100 }
};

function getMinStake(project){
  return PROJECT_RULES[project]?.minStake || 0;
}

/* ===============================
   REWARD RATES
================================ */
function getRate(project, duration){

  // Raheem Pharmacy
  if(project === "Raheem"){
    return duration === 30 ? 0.01 :
           duration === 60 ? 0.025 :
           0.05;
  }

  // Hauwal Sumonviter
  if(project === "Hauwal"){
    return duration === 30 ? 0.02 :
           duration === 60 ? 0.04 :
           0.08;
  }

  // Khairat oganic fertiliser (fi Hauwal, ƙasa da Barsh)
  if(project === "Khairat"){
    return duration === 30 ? 0.025 :
           duration === 60 ? 0.05 :
           0.09;
  }

  // Barsh Agro (mafi girma)
  if(project === "Barsh"){
    return duration === 30 ? 0.03 :
           duration === 60 ? 0.06 :
           0.10;
  }

  return 0;
}

/* ===============================
   ADD STAKE
================================ */
function addStake({ project, amount, duration }){

  const stakes = getStakes();
  const reward = amount * getRate(project, duration);

  stakes.push({
    id: Date.now(),
    project,
    amount,
    duration,
    reward,
    status: "Successful", // tsarin demo
    date: new Date().toLocaleDateString()
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

  return { stake, reward, stakes };
}
