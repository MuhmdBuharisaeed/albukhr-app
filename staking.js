// =======================================
// ALBUKHR STAKING ENGINE v5 (FINTECH CORE)
// API Driven • Secure • Scalable
// =======================================

/* ======================================
   GLOBAL CACHE
====================================== */

let __stakesCache = [];
let __stakesLoaded = false;

const INTERNAL_KEY = "albukhr_stakes";

/* ======================================
   SAFE FALLBACK STORAGE (IMPROVED)
====================================== */

function _safeParse(key){

  try{

    const raw = localStorage.getItem(key);

    if(!raw) return [];

    const data = JSON.parse(raw);

    if(!Array.isArray(data)){
      console.warn("⚠️ Invalid format:", key);
      return [];
    }

    /* optional: basic validation */
    return data.filter(item =>
      item &&
      typeof item === "object" &&
      item.project &&
      item.amount !== undefined
    );

  }catch(err){

    console.error("❌ Parse error:", key, err);

    return [];

  }

}

function _save(key,data){

  try{

    if(!Array.isArray(data)){
      console.warn("⚠️ Save rejected (not array):", key);
      return;
    }

    /* optional: prevent huge storage */
    if(data.length > 5000){
      console.warn("⚠️ Too much data, trimming...");
      data = data.slice(-5000);
    }

    localStorage.setItem(
      key,
      JSON.stringify(data)
    );

  }catch(err){

    console.error("❌ Save failed:", key, err);

  }

}

/* ======================================
   USER (SECURE VERSION)
====================================== */

function getCurrentUser(){

  try{

    const raw =
      localStorage.getItem("pi_user");

    if(!raw) return null;

    const user = JSON.parse(raw);

    /* 🔐 VALIDATE STRUCTURE */
    if(
      !user ||
      typeof user !== "object" ||
      !user.uid ||
      typeof user.uid !== "string"
    ){
      console.warn("⚠️ Invalid user data");

      localStorage.removeItem("pi_user");

      return null;
    }

    return {
      uid: user.uid,
      username: user.username || "user"
    };

  }catch(err){

    console.error("❌ User parse error:", err);

    localStorage.removeItem("pi_user");

    return null;

  }

       }

/* ======================================
   API LAYER (SECURE VERSION)
====================================== */

async function getStakesAPI(){

  const user = getCurrentUser();

  if(!user?.uid) return [];

  try{

    const res = await fetch(
      `${API_BASE}/stakes`,
      {
        method:"GET",
        headers:{
          "Content-Type":"application/json",

          /* 🔐 SEND USER ID SAFELY */
          "x-user-id": user.uid
        }
      }
    );

    /* 🚫 HTTP ERROR */
    if(!res.ok){
      throw new Error("Bad response");
    }

    const data = await res.json();

    /* 🔍 VALIDATE RESPONSE */
    if(!Array.isArray(data)){
      throw new Error("Invalid data format");
    }

    return data;

  }catch(err){

    console.warn("⚠️ API failed, using fallback");

    return _safeParse(INTERNAL_KEY);

  }

 }

/* ======================================
   PI PAYMENT (SECURE FLOW)
====================================== */

async function payWithPi({amount, memo, metadata}){

  const PiNetwork = window.Pi;

  if(!PiNetwork){
    throw new Error("Pi SDK not loaded");
  }

  return new Promise((resolve,reject)=>{

    let completed = false;

    PiNetwork.createPayment({
      amount,
      memo,
      metadata
    },{

      /* 🔐 STEP 1: SERVER APPROVAL */
      onReadyForServerApproval: async function(paymentId){

        try{

          const res = await fetch(
            `${API_BASE}/approve-payment`,
            {
              method:"POST",
              headers:{
                "Content-Type":"application/json"
              },
              body: JSON.stringify({ paymentId })
            }
          );

          const data = await res.json();

          if(!data.success){
            reject("Payment not approved");
          }

        }catch(err){
          reject("Approval failed");
        }

      },

      /* ✅ STEP 2: COMPLETION */
      onReadyForServerCompletion: function(paymentId, txid){

        if(completed) return;
        completed = true;

        console.log("✅ Payment complete:", txid);

        resolve({paymentId, txid});

      },

      /* ❌ CANCEL */
      onCancel: function(){

        if(completed) return;
        completed = true;

        reject("cancelled");

      },

      /* ❌ ERROR */
      onError: function(error){

        if(completed) return;
        completed = true;

        console.error("❌ Pi Error:", error);

        reject(error);

      }

    });

    /* ⏱ TIMEOUT (SAFETY) */
    setTimeout(()=>{
      if(!completed){
        completed = true;
        reject("Payment timeout");
      }
    }, 120000); // 2 mins

  });

    }

