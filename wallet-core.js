/* =========================================
   ALBUKHR WALLET CORE v4.1 (STABLE)
   Source of Truth = staking.js
   Wallet = Withdraw Layer Only
========================================= */

const WITHDRAW_KEY = "albukhr_wallet_withdrawals_v4";

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
   DAILY WITHDRAW LIMIT (PER PROJECT)
========================================= */

const DAILY_LIMIT = {
  Raheem: 50,
  Hauwal: 100,
  Barsh: 300,
  Khairat: 150,
  Urban: 500,
  Labbaika: 80,
  default: 50
};

/* =========================================
   EXTERNAL DATA (staking.js)
========================================= */

function getExternalTotals(){
  if(typeof getTotals === "function"){
    return getTotals();
  }
  return { totalStake:0, totalReward:0 };
}

/* =========================================
   CALCULATIONS
========================================= */

function getTotalStake(){
  return getExternalTotals().totalStake || 0;
}

function getGrossRewards(){
  return getExternalTotals().totalReward || 0;
}

function getTotalWithdrawn(){
  return getWithdrawals()
    .reduce((sum,t)=> sum + (Number(t.amount) || 0), 0);
}

/* NET REWARD (after withdraw) */
function getNetRewards(){
  return getGrossRewards() - getTotalWithdrawn();
}

function getAvailableBalance(){
  return getNetRewards();
}

function getWalletSummary(){
  return {
    locked: getTotalStake(),
    grossRewards: getGrossRewards(),
    withdrawn: getTotalWithdrawn(),
    rewards: getNetRewards(),
    available: getAvailableBalance()
  };
}

/* =========================================
   WITHDRAW REQUEST
========================================= */

function requestWithdraw(amount, walletAddress){

  amount = parseFloat(amount);

  if(amount <= 0)
    return { error:"Invalid amount" };

  if(!walletAddress)
    return { error:"Wallet address required" };

  if(amount > getAvailableBalance())
    return { error:"Insufficient reward balance" };

  const now = Date.now();

const todayTotal = getTodayWithdrawTotal();
const limit = DAILY_LIMIT.default;

if(todayTotal + amount > limit){
  return { error: "Daily withdraw limit reached" };
}
   
  const tx = {
    id: "WD-" + now,
    type: "withdraw",
    amount,
    walletAddress,
    timestamp: now,     // ← STANDARDIZED FIELD
    createdAt: now      // ← backward compatibility
  };

  const list = getWithdrawals();
  list.push(tx);
  saveWithdrawals(list);

  return tx;
}

/* =========================================
   HISTORY (Withdraw Only)
========================================= */

function getWithdrawHistory(){

  return getWithdrawals()
    .map(tx => ({
      ...tx,
      timestamp: tx.timestamp || tx.createdAt || Date.now()
    }))
    .sort((a,b)=> b.timestamp - a.timestamp);
}

/* =========================================
   DEV
========================================= */

function clearWalletLedger(){
  localStorage.removeItem(WITHDRAW_KEY);
}

function getTodayWithdrawTotal(){

  const today = new Date().toDateString();

  return getWithdrawals()
    .filter(tx => new Date(tx.createdAt).toDateString() === today)
    .reduce((sum,tx)=> sum + Number(tx.amount),0);
}
