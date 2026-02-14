/* =========================================
   ALBUKHR WALLET CORE v5 (ECOSYSTEM SAFE)
   Source of Truth = staking.js
   Wallet = Withdraw Layer Only
========================================= */

const WITHDRAW_KEY = "albukhr_wallet_withdrawals_v5";

/* =========================================
   SAFE STORAGE
========================================= */

function _safeParse(key){
  try{
    return JSON.parse(localStorage.getItem(key)) || [];
  }catch{
    return [];
  }
}

function _save(key,data){
  localStorage.setItem(key, JSON.stringify(data));
}

function getWithdrawals(){
  return _safeParse(WITHDRAW_KEY);
}

function saveWithdrawals(list){
  _save(WITHDRAW_KEY,list);
}

/* =========================================
   SOURCE OF TRUTH (staking.js)
========================================= */

function _getExternalTotals(){
  if(typeof getTotals === "function"){
    return getTotals();
  }
  return { totalStake:0, totalReward:0 };
}

/* =========================================
   CALCULATIONS
========================================= */

function getTotalStake(){
  return Number(_getExternalTotals().totalStake) || 0;
}

function getGrossRewards(){
  return Number(_getExternalTotals().totalReward) || 0;
}

function getTotalWithdrawn(){
  return getWithdrawals()
    .reduce((sum,t)=> sum + (Number(t.amount) || 0), 0);
}

/* NET REWARD (after withdraw) */
function getNetRewards(){
  const net = getGrossRewards() - getTotalWithdrawn();
  return net < 0 ? 0 : net;
}

/* AVAILABLE BALANCE */
function getAvailableBalance(){
  return getNetRewards();
}

/* MASTER SUMMARY (Wallet Compatible Old + New UI) */
function getWalletSummary(){

  const totalStake   = getTotalStake();
  const grossRewards = getGrossRewards();
  const withdrawn    = getTotalWithdrawn();
  const netRewards   = getNetRewards();

  return {

    /* NEW STRUCTURE */
    locked: totalStake,
    grossRewards: grossRewards,
    withdrawn: withdrawn,
    rewards: netRewards,
    available: netRewards,

    /* BACKWARD COMPATIBILITY */
    totalStake: totalStake,
    totalReward: netRewards
  };
}

/* =========================================
   WITHDRAW RULE ENGINE
========================================= */

function requestWithdraw(amount,walletAddress){

  amount = parseFloat(amount);

  /* BLOCK ZERO / INVALID */
  if(isNaN(amount) || amount <= 0){
    return { error:"Invalid withdraw amount" };
  }

  if(!walletAddress || walletAddress.trim()===""){
    return { error:"Wallet address required" };
  }

  const available = getAvailableBalance();

  if(amount > available){
    return { error:"Insufficient reward balance" };
  }

  const now = Date.now();

  const tx = {
    id: "WD-" + now,
    type: "withdraw",
    amount: Number(amount),
    walletAddress: walletAddress.trim(),
    timestamp: now,
    createdAt: now
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
    .map(tx=>({
      ...tx,
      timestamp: tx.timestamp || tx.createdAt || Date.now()
    }))
    .sort((a,b)=> b.timestamp - a.timestamp);
}

/* =========================================
   DEV RESET
========================================= */

function clearWalletLedger(){
  localStorage.removeItem(WITHDRAW_KEY);
}
