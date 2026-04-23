// =======================================
// ALBUKHR STAKING ENGINE (LOCAL FINAL)
// Pi SDK Ready • No API • Mobile Safe
// =======================================

const SUPABASE_URL = "https://qexmnghilahsvethlxem.supabase.co";
const SUPABASE_KEY = "sb_publishable_mSbWlhVKdmSjasKJC50QYw_5wzgRMe2";

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
    if(u?.uid){
      return { uid: u.uid, username: u.username };
    }
  }

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
  const table = {
    Raheem:{30:0.01,60:0.025,90:0.05},
    Hauwal:{30:0.02,60:0.04,90:0.08},
    Khairat:{30:0.025,60:0.05,90:0.09},
    Barsh:{30:0.03,60:0.06,90:0.10},
    Labbaika:{30:0.02,60:0.045,90:0.075},
    Urban:{30:0.12,60:0.12,90:0.12},
    Azman:{30:0.04,60:0.07,90:0.12}
  };

  return table?.[project]?.[Number(duration)] || 0;
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

/* 🔥 ADD THIS HERE */
const unlockTime =
Date.now() + (safeDuration * 24 * 60 * 60 * 1000);

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

  const res = await fetch("https://qexmnghilahsvethlxem.supabase.co/rest/v1/stakes",{
  method:"POST",
  headers:{
    "Content-Type":"application/json",
    "apikey":"sb_publishable_mSbWlhVKdmSjasKJC50QYw_5wzgRMe2",
    "Authorization":"Bearer sb_publishable_mSbWlhVKdmSjasKJC50QYw_5wzgRMe2"
  },
  body: JSON.stringify({
  userid:user.uid,
  project: project,
  amount:safeAmount,
  duration:safeDuration,
  txid: payment.txid,
  reward: safeAmount * getRate(project, safeDuration),
  withdrawnReward:0,
  type:"stake",
  unlocktime: unlockTime   // 🔥 NAN
})
});

  if(!res.ok){
  const err = await res.text();
  console.error("❌ Insert failed:", err);
}else{
  console.log("✅ Stake saved to Supabase");
  }
   
}catch(e){

  console.error("❌ Supabase error", e);

  return {
    error:"Network error"
  };

}

  /* ===============================
     RECORD TRANSACTION (FIX HISTORY)
  =============================== */

  if(typeof recordTx === "function"){
  recordTx({
    type:"stake",
    project,
    amount:safeAmount,
    timestamp:Date.now()
  });
}

__stakingLock = false;

return {
  success:true
};

} // 🔥 THIS LINE IS MISSING (rufe addStake)

/* ======================================
   GET ALL STAKES
====================================== */

async function getAllStakesMerged(){

  let user = getCurrentUser();

  // 🔥 fallback user for index
  if(!user?.uid){

    const local = localStorage.getItem("pi_user");

    if(local){
      try{
        user = JSON.parse(local);
      }catch{}
    }

  }

  // 🔥 FINAL FALLBACK (IMPORTANT)
  if(!user?.uid){

    // 👇 THIS FIXES INDEX
    user = {
      uid: "test123"
    };

  }

  try{

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/stakes?select=*&userid=eq.${user.uid}`,
      {
        headers:{
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    if(!res.ok){
      console.error(await res.text());
      return [];
    }

    const data = await res.json();

    return Array.isArray(data) ? data : [];

  }catch(e){

    console.error("❌ Network error:", e);
    return [];

  }

}

/* ======================================
   PROJECT TOTALS
====================================== */
async function getProjectTotals(project){

  const stakes = await getAllStakesMerged();

  let stake = 0;
  let reward = 0;

  const projectData = stakes.filter(s => s.project === project);

  projectData.forEach(s => {

    const amount = Number(s.amount) || 0;

    // ✅ CAPITAL (includes withdraw negative)
    if(s.type === "stake" || s.type === "withdraw"){
      stake += amount;
    }

    // ✅ REWARD ONLY FROM REAL STAKES
    if(s.type === "stake"){

      const total = Number(s.reward) || 0;
      const withdrawn = Number(s.withdrawnReward) || 0;

      const remaining = total - withdrawn;

      reward += Math.max(0, remaining);
    }

  });

  return {
    stake,
    reward,
    stakes: projectData
  };

}

/* ======================================
   GET USER STAKE
====================================== */
async function getUserStakes(){

  const user = getCurrentUser();

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/stakes?select=*&userid=eq.${user.uid}`,
    {
      headers:{
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    }
  );

  const data = await res.json();

  return Array.isArray(data) ? data : [];
}

/* ======================================
   WITHDRAW PROJECT REWARD
====================================== */
let __withdrawLock = false;

async function withdrawProjectReward(project, amount){

  // 🔒 PREVENT DOUBLE CLICK / DOUBLE WITHDRAW
  if(__withdrawLock){
    return {error:"Processing..."};
  }

  __withdrawLock = true;

  const user = getCurrentUser();

  let remainingToTake = Number(amount);

  // 🔥 VALIDATION
  if(!Number.isFinite(remainingToTake) || remainingToTake <= 0){
    __withdrawLock = false;
    return {error:"Invalid amount"};
  }

  try{

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/stakes?project=eq.${project}&userid=eq.${user.uid}&order=created_at.asc`,
      {
        headers:{
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    if(!res.ok){
      const err = await res.text();
      console.error("❌ Fetch error:", err);
      __withdrawLock = false;
      return {error:"Fetch failed"};
    }

    let stakes = await res.json();

    if(!Array.isArray(stakes) || !stakes.length){
      __withdrawLock = false;
      return {error:"No stakes"};
    }

    // 🔥 ONLY REAL STAKES
    stakes = stakes.filter(s => s.type === "stake");

    for(const stake of stakes){

      if(remainingToTake <= 0) break;

      const totalReward = Number(stake.reward) || 0;
      const withdrawn = Number(stake.withdrawnReward) || 0;

      const remaining = totalReward - withdrawn;

      // 🔥 SAFETY CHECK
      if(!Number.isFinite(remaining)){
        continue;
      }

      if(remaining <= 0) continue;

      const take = Math.min(remainingToTake, remaining);

      // 🔥 PROTECT CALCULATION
      if(!Number.isFinite(take)){
        __withdrawLock = false;
        return {error:"Invalid calculation"};
      }

      const newWithdrawn = withdrawn + take;

      const updateRes = await fetch(
        `${SUPABASE_URL}/rest/v1/stakes?id=eq.${stake.id}`,
        {
          method:"PATCH",
          headers:{
            "Content-Type":"application/json",
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`
          },
          body: JSON.stringify({
            withdrawnReward: newWithdrawn
          })
        }
      );

      if(!updateRes.ok){

        let errText = "Unknown error";

        try{
          errText = await updateRes.text();
        }catch{}

        console.error("❌ Update error:", errText);

        __withdrawLock = false;
        return {error:"Update failed"};
      }

      remainingToTake -= take;
    }

    if(remainingToTake > 0){
      __withdrawLock = false;
      return {error:"Insufficient reward"};
    }

    __withdrawLock = false;

    return {
      success:true,
      amount: amount
    };

  }catch(e){

    console.error("❌ Network error:", e);

    __withdrawLock = false;

    return {error:"Network error"};
  }
}

