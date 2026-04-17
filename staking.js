// =======================================
// ALBUKHR STAKING ENGINE v5 (FINTECH CORE)
// API Driven • Secure • Scalable
// =======================================

const INTERNAL_KEY = "albukhr_stakes";

/* ======================================
   SAFE FALLBACK STORAGE
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
   API LAYER
====================================== */
async function getStakesAPI(){

  const user = getCurrentUser();

  if(!user?.uid) return [];

  try{
    const res = await fetch(
      `http://localhost:3000/stakes?uid=${user.uid}`
    );

    return await res.json();

  }catch(err){
    console.warn("API failed, fallback");
    return _safeParse(INTERNAL_KEY);
  }

}

/* ======================================
   PI PAYMENT
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
      onReadyForServerCompletion(paymentId, txid){
        resolve({paymentId, txid});
      },
      onCancel(){ reject("cancelled"); },
      onError(e){ reject(e); }
    });

  });

}

/* ======================================
   ADD STAKE (REAL FLOW)
====================================== */
const API_BASE = "http://localhost:3000";

async function addStake({project,amount,duration}){

  const user = getCurrentUser();

  if(!user?.uid){
    return {error:"User not logged in"};
  }

  if(!project || !amount || amount <= 0){
    return {error:"Invalid input"};
  }

  /* 1. PI PAYMENT */
  let payment;

  try{
    payment = await payWithPi({
      amount,
      memo:`Stake in ${project}`,
      metadata:{project,duration}
    });
  }catch{
    return {error:"Payment failed"};
  }

  /* 🔒 VALIDATE PAYMENT */
  if(!payment?.txid){
    return {error:"Invalid payment"};
  }

  /* 2. SEND TO BACKEND */
  try{

    const res = await fetch(`${API_BASE}/stake`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body: JSON.stringify({
        userId: user.uid,
        project,
        amount,
        duration,
        txid: payment.txid
      })
    });

    if(!res.ok){
      return {error:"Server error"};
    }

    const data = await res.json();

    if(!data.success){
      return {error:data.error || "Stake failed"};
    }

    return {
      success:true,
      stake:data.stake
    };

  }catch(err){
    console.error(err);
    return {error:"Network error"};
  }

}

/* ======================================
   GET ALL STAKES (ASYNC CORE)
====================================== */
async function getAllStakesMerged(){

  const data = await getStakesAPI();

  return (data || [])
    .filter(s => s.status === "Successful")
    .sort((a,b)=>
      (b.timestamp||0) - (a.timestamp||0)
    );

}

/* ======================================
   PROJECT TOTALS (ASYNC)
====================================== */
async function getProjectTotals(project){

  const stakes = await getAllStakesMerged();

  const filtered =
    stakes.filter(s=>s.project===project);

  let stake = 0;
  let reward = 0;

  filtered.forEach(s=>{
    stake  += Number(s.amount)||0;
    reward += Number(s.reward)||0;
  });

  return {stake,reward,stakes:filtered};
}

/* ======================================
   WITHDRAW (API ONLY)
====================================== */
async function withdrawStakeReward(stakeId, amount){

  const user = getCurrentUser();

  if(!user?.uid){
    return {error:"User not logged in"};
  }

  try{

    const res = await fetch(
      "http://localhost:3000/withdraw",
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body: JSON.stringify({
          userId: user.uid,
          stakeId,
          amount
        })
      }
    );

    return await res.json();

  }catch{
    return {error:"Withdraw failed"};
  }

}

/* ======================================
   LEGACY WRAPPERS
====================================== */
function getStakes(){ return getAllStakesMerged(); }
function getInternalTotals(){ return getProjectTotals(); }
function getInternalProjectTotals(p){ return getProjectTotals(p); }
function addInternalStake(p){ return addStake(p); }