/* ======================================
   ADD STAKE (ULTRA FINTECH FLOW)
====================================== */

const API_BASE = "http://localhost:3000";

let __stakingLock = false;

async function addStake({project,amount,duration}){

  /* 🔒 PREVENT DOUBLE CLICK */
  if(__stakingLock){
    return {error:"Processing in progress"};
  }

  __stakingLock = true;

  const user = getCurrentUser();

  if(!user?.uid){
    __stakingLock = false;
    return {error:"User not logged in"};
  }

  if(!project || !amount || amount <= 0){
    __stakingLock = false;
    return {error:"Invalid input"};
  }

  /* ===============================
     STEP 1: PI PAYMENT
  =============================== */

  let payment;

  try{

    payment = await payWithPi({
      amount,
      memo:`Stake in ${project}`,
      metadata:{project,duration}
    });

  }catch(err){
    __stakingLock = false;
    return {error:"Payment failed"};
  }

  /* 🔐 VALIDATE PAYMENT */
  if(!payment?.txid){
    __stakingLock = false;
    return {error:"Invalid payment"};
  }

  /* 🧠 TEMP RECORD (ANTI-LOSS) */
  const tempTx = {
    id:"TMP-"+Date.now(),
    type:"stake",
    project,
    amount,
    status:"pending",
    timestamp:Date.now()
  };

  if(typeof recordTx === "function"){
    recordTx(tempTx);
  }

  /* ===============================
     STEP 2: SEND TO BACKEND
  =============================== */

  try{

    const controller = new AbortController();

    /* ⏱ TIMEOUT */
    const timeout = setTimeout(()=>{
      controller.abort();
    }, 15000);

    const res = await fetch(`${API_BASE}/stake`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",

        /* 🔐 BETTER THAN BODY UID */
        "x-user-id": user.uid
      },
      body: JSON.stringify({
        project,
        amount,
        duration,
        txid: payment.txid
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if(!res.ok){
      throw new Error("Server error");
    }

    const data = await res.json();

    if(!data.success){
      throw new Error(data.error || "Stake failed");
    }

    /* ✅ UPDATE TX STATUS */
    if(typeof recordTx === "function"){
      recordTx({
        ...tempTx,
        status:"success"
      });
    }

    __stakingLock = false;

    return {
      success:true,
      stake:data.stake
    };

  }catch(err){

    console.error("❌ Stake error:", err);

    /* ❌ MARK FAILED */
    if(typeof recordTx === "function"){
      recordTx({
        ...tempTx,
        status:"failed"
      });
    }

    __stakingLock = false;

    return {error:"Network / server error"};
  }

  }

/* ======================================
   GET ALL STAKES (ULTRA SAFE)
====================================== */

async function getAllStakesMerged(){

  let data = [];

  try{

    const apiData = await getStakesAPI();

    if(Array.isArray(apiData)){
      data = apiData;
    }else{
      throw new Error("Invalid API data");
    }

  }catch(err){

    console.warn("⚠️ Using fallback stakes");

    data = _safeParse(INTERNAL_KEY);

  }

  /* 🔍 NORMALIZE + CLEAN */
  const cleaned = data.map(s => ({

    id: s.id || "ST-"+Date.now(),

    project: s.project || "Unknown",

    amount: Number(s.amount) || 0,
    duration: Number(s.duration) || 0,

    reward: Number(s.reward) || 0,
    withdrawnReward: Number(s.withdrawnReward) || 0,

    remainingReward:
      Number(s.remainingReward) ??
      Math.max(
        0,
        (Number(s.reward)||0) -
        (Number(s.withdrawnReward)||0)
      ),

    status: s.status || "Pending",

    timestamp: s.timestamp || Date.now(),

    unlockTime: s.unlockTime || 0,

    /* 🔐 FLAGS */
    capitalWithdrawn: Boolean(s.capitalWithdrawn),

    type: s.type || "internal"

  }));

  /* ✅ FILTER SUCCESS ONLY */
  const filtered =
    cleaned.filter(s => s.status === "Successful");

  /* 🔄 SORT */
  filtered.sort((a,b)=>
    (b.timestamp||0) - (a.timestamp||0)
  );

  return filtered;

}

/* ======================================
   PROJECT TOTALS (ULTRA SAFE)
====================================== */
async function getProjectTotals(project){

  if(!project){
    return {
      stake:0,
      reward:0,
      totalReward:0,
      stakes:[]
    };
  }

  let stakes = [];

  try{
    stakes = await getAllStakesMerged();
  }catch{
    stakes = [];
  }

  const filtered =
    stakes.filter(s => s.project === project);

  let totalStake = 0;

  let totalReward = 0;     // all reward ever
  let availableReward = 0; // withdrawable

  filtered.forEach(s=>{

    const amount =
      Number(s.amount) || 0;

    const reward =
      Number(s.reward) || 0;

    const withdrawn =
      Number(s.withdrawnReward) || 0;

    const remaining =
      Math.max(0, reward - withdrawn);

    totalStake += amount;
    totalReward += reward;
    availableReward += remaining;

  });

  return {
    stake: totalStake,
    reward: availableReward,     // 👉 UI THIS ONE
    totalReward: totalReward,    // 👉 analytics
    stakes: filtered
  };

}

/* ======================================
   WITHDRAW (ULTRA FINTECH SAFE)
====================================== */

let __withdrawLock = false;

async function withdrawStakeReward(stakeId, amount){

  /* 🔒 PREVENT DOUBLE CLICK */
  if(__withdrawLock){
    return {error:"Processing..."};
  }

  __withdrawLock = true;

  const user = getCurrentUser();

  if(!user?.uid){
    __withdrawLock = false;
    return {error:"User not logged in"};
  }

  const safeAmount = Number(amount);

  if(!safeAmount || safeAmount <= 0){
    __withdrawLock = false;
    return {error:"Invalid amount"};
  }

  try{

    const controller = new AbortController();

    /* ⏱ TIMEOUT */
    const timeout = setTimeout(()=>{
      controller.abort();
    }, 15000);

    const res = await fetch(
      `${API_BASE}/withdraw`,
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json",

          /* 🔐 SAFE HEADER */
          "x-user-id": user.uid
        },
        body: JSON.stringify({
          stakeId,
          amount: safeAmount
        }),
        signal: controller.signal
      }
    );

    clearTimeout(timeout);

    if(!res.ok){
      throw new Error("Server error");
    }

    const data = await res.json();

    /* 🔍 VALIDATE RESPONSE */
    if(!data || typeof data !== "object"){
      throw new Error("Invalid response");
    }

    if(!data.success){
      throw new Error(data.error || "Withdraw failed");
    }

    __withdrawLock = false;

    return {
      success:true,
      amount: data.amount || safeAmount
    };

  }catch(err){

    console.error("❌ Withdraw error:", err);

    __withdrawLock = false;

    return {error:"Network / server error"};
  }

}

