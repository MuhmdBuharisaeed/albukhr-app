/* =========================================
   ALBUKHR WALLET CORE v6 (SYNCED WITH ENGINE 3.2)
   Internal + External Unified
========================================= */

const WITHDRAW_KEY = "albukhr_wallet_withdrawals_v6";
const SETTINGS_KEY = "albukhr_wallet_settings";

/* =========================================
   SETTINGS (ADMIN ADJUSTABLE)
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
   PROJECT BREAKDOWN (SYNCED WITH REMAINING REWARD)
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

    if(!s.capitalWithdrawn){
      map[s.project].stake += Number(s.amount) || 0;
    }

    map[s.project].grossReward += 
      Number(s.remainingReward ?? s.reward) || 0;
  });

  withdrawals.forEach(w=>{
    if(!map[w.project]) return;
    map[w.project].withdrawn += Number(w.grossAmount || 0) || 0;
  });

  return Object.values(map).map(p=>({
    ...p,
    netReward: p.grossReward
  }));
}

/* =========================================
   GLOBAL SUMMARY
========================================= */

function getWalletSummary(){

  const projects = getProjectWalletBreakdown();

  let totalStake = 0;
  let rewards = 0;

  projects.forEach(p=>{
    totalStake += p.stake;
    rewards += p.netReward;
  });

  return {
    totalStake,
    grossRewards: rewards,
    withdrawn: 0,
    rewards,
    available: rewards
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
   WITHDRAW (PROJECT SPECIFIC + ENGINE SYNC)
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
    return { error:"Daily limit exceeded" };

  const fee = (amount * settings.feePercent) / 100;
  const received = amount - fee;

  /* ==========================
     ENGINE REWARD DEDUCTION
  ========================== */

  if(typeof withdrawProjectReward === "function"){
    const result = withdrawProjectReward(project, amount);
    if(result?.error){
      return result;
    }
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
    type: "withdrawal"
  };

  const list = getWithdrawals();
  list.push(tx);
  saveWithdrawals(list);

  return tx;
}

/* =========================================
   PROJECT LEVEL HISTORY (FOR PROJECT PAGE)
========================================= */

function getProjectWithdrawHistory(project){

  return getWithdrawals()
    .filter(w=>w.project===project)
    .sort((a,b)=>b.timestamp - a.timestamp);
}

/* =========================================
   MERGED PROJECT HISTORY (Stake + Withdraw)
========================================= */

function getProjectFullHistory(project){

  const stakes = 
    typeof getInternalProjectTotals === "function"
      ? getInternalProjectTotals(project).stakes || []
      : [];

  const withdrawals = getProjectWithdrawHistory(project);

  const mappedWithdrawals = withdrawals.map(w=>({
    id: w.id,
    project: w.project,
    amount: w.grossAmount,
    type: "withdrawal",
    timestamp: w.timestamp
  }));

  return [...stakes, ...mappedWithdrawals]
    .sort((a,b)=> b.timestamp - a.timestamp);
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
