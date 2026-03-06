/* =========================================
   ALBUKHR WALLET CORE v7 (SAFE + RECOVERY)
   Backward Compatible • Corruption Safe
========================================= */

const WITHDRAW_KEY = "albukhr_wallet_withdrawals_v6";
const SETTINGS_KEY = "albukhr_wallet_settings";

/* =========================================
   SAFE JSON PARSE
========================================= */

function safeParse(value, fallback){
  try{
    if(!value) return fallback;
    return JSON.parse(value);
  }catch(e){
    console.warn("Wallet parse error recovered");
    return fallback;
  }
}

function safeStringify(value){
  try{
    return JSON.stringify(value);
  }catch(e){
    console.error("Wallet stringify error");
    return "[]";
  }
}

/* =========================================
   SETTINGS
========================================= */

function getWalletSettings(){
  return safeParse(
    localStorage.getItem(SETTINGS_KEY),
    {
      feePercent: 1,
      dailyLimit: 50
    }
  );
}

/* =========================================
   STORAGE
========================================= */

function getWithdrawals(){
  const data = safeParse(
    localStorage.getItem(WITHDRAW_KEY),
    []
  );

  if(!Array.isArray(data)) return [];

  return data;
}

function saveWithdrawals(list){
  if(!Array.isArray(list)) return;
  localStorage.setItem(
    WITHDRAW_KEY,
    safeStringify(list)
  );
}

/* =========================================
   PROJECT BREAKDOWN
========================================= */

function getProjectWalletBreakdown(){

  if(typeof getAllStakesMerged !== "function"){
    return [];
  }

  const stakes = getAllStakesMerged() || [];
  const withdrawals = getWithdrawals();

  const map = {};

  stakes.forEach(s=>{

    if(!s?.project) return;

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

    if(!w?.project) return;
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
   GLOBAL SUMMARY
========================================= */

function getWalletSummary(){

  const projects = getProjectWalletBreakdown();

  let totalStake = 0;
  let grossRewards = 0;
  let totalWithdrawn = 0;
  let availableRewards = 0;

  projects.forEach(p=>{
    totalStake += Number(p.stake) || 0;
    grossRewards += Number(p.grossReward) || 0;
    totalWithdrawn += Number(p.withdrawn) || 0;
    availableRewards += Number(p.netReward) || 0;
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
   REWARD WITHDRAW
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
    walletAddress:walletAddress || "internal",
    timestamp:Date.now()
  });

  saveWithdrawals(history);

  window.dispatchEvent(new CustomEvent("walletUpdated", {
  detail: {
    type: "reward-withdraw"
  }
}));

  return {
    success:true,
    grossAmount:amount,
    fee,
    received
  };
}

/* =========================================
   CAPITAL WITHDRAW
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

  window.dispatchEvent(new CustomEvent("walletUpdated", {
  detail: {
    type: "capital-withdraw"
  }
}));

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
   DEV RESET
========================================= */

function clearWalletLedger(){
  localStorage.removeItem(WITHDRAW_KEY);
     }

/* =========================================
   ADMIN COMPATIBILITY LAYER
   Makes wallet-core readable by admin panel
========================================= */

const ADMIN_WALLET_KEY = "albukhr_admin_wallet_v1";

/* Build admin wallet object from withdrawals */
function buildAdminWallet(){

  const withdrawals = getWithdrawals();

  let balance = 0;

  withdrawals.forEach(tx=>{
    balance -= Number(tx.grossAmount) || 0;
  });

  return {
    balance: balance,
    currency: "Pi",
    status: localStorage.getItem("albukhr_wallet_status") || "active",
    transactions: withdrawals.map(tx=>({
      type: tx.type,
      amount: tx.grossAmount,
      address: tx.walletAddress || "internal",
      at: tx.timestamp,
      project: tx.project
    }))
  };
}

/* Used by admin-wallet.js */
function getWallet(){
  return buildAdminWallet();
}

/* Save wallet status only (lock/unlock) */
function saveWallet(wallet){
  if(wallet?.status){
    localStorage.setItem("albukhr_wallet_status", wallet.status);
  }
}

window.dispatchEvent(new CustomEvent("walletUpdated", {
  detail: { type: "reward-withdraw" }
}));
