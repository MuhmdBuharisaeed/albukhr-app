/* =========================================
   ALBUKHR WALLET CORE v7
   FULLY SYNCED WITH NEW STAKING ENGINE
========================================= */

const WITHDRAW_KEY = "albukhr_wallet_withdrawals_v7";
const SETTINGS_KEY = "albukhr_wallet_settings";

/* =========================================
   SETTINGS
========================================= */

function getWalletSettings(){
  const def = { feePercent:1, dailyLimit:50 };
  return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || def;
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
   PROJECT BREAKDOWN (REWARD + CAPITAL)
========================================= */

function getProjectWalletBreakdown(){

  if(typeof getAllStakesMerged !== "function") return [];

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
      Number(s.remainingReward ?? s.reward ?? 0);
  });

  withdrawals.forEach(w=>{
    if(!map[w.project]) return;

    if(w.type === "reward"){
      map[w.project].withdrawnReward += Number(w.grossAmount);
    }

    if(w.type === "capital"){
      map[w.project].withdrawnCapital += Number(w.grossAmount);
    }
  });

  return Object.values(map).map(p=>({
    ...p,
    withdrawn: p.withdrawnReward + p.withdrawnCapital,
    netReward: p.grossReward
  }));
}

/* =========================================
   SUMMARY
========================================= */

function getWalletSummary(){

  const projects = getProjectWalletBreakdown();

  let totalStake = 0;
  let rewards = 0;
  let withdrawn = 0;

  projects.forEach(p=>{
    totalStake += p.stake;
    rewards += p.netReward;
    withdrawn += p.withdrawn;
  });

  return {
    totalStake,
    grossRewards: rewards,
    withdrawn,
    available: rewards
  };
}

/* =========================================
   DAILY LIMIT
========================================= */

function getTodayWithdrawTotal(){

  const today = new Date().toDateString();

  return getWithdrawals()
    .filter(w =>
      new Date(w.timestamp).toDateString() === today
    )
    .reduce((sum,w)=> sum + Number(w.grossAmount),0);
}

/* =========================================
   REWARD WITHDRAW
========================================= */

function requestWithdraw({project, amount, walletAddress}){

  const settings = getWalletSettings();
  amount = parseFloat(amount);

  if(!project) return {error:"Project required"};
  if(amount <= 0) return {error:"Invalid amount"};
  if(!walletAddress) return {error:"Wallet required"};

  const projects = getProjectWalletBreakdown();
  const p = projects.find(x=>x.project===project);
  if(!p) return {error:"Project not found"};

  if(amount > p.netReward)
    return {error:"Insufficient reward balance"};

  if(getTodayWithdrawTotal() + amount > settings.dailyLimit)
    return {error:"Daily limit exceeded"};

  const fee = (amount * settings.feePercent)/100;
  const received = amount - fee;

  /* ENGINE DEDUCT REWARD */
  if(typeof withdrawProjectReward === "function"){
    const res = withdrawProjectReward(project, amount);
    if(res?.error) return res;
  }

  const tx = {
    id:"WD-"+Date.now(),
    project,
    grossAmount:amount,
    fee,
    received,
    walletAddress,
    timestamp:Date.now(),
    type:"reward"
  };

  const list = getWithdrawals();
  list.push(tx);
  saveWithdrawals(list);

  return tx;
}

/* =========================================
   CAPITAL WITHDRAW (AFTER DURATION)
========================================= */

function requestCapitalWithdraw(project){

  if(typeof withdrawProjectCapital !== "function")
    return {error:"Capital engine not ready"};

  const res = withdrawProjectCapital(project);
  if(res?.error) return res;

  const tx = {
    id:"CAP-"+Date.now(),
    project,
    grossAmount:res.amount,
    fee:0,
    received:res.amount,
    walletAddress:"internal",
    timestamp:Date.now(),
    type:"capital"
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
