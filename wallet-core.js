/* =========================================
   ALBUKHR WALLET CORE v5 (EXTENDED SAFE)
   Backward Compatible + Capital Support
========================================= */

const WITHDRAW_KEY = "albukhr_wallet_withdrawals_v5";
const SETTINGS_KEY = "albukhr_wallet_settings";

/* =========================================
   SETTINGS
========================================= */

function getWalletSettings(){
  const def = {
    feePercent: 1,
    dailyLimit: 50
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
   PROJECT BREAKDOWN (SYNC WITH ENGINE 3.2)
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
    netReward: p.grossReward
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
    rewards: grossRewards,
    available: grossRewards
  };
}

/* =========================================
   DAILY LIMIT
========================================= */

function getTodayWithdrawTotal(){

  const today = new Date().toDateString();

  return getWithdrawals()
    .filter(w => new Date(w.timestamp).toDateString() === today)
    .reduce((sum,w)=> sum + Number(w.grossAmount || 0),0);
}

/* =========================================
   REWARD WITHDRAW
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

  /* ENGINE SYNC */
  if(typeof withdrawProjectReward === "function"){
    const res = withdrawProjectReward(project, amount);
    if(res?.error) return res;
  }

  const now = Date.now();

  const tx = {
    id: "WD-" + now,
    project,
    grossAmount: amount,
    fee,
    received,
    walletAddress,
    timestamp: now,
    type: "reward"
  };

  const list = getWithdrawals();
  list.push(tx);
  saveWithdrawals(list);

  return tx;
}

/* =========================================
   CAPITAL WITHDRAW (MATURED ONLY)
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