/* ======================================
   LEGACY WRAPPERS (ASYNC SAFE)
====================================== */

async function getStakes(){
  return await getAllStakesMerged();
}

async function getInternalTotals(){
  return await getProjectTotals();
}

async function getInternalProjectTotals(p){
  return await getProjectTotals(p);
}

async function addInternalStake(p){
  return await addStake(p);
}

/* ======================================
   PRELOAD STAKES (AUTO)
====================================== */

async function preloadStakes(){

  try{

    const data = await getStakesAPI();

    if(Array.isArray(data)){
      __stakesCache = data;
      __stakesLoaded = true;
    }

  }catch(err){

    console.warn("⚠️ Using fallback");

    __stakesCache = _safeParse(INTERNAL_KEY);
    __stakesLoaded = true;

  }

    }
/* AUTO START */
preloadStakes();

/* ======================================
   GET ALL STAKES (SYNC SAFE)
====================================== */

function getAllStakesMerged(){

  if(!__stakesLoaded){
    console.warn("⚠️ Stakes not ready yet");
    return [];
  }

  return (__stakesCache || [])
    .filter(s => s.status === "Successful")
    .sort((a,b)=>
      (b.timestamp||0) - (a.timestamp||0)
    );

}

async function getAllStakesMergedAsync(){
  return await getStakesAPI();
}

setInterval(preloadStakes, 10000);
if(!__stakesLoaded) showLoader();
