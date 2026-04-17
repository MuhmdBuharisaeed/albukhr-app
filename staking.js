// =======================================
// ALBUKHR STAKING ENGINE v5 (ULTRA CLEAN)
// API Driven • Stable • Production Ready
// =======================================

const API_BASE = "https://api.albukhr.com";
const INTERNAL_KEY = "albukhr_stakes";

/* ======================================
   SAFE STORAGE (FALLBACK)
====================================== */
function _safeParse(key){
  try{
    const raw = localStorage.getItem(key);
    if(!raw) return [];
    const data = JSON.parse(raw);
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
    const user = JSON.parse(localStorage.getItem("pi_user"));
    return user?.uid ? user : null;
  }catch{
    return null;
  }
}

/* ======================================
   API: GET STAKES
====================================== */
async function getStakesAPI(){

  const user = getCurrentUser();
  if(!user?.uid) return [];

  try{
    const res = await fetch(
      `${API_BASE}/stakes?uid=${user.uid}`
    );

    if(!res.ok) throw new Error();

    const data = await res.json();

    if(Array.isArray(data)){
      _save(INTERNAL_KEY, data); // cache
      return data;
    }

    throw new Error();

  }catch{
    return _safeParse(INTERNAL_KEY);
  }

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
      onReadyForServerCompletion(paymentId, txid){
        resolve({paymentId, txid});
      },
      onCancel(){ reject("cancelled"); },
      onError(e){ reject(e); }
    });

  });

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

  const user = getCurrentUser();

  if(!user?.uid){
    __stakingLock = false;
    return {error:"User not logged in"};
  }

  if(!project || !amount || amount <= 0){
    __stakingLock = false;
    return {error:"Invalid input"};
  }

  /* PAYMENT */
  let payment;

  try{
    payment = await payWithPi({
      amount,
      memo:`Stake in ${project}`,
      metadata:{project,duration}
    });
  }catch{
    __stakingLock = false;
    return {error:"Payment failed"};
  }

  if(!payment?.txid){
    __stakingLock = false;
    return {error:"Invalid payment"};
  }

  /* SEND TO API */
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

    const data = await res.json();

    if(!data.success){
      throw new Error(data.error);
    }

    __stakingLock = false;

    return {
      success:true,
      stake:data.stake
    };

  }catch(err){

    console.error(err);

    __stakingLock = false;

    return {error:"Network / server error"};
  }

}

/* ======================================
   GET ALL STAKES
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
   PROJECT TOTALS
====================================== */
async function getProjectTotals(project){

  const stakes = await getAllStakesMerged();

  const filtered =
    stakes.filter(s=>s.project===project);

  let totalStake = 0;
  let totalReward = 0;

  filtered.forEach(s=>{

    const reward =
      (Number(s.reward)||0) -
      (Number(s.withdrawnReward)||0);

    totalStake += Number(s.amount)||0;
    totalReward += Math.max(0, reward);

  });

  return {
    stake: totalStake,
    reward: totalReward,
    stakes: filtered
  };

}

/* ======================================
   WITHDRAW
====================================== */
let __withdrawLock = false;

async function withdrawStakeReward(project, amount){

  if(__withdrawLock){
    return {error:"Processing..."};
  }

  __withdrawLock = true;

  const user = getCurrentUser();

  if(!user?.uid){
    __withdrawLock = false;
    return {error:"User not logged in"};
  }

  try{

    const res = await fetch(
      `${API_BASE}/withdraw`,
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body: JSON.stringify({
          userId: user.uid,
          project,
          amount
        })
      }
    );

    const data = await res.json();

    if(!data.success){
      throw new Error(data.error);
    }

    __withdrawLock = false;

    return {success:true};

  }catch(err){

    console.error(err);

    __withdrawLock = false;

    return {error:"Withdraw failed"};
  }

}

/* ======================================
   WRAPPERS
====================================== */
function getStakes(){ return getAllStakesMerged(); }
function getInternalTotals(){ return getProjectTotals(); }
function getInternalProjectTotals(p){ return getProjectTotals(p); }
function addInternalStake(p){ return addStake(p); }
