/* =========================================
   ALBUKHR WALLET CORE v5 (PROJECT AWARE)
   Internal + External Unified
========================================= */

const WITHDRAW_KEY = "albukhr_wallet_withdrawals_v5";
const SETTINGS_KEY = "albukhr_wallet_settings";

/* =========================================
   SETTINGS (ADMIN ADJUSTABLE)
========================================= */

function getWalletSettings(){
  const def = {
    feePercent: 1,        // 1%
    dailyLimit: 50        // 50 Pi per day
  };
  return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || def;
}

function saveWalletSettings(settings){
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
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
   PROJECT BREAKDOWN (CORE)
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
        withdrawn: 0
      };
    }

    map[s.project].stake += Number(s.amount) || 0;
    map[s.project].grossReward += Number(s.reward) || 0;
  });

  withdrawals.forEach(w=>{
    if(!map[w.project]) return;
    map[w.project].withdrawn += Number(w.grossAmount || w.amount) || 0;
  });

  return Object.values(map).map(p=>({
    ...p,
    netReward: p.grossReward - p.withdrawn
  }));
}

/* =========================================
   GLOBAL SUMMARY
========================================= */

function getWalletSummary(){

  const projects = getProjectWalletBreakdown();

  let totalStake = 0;
  let grossRewards = 0;
  let withdrawn = 0;

  projects.forEach(p=>{
    totalStake += p.stake;
    grossRewards += p.grossReward;
    withdrawn += p.withdrawn;
  });

  return {
    totalStake,
    grossRewards,
    withdrawn,
    rewards: grossRewards - withdrawn,
    available: grossRewards - withdrawn
  };
}

/* =========================================
   DAILY LIMIT CHECK
========================================= */

function getTodayWithdrawTotal(){

  const today = new Date().toDateString();

  return getWithdrawals()
    .filter(w => new Date(w.timestamp).toDateString() === today)
    .reduce((sum,w)=> sum + Number(w.grossAmount || 0),0);
}

/* =========================================
   WITHDRAW (PROJECT SPECIFIC)
========================================= */

function requestWithdraw({project, amount, walletAddress}){

  const settings = getWalletSettings();
  amount = parseFloat(amount);

  if(!project)
    return { error:"Project required" };

  if(amount <= 0)
    return { error:"Invalid amount" };

  if(!walletAddress)
    return { error:"Wallet address required" };

  const projects = getProjectWalletBreakdown();
  const p = projects.find(x=>x.project===project);

  if(!p)
    return { error:"Project not found" };

  if(amount > p.netReward)
    return { error:"Insufficient project reward balance" };

  if(getTodayWithdrawTotal() + amount > settings.dailyLimit)
    return { error:"Daily limit exceeded (50 Pi)" };

  const fee = (amount * settings.feePercent) / 100;
  const received = amount - fee;

  const now = Date.now();

  const tx = {
    id: "WD-" + now,
    project,
    grossAmount: amount,
    fee,
    received,
    walletAddress,
    timestamp: now
  };

  const list = getWithdrawals();
  list.push(tx);
  saveWithdrawals(list);

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