/* ======================================
   WITHDRAW CAPITAL
====================================== */
async function withdrawCapital({project, amount}){

  const user = getCurrentUser();

  let remaining = Number(amount);

  if(remaining <= 0){
    return {error:"Invalid amount"};
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/stakes?project=eq.${project}&userid=eq.${user.uid}&order=created_at.asc`,
    {
      headers:{
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    }
  );

  let stakes = await res.json();

  // 🔥 ONLY REAL STAKES
  stakes = stakes.filter(s => s.type === "stake");

  for(const s of stakes){

    if(remaining <= 0) break;

    if(Date.now() < (s.unlocktime || 0)) continue;

    const available = Number(s.amount) || 0;

    if(available <= 0) continue;

    const take = Math.min(available, remaining);

    // 🔥 DO NOT MODIFY ORIGINAL STAKE
    const insertRes = await fetch(
      `${SUPABASE_URL}/rest/v1/stakes`,
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({
          userid: user.uid,
          project,
          amount: -take,
          duration: 0,
          txid: "CAP-"+Date.now()+"-"+Math.random().toString(36).slice(2),
          reward: 0,
          withdrawnReward: 0,
          type:"withdraw"
        })
      }
    );

   if(!insertRes.ok){

  let errText = "Unknown error";

  try{
    errText = await insertRes.text();
  }catch{}

  console.error("❌ Withdraw insert error:", errText);

  return {error:"Withdraw failed"};
}

// 🔥 PROTECT SYSTEM
if(!Number.isFinite(take)){
  return {error:"Invalid calculation"};
}

remaining -= take;

}

if(remaining > 0){
  return {error:"Insufficient unlocked capital"};
}

return {
  success:true,
  amount
}; 

/* ======================================
  COMFIRM WITHDRAW CAPITAL
====================================== */
async function confirmCapitalWithdraw(){

const amount = Number(capitalWithdrawAmount.value);
const wallet = capitalWallet.value;

if(!amount || amount <= 0){
  alert("Invalid amount");
  return;
}

if(!wallet){
  alert("Enter wallet address");
  return;
}

const fee = amount * 0.01;
const receive = amount - fee;

/* 🔥 SEND TO SUPABASE */
const res = await withdrawCapital({
  project: PROJECT_NAME,
  amount: amount
});

if(res?.error){
  alert(res.error);
  return;
}

/* 🔥 RECORD TX */
recordTx({
  type:"capital",
  project:PROJECT_NAME,
  amount:receive,
  meta:{
    wallet:wallet,
    fee:fee
  }
});

closeCapitalModal();

capitalWithdrawAmount.value = "";
capitalWallet.value = "";

load();
}

/* ======================================
   LOAD DATA
====================================== */

async function loadData(){

  try{

    const stakes = await getAllStakesMerged();

    console.log("📊 STAKES:", stakes);

    // ❗ idan babu data, kada ka nuna error
    if(!Array.isArray(stakes)){
      console.warn("No data returned");
      return;
    }

    // OPTIONAL: update UI nan gaba

  }catch(e){

    console.error("❌ Load error:", e);

    // ❌ kar ka yi alert nan
  }

}

/* ======================================
   HELPERS
====================================== */
function getStakes(){ return getAllStakesMerged(); }
function getInternalTotals(){ return getProjectTotals(); }
function getInternalProjectTotals(p){ return getProjectTotals(p); }
function addInternalStake(p){ return addStake(p); }
