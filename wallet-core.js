/* =========================================
   ALBUKHR WALLET CORE v5
   Project-Aware + Daily Limit + Audit Safe
   Source of Truth = staking.js
========================================= */

const WITHDRAW_KEY = "albukhr_wallet_withdrawals_v5";

/* =========================================
   PER-PROJECT DAILY LIMIT POLICY
========================================= */

const PROJECT_DAILY_LIMIT = {
  Raheem: 50,
  Hauwal: 100,
  Barsh: 300,
  Khairat: 150,
  Urban: 500,
  Labbaika: 80,
  default: 50
};

/* =========================================
   STORAGE
========================================= */

function getWithdrawals(){
  try{
    return JSON.parse(localStorage.getItem(WITHDRAW_KEY)) || [];
  }catch{
    return [];
  }
}

function saveWithdrawals(list){
  localStorage.setItem(WITHDRAW_KEY, JSON.stringify(list));
}

/* =========================================
   EXTERNAL DATA (staking.js)
========================================= */

function getExternalTotals(){
  if(typeof getTotals === "function"){
    return getTotals();
  }
  return { totalStake:0, totalReward:0 };
}

function getAllStakesSafe(){
  if(typeof getAllStakesMerged === "function"){
    return getAllStakesMerged();
  }
  if(typeof getStakes === "function"){
    return getStakes();
  }
  return [];
}

/* =========================================
   CORE CALCULATIONS
========================================= */

function getTotalStake(){
  return getExternalTotals().totalStake || 0;
}

function getGrossRewards(){
  return getExternalTotals().totalReward || 0;
}

function getTotalWithdrawn(){
  return getWithdrawals()
    .reduce((sum,t)=> sum + Number(t.amount || 0),0);
}

/* NET REWARD */
function getNetRewards(){
  return getGrossRewards() - getTotalWithdrawn();
}

function getAvailableBalance(){
  return getNetRewards();
}

/* =========================================
   PROJECT REWARD POOL (FIFO ENGINE)
========================================= */

function buildProjectRewardPool(){

  const stakes = getAllStakesSafe();
  const withdrawals = getWithdrawals();

  const pool = {};

  /* 1️⃣ Collect rewards per project */
  stakes.forEach(s=>{
    if(!pool[s.project]){
      pool[s.project] = {
        reward:0,
        withdrawn:0
      };
    }
    pool[s.project].reward += Number(s.reward) || 0;
  });

  /* 2️⃣ Apply previous withdrawals FIFO */
  withdrawals.forEach(w=>{
    if(!w.breakdown) return;

    w.breakdown.forEach(b=>{
      if(pool[b.project]){
        pool[b.project].withdrawn += Number(b.amount) || 0;
      }
    });
  });

  return pool;
}

/* =========================================
   DAILY WITHDRAW TRACKER
========================================= */

function getTodayWithdrawByProject(project){

  const today = new Date().toDateString();

  return getWithdrawals()
    .filter(tx =>
      new Date(tx.createdAt).toDateString() === today
    )
    .reduce((sum,tx)=>{
      const part = (tx.breakdown || [])
        .filter(b=>b.project===project)
        .reduce((s,b)=>s+Number(b.amount||0),0);
      return sum + part;
    },0);
}

/* =========================================
   WALLET SUMMARY
========================================= */

function getWalletSummary(){
  return {
    totalStake: getTotalStake(),
    totalReward: getNetRewards(),  // NET mode
    withdrawn: getTotalWithdrawn(),
    available: getAvailableBalance()
  };
}

/* =========================================
   WITHDRAW REQUEST (PROJECT-AWARE)
========================================= */

function requestWithdraw(amount, walletAddress){

  amount = Number(amount);

  /* ===== BASIC VALIDATION ===== */

  if(!amount || isNaN(amount) || amount <= 0){
    return { error:"Enter valid amount greater than 0" };
  }

  if(!walletAddress){
    return { error:"Wallet address required" };
  }

  if(amount > getAvailableBalance()){
    return { error:"Insufficient reward balance" };
  }

  /* ===== BUILD POOL ===== */

  const pool = buildProjectRewardPool();
  const breakdown = [];

  let remaining = amount;

  /* FIFO DISTRIBUTION */
  for(const project in pool){

    if(remaining <= 0) break;

    const available =
      pool[project].reward - pool[project].withdrawn;

    if(available <= 0) continue;

    const dailyLimit =
      PROJECT_DAILY_LIMIT[project] ||
      PROJECT_DAILY_LIMIT.default;

    const todayUsed =
      getTodayWithdrawByProject(project);

    if(todayUsed >= dailyLimit){
      return { error:`Daily limit reached for ${project}` };
    }

    const usable = Math.min(available, remaining);

    if(todayUsed + usable > dailyLimit){
      return { error:`${project} daily limit exceeded` };
    }

    breakdown.push({
      project,
      amount: usable
    });

    remaining -= usable;
  }

  if(remaining > 0){
    return { error:"Withdraw exceeds allowed project limits" };
  }

  /* ===== SAVE TX ===== */

  const tx = {
    id: "WD-" + Date.now(),
    type: "withdraw",
    amount,
    walletAddress,
    breakdown,           // 🔑 project-aware tracking
    createdAt: Date.now()
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
    .sort((a,b)=>b.createdAt - a.createdAt);
}

/* =========================================
   DEV TOOL
========================================= */

function clearWalletLedger(){
  localStorage.removeItem(WITHDRAW_KEY);
}
