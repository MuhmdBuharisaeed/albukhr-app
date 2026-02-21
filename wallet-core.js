/* =========================================
   ALBUKHR WALLET CORE v6 (ACCOUNTING SAFE)
   Single Source of Truth Architecture
========================================= */

const WITHDRAW_KEY = "albukhr_wallet_withdrawals_v6";
const SETTINGS_KEY = "albukhr_wallet_settings";

/* =========================================
   SETTINGS
========================================= */

function getWalletSettings(){
  return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {
    feePercent: 1,
    dailyLimit: 50
  };
}

/* =========================================
   STORAGE
========================================= */

function getWithdrawals(){
  return JSON.parse(localStorage.getItem(WITHDRAW_KEY)) || [];
}

function saveWithdrawals(list){
  localStorage.setItem(WITHDRAW_KEY, JSON.stringify(list));
}

/* =========================================
   PROJECT BREAKDOWN (REAL ACCOUNTING)
========================================= */

function getProjectWalletBreakdown(){

  if(typeof getAllStakesMerged !== "function"){
    return [];
  }

  const stakes = getAllStakesMerged();
  const withdrawals = getWithdrawals();

  const map = {};

  stakes.forEach(s=>{

    if(!map[s.project]){
      map[s.project] = {
        project: s.project,
        stake: 0,
        grossReward: 0,
        withdrawnReward: 0,
        withdrawnCapital: 0
      };
    }

    if(!s.capitalWithdrawn){
      map[s.project].stake += Number(s.amount) || 0;
    }

    map[s.project].grossReward +=
      Number(s.remainingReward ?? s.reward) || 0;
  });

  withdrawals.forEach(w=>{
    if(!map[w.project]) return;

    if(w.type === "capital"){
      map[w.project].withdrawnCapital += Number(w.grossAmount) || 0;
    }else{
      map[w.project].withdrawnReward += Number(w.grossAmount) || 0;
    }
  });

  return Object.values(map).map(p=>({

    project: p.project,

    stake: p.stake,

    grossReward: p.grossReward,

    withdrawn: p.withdrawnReward + p.withdrawnCapital,

    withdrawnReward: p.withdrawnReward,

    withdrawnCapital: p.withdrawnCapital,

    netReward: Math.max(
      p.grossReward - p.withdrawnReward,
      0
    )
  }));
}

/* =========================================
   GLOBAL SUMMARY (CORRECTED)
========================================= */

function getWalletSummary(){

  const projects = getProjectWalletBreakdown();

  let totalStake = 0;
  let grossRewards = 0;
  let totalWithdrawn = 0;
  let availableRewards = 0;

  projects.forEach(p=>{
    totalStake += p.stake;
    grossRewards += p.grossReward;
    totalWithdrawn += p.withdrawn;
    availableRewards += p.netReward;
  });

  return {
    totalStake,
    grossRewards,
    withdrawn: totalWithdrawn,
    available: availableRewards
  };
}

/* =========================================
   DAILY LIMIT
========================================= */

function getTodayWithdrawTotal(){

  const today = new Date().toDateString();

  return getWithdrawals()
    .filter(w =>
      new Date(w.timestamp).toDateString() === today &&
      w.type !== "capital"
    )
    .reduce((sum,w)=>
      sum + Number(w.grossAmount || 0),0);
}

/* =========================================
   REWARD WITHDRAW (SAFE VERSION)
========================================= */

function requestWithdraw({project, amount, walletAddress}){

  amount = Number(amount);

  if(!amount || amount <= 0){
    return {error:"Invalid amount"};
  }

  const settings = getWalletSettings();
  const projects = getProjectWalletBreakdown();
  const target = projects.find(p => p.project === project);

  if(!target){
    return {error:"Project not found"};
  }

  if(amount > target.netReward){
    return {error:"Insufficient reward balance"};
  }

  if(getTodayWithdrawTotal() + amount > settings.dailyLimit){
    return {error:"Daily withdraw limit exceeded"};
  }

  const fee = amount * (settings.feePercent / 100);
  const received = amount - fee;

  const history = getWithdrawals();

  history.push({
    id:"RW-"+Date.now(),
    type:"reward",
    project,
    grossAmount:amount,
    fee,
    received,
    walletAddress,
    timestamp:Date.now()
  });

  saveWithdrawals(history);

  window.dispatchEvent(new Event("walletUpdated"));

  return {
    success:true,
    grossAmount:amount,
    fee,
    received
  };
}

/* =========================================
   CAPITAL WITHDRAW (MATURED SAFE)
========================================= */

function requestCapitalWithdraw(project){

  if(typeof getProjectTotals !== "function")
    return { error:"Engine not ready" };

  const totals = getProjectTotals(project);

  if(!totals?.stakes?.length)
    return { error:"No stakes found" };

  let totalCapital = 0;

  totals.stakes.forEach(s=>{
    if(typeof isStakeMatured === "function" &&
       isStakeMatured(s) &&
       !s.capitalWithdrawn){

      if(typeof withdrawCapital === "function"){
        withdrawCapital(s.id);
      }

      totalCapital += Number(s.amount) || 0;
    }
  });

  if(totalCapital <= 0)
    return { error:"No matured capital available" };

  const tx = {
    id: "CAP-" + Date.now(),
    project,
    grossAmount: totalCapital,
    fee: 0,
    received: totalCapital,
    walletAddress: "internal",
    timestamp: Date.now(),
    type: "capital"
  };

  const list = getWithdrawals();
  list.push(tx);
  saveWithdrawals(list);

  window.dispatchEvent(new Event("walletUpdated"));

  return tx;
}

/* =========================================
   HISTORY
========================================= */

function getWithdrawHistory(){
  return getWithdrawals()
    .sort((a,b)=> b.timestamp - a.timestamp);
}

/* =========================================
   DEV
========================================= */

function clearWalletLedger(){
  localStorage.removeItem(WITHDRAW_KEY);
     }
