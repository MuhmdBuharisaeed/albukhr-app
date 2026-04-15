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
  Hauwal:{minStake:10},
  Barsh:{minStake:10},
  Khairat:{minStake:10},
  Urban:{minStake:10},
  Labbaika:{minStake:10},
  Azman:{minStake:10}
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
   PI PAYMENT HANDLER
====================================== */

async function payWithPi({amount, memo, metadata}){

  const PiNetwork = window.Pi;

  return new Promise((resolve,reject)=>{

    PiNetwork.createPayment({
      amount: amount,
      memo: memo,
      metadata: metadata
    },{

      onReadyForServerApproval: function(paymentId){
        console.log("Ready for approval:", paymentId);
      },

      onReadyForServerCompletion: function(paymentId, txid){
        console.log("Payment complete:", txid);
        resolve({paymentId, txid});
      },

      onCancel: function(paymentId){
        console.warn("Payment cancelled");
        reject("cancelled");
      },

      onError: function(error, payment){
        console.error("Payment error:", error);
        reject(error);
      }

    });

  });

}

/* ======================================
   ADD STAKE (PI PAYMENT REQUIRED)
====================================== */

async function addStake({project,amount,duration}){

  const safeAmount   = Number(amount);
  const safeDuration = Number(duration);

  if(!project || isNaN(safeAmount) || safeAmount <= 0){
    return {error:"Invalid amount"};
  }

  if(safeAmount < getMinStake(project)){
    return {error:"Minimum stake not reached"};
  }

  /* ===============================
     STEP 1: PI PAYMENT
  =============================== */

  try{

    const payment = await payWithPi({
      amount: safeAmount,
      memo: `Stake in ${project}`,
      metadata: {
        project,
        duration
      }
    });

    console.log("Payment success:", payment);

  }catch(err){
    return {error:"Payment failed"};
  }

  /* ===============================
     STEP 2: SAVE STAKE AFTER PAYMENT
  =============================== */

  const rate   = getRate(project,safeDuration);
  const reward = safeAmount * rate;

  const stakes = _safeParse(INTERNAL_KEY);

  const startTime = Date.now();

  const unlockTime =
    startTime + (safeDuration * 86400000);

  const newStake = {
    id:"ST-"+Date.now(),
    project,
    amount:safeAmount,
    duration:safeDuration,

    reward:Number(reward)||0,
    remainingReward:Number(reward)||0,
    capitalWithdrawn:false,

    status:"Successful",
    timestamp:Date.now(),
    type:"internal",

    /* NEW IMPORTANT */
    source:"pi",
    network:"testnet"
  };

  const currentUser =
JSON.parse(localStorage.getItem("pi_user") || "null");

if(!currentUser){
  return {error:"User not logged in"};
}

stakes.push({
id:"ST-"+Date.now(),

userId: currentUser.uid,   // 🔥 VERY IMPORTANT

project,
amount:safeAmount,
duration:safeDuration,

startTime:startTime,
unlockTime:unlockTime,

reward:Number(reward)||0,
remainingReward:Number(reward)||0,
capitalWithdrawn:false,

status:"Successful",
timestamp:Date.now(),
type:"internal"
});
  }

  return {success:true, stake:newStake};
}

/* ======================================
   MERGED STAKES (WALLET SAFE)
====================================== */
function getAllStakesMerged(){

  const currentUser =
    JSON.parse(localStorage.getItem("pi_user") || "null");

  if(!currentUser) return [];

  const internal = _safeParse(INTERNAL_KEY)
    .filter(s =>
      s.status === "Successful" &&
      s.userId === currentUser.uid   // 🔥 FILTER USER
    )
    .map(s=>({
      ...s,
      remainingReward:
        s.remainingReward ?? s.reward ?? 0,
      capitalWithdrawn:
        s.capitalWithdrawn ?? false
    }));

  const external = _safeParse(EXTERNAL_KEY)
    .filter(p =>
      p.status === "approved" &&
      p.userId === currentUser.uid   // 🔥 ALSO FILTER
    )
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
function withdrawStakeReward(stakeId, amount){

const stakes = _safeParse(INTERNAL_KEY);

const stake = stakes.find(s => s.id === stakeId);

if(!stake) return {error:"Stake not found"};

const totalReward = Number(stake.reward) || 0;
const withdrawn   = Number(stake.withdrawnReward) || 0;

const remaining = totalReward - withdrawn;

if(remaining <= 0){
return {error:"No reward available"};
}

const take = Math.min(Number(amount)||0, remaining);

stake.withdrawnReward =
  (stake.withdrawnReward || 0) + take;

_save(INTERNAL_KEY,stakes);

return {
success:true,
amount:take
};

}

/* ======================================
   LEGACY WRAPPERS
====================================== */
function getStakes(){ return getAllStakesMerged(); }
function getInternalTotals(){ return getProjectTotals(); }
function getInternalProjectTotals(p){ return getProjectTotals(p); }
function addInternalStake(p){ return addStake(p); }
