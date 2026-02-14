// ===============================
// ALBUKHR STAKING ENGINE v2 (CLEAN)
// Source of Truth – Internal Only
// ===============================

const STORAGE_KEY = "albukhr_stakes";

/* ===============================
   STORAGE CORE
================================ */
function _getAllStakes(){
  try{
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  }catch{
    return [];
  }
}

function _saveAllStakes(stakes){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stakes));
}

/* ===============================
   PROJECT RULES
================================ */
const PROJECT_RULES = {
  Raheem:   { minStake:10 },
  Hauwal:   { minStake:20 },
  Barsh:    { minStake:100 },
  Khairat:  { minStake:50 },
  Urban:    { minStake:150 },
  Labbaika: { minStake:30 }
};

function getMinStake(project){
  return PROJECT_RULES[project]?.minStake || 0;
}

/* ===============================
   REWARD RATES
================================ */
function getRate(project, duration){

  const d = Number(duration);

  const table = {
    Raheem:   {30:0.01, 60:0.025, 90:0.05},
    Hauwal:   {30:0.02, 60:0.04,  90:0.08},
    Khairat:  {30:0.025,60:0.05,  90:0.09},
    Barsh:    {30:0.03, 60:0.06,  90:0.10},
    Labbaika: {30:0.02, 60:0.045, 90:0.075},
    Urban:    {30:0.12, 60:0.12,  90:0.12}
  };

  return table[project]?.[d] || 0;
}

/* ===============================
   ADD STAKE (ENGINE ENFORCED)
================================ */
function addStake({ project, amount, duration }){

  const safeAmount   = Number(amount);
  const safeDuration = Number(duration);

  if(
    !project ||
    isNaN(safeAmount) ||
    isNaN(safeDuration) ||
    safeAmount <= 0 ||
    safeAmount < getMinStake(project)
  ){
    return false;
  }

  const rate   = getRate(project, safeDuration);
  const reward = safeAmount * rate;

  const stakes = _getAllStakes();

  stakes.push({
    id: "ST-" + Date.now() + "-" + Math.floor(Math.random()*1000),
    project,
    amount: safeAmount,
    duration: safeDuration,
    reward: Number(reward) || 0,
    status: "Successful",
    timestamp: Date.now(),
    type: "internal"
  });

  _saveAllStakes(stakes);
  return true;
}

/* ===============================
   TOTALS
================================ */
function getTotals(){

  const stakes = _getAllStakes();
  let totalStake  = 0;
  let totalReward = 0;

  stakes.forEach(s=>{
    if(s?.status === "Successful"){
      totalStake  += Number(s.amount) || 0;
      totalReward += Number(s.reward) || 0;
    }
  });

  return { totalStake, totalReward };
}

/* ===============================
   PROJECT TOTALS
================================ */
function getProjectTotals(project){

  const filtered = _getAllStakes().filter(
    s => s.project === project && s.status === "Successful"
  );

  let stake  = 0;
  let reward = 0;

  filtered.forEach(s=>{
    stake  += Number(s.amount) || 0;
    reward += Number(s.reward) || 0;
  });

  return { stake, reward, stakes: filtered };
}

/* ===============================
   DATE FORMATTER
================================ */
function formatDateTime(obj){

  const ts = obj?.timestamp || Date.now();
  const d  = new Date(ts);

  if(isNaN(d)){
    return { date:"--", time:"--" };
  }

  return {
    date: d.toLocaleDateString("en-GB"),
    time: d.toLocaleTimeString("en-GB",{
      hour:"2-digit",
      minute:"2-digit",
      second:"2-digit"
    })
  };
}

/* ===============================
   LEGACY API
================================ */
function getStakes(){
  return _getAllStakes();
}

function addInternalStake(p){
  return addStake(p);
}

function getInternalTotals(){
  return getTotals();
}

function getInternalProjectTotals(p){
  return getProjectTotals(p);
}
