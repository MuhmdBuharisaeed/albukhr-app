/* =========================================
   ALBUKHR WALLET CORE v3
   Source of Truth = staking.js
   Wallet = Withdraw Layer Only
========================================= */

const LEDGER_KEY = "albukhr_wallet_withdrawals_v3";

/* =========================================
   LEDGER (Withdraw Only)
========================================= */

function getLedger(){
  return JSON.parse(localStorage.getItem(LEDGER_KEY)) || [];
}

function saveLedger(list){
  localStorage.setItem(LEDGER_KEY, JSON.stringify(list));
}

function addWithdraw({ amount, walletAddress }){

  if(!amount || amount <= 0) return false;

  const tx = {
    id: "WD-" + Date.now() + "-" + Math.floor(Math.random()*1000),
    type: "withdraw",
    amount: parseFloat(amount),
    walletAddress,
    status: "completed",
    createdAt: Date.now()
  };

  const list = getLedger();
  list.push(tx);
  saveLedger(list);

  return tx;
}

/* =========================================
   EXTERNAL DATA (FROM staking.js)
========================================= */

function getExternalTotals(){
  if(typeof getTotals === "function"){
    return getTotals();
  }
  return { totalStake: 0, totalReward: 0 };
}

function getExternalStakes(){
  if(typeof getStakes === "function"){
    return getStakes();
  }
  return [];
}

/* =========================================
   CALCULATIONS
========================================= */

function getTotalStake(){
  return getExternalTotals().totalStake || 0;
}

function getTotalRewards(){
  return getExternalTotals().totalReward || 0;
}

function getTotalWithdrawn(){
  return getLedger()
    .reduce((sum,t)=>sum+t.amount,0);
}

function getAvailableBalance(){
  return getTotalRewards() - getTotalWithdrawn();
}

function getWalletSummary(){
  return {
    totalStake: getTotalStake(),
    totalReward: getTotalRewards(),
    withdrawn: getTotalWithdrawn(),
    available: getAvailableBalance()
  };
}

/* =========================================
   WITHDRAW REQUEST
========================================= */

function requestWithdraw(amount, walletAddress){

  amount = parseFloat(amount);

  if(amount <= 0)
    return { error: "Invalid amount" };

  if(!walletAddress)
    return { error: "Wallet address required" };

  if(amount > getAvailableBalance())
    return { error: "Insufficient reward balance" };

  return addWithdraw({
    amount,
    walletAddress
  });
}

/* =========================================
   MERGED TRANSACTION HISTORY
========================================= */

function getMergedHistory(){

  const stakingTx = getExternalStakes()
    .filter(s => s.status === "Successful")
    .map(s => ({
      id: "ST-" + s.timestamp,
      type: "stake",
      project: s.project,
      amount: s.amount,
      createdAt: s.timestamp
    }));

  const withdrawTx = getLedger().map(w => ({
    id: w.id,
    type: "withdraw",
    amount: w.amount,
    walletAddress: w.walletAddress,
    createdAt: w.createdAt
  }));

  return [...stakingTx, ...withdrawTx]
    .sort((a,b)=>b.createdAt - a.createdAt);
}

/* =========================================
   DEV HELPERS
========================================= */

function clearWalletLedger(){
  localStorage.removeItem(LEDGER_KEY);
}
