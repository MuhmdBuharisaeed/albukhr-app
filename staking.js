// =======================================
// ALBUKHR STAKING ENGINE (LOCAL FINAL)
// Pi SDK Ready • No API • Mobile Safe
// =======================================

const INTERNAL_KEY = "albukhr_stakes";

/* ======================================
   STORAGE
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
  if(Array.isArray(data)){
    localStorage.setItem(key, JSON.stringify(data));
  }
}

/* ======================================
   USER
====================================== */
function getCurrentUser(){
  try{
    return JSON.parse(localStorage.getItem("pi_user"));
  }catch{
    return null;
  }
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
   PI PAYMENT
====================================== */
async function payWithPi({amount, memo, metadata}){

  const PiNetwork = window.Pi;

  if(!PiNetwork){
    throw new Error("Pi SDK not loaded");
  }

  return new Promise((resolve,reject)=>{

    PiNetwork.createPayment({
      amount,
      memo,
      metadata
    },{

      /* ❌ REMOVE SERVER APPROVAL */

      onReadyForServerCompletion: function(paymentId, txid){
        console.log("✅ Payment success:", txid);

        resolve({
          paymentId,
          txid
        });
      },

      onCancel: function(){
        console.warn("❌ User cancelled");
        reject("cancelled");
      },

      onError: function(error){
        console.error("❌ Pi error:", error);
        reject(error);
      }

    });

  });

}

/* ======================================
   ADD STAKE
====================================== */
async function addStake({project,amount,duration}){

  const user = getCurrentUser();

  if(!user?.uid){
    return {error:"User not logged in"};
  }

  /* 🔥 ADD THIS HERE (BEST POSITION) */
  if(typeof window.Pi === "undefined"){
    return {error:"Pi SDK not ready"};
  }

  const safeAmount = Number(amount);
  const safeDuration = Number(duration);

  if(!project || safeAmount <= 0){
    return {error:"Invalid input"};
  }

  if(safeAmount < getMinStake(project)){
    return {error:"Minimum stake not reached"};
  }
   
  /* PI PAYMENT */
  let payment;

  try{
    payment = await payWithPi({
      amount: safeAmount,
      memo:`Stake in ${project}`,
      metadata:{project,duration}
    });
  }catch(err){
  console.error("❌ Payment error:", err);
  return {error:"Payment failed"};
  }

  if(!payment?.txid){
    return {error:"Invalid payment"};
  }

  /* SAVE LOCAL */
  const stakes = _safeParse(INTERNAL_KEY);

  const startTime = Date.now();
  const unlockTime =
    startTime + (safeDuration * 86400000);

  const reward =
    safeAmount * getRate(project,safeDuration);

  const newStake = {

    id:"ST-"+Date.now(),
    userId:user.uid,

    project,
    amount:safeAmount,
    duration:safeDuration,

    startTime,
    unlockTime,

    reward,
    withdrawnReward:0,

    status:"Successful",
    timestamp:Date.now(),

    txid: payment.txid
  };

  stakes.push(newStake);
  _save(INTERNAL_KEY, stakes);

  return {success:true, stake:newStake};
}

/* ======================================
   GET ALL STAKES
====================================== */
function getAllStakesMerged(){

  const user = getCurrentUser();
  if(!user) return [];

  return _safeParse(INTERNAL_KEY)
    .filter(s =>
      s.userId === user.uid &&
      s.status === "Successful"
    )
    .sort((a,b)=>b.timestamp - a.timestamp);
}

/* ======================================
   PROJECT TOTALS
====================================== */
function getProjectTotals(project){

  const stakes = getAllStakesMerged();

  const filtered =
    stakes.filter(s=>s.project===project);

  let stake = 0;
  let reward = 0;

  filtered.forEach(s=>{

    stake += Number(s.amount)||0;

    const remaining =
      (Number(s.reward)||0) -
      (Number(s.withdrawnReward)||0);

    reward += Math.max(0, remaining);

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

  const remaining =
    (stake.reward || 0) -
    (stake.withdrawnReward || 0);

  if(remaining <= 0){
    return {error:"No reward"};
  }

  const take = Math.min(Number(amount)||0, remaining);

  stake.withdrawnReward =
    (stake.withdrawnReward || 0) + take;

  _save(INTERNAL_KEY, stakes);

  return {success:true, amount:take};
}

/* ======================================
   HELPERS
====================================== */
function getStakes(){ return getAllStakesMerged(); }
function getInternalTotals(){ return getProjectTotals(); }
function getInternalProjectTotals(p){ return getProjectTotals(p); }
function addInternalStake(p){ return addStake(p); }
