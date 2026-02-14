/* =========================================
   ALBUKHR WALLET CORE v6 (DAILY CONTROL)
   Source of Truth = staking.js
   Wallet = Withdraw Layer Only
========================================= */

const WITHDRAW_KEY = "albukhr_wallet_withdrawals_v6";

/* ===== DAILY RULES ===== */
const DAILY_LIMIT_COUNT  = 1;        // 1 withdraw per 24h
const DAILY_LIMIT_AMOUNT = 50;       // max 50 Pi per 24h
const DAILY_WINDOW_MS    = 24 * 60 * 60 * 1000;

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

function getNetRewards(){
  const net = getGrossRewards() - getTotalWithdrawn();
  return net < 0 ? 0 : net;
}

function getAvailableBalance(){
  return getNetRewards();
}

function getWalletSummary(){

  const totalStake   = getTotalStake();
  const grossRewards = getGrossRewards();
  const withdrawn    = getTotalWithdrawn();
  const netRewards   = getNetRewards();

  return {
    locked: totalStake,
    grossRewards: grossRewards,
    withdrawn: withdrawn,
    rewards: netRewards,
    available: netRewards,

    /* backward compatibility */
    totalStake: totalStake,
    totalReward: netRewards
  };
}

/* =========================================
   DAILY LIMIT ENGINE
========================================= */

function _getWithdrawsLast24h(){

  const now = Date.now();

  return getWithdrawals().filter(tx=>{
    const time = tx.timestamp || tx.createdAt || 0;
    return (now - time) <= DAILY_WINDOW_MS;
  });
}

function _dailyCountExceeded(){
  return _getWithdrawsLast24h().length >= DAILY_LIMIT_COUNT;
}

function _dailyAmountExceeded(amount){

  const totalToday = _getWithdrawsLast24h()
    .reduce((sum,tx)=> sum + (Number(tx.amount)||0),0);

  return (totalToday + amount) > DAILY_LIMIT_AMOUNT;
}

/* =========================================
   WITHDRAW REQUEST
========================================= */

function requestWithdraw(amount,walletAddress){

  amount = parseFloat(amount);

  /* BASIC VALIDATION */
  if(isNaN(amount) || amount <= 0){
    return { error:"Invalid withdraw amount" };
  }

  if(!walletAddress || walletAddress.trim()===""){
    return { error:"Wallet address required" };
  }

  if(_dailyCountExceeded()){
    return { error:"Daily withdraw limit reached (1 per 24h)" };
  }

  if(_dailyAmountExceeded(amount)){
    return { error:`Daily max withdraw is ${DAILY_LIMIT_AMOUNT} Pi` };
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
