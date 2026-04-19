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

  if(window.Pi && Pi.getUser){

    const u = Pi.getUser();

    if(u && u.uid){
      return {
        uid: u.uid,
        username: u.username
      };
    }

  }

  // fallback (IMPORTANT)
  const local = localStorage.getItem("pi_user");

  if(local){
    try{
      return JSON.parse(local);
    }catch{}
  }

  // 🔥 LAST FALLBACK (TEST MODE)
  return {
    uid: "test123",
    username: "Test User"
  };

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

  console.log("⚠️ TEST MODE PAYMENT");

  return {
    paymentId: "TEST-"+Date.now(),
    txid: "TEST-"+Date.now()
  };

}

/* ======================================
   ADD STAKE
====================================== */
let __stakingLock = false;

async function addStake({project,amount,duration}){

  if(__stakingLock){
    return {error:"Processing..."};
  }

  __stakingLock = true;

  const user = await getCurrentUser();

  if(!user?.uid){
    __stakingLock = false;
    return {error:"User not logged in"};
  }

  /* 🔐 PI CHECK */
  if(typeof window.Pi === "undefined"){
    __stakingLock = false;
    return {error:"Pi SDK not ready"};
  }

  const safeAmount = Number(amount);
  const safeDuration = Number(duration);

  if(!project || safeAmount <= 0){
    __stakingLock = false;
    return {error:"Invalid input"};
  }

  if(safeAmount < getMinStake(project)){
    __stakingLock = false;
    return {error:"Minimum stake not reached"};
  }

  /* ===============================
     PI PAYMENT
  =============================== */
  let payment;

  try{

    payment = await payWithPi({
      amount: safeAmount,
      memo:`Stake in ${project}`,
      metadata:{project,duration}
    });

  }catch(err){

    console.error("❌ Payment error:", err);

    __stakingLock = false;
    return {error:"Payment failed"};

  }

  if(!payment?.txid){
    __stakingLock = false;
    return {error:"Invalid payment"};
  }

   /* SEND TO BACKEND */
try{

   ⏳ WAIT FOR RENDER WAKE UP
   await new Promise(r => setTimeout(r, 1500));

  const res = await fetch("https://albukhr-api.onrender.com/stake",{
  method:"POST",
  headers:{
    "Content-Type":"application/json"
  },
  body: JSON.stringify({
    userId:user.uid,
    project: project,
    amount:safeAmount,
    duration:safeDuration,
    txid: payment.txid
  })
});

  const data = await res.json();

if(!data.success){
  console.warn("Backend rejected:", data.error);
}else{
  console.log("✅ Stake saved to backend");
}

}catch(e){

  console.warn("❌ Backend withdraw failed", e);

  return {
    error:"Network error"
  };

}

  /* ===============================
     SAVE LOCAL (TESTNET MODE)
  =============================== */

  const stakes = _safeParse(INTERNAL_KEY);

  const now = Date.now();

  const unlockTime =
    now + (safeDuration * 86400000);

  const rate =
    Number(getRate(project,safeDuration)) || 0;

  const reward =
    safeAmount * rate;

  const newStake = {

    id:"ST-"+now,
    userId:user.uid,

    project,
    amount:safeAmount,
    duration:safeDuration,

    startTime:now,
    unlockTime,

    reward,
    withdrawnReward:0,

    status:"Successful",
    timestamp:now,

    txid: payment.txid
  };

  stakes.push(newStake);
  _save(INTERNAL_KEY, stakes);

  /* ===============================
     RECORD TRANSACTION (FIX HISTORY)
  =============================== */

  if(typeof recordTx === "function"){
    recordTx({
      type:"stake",
      project,
      amount:safeAmount,
      timestamp:now
    });
  }

  __stakingLock = false;

  return {
    success:true,
    stake:newStake
  };

}

/* ======================================
   GET ALL STAKES
====================================== */
async function getAllStakesMerged(){

  const user = getCurrentUser();

  if(!user?.uid){
    console.warn("No UID");
    return [];
  }

  try{

     ⏳ WAIT FOR RENDER WAKE UP
     await new Promise(r => setTimeout(r, 1500));

    const res = await fetch(
      "https://albukhr-api.onrender.com/stakes?uid=" + user.uid
    );

    if(!res.ok){
      throw new Error("Network error");
    }

    const data = await res.json();

    if(Array.isArray(data)){
      return data;
    }

  }catch(e){

    console.warn("API failed, fallback local");

  }

  return _safeParse(INTERNAL_KEY)
    .filter(s => s.userId === user.uid);

}

/* ======================================
   PROJECT TOTALS
====================================== */
async function getProjectTotals(project){

  const stakes = await getAllStakesMerged();

  const filtered = stakes.filter(s => s.project === project);

  let stake = 0;
  let reward = 0;

  filtered.forEach(s => {

    stake += Number(s.amount) || 0;

    const remaining =
      (Number(s.reward)||0) -
      (Number(s.withdrawnReward)||0);

    reward += Math.max(0, remaining);

  });

  return {stake, reward, stakes: filtered};

}

/* ======================================
   WITHDRAW REWARD
====================================== */
async function withdrawStakeReward(stakeId, amount){

  const user = getCurrentUser();

  if(!user?.uid){
    return {error:"User not logged in"};
  }

  try{

     ⏳ WAIT FOR RENDER WAKE UP
     await new Promise(r => setTimeout(r, 1500));

    const res = await fetch(
      "https://albukhr-api.onrender.com/withdraw",
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body: JSON.stringify({
          userId:user.uid,
          amount:Number(amount)
        })
      }
    );

    const data = await res.json();

    if(!data.success){
      return {error:data.error || "Withdraw failed"};
    }

    return {success:true};

  }catch(e){

    console.warn("Fallback local");

    const stakes = _safeParse(INTERNAL_KEY);

    const stake = stakes.find(s => s.id === stakeId);

    if(!stake) return {error:"Stake not found"};

    const remaining =
      (stake.reward||0) -
      (stake.withdrawnReward||0);

    const take = Math.min(Number(amount)||0, remaining);

    stake.withdrawnReward += take;

    _save(INTERNAL_KEY, stakes);

    return {success:true, amount:take};

  }

}

/* ======================================
   LOAD DATA
====================================== */

async function loadData(){

  try{

    const stakes = await getAllStakesMerged();

    console.log("STAKES:", stakes);

  }catch(e){

    alert("Failed to load data");

  }

       }

/* ======================================
   HELPERS
====================================== */
function getStakes(){ return getAllStakesMerged(); }
function getInternalTotals(){ return getProjectTotals(); }
function getInternalProjectTotals(p){ return getProjectTotals(p); }
function addInternalStake(p){ return addStake(p); }
