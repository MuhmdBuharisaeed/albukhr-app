// =======================================
// ALBUKHR STAKING ENGINE v3.2 (WALLET SAFE)
// Fully Compatible with Wallet Core v7
// =======================================

const INTERNAL_KEY = "albukhr_stakes";
const EXTERNAL_KEY = "albukhr_external_projects";

/* ======================================
   SAFE STORAGE
====================================== */
function _safeParse(key){
  try{
    const data = JSON.parse(localStorage.getItem(key));
    return Array.isArray(data) ? data : [];
  }catch{
    return [];
  }
}

function _save(key,data){
  localStorage.setItem(key, JSON.stringify(data));
}

/* ======================================
   PROJECT RULES
====================================== */
const PROJECT_RULES = {
  Raheem:{minStake:10},
  Hauwal:{minStake:20},
  Barsh:{minStake:100},
  Khairat:{minStake:50},
  Urban:{minStake:150},
  Labbaika:{minStake:30},
  Azman:{minStake:50}
};

function getMinStake(project){
  return PROJECT_RULES?.[project]?.minStake || 0;
}

/* ======================================
   REWARD RATES
====================================== */
function getRate(project,duration){

  const d = Number(duration);

  const table = {
    Raheem:{30:0.01,60:0.025,90:0.05},
    Hauwal:{30:0.02,60:0.04,90:0.08},
    Khairat:{30:0.025,60:0.05,90:0.09},
    Barsh:{30:0.03,60:0.06,90:0.10},
    Labbaika:{30:0.02,60:0.045,90:0.075},
    Urban:{30:0.12,60:0.12,90:0.12},
    Azman:{30:0.04,60:0.07,90:0.12}
  };

  return table?.[project]?.[d] || 0;
}

/* ======================================
   ADD INTERNAL STAKE (UPDATED)
====================================== */
function addStake({project,amount,duration}){

  const safeAmount   = Number(amount);
  const safeDuration = Number(duration);

  if(!project || isNaN(safeAmount) || safeAmount <= 0){
    return false;
  }

  if(safeAmount < getMinStake(project)){
    return false;
  }

  const rate   = getRate(project,safeDuration);
  const reward = safeAmount * rate;

  const stakes = _safeParse(INTERNAL_KEY);

  stakes.push({
    id:"ST-"+Date.now(),
    project,
    amount:safeAmount,
    duration:safeDuration,
    reward:Number(reward)||0,

    // 🔥 IMPORTANT FOR WALLET
    remainingReward:Number(reward)||0,
    capitalWithdrawn:false,

    status:"Successful",
    timestamp:Date.now(),
    type:"internal"
  });

  _save(INTERNAL_KEY,stakes);
  return true;
}

/* ======================================
   MERGED STAKES (WALLET SAFE)
====================================== */
function getAllStakesMerged(){

  const internal = _safeParse(INTERNAL_KEY)
    .filter(s=>s.status==="Successful")
    .map(s=>({
      ...s,
      remainingReward:
        s.remainingReward ?? s.reward ?? 0,
      capitalWithdrawn:
        s.capitalWithdrawn ?? false
    }));

  const external = _safeParse(EXTERNAL_KEY)
    .filter(p=>p.status==="approved")
    .map(p=>({
      ...p,
      status:"Successful",
      remainingReward:
        p.remainingReward ?? p.reward ?? 0,
      capitalWithdrawn:false
    }));

  return [...internal,...external]
    .sort((a,b)=>b.timestamp - a.timestamp);
}

/* ======================================
   PROJECT TOTALS
====================================== */
function getProjectTotals(project){

  const filtered = getAllStakesMerged()
    .filter(s=>s.project===project);

  let stake = 0;
  let reward = 0;

  filtered.forEach(s=>{
    stake  += Number(s.amount)||0;
    reward += Number(s.reward)||0;
  });

  return {stake,reward,stakes:filtered};
}

/* ======================================
   WITHDRAW REWARD (DASHBOARD)
====================================== */
function withdrawStakeReward(stakeId){

const stakes = _safeParse(INTERNAL_KEY);

const stake = stakes.find(s => s.id === stakeId);

if(!stake) return {error:"Stake not found"};

if(!stake.remainingReward || stake.remainingReward <= 0){
return {error:"No reward available"};
}

const amount = Number(stake.remainingReward);

stake.remainingReward = 0;

_save(INTERNAL_KEY,stakes);

return {
success:true,
amount
};

}

/* ======================================
   LEGACY WRAPPERS
====================================== */
function getStakes(){ return getAllStakesMerged(); }
function getInternalTotals(){ return getProjectTotals(); }
function getInternalProjectTotals(p){ return getProjectTotals(p); }
function addInternalStake(p){ return addStake(p); }
