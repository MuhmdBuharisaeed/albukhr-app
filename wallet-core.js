/* =========================================
   ALBUKHR WALLET CORE v8
   Admin Adjustable Fee + Daily Limit
========================================= */

const WITHDRAW_KEY = "albukhr_wallet_withdrawals_v4";
const WALLET_SETTINGS_KEY = "albukhr_wallet_settings";

/* =========================================
   DEFAULT SETTINGS
========================================= */

const DEFAULT_SETTINGS = {
  withdrawFeeRate: 0.01,   // 1% default
  dailyLimit: 50           // 50 Pi daily cap
};

/* =========================================
   SETTINGS STORAGE
========================================= */

function getWalletSettings(){
  const saved = JSON.parse(localStorage.getItem(WALLET_SETTINGS_KEY));
  return { ...DEFAULT_SETTINGS, ...saved };
}

function saveWalletSettings(settings){
  localStorage.setItem(WALLET_SETTINGS_KEY, JSON.stringify(settings));
}

/* ADMIN: UPDATE FEE */
function setWithdrawFeeRate(rate){

  rate = Number(rate);

  if(isNaN(rate) || rate < 0 || rate > 0.2){
    return { error:"Invalid fee rate (0 - 20%)" };
  }

  const settings = getWalletSettings();
  settings.withdrawFeeRate = rate;
  saveWalletSettings(settings);

  return { success:true };
}

/* ADMIN: UPDATE DAILY LIMIT */
function setDailyLimit(limit){

  limit = Number(limit);

  if(isNaN(limit) || limit <= 0){
    return { error:"Invalid daily limit" };
  }

  const settings = getWalletSettings();
  settings.dailyLimit = limit;
  saveWalletSettings(settings);

  return { success:true };
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

function getNetRewards(){
  return getGrossRewards() - getTotalWithdrawn();
}

function getAvailableBalance(){
  return getNetRewards();
}

/* =========================================
   DAILY LIMIT CHECK
========================================= */

function getTodayWithdrawTotal(){

  const today = new Date().toDateString();

  return getWithdrawals()
    .filter(tx => new Date(tx.timestamp).toDateString() === today)
    .reduce((sum,t)=> sum + (Number(t.amount) || 0), 0);
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

  const settings = getWalletSettings();

  const todayUsed = getTodayWithdrawTotal();

  if(todayUsed + amount > settings.dailyLimit){
    return { error:`Daily limit exceeded (${settings.dailyLimit} Pi)` };
  }

  const fee = amount * settings.withdrawFeeRate;
  const net = amount - fee;

  const now = Date.now();

  const tx = {
    id: "WD-" + now,
    type: "withdraw",
    amount,
    fee,
    net,
    walletAddress,
    timestamp: now
  };

  const list = getWithdrawals();
  list.push(tx);
  saveWithdrawals(list);

  return tx;
}

/* =========================================
   SUMMARY
========================================= */

function getWalletSummary(){

  return {
    totalStake: getTotalStake(),
    grossRewards: getGrossRewards(),
    withdrawn: getTotalWithdrawn(),
    rewards: getNetRewards(),
    available: getAvailableBalance(),
    settings: getWalletSettings()
  };
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

function resetWalletSettings(){
  localStorage.removeItem(WALLET_SETTINGS_KEY);
}
