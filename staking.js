// =======================================
// ALBUKHR STAKING ENGINE v4 (FINAL CLEAN)
// Stable • Wallet Safe • Pi Compatible
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

    if(!PiNetwork){
      reject("Pi SDK not loaded");
      return;
    }

    PiNetwork.createPayment({
      amount,
      memo,
      metadata
    },{
      onReadyForServerApproval(paymentId){
        console.log("Approval:", paymentId);
      },
      onReadyForServerCompletion(paymentId, txid){
        resolve({paymentId, txid});
      },
      onCancel(){
        reject("cancelled");
      },
      onError(error){
        reject(error);
      }
    });

  });

}

/* ======================================
   ADD STAKE
====================================== */
async function addStake({project,amount,duration}){

  const safeAmount   = Number(amount);
  const safeDuration = Number(duration);

  /* USER CHECK */
  const currentUser =
    JSON.parse(localStorage.getItem("pi_user") || "null");

  if(!currentUser || !currentUser.uid){
    return {error:"User not logged in"};
  }

  if(!project || isNaN(safeAmount) || safeAmount <= 0){
    return {error:"Invalid amount"};
  }

  if(safeAmount < getMinStake(project)){
    return {error:"Minimum stake not reached"};
  }

  /* PAYMENT */
  let payment;

  try{
    payment = await payWithPi({
      amount: safeAmount,
      memo: `Stake in ${project}`,
      metadata: { project, duration }
    });
  }catch(err){
    return {error:"Payment failed"};
  }

  /* SAVE STAKE */
  const stakes = _safeParse(INTERNAL_KEY);

  const startTime = Date.now();
  const unlockTime =
    startTime + (safeDuration * 86400000);

  const reward =
    safeAmount * getRate(project,safeDuration);

  const newStake = {

    id:"ST-"+Date.now(),
    userId: currentUser.uid,

    project,
    amount:safeAmount,
    duration:safeDuration,

    startTime,
    unlockTime,

    reward:Number(reward)||0,
    remainingReward:Number(reward)||0,
    withdrawnReward:0,

    capitalWithdrawn:false,

    status:"Successful",
    timestamp:Date.now(),
    type:"internal",

    source:"pi",
    network:"testnet",
    txid: payment?.txid || null

  };

  stakes.push(newStake);
  _save(INTERNAL_KEY, stakes);

  /* RECORD TX */
  if(typeof recordTx === "function"){
    recordTx({
      type:"stake",
      project,
      amount:safeAmount,
      meta:{
        duration:safeDuration,
        source:"pi"
      }
    });
  }

  return {success:true, stake:newStake};
}

/* ======================================
   MERGED STAKES
====================================== */
function getAllStakesMerged(){

  const currentUser =
    JSON.parse(localStorage.getItem("pi_user") || "null");

  if(!currentUser) return [];

  const internal = _safeParse(INTERNAL_KEY)
    .filter(s =>
      s.status === "Successful" &&
      s.userId === currentUser.uid
    );

  const external = _safeParse(EXTERNAL_KEY)
    .filter(p =>
      p.status === "approved" &&
      p.userId === currentUser.uid
    )
    .map(p=>({
      ...p,
      status:"Successful"
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
   WITHDRAW REWARD
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
   HELPERS
====================================== */
function getStakes(){ return getAllStakesMerged(); }
function getInternalTotals(){ return getProjectTotals(); }
function getInternalProjectTotals(p){ return getProjectTotals(p); }
function addInternalStake(p){ return addStake(p); }
