/* =========================================
   ALBUKHR WALLET CORE v6
   Fully Defensive + Stable Totals
   Compatible with staking v3
========================================= */

const WITHDRAW_KEY = "albukhr_wallet_withdrawals_v6";

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
   SAFE STAKE ACCESS
========================================= */

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
   TOTAL CALCULATIONS (LOCAL SAFE)
========================================= */

function calculateTotalsFromStakes(){

  const stakes = getAllStakesSafe();

  let totalStake = 0;
  let totalReward = 0;

  stakes.forEach(s=>{
    totalStake  += Number(s.amount) || 0;
    totalReward += Number(s.reward) || 0;
  });

  return { totalStake, totalReward };
}

function getTotalStake(){
  return calculateTotalsFromStakes().totalStake;
}

function getGrossRewards(){
  return calculateTotalsFromStakes().totalReward;
}

function getTotalWithdrawn(){
  return getWithdrawals()
    .reduce((sum,t)=> sum + Number(t.amount || 0),0);
}

function getNetRewards(){
  return getGrossRewards() - getTotalWithdrawn();
}

function getAvailableBalance(){
  return getNetRewards();
}

function getWalletSummary(){
  return {
    totalStake: getTotalStake(),
    totalReward: getNetRewards(),   // NET display
    withdrawn: getTotalWithdrawn(),
    available: getAvailableBalance()
  };
}

/* =========================================
   WITHDRAW REQUEST (SAFE)
========================================= */

function requestWithdraw(amount, walletAddress){

  amount = Number(amount);

  if(!amount || isNaN(amount) || amount <= 0){
    return { error:"Enter valid amount greater than 0" };
  }

  if(!walletAddress){
    return { error:"Wallet address required" };
  }

  if(amount > getAvailableBalance()){
    return { error:"Insufficient reward balance" };
  }

  const tx = {
    id: "WD-" + Date.now(),
    type: "withdraw",
    amount,
    walletAddress,
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
   DEV
========================================= */

function clearWalletLedger(){
  localStorage.removeItem(WITHDRAW_KEY);
}
